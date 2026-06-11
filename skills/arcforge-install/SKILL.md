---
name: arcforge-install
description: 当用户拉取 ArcForge 当前仓库后，想在 agent 中运行安装流程，一次性安装用户级 arcforge、arcforge-skill-first、本地 arcforge CLI，以及可真实调起的 ArcForge Desktop launcher 时使用。
---

# ArcForge 安装

这个 skill 用于从当前 ArcForge 源码仓库完成本地安装。它服务于“用户 clone 当前项目，在 agent 中打开项目，然后运行安装 skill，后续使用 `arcforge` 和 `arcforge-skill-first` 时能真实调起 CLI 和 Desktop”的场景。

安装目标：

- 把仓库里的 `skills/arcforge/` 和 `skills/arcforge-skill-first/` 安装到当前 agent 对应的用户级 skill 目录。
- 从当前源码构建 CLI，并在用户级 bin 目录写入 `arcforge` shim。
- 安装 Node 依赖，构建 Desktop，并在用户级 bin 目录写入 `arcforge-desktop` launcher。
- 需要本地安装包时再执行 Desktop package；package 不替代 `arcforge-desktop` launcher。

ArcForge 仍然是本地优先、GitHub 优先的治理工作台。不要把这个安装流程描述成 marketplace、public registry、agent runtime 或托管分发平台。

## 默认流程

1. 确认当前目录是 ArcForge 仓库根目录：存在 `package.json`、`skills/arcforge/SKILL.md`、`src/cli/index.ts`。
2. 说明将写入的真实用户级目标：
   - Codex: `~/.codex/skills/arcforge`
   - Codex Skill First: `~/.codex/skills/arcforge-skill-first`
   - CLI shim: 默认 `~/.local/bin/arcforge`，或脚本按平台选择的持久用户级 bin 目录
   - Desktop launcher: 与 CLI 同目录的 `arcforge-desktop`
   - Desktop runtime: 当前仓库的 `node_modules`、`dist`、`dist-ui`，以及可选 `release/`
3. 默认安装必须面向普通新终端可用的持久 PATH，不要把 shim 写到 Codex、Claude、Cursor 或其他 agent 注入的临时 PATH，也不要写到 `node_modules` vendor 目录；如果当前终端 PATH 里有这类目录，脚本应跳过并优先使用 `~/.local/bin`。
4. 安装必须修复可修复的 PATH shadow：如果 `command -v arcforge` 或 `command -v arcforge-desktop` 会先命中用户目录下旧的、可写的 wrapper，例如 `~/.gem/.../bin/arcforge`，脚本必须覆盖该旧 wrapper 为当前仓库的正确 shim；如果排在前面的非临时 wrapper 不可写或不在用户目录，安装必须失败并说明原因，不能只提示用户手动处理。
5. 如果用户已经明确要求安装，可以直接运行安装脚本；如果用户只是询问安装方式，先只给命令，不执行。
6. 优先执行一条命令：

```bash
node skills/arcforge-install/scripts/install-from-repo.mjs --agent codex --desktop install
```

7. 如果用户明确要求生成本地 Desktop 安装包，使用：

```bash
node skills/arcforge-install/scripts/install-from-repo.mjs --agent codex --desktop package
```

8. 如果用户目标包含“打开新的普通终端后直接执行 `arcforge` 或 `arcforge-desktop`”，先说明需要把持久用户级 bin 目录加入 shell PATH；用户明确允许修改 shell profile 以加入 PATH 时，增加 `--update-path`：

```bash
node skills/arcforge-install/scripts/install-from-repo.mjs --agent codex --desktop install --update-path
```

9. 完成后运行验证。安装脚本输出的 `CLI shim` 和 `Desktop launcher` 是当前安装的真实入口；在 Codex/Claude/Cursor agent 会话中，如果裸 `arcforge` 或 `arcforge-desktop` 被 agent 注入的临时 `codex-path` 等 wrapper 抢先命中，应把它视为当前会话 PATH 噪声，不要把它当作持久安装失败，也不要覆盖临时 wrapper。此时用脚本输出的绝对路径验证：

