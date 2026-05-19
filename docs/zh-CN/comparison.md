# 对比说明

SkillOps 不是 registry、marketplace，也不是 agent runtime。

| 类别 | 示例 | SkillOps 的立场 |
|---|---|---|
| 公开 skill 目录 | skills.sh、Skillery | 把它们作为分发渠道，而不是 GitHub source 的替代品。 |
| 多 agent 同步工具 | skillshare、agpack | 与它们集成，而不是重新实现所有目标适配器。 |
| 桌面 skill 管理器 | SkillsGate、Anvil、YouSkill | 只在工作流治理上竞争：审计、profiles、drift、发布计划。 |
| 私有 registry | SkillHub、SkillReg | MVP 阶段避免托管 registry 复杂度。对小团队来说，GitHub 仓库权限已经足够。 |

核心产品判断是：个人和小团队的 skills 需要生命周期工具，而不只是安装工具。
