import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import type { InstalledSkillInstallKind, InstalledSkillItem, InstalledSkillOrganizeAction, InstalledSkillOrganizeDecision, InstalledSkillOrganizePlan, InstalledSkillOrganizeResult, InstalledSkillPluginMetadata, InstalledSkillRoot, InstalledSkillsInventory, InstalledSkillsScanOptions } from "../shared/types.js";
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
export type InstalledSkillOrganizeOptions = ScanInstalledSkillsOptions & { decisions?: InstalledSkillOrganizeDecision[]; confirm?: boolean };

const ORGANIZE_ACTION_KINDS = new Set<InstalledSkillOrganizeAction["kind"]>([
  "copy-to-generic",
  "link-agent-directory",
  "replace-with-link",
  "remove-duplicate"
]);

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

export async function createInstalledSkillOrganizePlan(options: InstalledSkillOrganizeOptions = {}): Promise<InstalledSkillOrganizePlan> {
  const inventory = await scanInstalledSkills({ ...options, includeAgentSystemSkills: false });
  const genericRoot = path.join(inventory.home, ".agents", "skills");
  const groups = new Map<string, Array<InstalledSkillItem & { manifestSignature: string }>>();
  const actions: InstalledSkillOrganizeAction[] = [];
  const conflicts: InstalledSkillOrganizePlan["conflicts"] = [];
  const messages: string[] = [
    "Installed skill inventory is evidence only; identical names or content do not select a canonical owner.",
    "Agent or user decisions are required before the plan can contain copy, link, or removal actions."
  ];

  for (const skill of inventory.skills) {
    if (skill.isSystem) continue;
    const manifestSignature = await fileManifest(skill.path);
    const key = normalizeSkillKey(skill.name);
    groups.set(key, [...(groups.get(key) ?? []), { ...skill, manifestSignature }]);
  }

  const evidenceGroups = [...groups.values()]
    .filter((items) => items.length > 1)
    .map((items) => ({
      skillName: items[0]?.name ?? "",
      items: items.map((item) => ({
        rootName: item.rootName,
        path: item.path,
        installKind: item.installKind,
        isSystem: item.isSystem,
        manifestSignature: item.manifestSignature
      }))
    }))
    .sort((left, right) => left.skillName.localeCompare(right.skillName));

  for (const items of groups.values()) {
    const bySignature = new Map<string, typeof items>();
    for (const item of items) bySignature.set(item.manifestSignature, [...(bySignature.get(item.manifestSignature) ?? []), item]);
    if (items.length > 1 && bySignature.size > 1) {
      conflicts.push({
        skillName: items[0]?.name ?? "",
        reason: "Same skill name has different file-level content.",
        items: items.map((item) => ({
          rootName: item.rootName,
          path: item.path,
          manifestSignature: item.manifestSignature
        }))
      });
    }
  }

  const acceptedDecisions: InstalledSkillOrganizeDecision[] = [];
  const seenDecisions = new Set<string>();
  for (const decision of options.decisions ?? []) {
    const skillName = typeof decision?.skillName === "string" ? decision.skillName : "";
    const key = normalizeSkillKey(skillName);
    const items = groups.get(key) ?? [];
    const reason = validateOrganizeDecision(decision, items, inventory.roots);
    if (key && seenDecisions.has(key)) {
      conflicts.push(conflictForDecision(skillName, "Multiple organize decisions target the same skill.", items));
      continue;
    }
    if (key) seenDecisions.add(key);
    if (reason) {
      conflicts.push(conflictForDecision(skillName || "<invalid-decision>", reason, items));
      continue;
    }
    acceptedDecisions.push(decision);
    actions.push(...decision.actions);
  }

  if ((options.decisions ?? []).length === 0) messages.push("No organize decisions were supplied; actions are intentionally empty.");

  return {
    home: inventory.home,
    generatedAt: new Date().toISOString(),
    genericRoot,
    evidenceGroups,
    decisions: acceptedDecisions,
    actions: uniqueOrganizeActions(actions),
    conflicts,
    requiresConfirm: actions.length > 0,
    messages
  };
}

