# SkillOps

[简体中文](docs/zh-CN/README.md)

## Why This Exists

SkillOps started as a personal itch: I want a small, local-first way to manage AI agent skills before they are copied into agents or shared with other people. I am not sure yet whether this direction is broadly useful, and I do not want to overbuild it before there is a clear signal.

If you also have skill management needs and cannot find a tool that fits how you work, please star this project, open an issue, or send a PR. That tells me I am not the only one running into this problem.

Stars are the strongest signal for how much energy I should keep putting into SkillOps. The more real interest there is, the more I can justify turning this from a personal workflow tool into something maintained more seriously.

Local-first, GitHub-first governance for AI agent skills.

SkillOps helps individuals and small teams turn `SKILL.md` files into reviewed, grouped, shareable assets before they are installed into agents or published to GitHub/ClawHub.

![SkillOps overview](docs/assets/skillops-overview.svg)

## Positioning

SkillOps is not a skill marketplace, public registry, package manager, or agent runtime.

It is the workflow layer before distribution:

```text
write skill -> audit -> profile -> apply -> drift check -> release prep
```

Use SkillOps to answer operational questions that registries and installers usually do not own:

- Which skills are approved for this project or team?
- Is this skill safe enough to share or publish?
- Did an installed copy drift from the source repository?
- Which install commands and release checklist should we give users?

## How It Differs

| Product type | Representative products | They optimize for | SkillOps does instead |
|---|---|---|---|
| Public skill registries | [ClawHub/OpenClaw](https://github.com/openclaw/clawhub), skills.sh | discovery, public publishing, search, marketplace UX | prepare skills before publishing; keep GitHub as source of truth |
| Cross-agent installers | [skillshare](https://github.com/runkids/skillshare), [npx skills](https://github.com/vercel-labs/skills) | install and sync skills into many agents | generate profile sets, audit gates, drift reports, and release plans around those tools |
| Agent-native systems | [Claude Code plugins](https://code.claude.com/docs/en/plugins), [Claude skills](https://code.claude.com/docs/en/skills), Cursor rules | runtime loading, activation, agent-specific behavior | manage source skills before they are copied into runtime-specific locations |
| Project instruction files | `AGENTS.md`, `CLAUDE.md`, `.cursor/rules` | tell one project or agent how to behave | manage reusable `SKILL.md` assets across projects and agents |
| MCP registries | [Smithery](https://smithery.ai/), MCP catalogs | discover and install MCP servers | stay focused on skill governance, not tool-server distribution |

The short version: use registries to find and distribute skills, use installers to copy them into agents, and use SkillOps to decide what should be trusted, grouped, applied, and released.

For detailed product-by-product comparisons, see [docs/comparison.md](docs/comparison.md).

## When To Use It

Use SkillOps when:

- you keep skills in Git and want reviewable changes
- a team needs one approved skill set per project
- you use multiple agents such as Codex, Claude Code, Cursor, or OpenClaw
- you want to publish skills without leaking internal paths, tokens, or process notes
- you need CLI output for CI checks before sharing a skill repository

Do not use SkillOps if you only need to browse public skills or install one-off skills into one agent.

## How To Use

```bash
npm install
npm run dev
```

Build and run the packaged app locally:

```bash
npm run build
npm start
```

Use the CLI after build:

```bash
npm run build
node dist/cli/index.js scan --root .
node dist/cli/index.js audit --root .
node dist/cli/index.js drift --root . --profile default --target .skillops/skills
node dist/cli/index.js publish-plan --root . --visibility public
```

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

## Typical Scenarios

![SkillOps workflow](docs/assets/skillops-workflow.svg)

| Scenario | Why SkillOps helps | Main commands/features |
|---|---|---|
| Private team skill repo | keep skills reviewed in Git without running a registry | scan, audit, profiles, GitHub share plan |
| Per-project agent setup | install only the skills a project should use | profiles, apply-profile, target history |
| Pre-publication review | catch secrets, risky instructions, weak metadata, and internal references | audit, public publish plan, release checklist |
| Multi-agent drift control | compare installed copies with source skills | drift report, apply-profile |
| CI guardrail | fail or warn before unreviewed skills are merged | JSON CLI output |

## Project Status

Early MVP. APIs and config shape may change before `1.0`.

Further docs:

- [Product brief](docs/product.md)
- [Comparison](docs/comparison.md)
- [Architecture](docs/architecture.md)
- [Roadmap](docs/roadmap.md)
