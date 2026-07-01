import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import type { InstalledSkillInstallKind, InstalledSkillItem, InstalledSkillOrganizeAction, InstalledSkillOrganizePlan, InstalledSkillOrganizeResult, InstalledSkillPluginMetadata, InstalledSkillRoot, InstalledSkillsInventory, InstalledSkillsScanOptions } from "../shared/types.js";
import { parseFrontmatter } from "./frontmatter.js";
import { pathExists, readText } from "./fs.js";
import { findSkillMarkdownFile } from "./skill-markdown.js";

interface InstalledSkillRootDefinition {
  id: string;
  name: string;
  segments: string[];
  installKind: InstalledSkillInstallKind;
}

export const DEFAULT_INSTALLED_SKILL_ROOTS: InstalledSkillRootDefinition[] = [
  { id: "codex-user", name: "Codex", segments: [".codex", "skills"], installKind: "agent-user" },
  { id: "claude-user", name: "Claude", segments: [".claude", "skills"], installKind: "agent-user" },
  { id: "cursor-user", name: "Cursor", segments: [".cursor", "skills"], installKind: "agent-user" },
  { id: "agents-user", name: "Generic agents", segments: [".agents", "skills"], installKind: "agent-generic" },
  { id: "codex-plugin-cache", name: "Codex plugin cache", segments: [".codex", "plugins", "cache"], installKind: "codex-plugin-cache" }
];

export type ScanInstalledSkillsOptions = InstalledSkillsScanOptions;

export async function scanInstalledSkills(options: ScanInstalledSkillsOptions = {}): Promise<InstalledSkillsInventory> {
  const home = path.resolve(options.home ?? os.homedir());
  const normalizedOptions = normalizeInstalledSkillsScanOptions(options);
  const definitions = DEFAULT_INSTALLED_SKILL_ROOTS.filter((definition) => normalizedOptions.includeCodexPluginCache || definition.installKind !== "codex-plugin-cache");
  const rootResults = await Promise.all(definitions.map((definition) => scanRoot(home, definition, normalizedOptions)));
  const roots = rootResults.map((item) => item.root);
  const skills = rootResults.flatMap((item) => item.skills).sort(compareInstalledSkills);
  return {
    home,
    generatedAt: new Date().toISOString(),
    options: normalizedOptions,
    roots,
    skills,
    duplicateGroups: duplicateGroups(skills)
  };
}

