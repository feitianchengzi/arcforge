import path from "node:path";
import os from "node:os";
import { execFile } from "node:child_process";
import { constants as fsConstants, promises as fs } from "node:fs";
import { promisify } from "node:util";
import type { CliInstallStatus } from "../shared/types.js";
import { pathExists } from "./fs.js";

const execFileAsync = promisify(execFile);

export interface CliShimOptions {
  executablePath: string;
  appPath?: string;
  appIsPackaged?: boolean;
  pathValue?: string;
  updateShellProfile?: boolean;
}

export async function installCliShim(options: CliShimOptions): Promise<CliInstallStatus> {
  const shimDir = await cliShimDirectory(options.pathValue);
  await fs.mkdir(shimDir, { recursive: true });
  const shimPath = cliShimPath(shimDir);
  const script = cliShimScript(options);
  await fs.writeFile(shimPath, script, "utf8");
  if (process.platform !== "win32") await fs.chmod(shimPath, 0o755);
  const shellProfilePath = options.updateShellProfile && !pathInPath(shimDir, options.pathValue)
    ? await updatePersistentPath(shimDir)
    : undefined;
  const status = await cliInstallStatus({ ...options, pathValue: options.pathValue, preferredShimDir: shimDir });
  return {
    ...status,
    shellProfilePath,
    shellProfileUpdated: Boolean(shellProfilePath),
    message: shellProfilePath ? `${status.message} Added ${shimDir} to ${shellProfilePath}; open a new terminal to use arcforge.` : status.message
  };
}

export async function cliInstallStatus(options: CliShimOptions & { preferredShimDir?: string }): Promise<CliInstallStatus> {
  const shimDir = options.preferredShimDir ?? await cliShimDirectory(options.pathValue);
  const shimPath = cliShimPath(shimDir);
  const shimExists = await pathExists(shimPath);
  const shimDirInPath = pathInPath(shimDir, options.pathValue);
  return {
    available: shimExists && shimDirInPath,
    executablePath: options.executablePath,
    shimPath,
    shimDir,
    shimExists,
    shimDirInPath,
    message: statusMessage(shimExists, shimDirInPath, shimPath, shimDir)
  };
}

export async function cliShimDirectory(pathValue = process.env.PATH ?? ""): Promise<string> {
  if (process.platform === "win32") return path.join(os.homedir(), ".arcforge", "bin");
  const home = os.homedir();
  const pathEntries = pathValue.split(path.delimiter).filter(Boolean);
  for (const entry of pathEntries) {
    const resolvedEntry = path.resolve(entry);
    if (resolvedEntry !== home && !resolvedEntry.startsWith(`${home}${path.sep}`)) continue;
    try {
      await fs.access(resolvedEntry, fsConstants.W_OK);
      return resolvedEntry;
    } catch {
      continue;
    }
  }
  return path.join(home, ".local", "bin");
}

function cliShimPath(shimDir: string): string {
  return path.join(shimDir, process.platform === "win32" ? "arcforge.cmd" : "arcforge");
}

function cliShimScript(options: CliShimOptions): string {
  const devAppArg = options.appIsPackaged || !options.appPath ? "" : ` "${options.appPath}"`;
  if (process.platform === "win32") {
    return `@echo off\r\n"${options.executablePath}"${devAppArg} --cli %*\r\n`;
  }
  return `#!/bin/sh\nexec "${options.executablePath}"${devAppArg} --cli "$@"\n`;
}

function pathInPath(targetDir: string, pathValue = process.env.PATH ?? ""): boolean {
  const resolvedTarget = normalizePath(targetDir);
  return pathValue
    .split(path.delimiter)
    .filter(Boolean)
    .some((entry) => normalizePath(entry) === resolvedTarget);
}

function normalizePath(value: string): string {
  return process.platform === "win32" ? path.resolve(value).toLowerCase() : path.resolve(value);
}

function statusMessage(shimExists: boolean, shimDirInPath: boolean, shimPath: string, shimDir: string): string {
  if (shimExists && shimDirInPath) return `CLI is available as arcforge via ${shimPath}.`;
  if (shimExists) return `CLI shim exists at ${shimPath}, but ${shimDir} is not on PATH.`;
  if (shimDirInPath) return `CLI shim is missing from ${shimDir}.`;
  return `CLI shim is missing, and ${shimDir} is not on PATH.`;
}

async function updateShellProfile(shimDir: string): Promise<string | undefined> {
  const profilePath = shellProfilePath();
  const exportLine = `export PATH="${shimDir}:$PATH"`;
  const block = `\n# ArcForge CLI\n${exportLine}\n`;
  const existing = await pathExists(profilePath) ? await fs.readFile(profilePath, "utf8") : "";
  if (!existing.includes(exportLine)) {
    await fs.writeFile(profilePath, `${existing.trimEnd()}${block}`, "utf8");
  }
  return profilePath;
}

async function updatePersistentPath(shimDir: string): Promise<string | undefined> {
  if (process.platform === "win32") return updateWindowsUserPath(shimDir);
  return updateShellProfile(shimDir);
}

async function updateWindowsUserPath(shimDir: string): Promise<string> {
  const escaped = shimDir.replace(/'/g, "''");
  const command = [
    "$target = 'User'",
    "$path = [Environment]::GetEnvironmentVariable('Path', $target)",
    `$entry = '${escaped}'`,
    "$parts = @($path -split ';' | Where-Object { $_ })",
    "if ($parts -notcontains $entry) {",
    "  $next = (@($parts) + $entry) -join ';'",
    "  [Environment]::SetEnvironmentVariable('Path', $next, $target)",
    "}"
  ].join("; ");
  await execFileAsync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command]);
  return "Windows user PATH";
}

function shellProfilePath(): string {
  const shellName = path.basename(process.env.SHELL ?? "");
  if (shellName === "bash") return path.join(os.homedir(), ".bashrc");
  if (shellName === "zsh" || !shellName) return path.join(os.homedir(), ".zshrc");
  return path.join(os.homedir(), ".profile");
}
