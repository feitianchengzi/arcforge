# Isolated Skill Validation Runner

## Status

- State: parked
- Type: agent
- Source: agent conversation
- Created: 2026-06-13
- Updated: 2026-06-13
- Decision: record only; do not execute yet

## Background

During discussion of `arcforge-skill-first`, the user identified that ordinary subagents are not enough for validating skills whose correctness depends on user interaction. A fully automated alternative was discussed: a local validation runner CLI that starts an isolated executor agent, brokers structured user questions through the main agent, and records transcripts for later observation and optimization.

This fits ArcForge only as a local pre-share and pre-publish governance capability. It should not become a hosted agent runtime, marketplace, registry, or benchmark platform.

## Pending Item

Explore, but do not build yet, an isolated skill validation runner:

- A CLI command starts an isolated executor agent with only the target skill, task, workspace boundary, and interaction protocol.
- The executor agent performs the real task and emits structured events such as `ask_user`, `request_permission`, `progress`, and `execution_result`.
- The main agent acts as observer and broker, relaying user questions without injecting diagnostics, expected answers, or repair ideas.
- The runner stores transcripts, tool events, user requests, execution results, and observer notes in a local run directory.
- The main agent uses the transcript to classify issues and update the target skill.

## Current Judgment

The architecture preserves context isolation and makes interactive skill validation more realistic than ordinary subagents, but it is comparatively heavy. It requires an agent runner integration, a pause/resume or streaming protocol, structured event parsing, run state persistence, and careful permission boundaries.

For now, prefer a manual bridge: the main agent prepares an isolated executor prompt and instructions; the user opens a separate agent conversation and returns the execution transcript for observation.

## Revisit When

- Manual bridge validation becomes frequent or painful.
- Repeated skill validation needs reliable transcript capture.
- `arcforge-skill-first` needs automated interactive validation before team sharing or publish readiness.
- ArcForge has a stable local agent runner or CLI integration suitable for isolated execution.

## Related Areas

- `arckit/pending/items/2026-05-25-skill-effect-testing-security-audit.md`
- `arckit/tech/audit/solution.md`
- `arckit/tech/cli/solution.md`
- `.codex/skills/project-showcase-video/SKILL.md`

## Notes

- Keep the design local-first and GitHub-first.
- Treat the runner as governance validation, not as an agent runtime product.
- The first implementation should likely start with transcript schema and manual bridge fixtures before any long-running executor process.

## Outcome