export async function createInstalledSkillOrganizePlan(options: ScanInstalledSkillsOptions = {}): Promise<InstalledSkillOrganizePlan> {
  const inventory = await scanInstalledSkills({ ...options, includeAgentSystemSkills: false });
  const genericRoot = path.join(inventory.home, ".agents", "skills");
  const groups = new Map<string, Array<InstalledSkillItem & { manifestSignature: string }>>();
  const actions: InstalledSkillOrganizeAction[] = [];
  const conflicts: InstalledSkillOrganizePlan["conflicts"] = [];
  const messages: string[] = [
    "Organize plan only includes non-system skills.",
    "Run requires explicit confirmation before copying, linking, or removing duplicate physical entries."
  ];

  for (const skill of inventory.skills) {
    if (skill.isSystem) continue;
    const manifestSignature = await fileManifest(skill.path);
    const key = normalizeSkillKey(skill.name);
    groups.set(key, [...(groups.get(key) ?? []), { ...skill, manifestSignature }]);
  }

  for (const items of groups.values()) {
    const bySignature = new Map<string, typeof items>();
    for (const item of items) bySignature.set(item.manifestSignature, [...(bySignature.get(item.manifestSignature) ?? []), item]);
    if (bySignature.size > 1) {
      conflicts.push({
        skillName: items[0]?.name ?? "",
        reason: "Same skill name has different file-level content.",
        items: items.map((item) => ({
          rootName: item.rootName,
          path: item.path,
          manifestSignature: item.manifestSignature
        }))
      });
      continue;
    }

    const canonical = chooseCanonicalSkill(items, genericRoot);
    if (!canonical) continue;
    const targetPath = path.join(genericRoot, path.basename(canonical.path));
    if (canonical.installKind !== "agent-generic") {
      actions.push({
        kind: "copy-to-generic",
        skillName: canonical.name,
        sourcePath: canonical.path,
        targetPath,
        reason: "Move non-system skill ownership into the generic agents directory.",
        manifestSignature: canonical.manifestSignature,
        rootName: canonical.rootName
      });
      if (isModifiableInstalledSkill(canonical)) {
        actions.push({
          kind: "replace-with-link",
          skillName: canonical.name,
          sourcePath: canonical.path,
          targetPath,
          reason: "Canonical agent skill is copied to the generic agents directory, then replaced with a directory link.",
          manifestSignature: canonical.manifestSignature,
          rootName: canonical.rootName
        });
      }
    }

    for (const item of items) {
      if (samePath(item.path, canonical.path)) continue;
      if (!isModifiableInstalledSkill(item)) continue;
      if (item.installKind === "agent-generic") {
        actions.push({
          kind: "remove-duplicate",
          skillName: item.name,
          sourcePath: item.path,
          targetPath: canonical.path,
          reason: "Duplicate generic skill has identical file-level content.",
          manifestSignature: item.manifestSignature,
          rootName: item.rootName
        });
        continue;
      }
      actions.push({
        kind: "replace-with-link",
        skillName: item.name,
        sourcePath: item.path,
        targetPath,
        reason: "Agent directory duplicate has identical content; keep one generic copy and replace the duplicate with a directory link.",
        manifestSignature: item.manifestSignature,
        rootName: item.rootName
      });
    }

    const linkedAgentRoots = new Set(items.filter((item) => item.installKind !== "agent-generic").map((item) => item.rootPath));
    for (const root of inventory.roots.filter((root) => root.installKind === "agent-user" && root.status === "scanned")) {
      if (linkedAgentRoots.has(root.path)) continue;
      const linkPath = path.join(root.path, path.basename(targetPath));
      actions.push({
        kind: "link-agent-directory",
        skillName: canonical.name,
        sourcePath: targetPath,
        targetPath: linkPath,
        reason: "Reference the generic agents copy from agent-specific directories that do not support the generic agents directory directly.",
        manifestSignature: canonical.manifestSignature,
        rootName: root.name
      });
    }
  }

  return {
    home: inventory.home,
    generatedAt: new Date().toISOString(),
    genericRoot,
    actions: uniqueOrganizeActions(actions),
    conflicts,
    requiresConfirm: true,
    messages
  };
}

export async function organizeInstalledSkills(options: ScanInstalledSkillsOptions & { confirm?: boolean } = {}): Promise<InstalledSkillOrganizeResult> {
  const plan = await createInstalledSkillOrganizePlan(options);
  if (!options.confirm) {
    return {
      plan,
      copied: [],
      linked: [],
      removed: [],
      skipped: [],
      conflicts: plan.conflicts,
      messages: [...plan.messages, "No changes were made because organize run requires confirm."]
    };
  }

  const copied: string[] = [];
  const linked: string[] = [];
  const removed: string[] = [];
  const skipped: string[] = [];
  for (const action of plan.actions) {
    if (action.kind === "copy-to-generic") {
      if (await isSameSkillDirectory(action.sourcePath, action.targetPath)) {
        skipped.push(action.targetPath);
        continue;
      }
      if (await pathExists(action.targetPath)) {
        skipped.push(action.targetPath);
        continue;
      }
      await copySkillDirectory(action.sourcePath, action.targetPath);
      copied.push(action.targetPath);
      continue;
    }

    if (action.kind === "remove-duplicate") {
      if (!(await isSameSkillDirectory(action.sourcePath, action.targetPath))) {
        skipped.push(action.sourcePath);
        continue;
      }
      await fs.rm(action.sourcePath, { recursive: true, force: true });
      removed.push(action.sourcePath);
      continue;
    }

    if (action.kind === "replace-with-link") {
      if (!(await isSameSkillDirectory(action.sourcePath, action.targetPath))) {
        skipped.push(action.sourcePath);
        continue;
      }
      await fs.rm(action.sourcePath, { recursive: true, force: true });
      await createDirectoryLink(action.targetPath, action.sourcePath);
      removed.push(action.sourcePath);
      linked.push(action.sourcePath);
      continue;
    }

    if (action.kind === "link-agent-directory") {
      if (await pathExists(action.targetPath)) {
        skipped.push(action.targetPath);
        continue;
      }
      if (!(await pathExists(action.sourcePath))) {
        skipped.push(action.targetPath);
        continue;
      }
      await createDirectoryLink(action.sourcePath, action.targetPath);
      linked.push(action.targetPath);
    }
  }

  return {
    plan,
    copied,
    linked,
    removed,
    skipped,
    conflicts: plan.conflicts,
    messages: plan.messages
  };
}

