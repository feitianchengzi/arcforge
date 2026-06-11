import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const pkg = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const appManifest = JSON.parse(await readFile(new URL("../app.manifest.json", import.meta.url), "utf8"));

test("package exposes desktop and cli entrypoints", () => {
  assert.equal(pkg.main, "dist/electron/main.js");
  assert.equal(pkg.bin.arcforge, "dist/cli/index.js");
});

test("project is positioned as github-first arcforge", () => {
  assert.match(pkg.description, /GitHub-first ArcForge/);
});

test("audit reports disclose rule-based coverage limits", async () => {
  const auditCore = await readFile(new URL("../src/core/audit.ts", import.meta.url), "utf8");
  const dashboard = await readFile(new URL("../src/ui/views/dashboard.tsx", import.meta.url), "utf8");
  const links = await readFile(new URL("../src/shared/links.ts", import.meta.url), "utf8");
  const main = await readFile(new URL("../src/electron/main.ts", import.meta.url), "utf8");
  const shell = await readFile(new URL("../src/ui/components/shell.tsx", import.meta.url), "utf8");

  assert.match(auditCore, /AUDIT_DISCLAIMER/);
  assert.match(auditCore, /local rule-based scan/);
  assert.match(auditCore, /feedbackUrl/);
  assert.match(auditCore, /secret\.anthropic/);
  assert.match(auditCore, /secret\.aws_access_key/);
  assert.match(auditCore, /risk\.destructive_shell/);
  assert.match(auditCore, /risk\.remote_script/);
  assert.match(links, /github\.com\/feitianchengzi\/arcforge\/issues\/new/);
  assert.match(main, /system:openExternal/);
  assert.match(dashboard, /auditTransparencyTitle/);
  assert.match(dashboard, /auditOpenIssue/);
  assert.match(shell, /feedbackHelp/);
});

test("installer metadata is managed from the app manifest", () => {
  assert.equal(appManifest.packageName, pkg.name);
  assert.equal(appManifest.version, pkg.version);
  assert.equal(appManifest.description, pkg.description);
  assert.equal(appManifest.productName, "ArcForge");
  assert.match(appManifest.appId, /^com\./);
});

test("cli-first share command is exposed to desktop and terminal entrypoints", async () => {
  const commands = await readFile(new URL("../src/commands/index.ts", import.meta.url), "utf8");
  const cli = await readFile(new URL("../src/cli/index.ts", import.meta.url), "utf8");
  const electronMain = await readFile(new URL("../src/electron/main.ts", import.meta.url), "utf8");
  const preload = await readFile(new URL("../src/electron/preload.cts", import.meta.url), "utf8");

  assert.match(commands, /arcforge share plan --root \. --repo/);
  assert.match(commands, /arcforge source status --root \./);
  assert.match(commands, /ArcForge CLI - source/);
  assert.match(commands, /command === "source"/);
  assert.match(commands, /ArcForge CLI - merge/);
  assert.match(commands, /command === "merge"/);
  assert.match(commands, /ArcForge CLI - import/);
  assert.match(commands, /command === "import"/);
  assert.match(commands, /runImportCommand/);
  assert.match(commands, /createImportSkillsPlan/);
  assert.match(commands, /importSkillsIntoProject/);
  assert.match(commands, /--target-dir <dir>/);
  assert.match(commands, /--target-profile <name>/);
  assert.match(commands, /The status action may fetch upstream refs/);
  assert.match(commands, /arcforge apply \[--root <dir>\] \[--from <path-or-url>\] \[--profile <name>\] \[--skills <a,b>\] --target <dir> \[--save\] --confirm/);
  assert.match(commands, /Apply writes the target directory and requires --confirm/);
  assert.match(commands, /arcforge drift \[--root <dir>\] \[--from <path-or-url>\] \[--profile <name>\] \[--skills <a,b>\] --target <dir>/);
  assert.match(commands, /--delivery <target-pr\|fork-pr\|direct-push\|local-branch>/);
  assert.match(commands, /--same-repository-remote <name>/);
  assert.match(commands, /ArcForge CLI - applied/);
  assert.match(commands, /command === "applied"/);
  assert.match(commands, /ArcForge CLI - apply/);
  assert.doesNotMatch(commands, /command === "init"/);
  assert.doesNotMatch(commands, /command === "sources"/);
  assert.doesNotMatch(commands, /ArcForge CLI - apply-profile/);
  assert.match(commands, /Local-first, GitHub-first governance/);
  assert.match(commands, /arcforge <command> --help/);
  assert.match(commands, /ArcForge CLI - share/);
  assert.match(commands, /--same-repository/);
  assert.match(commands, /command === "share"/);
  assert.match(commands, /command === "doctor"/);
  assert.match(commands, /requiresConfirm/);
  assert.match(cli, /runArcForgeCommand/);
  assert.match(electronMain, /"--cli"/);
  assert.match(electronMain, /installCliShim/);
  assert.match(electronMain, /system:installCli/);
  assert.match(electronMain, /share:drift/);
  assert.doesNotMatch(electronMain, /workspace:init/);
  assert.match(preload, /installCli/);
  assert.match(preload, /shareDriftReport/);
  assert.doesNotMatch(preload, /initWorkspace/);
});

