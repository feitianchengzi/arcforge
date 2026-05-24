# SkillOps

[简体中文](docs/zh-CN/README.md)

Local-first, GitHub-first governance for AI agent skills.

SkillOps helps individuals and small teams turn `SKILL.md` files into reviewed, grouped, shareable assets before they are installed into agents or published to GitHub/ClawHub.

![SkillOps governance concept](docs/assets/skillops-overview.svg)

## Why This Exists

SkillOps started as a personal itch: I want a small, local-first way to manage AI agent skills before they are copied into agents or shared with other people. **I am not sure yet whether this direction is broadly useful**, and I do not want to overbuild it before there is a clear signal.

If **you also have skill management needs** and cannot find a tool that fits how you work, please star this project, open an issue, or send a PR. That tells me **I am not the only one running into this problem**.

**Stars are the strongest signal** for how much energy I should keep putting into SkillOps. The more real interest there is, the more I can justify turning this from a personal workflow tool into something maintained more seriously.

## Positioning

SkillOps is not a skill marketplace, public registry, package manager, or agent runtime.

It is the workflow layer before distribution:

```text
write skill -> audit -> profile -> apply -> drift check -> release prep
```

Use SkillOps to answer operational questions that registries and installers usually do not own:

- Which skills are approved for this project or team?
- Can we inspect and fix the source skill before applying it?
- Is this skill safe enough to share or publish?
- Did an installed copy drift from the source repository?
- Which install commands and release checklist should we give users?

## How It Differs

| Product type | Representative products | They optimize for | SkillOps does instead |
|---|---|---|---|
| Public skill registries | [ClawHub/OpenClaw](https://github.com/openclaw/clawhub), skills.sh | discovery, public publishing, search, marketplace UX | prepare skills before publishing; keep GitHub as source of truth |
| Cross-agent installers | [skillshare](https://github.com/runkids/skillshare), [npx skills](https://github.com/vercel-labs/skills) | install and sync skills into many agents | review and edit source skills, then generate profile sets, audit gates, drift reports, and release plans around those tools |
| Agent-native systems | [Claude Code plugins](https://code.claude.com/docs/en/plugins), [Claude skills](https://code.claude.com/docs/en/skills), Cursor rules | runtime loading, activation, agent-specific behavior | manage source skills before they are copied into runtime-specific locations |
| Project instruction files | `AGENTS.md`, `CLAUDE.md`, `.cursor/rules` | tell one project or agent how to behave | manage reusable `SKILL.md` assets across projects and agents |
| MCP registries | [Smithery](https://smithery.ai/), MCP catalogs | discover and install MCP servers | stay focused on skill governance, not tool-server distribution |

The short version: use registries to find and distribute skills, use installers to copy them into agents, and use SkillOps to decide what should be trusted, grouped, applied, and released.

For detailed product-by-product comparisons, see [docs/comparison.md](docs/comparison.md).

## When To Use It

Use SkillOps when you need a local governance step before skills are copied into agents or prepared for release.

| Scenario | Use SkillOps for | Main path |
|---|---|---|
| Private team skill repo | keep skill changes reviewed in Git without running a registry | scan, audit, profiles, GitHub share |
| Per-project agent setup | install only the approved skills a project should use | profiles, apply-profile, drift |
| Pre-publication review | catch secrets, risky instructions, weak metadata, and internal references | audit, publish-plan |
| Multi-agent drift control | compare installed copies with the source repository | drift, apply-profile |
| Local skill editing | inspect and edit `SKILL.md`, references, and scripts without leaving the workspace | desktop skill file editor |
| CI guardrail | produce JSON checks before sharing or publishing | CLI commands |

Do not use SkillOps if you only need to browse public skills or install a one-off skill into one agent.

## How To Use

Expected workspace shape:

```text
my-skills/
  skillops.config.json
  skills/
    code-review/
      SKILL.md
      references/
    release-writer/
      SKILL.md
```

Minimal config:

```json
{
  "version": 1,
  "sourceDir": "skills",
  "teamRepo": "github.com/acme/team-skills",
  "profiles": [
    {
      "name": "frontend",
      "description": "Skills approved for frontend projects.",
      "skills": ["code-review", "release-writer"],
      "targets": ["codex", "claude", "cursor"]
    }
  ]
}
```

### Desktop App

Usage video: [SkillOps desktop demo](docs/assets/skillops-desktop-demo.mp4)

Install from a release by downloading the latest macOS `.dmg`, Windows `.exe`, or Linux `.AppImage` from GitHub Releases.

Run from source for development:

```bash
npm install
npm run dev
```

Build a local desktop package:

```bash
npm run package
```

Use the desktop app as the local governance workspace for skills before they are copied into agents or prepared for GitHub-first sharing.

| Desktop capability | Why it matters |
|---|---|
| Built-in skill editor | Turns audit findings into local fixes for `SKILL.md`, references, and scripts without leaving the governed workspace. |
| Profile-aware workspace views | Keeps project, team, or release skill sets visible as first-class working contexts instead of making profiles only a config field. |
| Multi-target apply groups | Applies an approved profile to agent, project, and custom local targets in one controlled workflow. |
| Multi-target sharing groups | Prepares the same governed skill set for different GitHub sharing or release paths. |
| Drift and CLI repair feedback | Keeps installed copies and the local CLI setup accountable instead of leaving users to guess what changed or failed. |

Desktop release builds include the same CLI engine. After the app starts, it installs a user-level `skillops` shim and the environment banner reports whether the shim is on PATH. Use **Repair CLI** when the shim directory needs to be added to your shell profile.

### CLI

Usage video: [SkillOps CLI demo](docs/assets/skillops-cli-demo.mp4)

Install the CLI from the latest GitHub release:

Requires Node.js 20 or newer on PATH.

```bash
curl -fsSL https://github.com/feitianchengzi/skillops/releases/latest/download/install.sh | sh
```

On Windows PowerShell:

```powershell
irm https://github.com/feitianchengzi/skillops/releases/latest/download/install.ps1 | iex
```

Build and run the CLI locally:

```bash
npm install
npm run build:cli
node dist/cli/index.js help
```

Common commands:

```bash
skillops init --root .
skillops scan --root .
skillops audit --root .
skillops apply-profile --root . --profile default --target ~/.codex/skills
skillops drift --root . --profile default --target ~/.codex/skills
skillops publish-plan --root . --visibility public
skillops share --root . --repo github.com/acme/team-skills --profile frontend --message "Share frontend skills"
skillops doctor
```

## Project Status

Early MVP. APIs and config shape may change before `1.0`.

Further docs:

- [Product brief](docs/product.md)
- [Comparison](docs/comparison.md)
- [Architecture](docs/architecture.md)
- [Roadmap](docs/roadmap.md)
- [Release notes](docs/release-notes.md)
