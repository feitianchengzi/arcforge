import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

test("arcforge skill first selects validation transport at runtime", async () => {
  const skill = await readFile(new URL("../skills/arcforge-skill-first/SKILL.md", import.meta.url), "utf8");
  const validation = await readFile(new URL("../skills/arcforge-skill-first/references/validation-execution.md", import.meta.url), "utf8");
  const checklist = await readFile(new URL("../skills/arcforge-skill-first/references/validation-checklist.md", import.meta.url), "utf8");
  const agentYaml = await readFile(new URL("../skills/arcforge-skill-first/agents/openai.yaml", import.meta.url), "utf8");

  assert.match(skill, /模拟测试/);
  assert.match(skill, /平台原生隔离 agent\/sub-agent/);
  assert.match(skill, /runner\/harness/);
  assert.match(skill, /最后才是人工桥接/);
  assert.match(skill, /不维护具体业务 skill 黑白名单/);
  assert.match(skill, /awaiting_validation_result/);
  assert.match(skill, /awaiting_validation_transcript/);

  assert.match(validation, /运行时通道选择/);
  assert.match(validation, /平台原生隔离 agent\/sub-agent/);
  assert.match(validation, /已配置 runner\/harness/);
  assert.match(validation, /人工桥接 fallback/);
  assert.match(validation, /统一验证契约/);
  assert.match(validation, /validation_binding_failed/);
  assert.match(validation, /通道选择属于验证编排，不进入真实任务 prompt/);
  assert.match(validation, /执行者只报告事实/);

  assert.match(checklist, /运行时能力依次评估/);
  assert.match(checklist, /没有业务 skill 黑白名单/);
  assert.match(checklist, /候选是否匹配由 Agent/);
  assert.match(checklist, /等待状态没有被写成验证通过/);

  assert.match(agentYaml, /原生隔离 agent\/sub-agent、已配置 runner\/harness、人工桥接 fallback/);
  assert.match(agentYaml, /统一事实报告/);
  assert.doesNotMatch(agentYaml, /唯一验证路径/);
});