export async function organizeInstalledSkills(options: InstalledSkillOrganizeOptions = {}): Promise<InstalledSkillOrganizeResult> {
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
    if (!(await pathExists(action.sourcePath)) || await fileManifest(action.sourcePath) !== action.manifestSignature) {
      skipped.push(action.sourcePath);
      continue;
    }
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
  return parts[0] === ".system";
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

function isModifiableInstalledSkill(skill: InstalledSkillItem): boolean {
  return skill.installKind !== "codex-plugin-cache" && !skill.isSystem;
}

function validateOrganizeDecision(
  decision: InstalledSkillOrganizeDecision | null | undefined,
  items: Array<InstalledSkillItem & { manifestSignature: string }>,
  roots: InstalledSkillRoot[]
): string | undefined {
  if (!decision || typeof decision !== "object") return "Decision must be an object.";
  if (typeof decision.skillName !== "string" || !decision.skillName.trim()) return "Decision skillName is required.";
  if (typeof decision.canonicalPath !== "string" || !decision.canonicalPath.trim()) return "Decision canonicalPath is required.";
  if (typeof decision.reason !== "string" || !decision.reason.trim()) return "Decision reason is required.";
  if (!Array.isArray(decision.evidence) || !decision.evidence.length || decision.evidence.some((item) => typeof item !== "string" || !item.trim())) return "Decision evidence must contain non-empty entries.";
  if (!Array.isArray(decision.actions)) return "Decision actions must be an array.";
  if (!items.length) return "Decision does not match an installed skill evidence group.";
  const canonical = items.find((item) => samePath(item.path, decision.canonicalPath));
  if (!canonical) return "canonicalPath must identify an observed installed copy in the same evidence group.";

  const writableRoots = roots.filter((root) => root.installKind !== "codex-plugin-cache").map((root) => path.resolve(root.path));
  for (const action of decision.actions) {
    if (!action || typeof action !== "object") return "Every action must be an object.";
    if (!ORGANIZE_ACTION_KINDS.has(action.kind)) return `Unknown organize action kind: ${String(action.kind)}`;
    if (typeof action.skillName !== "string" || !action.skillName.trim()) return "Every action requires a skillName.";
    if (typeof action.sourcePath !== "string" || !action.sourcePath.trim()) return "Every action requires a sourcePath.";
    if (typeof action.targetPath !== "string" || !action.targetPath.trim()) return "Every action requires a targetPath.";
    if (typeof action.manifestSignature !== "string" || !action.manifestSignature.trim()) return "Every action requires a manifestSignature.";
    if (normalizeSkillKey(action.skillName) !== normalizeSkillKey(decision.skillName)) return "Action skillName must match its decision.";
    if (typeof action.reason !== "string" || !action.reason.trim()) return "Every action requires a non-empty reason.";
    const source = items.find((item) => samePath(item.path, action.sourcePath));
    if (!source) return `Action source was not observed in the evidence group: ${action.sourcePath}`;
    if (source.manifestSignature !== action.manifestSignature) return `Action manifestSignature does not match observed source content: ${action.sourcePath}`;
    if (samePath(action.sourcePath, action.targetPath)) return "Action sourcePath and targetPath must differ.";
    if (!writableRoots.some((root) => isPathWithinSkillRoot(action.targetPath, root))) return `Action target is not a child of a user-managed installed-skill root: ${action.targetPath}`;
    if ((action.kind === "remove-duplicate" || action.kind === "replace-with-link") && !isModifiableInstalledSkill(source)) {
      return `Action cannot modify a system or plugin-managed copy: ${action.sourcePath}`;
    }
    if ((action.kind === "remove-duplicate" || action.kind === "replace-with-link") && !samePath(action.targetPath, canonical.path)) {
      return `${action.kind} must reference the selected canonicalPath as targetPath.`;
    }
  }
  return undefined;
}

function conflictForDecision(
  skillName: string,
  reason: string,
  items: Array<InstalledSkillItem & { manifestSignature: string }>
): InstalledSkillOrganizePlan["conflicts"][number] {
  return {
    skillName,
    reason,
    items: items.map((item) => ({ rootName: item.rootName, path: item.path, manifestSignature: item.manifestSignature }))
  };
}

function isPathWithinSkillRoot(candidate: string, root: string): boolean {
  const relative = path.relative(path.resolve(root), path.resolve(candidate));
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
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
  const normalize = (value: string) => {
    const resolved = path.resolve(value);
    return process.platform === "win32" || process.platform === "darwin" ? resolved.toLowerCase() : resolved;
  };
  return normalize(left) === normalize(right);
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
