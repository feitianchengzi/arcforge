# Roadmap

## Direction

SkillOps should stay small and focused: local-first governance for private/team skills, plus release preparation for GitHub and public registries such as ClawHub/OpenClaw.

Do not build a hosted marketplace, public registry, public search, ratings, comments, paid distribution, or a full agent runtime. Those are distribution and execution layers. SkillOps owns the work before that point: audit, profiles, drift, release prep, and lightweight automation.

## 0.1 MVP

- desktop workspace scan
- audit report
- profile apply and drift report
- publish plan
- JSON CLI
- open-source project documentation

## 0.2 Usability

- edit `skillops.config.json` from the UI
- create new skill from templates
- diff changed skills before apply
- detect installed tools and their skill directories
- import existing local agent skills
- label profiles as private, team, or publish-ready

## 0.3 GitHub Workflow

- GitHub repo connect flow
- generate pull requests for team skill updates
- release/tag helper
- public/private publish mode
- README and install badge generator
- ClawHub/OpenClaw publish-readiness checklist and dry-run command hints

## 0.4 Audit

- configurable audit rules
- allowlist and suppressions
- CI annotations
- public publish redaction checks
- registry-readiness checks for metadata, license, README, examples, and internal references
- score trend by release

## 0.5 Team

- profile ownership metadata
- version drift dashboard
- onboarding bundle generation
- GitHub-backed team metadata, without requiring a hosted SkillOps service

## Open Questions

- Which sync targets should be owned directly, and which should be delegated to `skillshare`, `npx skills`, or agent-native installers?
- How much GitHub automation should be built in before requiring auth?
- Should project profiles map to agent targets, project directories, or both?
- What should the config compatibility promise be before `1.0`?
- Should ClawHub/OpenClaw support stay as checklist-only, or should SkillOps provide a first-class publish-prep command?