```bash
<CLI shim path> doctor
<CLI shim path> scan --root .
node skills/arcforge-install/scripts/install-from-repo.mjs --verify
<Desktop launcher path>
```

如果是在普通新终端中验证，可以再运行 `command -v arcforge` 和 `command -v arcforge-desktop`，确认它们命中脚本输出的 shim 或已经被脚本修复过的持久 wrapper。不能或不应该启动 GUI 时，用 `--verify` 做 headless 验证。`--verify` 不只检查文件是否存在，还必须检查 PATH 解析出来的首个非临时 `arcforge` 和 `arcforge-desktop` 是否指向当前安装，并且首个非临时 `arcforge` 必须能实际执行 `doctor` 成功。PATH warning 或旧 wrapper shadow 不能被当成成功；可修复 shadow 应由脚本自动覆盖，不可修复 shadow 必须让安装失败。只在 agent 临时 PATH 里可见不算完整安装成功。

## 预检和临时验证

需要在不写入真实用户目录的前提下验证安装流程时，使用临时 HOME 和临时 shim 目录：

```bash
node skills/arcforge-install/scripts/install-from-repo.mjs \
  --agent codex \
  --desktop skip \
  --skip-npm-install \
  --home /private/tmp/arcforge-install-home \
  --shim-dir /private/tmp/arcforge-install-home/.local/bin \
  --npm-cache /private/tmp/arcforge-install-home/.npm
```

只想检查目标路径、不执行写入或构建时，使用：

```bash
node skills/arcforge-install/scripts/install-from-repo.mjs --agent codex --desktop install --dry-run
```

需要做“实际安装验证”但又不能修改源仓库时，先把仓库复制到临时目录，再在临时副本中运行安装脚本。即使使用 `--desktop skip --skip-npm-install`，脚本仍会执行 `npm run build:cli` 并写入当前仓库的 `dist/`，这是 CLI 安装所需的构建步骤。`--desktop install` 还会执行 `npm run build` 并写入 `dist-ui/`。

`--skip-npm-install` 只用于依赖已经存在、离线验证或临时副本预检；真实首次安装不要默认跳过依赖安装。

传入 `--home` 时，脚本会让子进程使用该临时 HOME；如果没有显式传 `--npm-cache`，npm cache 默认使用 `<home>/.npm`，避免临时验证写入真实 `~/.npm`。

## Headless 验证

不能启动 GUI 的环境中，使用：

```bash
node skills/arcforge-install/scripts/install-from-repo.mjs \
  --verify \
  --home /private/tmp/arcforge-install-home \
  --shim-dir /private/tmp/arcforge-install-home/.local/bin \
  --npm-cache /private/tmp/arcforge-install-home/.npm
```

`--verify` 不执行安装，只检查文件级安装状态和命令解析状态：

- `arcforge` CLI shim 存在且可执行。
- `dist/cli/index.js` 存在。
- `arcforge-desktop` launcher 存在且可执行。
- `node_modules/electron/cli.js` 存在。
- `dist/electron/main.js` 和 `dist-ui/index.html` 存在。
- CLI/Desktop 命令目录是否在 PATH 中。
- PATH 解析出来的首个非临时 `arcforge` 是否引用当前仓库的 `dist/cli/index.js`。
- PATH 解析出来的首个非临时 `arcforge` 是否能实际执行 `doctor`。
- PATH 解析出来的首个非临时 `arcforge-desktop` 是否引用当前仓库的 `node_modules/electron/cli.js`。
- 当前 shell 的裸命令是否被 agent 注入的临时 PATH wrapper 抢先命中；这种情况只作为 warning 报告，真实判断仍以首个非临时命令和绝对 shim 验证为准。

## Agent 目录规则

默认只安装到当前 Codex 用户级目录，因为这个仓库场景是“在 agent 中打开当前项目”。不要默认写入 Claude、Cursor 或其他 agent 的用户级目录。

用户明确指定其他 agent 时，才传对应参数：

