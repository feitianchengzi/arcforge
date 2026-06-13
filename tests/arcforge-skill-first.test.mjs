import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

test("arcforge skill first uses manual bridge validation only", async () => {
  const skill = await readFile(new URL("../skills/arcforge-skill-first/SKILL.md", import.meta.url), "utf8");
  const validation = await readFile(new URL("../skills/arcforge-skill-first/references/validation-execution.md", import.meta.url), "utf8");
  const checklist = await readFile(new URL("../skills/arcforge-skill-first/references/validation-checklist.md", import.meta.url), "utf8");
  const agentYaml = await readFile(new URL("../skills/arcforge-skill-first/agents/openai.yaml", import.meta.url), "utf8");

  assert.match(skill, /验证默认只使用人工桥接隔离验证/);
  assert.match(skill, /不调用任何平台工具来替代人工桥接/);
  assert.match(skill, /不要把这类工具是否可用写进验证模式判断/);
  assert.match(skill, /人工桥接是主 agent 发起和指挥的验证执行手段/);
  assert.match(skill, /awaiting_validation_transcript/);
  assert.match(skill, /不是完成状态/);
  assert.match(skill, /不能因为任务很小跳过验证发起或复测发起/);
  assert.doesNotMatch(skill, /自动隔离执行/);
  assert.doesNotMatch(skill, /sub-agent|runner|平台原生隔离/);

  assert.match(validation, /默认就是人工桥接隔离验证/);
  assert.match(validation, /不调用任何平台工具来替代人工桥接/);
  assert.match(validation, /不检查这类工具是否可用/);
  assert.match(validation, /主 agent 必须生成可复制的人工桥接执行包/);
  assert.match(validation, /交付执行包只表示进入 `awaiting_validation_transcript`/);
  assert.match(validation, /不表示验证完成/);
  assert.match(validation, /当前状态：`awaiting_validation_transcript`/);
  assert.match(validation, /直到用户回传执行记录/);
  assert.match(validation, /先保留本应发送的 executor prompt/);
  assert.doesNotMatch(validation, /自动隔离执行/);
  assert.doesNotMatch(validation, /sub-agent|runner|平台原生隔离/);

  assert.match(checklist, /没有调用任何平台工具来替代人工桥接/);
  assert.match(checklist, /没有把“当前会话不能直接调用自动代理工具”写成未验证原因/);
  assert.match(checklist, /人工桥接执行包/);
  assert.match(checklist, /awaiting_validation_transcript/);
  assert.match(checklist, /没有把目标 skill 写成验证通过、闭环完成或可进入 ArcForge 治理交接/);
  assert.match(checklist, /最终回复以请求用户执行桥接并回传结果收尾/);
  assert.match(checklist, /保留后续可复测的 executor prompt/);
  assert.doesNotMatch(checklist, /自动隔离执行/);
  assert.doesNotMatch(checklist, /sub-agent|runner|平台原生隔离/);

  assert.match(agentYaml, /默认只做人工桥接隔离验证/);
  assert.match(agentYaml, /不调用任何平台工具来替代人工桥接/);
  assert.match(agentYaml, /不要检查或汇报自动代理工具是否可用/);
  assert.match(agentYaml, /人工桥接是主 agent 发起和指挥的验证执行手段/);
  assert.match(agentYaml, /人工桥接执行包/);
  assert.match(agentYaml, /awaiting_validation_transcript/);
  assert.match(agentYaml, /不能把目标 skill 写成验证通过、闭环完成或可进入 ArcForge 治理交接/);
  assert.match(agentYaml, /最终回复必须以要求用户执行桥接并回传结果收尾/);
  assert.doesNotMatch(agentYaml, /自动隔离执行/);
  assert.doesNotMatch(agentYaml, /sub-agent|runner|平台原生隔离/);
});
