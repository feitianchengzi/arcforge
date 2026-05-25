# Release Journal Skill Candidates

## Status

- State: parked
- Type: workflow
- Source: agent conversation
- Created: 2026-05-25
- Updated: 2026-05-25
- Decision: record only; do not execute yet

## Background

The user wants a reusable, project-agnostic skill for preserving both changelog entries and release notes. The discussion clarified that changelogs and release notes are related but distinct artifacts.

A changelog is the factual change ledger: what changed, usually versioned, complete enough for maintainers, reviewers, and auditors. Release notes are the user-facing release explanation: what matters, why it matters, and whether users need to migrate or pay attention.

## Pending Item

Evaluate whether SkillOps should recommend, import, adapt, or help users build a release journal skill that produces both:

- `CHANGELOG.md` or equivalent long-lived change ledger.
- `docs/releases/vX.Y.Z.md`, GitHub Release body, or equivalent user-facing release notes.

Candidate external skills and references discussed:

- `wshobson/agents`
  - Repository: `https://github.com/wshobson/agents`
  - Candidate skill path: `plugins/documentation-generation/skills/changelog-automation/SKILL.md`
  - Current judgment: strongest generic base for combined changelog and release notes work.
  - Useful scope: `CHANGELOG.md`, release notes, Conventional Commits, SemVer, Keep a Changelog, `semantic-release`, `standard-version`, and `git-cliff`.
- `i-am-bee/agentstack`
  - Candidate skill: `release-notes`
  - Current judgment: useful writing model for user-facing release notes, but too AgentStack-specific to use directly.
  - Useful practices: determine release scope, inspect merged PRs, extract high-impact changes, write user impact instead of dumping PR lists.
- `release-skills` by JimLiu
  - Current judgment: useful later if SkillOps needs a full release workflow.
  - Risk: broader than documentation; may include version bumps, tags, hooks, and publish steps that are too heavy for a documentation-only workflow.

## Current Judgment

`wshobson/agents` `changelog-automation` should be treated as the main reference because it is generic and covers both artifacts. SkillOps should not automatically adopt the entire upstream repository model or multi-platform conversion chain unless users repeatedly need cross-agent distribution.

The more SkillOps-shaped direction is a local-first skill or workflow that reads git tags, commits, PR metadata when available, and existing changelog content, then proposes reviewed file changes. It should preserve GitHub as the review and release source of truth rather than becoming a hosted release-note service.

## Revisit When

- SkillOps adds first-class skill recommendation, import, or template workflows.
- Users repeatedly ask to prepare release notes or changelog entries before publishing skills.
- Release preparation becomes part of the publish-readiness checklist.
- The project needs a built-in sample skill for release documentation.

## Related Areas

- `CHANGELOG.md`
- `release/`
- `docs/`
- `arckit/spec/share/github-sharing.md`
- `arckit/tech/sharing-ipc/solution.md`
- `arckit/pending/items/2026-05-25-agent-workbench-skill-maintenance.md`

## Notes

- Keep the artifact split explicit: changelog records what changed; release notes explain user impact.
- A future skill name could be `release-journal`, `release-notes-and-changelog`, or `skillops-release-journal`.
- Prefer proposed patches and reviewable outputs over direct publishing.
- Do not frame this as registry replacement. It belongs to pre-publish preparation and team governance.

## Outcome