function normalizeInstalledSkillsScanOptions(options: ScanInstalledSkillsOptions): Required<InstalledSkillsScanOptions> {
  return {
    home: path.resolve(options.home ?? os.homedir()),
    includeAgentSystemSkills: options.includeAgentSystemSkills ?? false,
    includeCodexPluginCache: options.includeCodexPluginCache ?? true
  };
}

async function scanRoot(home: string, definition: InstalledSkillRootDefinition, options: Required<InstalledSkillsScanOptions>): Promise<{ root: InstalledSkillRoot; skills: InstalledSkillItem[] }> {
  const rootPath = path.join(home, ...definition.segments);
  if (!(await pathExists(rootPath))) {
    return { root: rootSummary(definition, rootPath, "missing", 0), skills: [] };
  }

  try {
    const stats = await fs.stat(rootPath);
    if (!stats.isDirectory()) {
      return { root: rootSummary(definition, rootPath, "error", 0, "Installed skill root is not a directory."), skills: [] };
    }
    const skills = await discoverInstalledSkills(rootPath, definition, options);
    return { root: rootSummary(definition, rootPath, "scanned", skills.length), skills };
  } catch (error) {
    return { root: rootSummary(definition, rootPath, "error", 0, error instanceof Error ? error.message : String(error)), skills: [] };
  }
}

function rootSummary(definition: InstalledSkillRootDefinition, rootPath: string, status: InstalledSkillRoot["status"], skillCount: number, error?: string): InstalledSkillRoot {
  return {
    id: definition.id,
    name: definition.name,
    path: rootPath,
    installKind: definition.installKind,
    status,
    skillCount,
    error
  };
}

async function discoverInstalledSkills(rootPath: string, definition: InstalledSkillRootDefinition, options: Required<InstalledSkillsScanOptions>): Promise<InstalledSkillItem[]> {
  const skills: InstalledSkillItem[] = [];
  await walkInstalledRoot(rootPath, rootPath, async (dir) => {
    const skillFile = await findSkillMarkdownFile(dir);
    if (!skillFile) return false;
    if (definition.installKind === "codex-plugin-cache" && !pluginMetadata(rootPath, dir)) return true;
    if (!options.includeAgentSystemSkills && definition.installKind !== "codex-plugin-cache" && isInstalledSkillSystemPath(rootPath, dir)) return true;
    skills.push(await summarizeInstalledSkill(rootPath, definition, dir, skillFile));
    return true;
  });
  return skills.sort(compareInstalledSkills);
}

async function walkInstalledRoot(rootPath: string, dir: string, onDir: (dir: string) => Promise<boolean>): Promise<void> {
  const stop = await onDir(dir);
  if (stop) return;

  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.isSymbolicLink()) continue;
    if (entry.name === ".git" || entry.name === "node_modules" || entry.name === "dist") continue;
    await walkInstalledRoot(rootPath, path.join(dir, entry.name), onDir);
  }
}

async function summarizeInstalledSkill(rootPath: string, definition: InstalledSkillRootDefinition, dir: string, skillFile: string): Promise<InstalledSkillItem> {
  const raw = await readText(skillFile);
  const parsed = parseFrontmatter(raw);
  const name = stringValue(parsed.frontmatter.name) || path.basename(dir);
  return {
    name,
    description: stringValue(parsed.frontmatter.description) || firstParagraph(parsed.body),
    path: dir,
    relativePath: path.relative(rootPath, dir),
    rootId: definition.id,
    rootName: definition.name,
    rootPath,
    installKind: definition.installKind,
    targets: arrayValue(parsed.frontmatter["metadata.targets"] ?? parsed.frontmatter.targets),
    version: stringValue(parsed.frontmatter.version),
    hasReferences: await pathExists(path.join(dir, "references")),
    hasScripts: await pathExists(path.join(dir, "scripts")),
    isSystem: isInstalledSkillSystemPath(rootPath, dir),
    plugin: definition.installKind === "codex-plugin-cache" ? pluginMetadata(rootPath, dir) : undefined
  };
}

export function isInstalledSkillSystemPath(rootPath: string, dir: string): boolean {
  const parts = path.relative(rootPath, dir).split(path.sep).filter(Boolean).map((part) => part.toLowerCase());
  return parts.includes(".system") || parts.includes("system") || parts.includes("builtin") || parts.includes("builtins");
}

