import process from "node:process";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { EnvironmentStatus, ToolStatus } from "../shared/types.js";
import { cliInstallStatus, type CliShimOptions } from "./cli-install.js";

const execFileAsync = promisify(execFile);

export async function getEnvironmentStatus(options?: CliShimOptions): Promise<EnvironmentStatus> {
  return {
    platform: process.platform,
    arch: process.arch,
    git: await toolStatus("git", ["--version"]),
    cli: options ? await cliInstallStatus(options) : undefined,
    tools: {
      skillshare: await toolStatus("skillshare", ["--version"]),
      npx: await toolStatus("npx", ["--version"]),
      clawhub: await toolStatus("clawhub", ["--version"])
    }
  };
}

async function toolStatus(command: string, args: string[]): Promise<ToolStatus> {
  try {
    const { stdout, stderr } = await execFileAsync(command, args);
    return {
      available: true,
      version: (stdout || stderr).trim().split(/\r?\n/)[0] || command
    };
  } catch (error) {
    return {
      available: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