```bash
node skills/arcforge-install/scripts/install-from-repo.mjs --agent claude
node skills/arcforge-install/scripts/install-from-repo.mjs --agent cursor
node skills/arcforge-install/scripts/install-from-repo.mjs --agent codex,claude,cursor
```

支持的目标：

- `codex` -> `~/.codex/skills/arcforge`
- `codex` -> `~/.codex/skills/arcforge-skill-first`
- `claude` -> `~/.claude/skills/arcforge`
- `claude` -> `~/.claude/skills/arcforge-skill-first`
- `cursor` -> `~/.cursor/skills/arcforge`
- `cursor` -> `~/.cursor/skills/arcforge-skill-first`

## Desktop 规则

Desktop 默认安装为源码仓库 launcher，不静默复制到系统应用目录。

- `--desktop install`：安装依赖、执行 `npm run build`，并写入持久用户级 `arcforge-desktop` launcher；这是默认模式。
- `--desktop build`：只执行 `npm run build`，不写入 Desktop launcher；仅用于低层调试。
- `--desktop package`：执行 `npm run package`，在 `release/` 下生成当前平台安装包，同时仍写入 `arcforge-desktop` launcher，保证后续 agent 可调起 Desktop。
- `--desktop skip`：只安装 skill 和 CLI。

如果 `npm install`、Desktop build 或 Electron package 因网络、证书、系统权限失败，报告失败阶段和下一步命令；不要伪装成已安装。

## 安全边界

- 写入用户级 skill 目录和用户级 bin 目录属于真实安装动作，包括 `arcforge` 和 `arcforge-desktop`。用户明确说“安装”时可以执行；否则先展示目标和命令。
- 覆盖用户目录下可写的旧 `arcforge` 或 `arcforge-desktop` wrapper 也属于安装修复动作；这是为了保证用户直接输入命令时命中当前安装。不要覆盖 Codex/Claude/Cursor 注入的临时 PATH wrapper、`node_modules` vendor 目录或用户目录之外的命令。
- `--update-path` 会修改 shell profile 或 Windows User PATH，只有用户明确允许时才使用；未使用时，如果目标 bin 目录不在普通 shell PATH 中，安装只能算文件级完成，不能宣称新终端命令已可用。
- `--home`、`--shim-dir` 仅用于临时验证或非默认用户目录；真实安装默认使用当前用户目录，并应自动避开 agent 私有 PATH。
- `--npm-cache` 用于临时验证隔离 npm cache；传 `--home` 时默认使用 `<home>/.npm`。
- `--verify` 是只读检查；不能启动 GUI 时用它替代直接运行 `arcforge-desktop`。如果 `--verify` 发现 PATH shadow，不要报告成功，应重新运行安装脚本修复或报告不可修复原因。
- 不要删除仓库外的文件。脚本只替换目标 `arcforge`、`arcforge-skill-first` skill 目录、目标 `arcforge` shim、同目录的 `arcforge-desktop` launcher，以及 PATH 上排在目标 shim 前方且位于用户目录、可写、非临时的同名旧 wrapper。
- 不要运行 Git push、PR、发布 release 或远程分享。
- 安装过程中发现仓库有未提交改动时，不要 revert；只报告这不影响安装脚本复制当前工作副本。

## 输出格式

完成后用简短中文报告：

- 安装的用户级 skill 目标路径，包括 `arcforge` 和 `arcforge-skill-first`
- CLI shim 路径和是否在 PATH
- 修复过的旧 wrapper 路径；如果存在不可修复 PATH shadow，报告失败原因
- Desktop launcher 路径、状态：`install`、`build`、`package`、`skip` 或失败阶段
- 已运行的验证命令和结果
- 还需要用户手动做的动作，例如加入 PATH、安装 `release/` 下的桌面包；不要把可自动修复的 PATH shadow 留给用户手动处理
- 如果用户确认安装可用，建议下一步交给 `arcforge` workflow 做本地治理检查，优先从 `arcforge scan --root .` 和 `arcforge audit --root .` 开始；不要在安装 skill 中直接执行 apply、share、push 或远程发布。