function pluginMetadata(rootPath: string, dir: string): InstalledSkillPluginMetadata | undefined {
  const parts = path.relative(rootPath, dir).split(path.sep).filter(Boolean);
  const skillsIndex = parts.indexOf("skills");
  if (skillsIndex < 3 || parts.length <= skillsIndex + 1) return undefined;
  return {
    channel: parts[0],
    pluginName: parts[1],
    revision: parts[2]
  };
}

function duplicateGroups(skills: InstalledSkillItem[]) {
  const groups = new Map<string, InstalledSkillItem[]>();
  for (const skill of skills) {
    const key = normalizeSkillKey(skill.name);
    groups.set(key, [...(groups.get(key) ?? []), skill]);
  }
  return [...groups.entries()]
    .filter(([, items]) => items.length > 1)
    .map(([key, items]) => ({
      key,
      name: items[0]?.name ?? key,
      items: items.sort(compareInstalledSkills)
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

function compareInstalledSkills(left: InstalledSkillItem, right: InstalledSkillItem): number {
  return left.name.localeCompare(right.name) || left.rootName.localeCompare(right.rootName) || left.path.localeCompare(right.path);
}

function chooseCanonicalSkill<T extends InstalledSkillItem & { manifestSignature: string }>(items: T[], genericRoot: string): T | undefined {
  return [...items].sort((left, right) => canonicalScore(right, genericRoot) - canonicalScore(left, genericRoot) || compareInstalledSkills(left, right))[0];
}

function canonicalScore(skill: InstalledSkillItem, genericRoot: string): number {
  if (skill.installKind === "agent-generic") return 3;
  if (samePath(skill.rootPath, genericRoot)) return 2;
  if (skill.installKind === "agent-user") return 1;
  return 0;
}

function isModifiableInstalledSkill(skill: InstalledSkillItem): boolean {
  return skill.installKind !== "codex-plugin-cache" && !skill.isSystem;
}

function uniqueOrganizeActions(actions: InstalledSkillOrganizeAction[]): InstalledSkillOrganizeAction[] {
  const seen = new Set<string>();
  return actions.filter((action) => {
    const key = `${action.kind}:${action.sourcePath}:${action.targetPath}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((left, right) => left.skillName.localeCompare(right.skillName) || organizeActionOrder(left.kind) - organizeActionOrder(right.kind) || left.targetPath.localeCompare(right.targetPath));
}

function organizeActionOrder(kind: InstalledSkillOrganizeAction["kind"]): number {
  if (kind === "copy-to-generic") return 0;
  if (kind === "replace-with-link") return 1;
  if (kind === "link-agent-directory") return 2;
  return 3;
}

async function fileManifest(dir: string): Promise<string> {
  const entries: string[] = [];
  await walkFiles(dir, async (filePath) => {
    const relativePath = path.relative(dir, filePath).replace(/\\/g, "/");
    const stats = await fs.stat(filePath);
    const hash = createHash("sha256").update(await fs.readFile(filePath)).digest("hex");
    entries.push(`${relativePath}:${stats.size}:${hash}`);
  });
  return createHash("sha256").update(entries.sort().join("\n")).digest("hex");
}

async function walkFiles(dir: string, onFile: (filePath: string) => Promise<void>): Promise<void> {
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) {
      if (entry.name === ".git" || entry.name === "node_modules" || entry.name === "dist") continue;
      await walkFiles(entryPath, onFile);
      continue;
    }
    if (entry.isFile()) await onFile(entryPath);
  }
}

async function isSameSkillDirectory(left: string, right: string): Promise<boolean> {
  if (!(await pathExists(left)) || !(await pathExists(right))) return false;
  return await fileManifest(left) === await fileManifest(right);
}

async function copySkillDirectory(source: string, target: string): Promise<void> {
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.cp(source, target, { recursive: true, errorOnExist: true, force: false });
}

async function createDirectoryLink(source: string, target: string): Promise<void> {
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.symlink(source, target, process.platform === "win32" ? "junction" : "dir");
}

function samePath(left: string, right: string): boolean {
  return path.resolve(left).toLowerCase() === path.resolve(right).toLowerCase();
}

function normalizeSkillKey(name: string): string {
  return name.trim().toLowerCase();
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function arrayValue(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function firstParagraph(body: string): string {
  const paragraph = body.split(/\n\s*\n/).find((part) => part.trim() && !part.trim().startsWith("#"));
  return paragraph?.replace(/\s+/g, " ").trim().slice(0, 180) ?? "";
}
