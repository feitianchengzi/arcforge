import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

test("arcforge install skill defines source install boundaries", async () => {
  const skill = await readFile(new URL("../skills/install-arcforge/SKILL.md", import.meta.url), "utf8");
  const agentYaml = await readFile(new URL("../skills/install-arcforge/agents/openai.yaml", import.meta.url), "utf8");
  const script = await readFile(new URL("../skills/install-arcforge/scripts/install-from-repo.mjs", import.meta.url), "utf8");
  const readme = await readFile(new URL("../README.md", import.meta.url), "utf8");
  const enReadme = await readFile(new URL("../docs/en/README.md", import.meta.url), "utf8");
  const zhReadme = await readFile(new URL("../docs/zh-CN/README.md", import.meta.url), "utf8");
  const arcforgeDesktopRouting = await readFile(new URL("../skills/arcforge/references/desktop-routing.md", import.meta.url), "utf8");
  const arcforgeCliOrchestration = await readFile(new URL("../skills/arcforge/references/cli-orchestration.md", import.meta.url), "utf8");
  const cliInstall = await readFile(new URL("../src/core/cli-install.ts", import.meta.url), "utf8");

  assert.match(skill, /name: install-arcforge/);
  assert.match(skill, /# Install ArcForge/);
  assert.match(skill, /## Critical Gate/);
  assert.match(skill, /## Default Install/);
  assert.match(skill, /## Recommended Stage/);
  assert.match(skill, /## Temporary Validation/);
  assert.match(skill, /## Safety/);
  assert.match(skill, /## Output/);
  assert.match(skill, /arcforge-skill-first/);
  assert.match(skill, /arcforge-skill-creator/);
  assert.match(skill, /当前 agent 用户级 skills/);
  assert.match(skill, /arcforge-desktop/);
  assert.match(skill, /--desktop install/);
  assert.match(skill, /--desktop package/);
  assert.match(skill, /--desktop skip/);
  assert.match(skill, /--update-path/);
  assert.match(skill, /--home/);
  assert.match(skill, /--shim-dir/);
  assert.match(skill, /--dry-run/);
  assert.match(skill, /--verify/);
  assert.match(skill, /--npm-cache/);
  assert.match(skill, /env PATH="\/private\/tmp\/install-arcforge-home\/\.local\/bin:\$PATH"/);
  assert.match(skill, /临时 shim 目录排在 PATH 最前/);
  assert.match(skill, /--recommended-skills/);
  assert.match(skill, /https:\/\/github\.com\/feitianchengzi\/arckit/);
  assert.match(skill, /https:\/\/github\.com\/feitianchengzi\/arckit-code/);
  assert.match(skill, /AI Agent Skills 中心/);
  assert.match(skill, /协作生命周期/);
  assert.match(skill, /不维护具体技术栈 coding workflow/);
  assert.match(skill, /具体技术栈 coding skills 仓库/);
  assert.match(skill, /SwiftUI\/Apple 客户端默认架构/);
  assert.match(skill, /反馈平台接入流程/);
  assert.match(skill, /仍在孵化中的共享 skill 项目/);
  assert.match(skill, /类似 skill 项目/);
  assert.match(skill, /不想增加 agent 触发面/);
  assert.match(skill, /--recommended-mode/);
  assert.match(skill, /quick/);
  assert.match(skill, /governed/);
  assert.match(skill, /pending_install_mode_choice/);
  assert.match(skill, /pending_quick_skill_choice/);
  assert.match(skill, /pending_governance_endpoints/);
  assert.match(skill, /--recommended-skills all/);
  assert.match(skill, /--recommended-skills skip/);
  assert.match(skill, /BEGIN_AGENT_FINAL_RESPONSE/);
  assert.match(skill, /等待模式选择/);
  assert.match(skill, /不能把“未安装”作为最终结论/);
  assert.match(skill, /drift/);
  assert.match(skill, /apply --save/);
  assert.match(skill, /--skip-npm-install/);
  assert.match(skill, /不得把 ArcForge 描述成 marketplace/);
  assert.match(skill, /public registry/);
  assert.match(skill, /agent runtime/);
  assert.match(skill, /持久用户级 bin 目录/);
  assert.match(skill, /agent 注入的临时 PATH/);
  assert.match(skill, /PATH shadow/);
  assert.match(skill, /不要运行 Git push/);
  assert.match(agentYaml, /\$install-arcforge/);
  assert.match(agentYaml, /display_name: "Install ArcForge"/);
  assert.doesNotMatch(agentYaml, /display_name: ".*[\u4e00-\u9fff].*"/);
  assert.match(agentYaml, /--desktop install/);
  assert.match(agentYaml, /不要默认加 `--update-path`/);
  assert.match(agentYaml, /安装和验证规则以 `SKILL\.md` 为准/);
  assert.match(agentYaml, /BEGIN_AGENT_FINAL_RESPONSE/);
  assert.match(agentYaml, /Recommended skill stage:\*/);

  assert.match(script, /skills\/arcforge-skill-first\/SKILL\.md/);
  assert.match(script, /skills\/arcforge-skill-creator\/SKILL\.md/);
  assert.match(script, /installedSkillNames = \["arcforge", "arcforge-skill-first", "arcforge-skill-creator"\]/);
  assert.match(script, /recommendedSkillProjects/);
  assert.match(script, /summaryZh/);
  assert.match(script, /parseRecommendedMode/);
  assert.match(script, /hasHelpFlag/);
  assert.match(script, /printHelp/);
  assert.match(script, /Print this help without installing/);
  assert.match(script, /Recommended Skill projects/);
  assert.match(script, /parseRecommendedSkillSelection/);
  assert.match(script, /--recommended-mode value/);
  assert.match(script, /--recommended-skills value/);
  assert.match(script, /Pass --recommended-mode quick or --recommended-mode governed when using --recommended-skills/);
  assert.match(script, /https:\/\/github\.com\/feitianchengzi\/arckit/);
  assert.match(script, /https:\/\/github\.com\/feitianchengzi\/arckit-code/);
  assert.match(script, /AI-agent-assisted software development skill center/);
  assert.match(script, /incubating shared/);
  assert.match(script, /technology-stack-specific coding skill project/);
  assert.match(script, /SwiftUI\/Apple client architecture/);
  assert.match(script, /feedback platform integration/);
  assert.match(script, /installRecommendedSkillProjects/);
  assert.match(script, /printRecommendedModePrompt/);
  assert.match(script, /printRecommendedQuickSkillPrompt/);
  assert.match(script, /printRecommendedGovernancePrompt/);
  assert.match(script, /printAgentActionRequired/);
  assert.match(script, /BEGIN_AGENT_FINAL_RESPONSE/);
  assert.match(script, /status: "recommended install mode choice pending"/);
  assert.match(script, /status: "recommended quick skill choice pending"/);
  assert.match(script, /status: "recommended governed install pending"/);
  assert.match(script, /stage: "pending_install_mode_choice"/);
  assert.match(script, /stage: "pending_quick_skill_choice"/);
  assert.match(script, /stage: "pending_governance_endpoints"/);
  assert.match(script, /console\.log\(`Recommended skill stage: \$\{options\.stage\}`\)/);
  assert.match(script, /你希望使用哪种模式/);
  assert.match(script, /推荐 Skill 项目/);
  assert.match(script, /仍在孵化中的共享 skill 项目/);
  assert.match(script, /建议先跳过/);
  assert.match(script, /理解 ArcForge 能做什么/);
  assert.match(script, /关系记录归属 root/);
  assert.doesNotMatch(script, /Ask this question in the final response/);
  assert.doesNotMatch(script, /Last agent-facing action/);
  assert.match(script, /"drift"/);
  assert.match(script, /"apply"/);
  assert.match(script, /"--confirm"/);
  assert.match(script, /"build:cli"/);
  assert.match(script, /"run", "build"/);
  assert.match(script, /"run", "package"/);
  assert.match(script, /installDesktopLauncher/);
  assert.match(script, /verifyInstall/);
  assert.match(script, /printVerifySummary/);
  assert.match(script, /npmCacheDir/);
  assert.match(script, /env\.npm_config_cache/);
  assert.match(script, /env\.HOME = installHome/);
  assert.match(script, /Electron launcher exists/);
  assert.match(script, /arcforge-desktop/);
  assert.match(script, /Desktop launcher/);
  assert.match(script, /"\.codex", "skills", skillName/);
  assert.match(script, /installHome/);
  assert.match(script, /explicitShimDir/);
  assert.match(script, /dryRun/);
  assert.match(script, /handleFatalError/);
  assert.match(script, /Stage: \$\{currentStage\}/);
  assert.match(script, /path\.join\(installHome/);
  assert.match(script, /updatePersistentPath/);
  assert.match(script, /repairPathCommandShadows/);
  assert.match(script, /addTransientShadowCheck/);
  assert.match(script, /firstDurableCommandPath/);
  assert.match(script, /first non-transient arcforge command resolves to this install/);
  assert.match(script, /first non-transient arcforge command runs doctor/);
  assert.match(script, /commandExitsSuccessfully/);
  assert.match(script, /first non-transient arcforge-desktop command resolves to this install/);
  assert.match(script, /Current agent shell may still resolve this first/);
  assert.match(script, /Cannot repair PATH shadowing command/);
  assert.match(script, /isTransientAgentShimDir/);
  assert.match(script, /codex-path/);
  assert.match(script, /\.local", "bin"/);
  assert.match(script, /optional: true/);
  assert.match(script, /Desktop command directory on PATH/);
  assert.doesNotMatch(script, /git push|gh pr|release upload/);
  assert.match(cliInstall, /isTransientAgentShimDir/);
  assert.match(cliInstall, /codex-path/);
  assert.match(cliInstall, /\.local", "bin"/);

  assert.match(readme, /从当前仓库安装 ArcForge/);
  assert.match(readme, /arcforge-skill-first/);
  assert.match(readme, /arcforge-skill-creator/);
  assert.match(readme, /arckit-code/);
  assert.match(readme, /AI Agent Skills 中心/);
  assert.match(readme, /具体技术栈 coding skills 仓库/);
  assert.match(readme, /SwiftUI\/Apple 客户端默认架构/);
  assert.match(readme, /两个都装、只装其中一个或都不装/);
  assert.match(readme, /快速安装模式/);
  assert.match(readme, /严格治理模式/);
  assert.match(readme, /飞天橙子内部使用者和开源使用者走同一个 GitHub-first 安装路径/);
  assert.match(readme, /仍在孵化中的共享 skill 项目/);
  assert.match(readme, /可以先跳过推荐安装/);
  assert.match(readme, /\[English\]\(docs\/en\/README\.md\)/);
  assert.match(readme, /skills\/install-arcforge/);
  assert.match(readme, /arcforge-desktop/);
  assert.match(enReadme, /Install ArcForge From This Repository/);
  assert.match(enReadme, /arcforge-skill-first/);
  assert.match(enReadme, /arcforge-skill-creator/);
  assert.match(enReadme, /arckit-code/);
  assert.match(enReadme, /AI Agent Skills center/);
  assert.match(enReadme, /Technology-stack-specific coding workflows live elsewhere/);
  assert.match(enReadme, /SwiftUI\/Apple client architecture/);
  assert.match(enReadme, /install both, install only one, or skip both/);
  assert.match(enReadme, /Quick install mode/);
  assert.match(enReadme, /Governed mode/);
  assert.match(enReadme, /same GitHub-first installation path/);
  assert.match(enReadme, /incubating shared Skill projects/);
  assert.match(enReadme, /should skip the optional install/);
  assert.match(enReadme, /\[简体中文\]\(\.\.\/\.\.\/README\.md\)/);
  assert.match(zhReadme, /从当前仓库安装 ArcForge/);
  assert.match(zhReadme, /arcforge-skill-first/);
  assert.match(zhReadme, /arcforge-skill-creator/);
  assert.match(zhReadme, /arckit-code/);
  assert.match(zhReadme, /AI Agent Skills 中心/);
  assert.match(zhReadme, /具体技术栈 coding skills 仓库/);
  assert.match(zhReadme, /两个都装、只装其中一个或都不装/);
  assert.match(zhReadme, /快速安装模式/);
  assert.match(zhReadme, /严格治理模式/);
  assert.match(zhReadme, /仍在孵化中的共享 skill 项目/);
  assert.match(zhReadme, /可以先跳过推荐安装/);
  assert.match(zhReadme, /\[English\]\(\.\.\/en\/README\.md\)/);
  assert.match(zhReadme, /skills\/install-arcforge/);
  assert.match(zhReadme, /arcforge-desktop/);

  assert.match(arcforgeDesktopRouting, /arcforge-desktop/);
  assert.match(arcforgeDesktopRouting, /--root \/path\/to\/project --page destinations/);
  assert.match(arcforgeDesktopRouting, /页面级 context open/);
  assert.match(arcforgeCliOrchestration, /arcforge-desktop/);
});

test("arcforge install help guides recommended arckit choices", () => {
  const result = spawnSync(
    process.execPath,
    ["skills/install-arcforge/scripts/install-from-repo.mjs", "--help"],
    {
      cwd: new URL("..", import.meta.url),
      encoding: "utf8"
    }
  );

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /--recommended-mode <mode>/);
  assert.match(result.stdout, /Default: prompt\./);
  assert.match(result.stdout, /--recommended-mode quick/);
  assert.match(result.stdout, /--recommended-mode governed/);
  assert.match(result.stdout, /--recommended-skills all/);
  assert.match(result.stdout, /--recommended-skills arckit/);
  assert.match(result.stdout, /--recommended-skills arckit-code/);
  assert.match(result.stdout, /--recommended-skills skip/);
  assert.match(result.stdout, /https:\/\/github\.com\/feitianchengzi\/arckit/);
  assert.match(result.stdout, /https:\/\/github\.com\/feitianchengzi\/arckit-code/);
  assert.match(result.stdout, /AI-agent-assisted software development skill center/);
  assert.match(result.stdout, /technology-stack-specific coding skill project/);
});

test("arcforge install rejects old implicit recommended skill commands", () => {
  const result = spawnSync(
    process.execPath,
    ["skills/install-arcforge/scripts/install-from-repo.mjs", "--recommended-skills", "all", "--dry-run"],
    {
      cwd: new URL("..", import.meta.url),
      encoding: "utf8"
    }
  );

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Pass --recommended-mode quick or --recommended-mode governed/);
});
