# Agent Workbench for Skill Maintenance

## Status

- State: parked
- Type: agent
- Source: agent conversation
- Created: 2026-05-25
- Updated: 2026-05-25
- Decision: record only; do not execute yet

## Background

SkillOps already supports viewing and editing skills. The open product question is how to add Agent assistance without turning SkillOps into a general agent runtime or hosted marketplace.

The discussion started from a possible terminal or iTerm2-like Codex CLI surface, then narrowed toward a more SkillOps-shaped approach: use Codex as an execution engine inside a governance workflow.

## Pending Item

Introduce an Agent Workbench around skill maintenance. The workbench helps users review, improve, and patch skills from within the current SkillOps workspace.

Candidate maintenance tasks include:

- Review `SKILL.md` structure, trigger clarity, progressive disclosure, and references.
- Suggest focused improvements to skill instructions and supporting files.
- Generate or update `references/`, `scripts/`, and `assets/` when a skill needs supporting material.
- Explain the impact of a skill diff before sharing or publishing.
- Generate a patch that the user can inspect before keeping changes.

The preferred execution model is controlled Codex CLI invocation such as `codex exec` scoped to the current workspace, rather than making a full interactive terminal the primary entry point.

## Current Judgment

The direction fits SkillOps when framed as skill governance and maintenance assistance. It becomes risky if positioned as a replacement for Codex App, Terminal, or a general-purpose agent runtime.

A lightweight command panel or task runner appears more aligned than a full terminal as the initial product surface. A full xterm/node-pty terminal can remain an advanced debugging option if users repeatedly need interactive Codex sessions.

## Revisit When

- Users repeatedly edit `SKILL.md` manually and need structured Agent review.
- SkillOps adds a first-class skill detail/editing workflow.
- The team decides how generated patches are previewed, accepted, and reverted.
- Codex CLI availability and authentication detection are reliable enough for desktop use.

## Related Areas

- `src/electron/main.ts`
- `src/electron/preload.cts`
- `src/ui/`
- `src/core/audit.ts`
- `arckit/tech/cli/solution.md`
- `arckit/tech/sharing-ipc/solution.md`

## Notes

- The Agent should operate through the Electron main process or command layer, not directly from the React renderer.
- The renderer should receive streamed output, status, exit code, and diff metadata through a narrow IPC contract.
- The initial scope should preserve SkillOps as a local-first, GitHub-first skill lifecycle governance layer, not a general agent runtime.

## Outcome
