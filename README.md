# SkillOps

[简体中文](docs/zh-CN/README.md)

GitHub-first SkillOps workspace for indie developers and small teams.

SkillOps helps you turn personal AI agent skills into reusable team assets. It gives you a desktop workspace and a CLI for auditing, profiling, syncing, and publishing Agent Skills from a Git repository.

## Why

AI agent skills are easy to write and hard to operationalize.

Personal and small-team workflows quickly run into the same problems:

- skills live in different agent folders
- teams do not know which version is approved
- public publishing can leak internal details
- risky instructions are hard to spot in review
- project-specific skill sets drift over time

SkillOps focuses on the workflow after the first draft:

```text
write skill -> audit -> group by project profile -> share with team -> publish from GitHub -> monitor drift
```

## MVP Scope

- Electron + React + TypeScript desktop app
- Shared TypeScript core used by desktop and CLI
- Local workspace scanning for `skills/**/SKILL.md`
- Safety and quality audit for common risks
- Project profiles for applying skill sets into target folders
- Drift checks between source skills and a target project
- GitHub-first publish plan with install commands and checklist
- CLI entrypoint for CI and automation

This project intentionally starts without a hosted registry. GitHub is the source of truth.

## Quick Start

```bash
npm install
npm run dev
```

Build:

```bash
npm run build
npm start
```

Package installers:

```bash
npm run package:mac:x64
npm run package:mac:arm64
npm run package:win:x64
npm run package:linux:x64
```

Installer metadata is managed in `app.manifest.json`, including `appId`,
`packageName`, `productName`, `version`, and platform installer targets. The
packaging config is generated with:

```bash
npm run package:config
```

GitHub Actions also includes a manual `Manual Package` workflow that builds
artifacts for macOS Intel, macOS Apple Silicon, Windows, and Linux. The workflow
accepts major and minor version inputs, auto-increments the patch version from
existing tags, creates a `vX.Y.Z` tag, and publishes the packages to GitHub
Releases.

CLI after build:

```bash
npm run build
node dist/cli/index.js scan --root .
node dist/cli/index.js audit --root .
node dist/cli/index.js publish-plan --root . --visibility public
```

## Workspace Layout

SkillOps expects a repository like this:

```text
my-skills/
  skillops.config.json
  skills/
    code-review/
      SKILL.md
      references/
      scripts/
    release-writer/
      SKILL.md
```

Initialize a config:

```bash
skillops init --root .
```

Example config:

```json
{
  "version": 1,
  "sourceDir": "skills",
  "teamRepo": "github.com/acme/team-skills",
  "profiles": [
    {
      "name": "frontend",
      "description": "Skills used by frontend projects.",
      "skills": ["code-review", "release-writer"],
      "targets": ["claude", "codex", "cursor"]
    }
  ]
}
```

Use `"skills": ["*"]` to include every discovered skill.

## CLI

```bash
skillops init [--root <dir>]
skillops scan [--root <dir>]
skillops audit [--root <dir>]
skillops publish-plan [--root <dir>] [--visibility private|public]
skillops drift [--root <dir>] [--profile default] [--target .skillops/skills]
skillops apply-profile [--root <dir>] [--profile default] [--target .skillops/skills]
```

All CLI commands return JSON so they can be used in CI or scripts.

## Positioning

SkillOps is not trying to replace skill registries, package managers, or agent-specific tools.

It is a workflow layer:

- use GitHub for source control and publishing
- use existing agent tools for installation and runtime behavior
- use SkillOps for audit, profile management, drift checks, and release planning

## Project Status

Early MVP. APIs and config shape may change before `1.0`.

See [docs/product.md](docs/product.md), [docs/architecture.md](docs/architecture.md), and [docs/roadmap.md](docs/roadmap.md).