test("cli can scan project-local agent skill directories from the project root", async () => {
  const commands = await readFile(new URL("../src/commands/index.ts", import.meta.url), "utf8");
  const workspace = await readFile(new URL("../src/core/workspace.ts", import.meta.url), "utf8");
  const sources = await readFile(new URL("../src/core/sources.ts", import.meta.url), "utf8");

  assert.match(commands, /--source-dir <dir>/);
  assert.match(commands, /scanWorkspace\(arg\(args, "--root"\) \?\? runtime\.cwd, \{ sourceDir: arg\(args, "--source-dir"\) \}\)/);
  assert.match(commands, /sourceDir: arg\(args, "--source-dir"\)/);
  assert.match(workspace, /ScanWorkspaceOptions/);
  assert.match(workspace, /--source-dir must be a relative path inside the workspace root/);
  assert.match(sources, /scanWorkspace\(root, \{ sourceDir: options\.sourceDir \}\)/);
  assert.match(sources, /if \(names\.includes\("\*"\)\) return \["\*"\]/);
});

test("workspace config is stored outside source checkouts", async () => {
  const configCore = await readFile(new URL("../src/core/config.ts", import.meta.url), "utf8");
  const projectStore = await readFile(new URL("../src/core/project-store.ts", import.meta.url), "utf8");
  const commands = await readFile(new URL("../src/commands/index.ts", import.meta.url), "utf8");

  assert.match(configCore, /saveLocalProjectConfig/);
  assert.match(configCore, /migrateRepositoryConfig/);
  assert.match(configCore, /fs.unlink/);
  assert.match(projectStore, /~\/.arcforge|"projects"/);
  assert.match(projectStore, /ARCFORGE_HOME/);
  assert.match(projectStore, /canonicalKey/);
  assert.match(configCore, /arcforge.config.json/);
  assert.match(commands, /ArcForge CLI - source/);
  assert.doesNotMatch(commands, /Create arcforge.config.json in a workspace/);
});

