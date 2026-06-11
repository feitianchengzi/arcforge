#!/usr/bin/env node
import process from "node:process";
import { runArcForgeCommand } from "../commands/index.js";

try {
  const result = await runArcForgeCommand(process.argv.slice(2), {
    cwd: process.cwd()
  });
  if (result.text) {
    console.log(result.text);
  } else {
    console.log(JSON.stringify(result.value, null, 2));
  }
  process.exitCode = result.exitCode;
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
