# Product Brief

[简体中文](../product.md)

## Positioning

SkillOps is a project-local governance layer for AI agent skills, designed for indie developers and small teams who work through coding agents.

Users primarily use SkillOps from inside a project through a coding agent. The SkillOps skill orchestrates CLI automation and opens the desktop UI when a workflow needs visual review, structured selection, editing, or confirmation.

It helps users turn AI agent skills from personal notes or project-local improvements into team-ready assets that are audited, versioned in GitHub, grouped by project, applied into local agent targets, and prepared for private team sharing or public publishing.

SkillOps is a pre-publish and team-governance layer. It is meant to sit upstream of GitHub releases, ClawHub/OpenClaw, `skillshare`, `npx skills`, and agent-specific runtimes rather than replace them.

## Target Users

- individual developers who maintain multiple AI coding agents
- small teams that share private skills without running a registry
- open-source authors who prepare Agent Skills before publishing from GitHub or ClawHub
- teams that need lightweight review and audit before adoption

## Non-Goals

- hosted marketplace
- public skill registry
- full enterprise RBAC
- cloud sync
- replacing ClawHub/OpenClaw, `skillshare`, `npx skills`, or agent-specific runtimes
- generic prompt library management

## Core Jobs

1. I improved a project-local skill and want to audit it before sharing or adopting it elsewhere.
2. I want to promote a useful project-local skill into a reusable Skill project.
3. I want to apply the formal Skill project version to another project and verify drift.
4. I want to share the formal Skill project to a remote GitHub or Git repository.
5. I want different projects to use different approved skill sets.
6. I want teammates to use the same reviewed version from GitHub.
7. I want a clean public release plan without leaking internal context.
8. I want a CLI for CI checks and agent orchestration.
9. I want the desktop UI to appear when a skill workflow needs visual review, editing, or batch confirmation.
10. I opened a skill project from GitHub and want to know whether my local checkout is behind before I update it.

## MVP Features

- scan a Git workspace for `SKILL.md` skills
- provide an agent-facing SkillOps skill that orchestrates CLI and desktop workflows from the current project
- audit skill quality and security risks
- browse and edit the workspace `skills/` tree with profile-based filtering
- apply named profiles to target folders
- report drift between profile source and target folder
- check and fast-forward update GitHub-sourced skill projects through CLI-first commands
- generate private/public publish plans
- provide JSON CLI output for automation
- open the desktop UI to specific workflow contexts when visual review or confirmation is needed

## Differentiation

Most existing products focus on public discovery, installation, registry hosting, or runtime integration. SkillOps focuses on the private lifecycle before a skill is adopted by a project or published to a public channel:

```text
draft -> audit -> profile -> share -> publish -> maintain
```

The product is intentionally GitHub-first because small teams already use GitHub for review, releases, issues, and access control.

The closest adjacent systems should be treated as distribution targets or install adapters:

- ClawHub/OpenClaw: public registry and ecosystem distribution.
- GitHub releases: source-of-truth versioning and team review.
- `skillshare` and `npx skills`: installation and sync paths.
- Agent runtimes: execution behavior and local skill loading.
