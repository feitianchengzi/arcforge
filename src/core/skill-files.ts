import path from "node:path";
import { promises as fs } from "node:fs";
import type { SkillFileDocument, SkillFileEntry } from "../shared/types.js";
import { findSkillMarkdownFile } from "./skill-markdown.js";

const IGNORED_DIRS = new Set([".git", "node_modules"]);
const MAX_EDITABLE_FILE_BYTES = 1024 * 1024 * 2;

export async function listSkillFiles(root: string, skillPath: string): Promise<SkillFileEntry[]> {
  const safeSkillPath = await assertSkillPath(root, skillPath);
  return listDirectory(root, safeSkillPath);
}

export async function listWorkspaceFiles(root: string, directoryPath: string): Promise<SkillFileEntry[]> {
  const safeDirectoryPath = assertWorkspacePath(root, path.isAbsolute(directoryPath) ? directoryPath : path.join(root, directoryPath));
  const stats = await fs.stat(safeDirectoryPath);
  if (!stats.isDirectory()) throw new Error("Selected path is not a directory.");
  return listDirectory(root, safeDirectoryPath);
}

export async function readSkillFile(root: string, filePath: string): Promise<SkillFileDocument> {
  const safeFilePath = assertWorkspacePath(root, filePath);
  const stats = await fs.stat(safeFilePath);
  if (!stats.isFile()) throw new Error("Selected path is not a file.");
  if (stats.size > MAX_EDITABLE_FILE_BYTES) throw new Error("File is too large to edit in SkillOps.");

  const buffer = await fs.readFile(safeFilePath);
  if (buffer.includes(0)) throw new Error("Binary files cannot be edited in SkillOps.");

  return {
    path: safeFilePath,
    relativePath: path.relative(path.resolve(root), safeFilePath),
    content: buffer.toString("utf8"),
    modifiedAt: stats.mtime.toISOString()
  };
}

export async function writeSkillFile(root: string, filePath: string, content: string): Promise<SkillFileDocument> {
  const safeFilePath = assertWorkspacePath(root, filePath);
  const stats = await fs.stat(safeFilePath);
  if (!stats.isFile()) throw new Error("Selected path is not a file.");
  await fs.writeFile(safeFilePath, content, "utf8");
  return readSkillFile(root, safeFilePath);
}

export async function defaultSkillFile(skillPath: string): Promise<string | undefined> {
  return findSkillMarkdownFile(skillPath);
}

async function listDirectory(root: string, dir: string): Promise<SkillFileEntry[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const result: SkillFileEntry[] = [];

  for (const entry of entries) {
    if (entry.isDirectory() && IGNORED_DIRS.has(entry.name)) continue;
    const entryPath = path.join(dir, entry.name);
    const relativePath = path.relative(path.resolve(root), entryPath);
    if (entry.isDirectory()) {
      result.push({
        name: entry.name,
        path: entryPath,
        relativePath,
        type: "directory",
        children: await listDirectory(root, entryPath)
      });
      continue;
    }
    if (!entry.isFile()) continue;
    const stats = await fs.stat(entryPath);
    result.push({
      name: entry.name,
      path: entryPath,
      relativePath,
      type: "file",
      size: stats.size
    });
  }

  return result.sort((a, b) => {
    if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

async function assertSkillPath(root: string, skillPath: string): Promise<string> {
  const safeSkillPath = assertWorkspacePath(root, skillPath);
  const stats = await fs.stat(safeSkillPath);
  if (!stats.isDirectory()) throw new Error("Selected skill is not a directory.");
  if (!(await findSkillMarkdownFile(safeSkillPath))) throw new Error("Selected directory is not a Skill.");
  return safeSkillPath;
}

function assertWorkspacePath(root: string, targetPath: string): string {
  const safeRoot = path.resolve(root);
  const resolved = path.resolve(targetPath);
  const relative = path.relative(safeRoot, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("Path is outside the current workspace.");
  return resolved;
}
