# 交互关系

## 页面依赖

- home/ 提供最近项目、本地项目和远程项目入口，是项目上下文的起点。
- overview/ 依赖 home/ 打开的项目快照，展示健康摘要和所有项目页面入口。
- skills/ 依赖当前项目快照、文件系统权限和可选目标 Skill 项目，负责技能文件浏览、筛选、编辑、保存和 Skill 归并。
- profiles/ 依赖当前项目技能列表，负责定义可被应用或共享的技能集合。
- destinations/ 依赖 skills/ 的来源清单与应用关系、profiles/ 的配置组，以及所选 Agent、项目目录和调用方提供的项目适用性 assessment，负责 availability-aware 计划、同名 catalog 候选聚合与版本/冲突决策、用户显式来源选择与 override、旧 sourceKey 目录 cleanup、direct 目标应用与漂移检查。
- share/ 依赖当前项目、skills/ 的 Skill 范围、profiles/ 的范围定义和 audit/ 的事实结果，负责共享事实计划、可选 Agent readiness assessment 与 Git 交付。
- audit/ 依赖当前项目快照和技能文件内容，负责审计发现、定位修复和重新扫描。

## 导航关系

- home/ 打开项目后进入 overview/。
- overview/ 可进入 skills/、profiles/、destinations/、share/ 和 audit/。
- audit/ 的 Fix in Skills 入口携带文件路径和行号进入 skills/。
- skills/ 保存后可触发 audit/ 重新扫描，也可返回 overview/ 查看健康摘要。
- skills/ 归并成功后进入 destinations/ 查看技能来源项目已成为应用目标。
- profiles/ 保存后可进入 destinations/ 查看影响目标。
- destinations/ 漂移修复后可返回 skills/ 或 profiles/ 检查来源和配置组。
- share/ 的阻断项可跳转 audit/、skills/ 或 profiles/ 修复。

## 投影关系

- 每个页面目录均包含 interaction.md 作为交互策略源，并由 default.html 投影关键状态。
- default.html 保持统一结构：details 状态块、state-description、wireframe-canvas、device-frame、component-list 和 interactions。
- wireframe-style.css 是全目录唯一线框样式，所有页面线框只引用该文件。

## 恢复路径

- home/ 下载或扫描失败时保留项目记录、远程地址和错误原因。
- overview/ 扫描失败时保留项目身份，并允许重新扫描或返回 home/。
- skills/ 保存失败时保留编辑内容，切换文件前处理未保存修改。
- skills/ 归并失败时保留目标 Skill 项目、技能选择、配置组和目标目录。
- profiles/ 保存或删除失败时保留配置组草稿和影响摘要。
- destinations/ 应用失败时保留来源 Skill 项目、目标组合、配置组、可用性计划、catalog 来源选择、assessment、用户 override、cleanup 和关系保存选择；catalog 冲突未解决时 Agent/CLI/Desktop 均不加载该 skill；漂移检查失败时保留上次成功结果。
- share/ 执行失败时保留共享范围、远端、提交信息、Agent assessment 和执行日志。
- audit/ 重新扫描失败时保留旧发现，用户仍可定位和修复已有问题。
