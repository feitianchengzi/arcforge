# Product Brief

## Positioning

SkillOps is a GitHub-first SkillOps workspace for indie developers and small teams.

It helps users turn AI agent skills from personal notes into team-ready assets that are audited, versioned, grouped by project, and publishable from GitHub.

## Target Users

- individual developers who maintain multiple AI coding agents
- small teams that share private skills without running a registry
- open-source authors who publish Agent Skills from GitHub
- teams that need lightweight review and audit before adoption

## Non-Goals

- hosted marketplace
- full enterprise RBAC
- cloud sync
- replacing `skillshare`, `npx skills`, or agent-specific runtimes
- generic prompt library management

## Core Jobs

1. I wrote a skill and want to know whether it is safe to share.
2. I want different projects to use different skill sets.
3. I want teammates to use the same approved version.
4. I want a clean public release plan without leaking internal context.
5. I want a CLI for CI checks.

## MVP Features

- scan a Git workspace for `SKILL.md` skills
- audit skill quality and security risks
- apply named profiles to target folders
- report drift between profile source and target folder
- generate private/public publish plans
- provide JSON CLI output for automation

## Differentiation

Most existing products focus on discovering, installing, and syncing skills. SkillOps focuses on the lifecycle between creation and adoption:

```text
draft -> audit -> profile -> share -> publish -> maintain
```

The product is intentionally GitHub-first because small teams already use GitHub for review, releases, issues, and access control.
