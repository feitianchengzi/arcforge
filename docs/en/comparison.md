# Comparison

[简体中文](../comparison.md)

SkillOps is not a registry, marketplace, package manager, installer, MCP registry, or agent runtime.

It is a local-first governance layer for `SKILL.md` repositories:

```text
author/iterate skills -> sub-agent validation -> audit -> profiles -> apply targets -> drift checks -> release prep
```

## Quick Map

| Neighbor | Primary job | Why it can look similar | SkillOps boundary |
|---|---|---|---|
| [skillshare](https://github.com/runkids/skillshare) | Sync skills, agents, rules, commands, and related files across many AI CLI tools. | It also works with multiple agents and supports team sharing/security checks. | SkillOps should stay upstream: Skill First validation, approved profiles, review gates, drift reports, and release prep. Delegate installation/sync where possible. |
| [npx skills](https://github.com/vercel-labs/skills) / [Vercel Agent Skills](https://vercel.com/docs/agent-resources/skills) | Add packaged skills to many agent environments. | It also uses skill packages and install commands. | SkillOps generates governance and publish-readiness around skill repositories; `npx skills` is an install path. |
| [ClawHub/OpenClaw](https://github.com/openclaw/clawhub) | Public registry for publishing, versioning, searching, installing, and moderating OpenClaw skills/packages. | It owns a broad skill ecosystem and has audit/moderation workflows. | SkillOps should prepare skills before publishing to ClawHub, not duplicate registry/search/marketplace features. |
| [Claude Code plugins](https://code.claude.com/docs/en/plugins) and [Claude skills](https://code.claude.com/docs/en/skills) | Runtime-specific packaging and loading for Claude Code capabilities. | Plugins can contain skills and marketplaces can distribute them. | SkillOps manages source skill sets before they become Claude-specific plugins or local skill folders. |
| Cursor rules / `AGENTS.md` / `CLAUDE.md` | Project-local instruction surfaces for one agent or codebase. | They can contain guidance that resembles a skill. | SkillOps manages reusable skill assets and profiles across projects; project instruction files remain target outputs or local policy files. |
| [Smithery](https://smithery.ai/) / [MCP registry](https://github.com/modelcontextprotocol/registry) | Discover and install MCP servers. | MCP servers and skills both extend agents. | SkillOps governs text/file-based skills, not tool-server distribution. |
| GitHub repository alone | Store, review, release, and permission source files. | SkillOps intentionally uses GitHub as source of truth. | SkillOps adds skill-aware scanning, audit, profiles, drift reports, and release checklists on top of Git. |

## SkillOps vs skillshare

`skillshare` is the closest overlap and the easiest product to confuse with SkillOps.

Based on its README, `skillshare` focuses on "one source of truth" for AI CLI skills, agents, rules, commands, and other file-based resources. It can sync to Claude, Cursor, Codex, OpenClaw, OpenCode, and many more targets, install from Git hosts, run security audit, support project skills, and expose a web UI.

SkillOps should not try to out-sync `skillshare`. Its useful role is earlier in the lifecycle:

| Question | skillshare | SkillOps |
|---|---|---|
| How do I sync files into 60+ agent targets? | Core feature. | Defer or integrate. |
| How do I install/update skills from Git hosts? | Core feature. | Generate install guidance and publish plans. |
| How do I manage agents, rules, commands, prompts, and extras? | Core feature. | Out of scope unless needed as target metadata. |
| Which skills are approved for this project profile? | Possible through config/filtering, but not the main product frame. | Core feature. |
| Has a working pattern been captured as a skill and validated on a real task? | Not the main sync job. | Core feature through `skillops-skill-first`. |
| Did this project drift from the approved source profile? | Adjacent to sync state. | Core feature. |
| Is this repo ready for private team sharing or public publishing? | Adjacent. | Core feature. |
| Should this become a hosted registry? | No. | No. |

Practical stance: SkillOps can generate `skillshare`-friendly source layouts and commands. `skillshare` can be the installer/sync backend when SkillOps users want broad target coverage.

## SkillOps vs npx skills

`npx skills` is an open skill installer path associated with Vercel Agent Skills. Vercel's docs describe skills as packaged capabilities that can be added to many AI agents, and the GitHub project positions itself as "the open agent skills tool."

SkillOps should not compete on simple one-command install.

| Question | npx skills | SkillOps |
|---|---|---|
| How do I add a public skill package to an agent? | Core feature. | Not the main job. |
| How do I keep a team repo reviewable before installation? | Not the main job. | Core feature. |
| How do I group skills by project/team/release profile? | Not the main job. | Core feature. |
| How do I check drift between a target folder and source repo? | Not the main job. | Core feature. |
| How do I prepare a GitHub release checklist? | Not the main job. | Core feature. |

Practical stance: SkillOps should emit `npx skills add ...` commands in publish plans, not replace the installer.

## SkillOps vs ClawHub/OpenClaw

ClawHub is a public skill registry for OpenClaw. Its README describes publishing, versioning, searching, comments/stars, moderation hooks, vector search, local installs, pinning, updates, and package publishing.

SkillOps should not rebuild that surface.

| Question | ClawHub/OpenClaw | SkillOps |
|---|---|---|
| Where do users discover public skills? | ClawHub. | Out of scope. |
| Where are public versions, stars, comments, and moderation handled? | ClawHub. | Out of scope. |
| How do I publish/install OpenClaw skills/packages? | ClawHub/OpenClaw CLI. | Generate readiness checklist and command hints. |
| How do I review a private team skill repo before publishing? | Adjacent. | Core feature. |
| How do I maintain per-project approved skill profiles? | Not the registry's primary job. | Core feature. |

Practical stance: SkillOps should become a ClawHub preflight tool, not a ClawHub competitor.

## SkillOps vs Claude Code Plugins and Skills

Claude Code plugins can package custom commands, agents, hooks, skills, and MCP servers. Claude Code skills are loaded from skill directories and can also come from plugins.

That makes Claude Code an important target, but not the same product layer.

| Question | Claude Code plugin/skill system | SkillOps |
|---|---|---|
| How does Claude Code load or activate a skill? | Runtime-owned. | Out of scope. |
| How do I package a Claude-specific plugin marketplace? | Claude plugin system. | Out of scope unless generating release guidance. |
| Which reusable skills should this team approve before packaging? | Not the main job. | Core feature. |
| How do I apply only a selected profile into `~/.claude/skills` or a plugin source folder? | Target-specific operation. | Core target workflow. |

Practical stance: Claude Code is a target runtime and packaging surface. SkillOps manages source readiness before the files land there.

## SkillOps vs Cursor Rules, AGENTS.md, and CLAUDE.md

Cursor rules, `AGENTS.md`, `CLAUDE.md`, and similar files are project-local instruction surfaces. They are extremely useful, but they are not a reusable skill lifecycle system by themselves.

| Question | Project instruction files | SkillOps |
|---|---|---|
| How should this specific repository guide an agent? | Core job. | Can generate or apply target files, but does not replace local policy. |
| How do I reuse the same capability across many projects? | Manual copying or templates. | Profiles and apply workflows. |
| How do I audit/publish a portable `SKILL.md` asset? | Not the main job. | Core feature. |
| How do I detect that one project has stale copied instructions? | Manual. | Drift report. |

Practical stance: project instruction files are targets or companions. SkillOps is the source-side manager.

## SkillOps vs MCP Registries

MCP registries such as Smithery or the community MCP registry help users find and install MCP servers. MCP servers expose tools and resources; skills are text/file packages that guide agent behavior.

| Question | MCP registry | SkillOps |
|---|---|---|
| How do I discover/install an MCP server? | Core feature. | Out of scope. |
| How do I govern reusable `SKILL.md` assets? | Out of scope. | Core feature. |
| How do I decide which skills are safe to share publicly? | Out of scope. | Core feature. |
| How do I combine a skill with MCP setup docs? | Possible in docs. | Can audit and package the skill-side guidance. |

Practical stance: MCP registries manage tools. SkillOps manages skill instructions and supporting files.

## Product Rule

When in doubt, keep SkillOps on the upstream side:

- Own: skill-first authoring/validation, scan, audit, profiles, drift, publish-readiness, GitHub release prep.
- Integrate: installers, registries, agent runtimes, MCP registries.
- Avoid: hosted marketplace, public search, ratings, comments, broad sync engine, agent runtime behavior, generic agent evaluation platform.
