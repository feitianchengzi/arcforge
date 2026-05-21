# AGENTS.md

## Product Direction

SkillOps is a local-first, GitHub-first governance workspace for AI agent skills.

It should not become a hosted marketplace, public registry, search engine, ratings system, paid distribution platform, or agent runtime. ClawHub/OpenClaw and similar systems already cover public registry and ecosystem distribution.

SkillOps owns the work before distribution:

- scan local skill repositories
- audit skills before team sharing or public publishing
- organize skills into project/team profiles
- apply profiles into local agent or project targets
- report drift between source skills and installed copies
- prepare GitHub and ClawHub/OpenClaw release checklists

## Implementation Bias

- Keep features local-first unless a workflow explicitly needs GitHub integration.
- Prefer GitHub as the source of truth for review, versioning, releases, and access control.
- Integrate with installers and registries instead of replacing them.
- Keep registry-specific logic as publish-readiness checks or command hints until there is a clear need for deeper integration.

## Documentation Bias

When updating docs, describe SkillOps as a pre-publish and team-governance layer. Avoid language that positions it as a marketplace or registry competitor.
