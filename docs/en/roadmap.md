# Roadmap

[简体中文](../roadmap.md)

SkillOps is developed as a demand-driven project. The `0.x` line should stay small and only cover the work needed to make the current local-first workflow dependable. Larger workflows move forward when there is enough real usage, stars, issues, or PRs to justify the maintenance cost.

There are no fixed dates. Stars, concrete issues, and useful PRs are the main signals for what should be built next.

## Direction

SkillOps should remain a lifecycle governance layer for AI agent skills, covering the local flow from authoring and validation through release preparation:

```text
write/iterate skill -> sub-agent validation -> audit -> profile -> apply -> drift check -> release prep
```

It should stay local-first and GitHub-first. Git remains the source of truth for review, history, releases, and team sharing.

SkillOps should not become a hosted marketplace, public registry, public search engine, ratings system, paid distribution platform, or agent runtime. Registries and installers already own discovery, distribution, and runtime loading. SkillOps owns the work before that point.

## 0.x - Essential Local Workflow

Goal: make the current product useful without expanding scope.

- keep workspace scan reliable for the documented `skills/` project shape
- keep `skillops-skill-first` able to capture working patterns as skills and hand validated skills into SkillOps governance
- keep audit output understandable enough for pre-share review
- keep profile apply and drift report usable for local agent folders
- keep publish plan useful as a GitHub/ClawHub release checklist
- keep JSON CLI stable enough for lightweight CI checks
- improve README, examples, screenshots, and troubleshooting as users hit rough edges
- fix bugs and polish existing flows before adding new surfaces

Possible `0.x` additions, only if needed:

- safer config editing in the UI
- clearer first-run and empty-state guidance
- better error messages for invalid config, missing skills, failed Git commands, and target write failures
- minimal import flow for existing local skills
- small audit rule refinements based on real false positives or misses
- small Skill First refinements based on real preflight, retest, and handoff friction

## 1.x - Stable Personal And Small-Team Use

Goal: make SkillOps stable enough that a developer or small team can rely on it without expecting breaking config changes.

- stabilize the user-level project state schema and migration behavior
- stabilize the core CLI commands and JSON output shape
- support a cleaner profile editing workflow
- provide better before-apply diffs and rollback guidance
- improve private GitHub sharing and release preparation
- document recommended GitHub review workflows for team skill repositories
- provide clearer integration guidance for `skillshare`, `npx skills`, ClawHub/OpenClaw, and agent-native skill folders
- keep all workflows usable without a hosted SkillOps service

## 2.x - Demand-Driven Expansion

Goal: expand only if there is enough demand from real users.

Candidate areas:

- richer GitHub automation, such as PR creation, release/tag helpers, and generated README/install sections
- configurable audit rules, suppressions, and CI annotations
- profile ownership, review status, and lightweight team metadata backed by GitHub
- stronger drift dashboards across multiple local targets
- publish-readiness helpers for public registries while keeping registry logic out of core SkillOps
- adapter-style integration with installers instead of replacing them

These should remain optional layers. They should not turn SkillOps into a marketplace, registry, or runtime.

## Not Planned Unless Strong Demand Appears

- hosted accounts or cloud sync
- public skill browsing or search
- ratings, comments, public marketplace features, or paid distribution
- full enterprise RBAC
- generic prompt library management
- agent runtime execution or activation logic
- generic agent evaluation platform

## Feedback Signals

The project will prioritize work based on:

- stars, as the simplest signal that this problem matters to more than one person
- issues that describe a concrete skill management workflow
- PRs that improve the local-first, GitHub-first workflow without broadening scope
- examples of teams managing skills in Git and hitting gaps in the current tool

If those signals stay small, SkillOps should stay small too.