test("desktop project list is backed by local project state", async () => {
  const projectStore = await readFile(new URL("../src/core/project-store.ts", import.meta.url), "utf8");
  const electronMain = await readFile(new URL("../src/electron/main.ts", import.meta.url), "utf8");
  const mainUi = await readFile(new URL("../src/ui/main.tsx", import.meta.url), "utf8");
  const preload = await readFile(new URL("../src/electron/preload.cts", import.meta.url), "utf8");
  const installer = await readFile(new URL("../skills/arcforge-install/scripts/install-from-repo.mjs", import.meta.url), "utf8");

  assert.match(projectStore, /listLocalProjectStates/);
  assert.match(projectStore, /saveLocalProjectListMetadata/);
  assert.match(projectStore, /saveLocalProjectListOrder/);
  assert.match(projectStore, /hideLocalProjectInList/);
  assert.match(projectStore, /dedupeProjectStates/);
  assert.match(projectStore, /removeDuplicateProjectStateFiles/);
  assert.match(projectStore, /canonicalProjectRootKey/);
  assert.match(electronMain, /projectList:remember/);
  assert.match(electronMain, /projectList:reorder/);
  assert.match(electronMain, /projectList:remove/);
  assert.match(electronMain, /recentWorkspacesFromProjectStore/);
  assert.match(electronMain, /persistRecentWorkspaceList/);
  assert.match(electronMain, /desktopContextFromArgs/);
  assert.match(electronMain, /seedDesktopContext/);
  assert.match(electronMain, /readArg\(args, "--root"\)/);
  assert.match(electronMain, /readArg\(args, "--page"\)/);
  assert.match(electronMain, /activeWorkspace: context\.root/);
  assert.match(electronMain, /tab: context\.page/);
  assert.match(preload, /rememberProjectWorkspace/);
  assert.match(preload, /reorderProjectWorkspaces/);
  assert.match(preload, /removeProjectWorkspace/);
  assert.match(mainUi, /rememberProjectWorkspace/);
  assert.match(mainUi, /reorderProjectWorkspaces/);
  assert.match(mainUi, /removeProjectWorkspace/);
  assert.match(installer, /arcforge-desktop/);
  assert.match(installer, /"\$@"/);
});

test("share delivery failures keep manual recovery guidance", async () => {
  const shareCore = await readFile(new URL("../src/core/share.ts", import.meta.url), "utf8");

  assert.match(shareCore, /Share delivery failed during/);
  assert.match(shareCore, /manual commands below/);
  assert.match(shareCore, /errorStage/);
  assert.match(shareCore, /manualCommands/);
  assert.match(shareCore, /shareSameRepositoryProject/);
  assert.match(shareCore, /commitPathIfChanged/);
});

