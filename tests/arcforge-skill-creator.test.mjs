import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

test("arcforge skill creator emits post maintenance handoff", async () => {
  const skill = await readFile(new URL("../skills/arcforge-skill-creator/SKILL.md", import.meta.url), "utf8");
  const handoff = await readFile(
    new URL("../skills/arcforge-skill-creator/references/post-maintenance-handoff.md", import.meta.url),
    "utf8",
  );
  const authoring = await readFile(
    new URL("../skills/arcforge-skill-creator/references/skill-authoring-rules.md", import.meta.url),
    "utf8",
  );
  const checklist = await readFile(
    new URL("../skills/arcforge-skill-creator/references/validation-checklist.md", import.meta.url),
    "utf8",
  );
  const agentYaml = await readFile(new URL("../skills/arcforge-skill-creator/agents/openai.yaml", import.meta.url), "utf8");

  for (const content of [skill, handoff, authoring, checklist, agentYaml]) {
    assert.match(content, /post_maintenance_handoff/);
    assert.match(content, /local_experiment_only/);
    assert.match(content, /verify_with_skill_first/);
    assert.match(content, /sync_to_maintenance_source/);
    assert.match(content, /verify_then_sync/);
  }

  assert.match(skill, /维护后交接判断/);
  assert.match(skill, /references\/post-maintenance-handoff\.md/);
  assert.match(handoff, /工作副本存在也不等于已经同步回维护源/);
  assert.match(handoff, /ArcForge 的治理目标是 pre-publish 和 team-governance/);
  assert.match(authoring, /不要额外复制到业务项目/);
  assert.match(checklist, /没有把工作副本存在写成已同步回源/);
  assert.match(agentYaml, /需要正式化、审计、merge plan、drift、apply、profile、publish 或 share/);
});
