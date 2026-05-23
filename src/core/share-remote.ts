import path from "node:path";
import type { ShareTargetMode } from "../shared/types.js";
import { pathExists } from "./fs.js";

export interface ParsedRemoteSource {
  cloneUrl: string;
  ref: string;
  subdir: string;
}

export function shareTargetSubdir(baseSubdir: string, targetMode: ShareTargetMode, projectName: string, sourceDir = "skills"): string {
  const base = cleanRelativePath(baseSubdir);
  if (targetMode === "direct") return projectRootSubdir(base, sourceDir);
  const name = cleanRelativePath(projectName);
  if (!name) throw new Error("Project name is required when sharing under a project folder.");
  return [base, name].filter(Boolean).join("/");
}

export function normalizeRemoteUrl(remoteUrl: string): string {
  const trimmed = remoteUrl.trim();
  if (!trimmed) throw new Error("Remote URL is required.");
  if (/^https?:\/\//.test(trimmed) || /^git@/.test(trimmed) || /^ssh:\/\//.test(trimmed)) return trimmed;
  if (/^[\w.-]+\/[\w.-]+(?:\.git)?$/.test(trimmed)) return appendGit(`https://github.com/${trimmed}`);
  if (/^github\.com\//.test(trimmed)) return appendGit(`https://${trimmed}`);
  throw new Error("Use a GitHub path like owner/repo, github.com/owner/repo, or a full Git URL.");
}

export function canonicalRemoteKey(remoteUrl: string): string {
  const trimmed = remoteUrl.trim().replace(/\/$/, "").replace(/\.git$/, "");
  const sshMatch = trimmed.match(/^git@github\.com:([^/]+)\/(.+)$/i);
  if (sshMatch) return `github.com/${sshMatch[1].toLowerCase()}/${sshMatch[2].toLowerCase()}`;
  const sshUrlMatch = trimmed.match(/^ssh:\/\/git@github\.com\/([^/]+)\/(.+)$/i);
  if (sshUrlMatch) return `github.com/${sshUrlMatch[1].toLowerCase()}/${sshUrlMatch[2].toLowerCase()}`;
  const githubPathMatch = trimmed.match(/^(?:https?:\/\/)?github\.com\/([^/]+)\/([^/]+)(?:\/.*)?$/i);
  if (githubPathMatch) return `github.com/${githubPathMatch[1].toLowerCase()}/${githubPathMatch[2].toLowerCase()}`;
  const ownerRepoMatch = trimmed.match(/^([\w.-]+)\/([\w.-]+)$/);
  if (ownerRepoMatch) return `github.com/${ownerRepoMatch[1].toLowerCase()}/${ownerRepoMatch[2].toLowerCase()}`;
  return normalizeRemoteUrl(remoteUrl).replace(/\/$/, "").replace(/\.git$/, "").toLowerCase();
}

export function parseRemoteSource(remoteUrl: string): ParsedRemoteSource {
  const trimmed = remoteUrl.trim();
  if (!trimmed) throw new Error("Remote URL is required.");

  if (/^git@/.test(trimmed) || /^ssh:\/\//.test(trimmed)) {
    return { cloneUrl: trimmed, ref: "", subdir: "" };
  }

  const httpsUrl = trimmed.startsWith("http://") || trimmed.startsWith("https://")
    ? trimmed
    : trimmed.startsWith("github.com/")
      ? `https://${trimmed}`
      : /^[\w.-]+\/[\w.-]+(?:\/.*)?$/.test(trimmed)
        ? `https://github.com/${trimmed}`
        : "";

  if (!httpsUrl) return { cloneUrl: normalizeRemoteUrl(trimmed), ref: "", subdir: "" };

  const url = new URL(httpsUrl);
  if (url.hostname !== "github.com") {
    return { cloneUrl: normalizeRemoteUrl(httpsUrl), ref: "", subdir: "" };
  }

  const parts = url.pathname.replace(/^\/+|\/+$/g, "").split("/");
  if (parts.length < 2) throw new Error("Use a GitHub path like owner/repo or github.com/owner/repo/tree/main/path.");
  const [owner, rawRepo, marker, maybeRef, ...subdirParts] = parts;
  const repo = rawRepo.replace(/\.git$/, "");
  const cloneUrl = `https://github.com/${owner}/${repo}.git`;
  if (marker === "tree" || marker === "blob") {
    if (!maybeRef) throw new Error("GitHub tree URL is missing a branch or tag.");
    return { cloneUrl, ref: decodeURIComponent(maybeRef), subdir: subdirParts.map(decodeURIComponent).join("/") };
  }
  if (parts.length > 2) {
    return { cloneUrl, ref: "", subdir: parts.slice(2).map(decodeURIComponent).join("/") };
  }
  return { cloneUrl, ref: "", subdir: "" };
}

export function remoteProjectRef(cloneUrl: string, branch: string, subdir: string): string {
  const base = remoteRef(cloneUrl);
  return subdir ? `${base}/tree/${branch}/${subdir}` : base;
}

export async function sourceProjectRoot(checkoutRoot: string, subdir: string): Promise<string> {
  if (!subdir) return checkoutRoot;
  const directRoot = path.join(checkoutRoot, subdir);
  return path.basename(directRoot) === "skills" && await pathExists(directRoot) ? path.dirname(directRoot) : directRoot;
}

export function repoName(remoteUrl: string): string {
  const withoutGit = remoteUrl.replace(/\.git$/, "");
  return withoutGit.split(/[/:]/).filter(Boolean).pop()?.replace(/[^\w.-]/g, "-") || "source";
}

function projectRootSubdir(baseSubdir: string, sourceDir: string): string {
  const sourceParts = cleanRelativePath(sourceDir).split("/").filter(Boolean);
  const baseParts = cleanRelativePath(baseSubdir).split("/").filter(Boolean);
  if (sourceParts.length === 0 || baseParts.length < sourceParts.length) return baseSubdir;
  const tail = baseParts.slice(-sourceParts.length);
  if (tail.every((part, index) => part === sourceParts[index])) {
    return baseParts.slice(0, -sourceParts.length).join("/");
  }
  return baseSubdir;
}

function cleanRelativePath(value: string): string {
  return value
    .trim()
    .replace(/\\/g, "/")
    .split("/")
    .filter((part) => part && part !== "." && part !== "..")
    .join("/");
}

function remoteRef(remoteUrl: string): string {
  return remoteUrl.replace(/^https?:\/\//, "").replace(/\.git$/, "");
}

function appendGit(remoteUrl: string): string {
  return remoteUrl.endsWith(".git") ? remoteUrl : `${remoteUrl}.git`;
}