test("share drift compares targets without remote writes", async () => {
  const shareDrift = await readFile(new URL("../src/core/share-drift.ts", import.meta.url), "utf8");
  const localGit = await readFile(new URL("../src/core/local-git.ts", import.meta.url), "utf8");

  assert.match(shareDrift, /shareDriftReport/);
  assert.match(shareDrift, /compareDirectory/);
  assert.match(shareDrift, /normalizeGitRelativePath/);
  assert.match(localGit, /fs\.realpath/);
  assert.match(localGit, /Workspace path is outside the Git repository/);
  assert.match(shareDrift, /status", "--porcelain", "--untracked-files=all"/);
  assert.doesNotMatch(shareDrift, /pushBranch/);
  assert.doesNotMatch(shareDrift, /createPullRequest/);
});

test("share sync does not create project-local bookkeeping files", async () => {
  const shareCore = await readFile(new URL("../src/core/share.ts", import.meta.url), "utf8");
  const shareSync = await readFile(new URL("../src/core/share-sync.ts", import.meta.url), "utf8");
  const shareDrift = await readFile(new URL("../src/core/share-drift.ts", import.meta.url), "utf8");

  assert.doesNotMatch(shareCore, /SHARE_MANIFEST_FILE|\.arcforge-share-manifest\.json/);
  assert.doesNotMatch(shareSync, /SHARE_MANIFEST_FILE|\.arcforge-share-manifest\.json|readShareManifest|writeShareManifest|staleShareManifestEntries/);
  assert.doesNotMatch(shareDrift, /readShareManifest|staleShareManifestEntries|deletedEntryFiles/);
});

test("profile deletion is persisted instead of draft-only", async () => {
  const profilesView = await readFile(new URL("../src/ui/views/profiles.tsx", import.meta.url), "utf8");

  assert.match(profilesView, /function deleteProfile/);
  assert.match(profilesView, /window\.confirm/);
  assert.match(profilesView, /confirmDeleteProfile/);
  assert.match(profilesView, /props\.saveProfiles/);
  assert.match(profilesView, /retargetProfileReferences/);
});

test("desktop skill merge imports source skills into the current project", async () => {
  const sourcesCore = await readFile(new URL("../src/core/sources.ts", import.meta.url), "utf8");
  const sharedTypes = await readFile(new URL("../src/shared/types.ts", import.meta.url), "utf8");
  const dashboard = await readFile(new URL("../src/ui/views/dashboard.tsx", import.meta.url), "utf8");
  const i18n = await readFile(new URL("../src/ui/i18n.ts", import.meta.url), "utf8");
  const electronMain = await readFile(new URL("../src/electron/main.ts", import.meta.url), "utf8");
  const preload = await readFile(new URL("../src/electron/preload.cts", import.meta.url), "utf8");

  assert.match(sourcesCore, /createImportSkillsPlan/);
  assert.match(sourcesCore, /importSkillsIntoProject/);
  assert.match(sharedTypes, /relationKind\?: "profileApply" \| "maintenanceImport"/);
  assert.match(sourcesCore, /"maintenanceImport"/);
  assert.match(sourcesCore, /"profileApply"/);
  assert.match(sourcesCore, /recordRelationKind/);
  assert.match(sourcesCore, /sourceProjectRoot/);
  assert.match(sourcesCore, /mergeSourceProfile\(plan\.root, plan\.targetProfile/);
  assert.match(electronMain, /import:plan/);
  assert.match(electronMain, /import:run/);
  assert.match(electronMain, /directorySelectionResult/);
  assert.match(electronMain, /path\.relative\(parent, selected\)/);
  assert.match(preload, /createImportSkillsPlan/);
  assert.match(preload, /importSkillsIntoProject/);
  assert.match(preload, /workspace:chooseDirectory", defaultPath, parentPath/);
  assert.match(dashboard, /t\.importSourceProject/);
  assert.match(dashboard, /t\.importIntoCurrentProject/);
  assert.match(dashboard, /chooseDirectory/);
  assert.match(dashboard, /selected\.relativePath/);
  assert.match(dashboard, /selected\.isInside/);
  assert.match(dashboard, /chooseWorkspace/);
  assert.match(dashboard, /createImportSkillsPlan/);
  assert.match(dashboard, /importSkillsIntoProject/);
  assert.match(i18n, /从另一个 Skill 项目把技能归并到当前项目/);
  assert.doesNotMatch(dashboard, /createMergePlan/);
  assert.doesNotMatch(dashboard, /mergeIntoProject/);
});

test("arcforge skill models source maintenance apply and share endpoints", async () => {
  const skill = await readFile(new URL("../skills/arcforge/SKILL.md", import.meta.url), "utf8");
  const agentYaml = await readFile(new URL("../skills/arcforge/agents/openai.yaml", import.meta.url), "utf8");
  const model = await readFile(new URL("../skills/arcforge/references/source-maintenance-target-model.md", import.meta.url), "utf8");
  const cli = await readFile(new URL("../skills/arcforge/references/cli-orchestration.md", import.meta.url), "utf8");
  const desktop = await readFile(new URL("../skills/arcforge/references/desktop-routing.md", import.meta.url), "utf8");
  const missing = await readFile(new URL("../skills/arcforge/references/missing-capabilities.md", import.meta.url), "utf8");

  assert.match(skill, /来源\/上游源、维护源、应用目标、共享目标/);
  assert.match(skill, /source-maintenance-target-model\.md/);
  assert.match(skill, /import plan 先于 import run/);
  assert.match(agentYaml, /四类端点/);
  assert.match(agentYaml, /关系记录/);
  assert.match(agentYaml, /Desktop Skills\/Import、Destinations 或 Share/);
  assert.match(model, /4 个端点对象、1 个关系对象、2 个选择维度/);
  assert.match(model, /共享目标不是应用目标/);
  assert.match(model, /应用目标不应该默认变成维护源/);
  assert.match(model, /关系记录/);
  assert.match(model, /场景矩阵/);
  assert.match(model, /从远程 GitHub\/Git Skill 项目导入到当前项目维护/);
  assert.match(model, /把当前项目内 skill 迁移\/正式化到团队 Skill 项目/);
  assert.match(model, /准备共享或发布/);
  assert.match(model, /不要用“默认目录”绕过这个检查/);
  assert.match(cli, /import --target-dir/);
  assert.match(cli, /共享目标/);
  assert.match(desktop, /共享目标确认场景/);
  assert.match(desktop, /Skills\/Import/);
  assert.match(desktop, /arcforge-desktop --root \/path\/to\/project --page destinations/);
  assert.match(desktop, /Destinations/);
  assert.match(desktop, /Share/);
  assert.match(missing, /四端点端到端工作流计划/);
  assert.match(missing, /workflow plan/);
  assert.match(missing, /Fine-grained Desktop Context/);
});

test("desktop drift diff uses file-level git status and tolerates unexpected directory entries", async () => {
  const shareDrift = await readFile(new URL("../src/core/share-drift.ts", import.meta.url), "utf8");
  const electronMain = await readFile(new URL("../src/electron/main.ts", import.meta.url), "utf8");

  assert.match(shareDrift, /--untracked-files=all/);
  assert.match(electronMain, /diff:openDrift/);
  assert.match(electronMain, /error\.code === "EISDIR"/);
  assert.match(electronMain, /\\[Directory\\]/);
});

test("destructive desktop actions require confirmation", async () => {
  const mainUi = await readFile(new URL("../src/ui/main.tsx", import.meta.url), "utf8");
  const destinationsView = await readFile(new URL("../src/ui/views/destinations.tsx", import.meta.url), "utf8");
  const shareView = await readFile(new URL("../src/ui/views/share.tsx", import.meta.url), "utf8");
  const i18n = await readFile(new URL("../src/ui/i18n.ts", import.meta.url), "utf8");

  assert.match(i18n, /confirmRemoveWorkspace/);
  assert.match(i18n, /confirmDeleteTargetGroup/);
  assert.match(i18n, /confirmRemoveTarget/);
  assert.match(i18n, /confirmDeleteShareTarget/);
  assert.match(mainUi, /confirmRemoveWorkspace/);
  assert.match(destinationsView, /confirmDeleteTargetGroup/);
  assert.match(destinationsView, /confirmRemoveTarget/);
  assert.match(shareView, /confirmDeleteShareTarget/);
});

test("desktop distinguishes maintenance import and profile apply relations", async () => {
  const destinationsView = await readFile(new URL("../src/ui/views/destinations.tsx", import.meta.url), "utf8");
  const i18n = await readFile(new URL("../src/ui/i18n.ts", import.meta.url), "utf8");

  assert.match(destinationsView, /appliedRelationKind\(record\.relationKind\)/);
  assert.match(destinationsView, /reapplyRelation\(record\.relationKind\)/);
  assert.match(i18n, /Maintenance import/);
  assert.match(i18n, /Profile application/);
  assert.match(i18n, /Re-import/);
  assert.match(i18n, /维护源导入/);
  assert.match(i18n, /配置组应用/);
  assert.match(i18n, /重新导入/);
});

test("release workflow publishes cli-only install assets", async () => {
  const workflow = await readFile(new URL("../.github/workflows/package.yml", import.meta.url), "utf8");
  const buildScript = await readFile(new URL("../scripts/build-cli-package.mjs", import.meta.url), "utf8");
  const pkgText = await readFile(new URL("../package.json", import.meta.url), "utf8");

  assert.match(pkgText, /"build:cli"/);
  assert.match(workflow, /CLI package/);
  assert.match(workflow, /darwin-x64 darwin-arm64 linux-x64/);
  assert.match(workflow, /arcforge-cli-\$\{target\}\.tar\.gz/);
  assert.match(workflow, /arcforge-cli-win-x64\.zip/);
  assert.match(workflow, /checksums\.txt/);
  assert.match(buildScript, /install\.sh/);
  assert.match(buildScript, /install\.ps1/);
  assert.match(buildScript, /while \[ -h "\$PRG" \]/);
  assert.match(buildScript, /command -v node/);
  assert.match(buildScript, /\[ "\$node_major" -lt "\$required_node_major" \]/);
  assert.match(buildScript, /rm -f "\$shim"/);
  assert.match(buildScript, /cat > "\$shim"/);
  assert.doesNotMatch(buildScript, /ln -sf "\$cli_dir\/bin\/arcforge" "\$bin_dir\/arcforge"/);
  assert.match(buildScript, /Get-Command node/);
  assert.match(buildScript, /\$CliEntry = Join-Path \$CliDir "dist\\\\cli\\\\index\.js"/);
  assert.match(buildScript, /Remove-Item -LiteralPath \$Shim -Force/);
});
