import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { test } from "node:test";

const require = createRequire(import.meta.url);
const ts = require("typescript");

test("frontmatter parser accepts CRLF skill markdown", async () => {
  const source = await readFile(new URL("../src/core/frontmatter.ts", import.meta.url), "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022
    }
  });
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(output.outputText).toString("base64")}`;
  const { parseFrontmatter } = await import(moduleUrl);

  const parsed = parseFrontmatter("---\r\nname: writing-skills\r\ndescription: Use when editing skills\r\n---\r\n\r\n# Writing Skills\r\n");

  assert.equal(parsed.frontmatter.name, "writing-skills");
  assert.equal(parsed.frontmatter.description, "Use when editing skills");
  assert.equal(parsed.body.trim(), "# Writing Skills");
});
