# Durable Agent Guidance Boundaries

## Status

- State: parked
- Type: agent
- Source: agent conversation
- Created: 2026-05-25
- Updated: 2026-05-25
- Decision: record only; do not execute yet

## Background

A prompt about GitHub-sourced skill project update checks revealed possible persistent project memory that may belong in `AGENTS.md` or a similar durable guidance document. The idea appears useful for preserving recurring project-level expectations across agent sessions, but the boundary between durable guidance and transient task context is not yet clear.

This is being recorded as unresolved project context only. It should not change `AGENTS.md`, formal Arckit docs, code, or current workflows until the boundary and extraction model are decided.

## Pending Item

Decide whether ArcForge needs a post-task agent workflow that identifies durable project guidance from conversation context and proposes updates to `AGENTS.md` or comparable durable docs.

Open questions:

1. What does this represent, and how should durable `AGENTS.md` guidance be separated from transient task details?
2. What should such a skill be called, and how should it be implemented?

## Current Judgment

The topic fits ArcForge as agent governance context, especially if it helps teams preserve durable collaboration rules and review expectations. It is not ready for execution because the risk of over-capturing temporary decisions, user preferences, or task-specific facts is high.

A future workflow should likely produce proposed guidance as a reviewable decision record or patch, rather than silently writing to `AGENTS.md`. It should also make clear what evidence makes an insight durable enough to persist.

## Revisit When

- Agent sessions repeatedly surface project-level guidance that should survive beyond a single task.
- The project defines criteria for durable guidance versus transient task context.
- ArcForge adds or revises workflows around agent memory, project instructions, or post-task review.
- The team wants a named skill or command for extracting durable guidance from completed conversations.

## Related Areas

- `AGENTS.md`
- `arckit/pending/`

## Notes

- Keep any future implementation local-first and review-driven.
- Avoid using this as a general conversation summarizer or automatic memory writer.
- The initial output should be a decision record or proposed patch, not an automatic execution step.
- Existing related discussion found in this item. The user later asked for a high-signal, reusable skill that can preserve long-term agent context into files such as `AGENTS.md`.
- Candidate references discussed:
  - `getsentry/skills` `agents-md`
    - Repository: `https://github.com/getsentry/skills`
    - Candidate skill path: `plugins/sentry-skills/skills/agents-md/SKILL.md`
    - Current judgment: best direct reference for a generic `AGENTS.md` / `CLAUDE.md` maintenance skill.
    - Useful practices: inspect lockfiles, lint config, CI/build commands, monorepo shape, and existing docs before writing; keep guidance concise and high signal; avoid obvious rules, raw project trees, and duplicated linter instructions.
  - `littlebearapps/contextdocs`
    - Repository: `https://github.com/littlebearapps/contextdocs`
    - Current judgment: lower public signal, but useful lifecycle model.
    - Useful practices: `init`, `update`, `promote`, `audit`, and `verify` for context documentation.
  - `OpenHands/skills` `agent-memory`
    - Repository: `https://github.com/OpenHands/skills`
    - Candidate skill path: `skills/agent-memory/SKILL.md`
    - Current judgment: useful confirmation and safety model.
    - Useful practices: confirm before saving durable knowledge and avoid issue-specific transient facts.
  - `meteor/meteor` `ai-context`
    - Repository: `https://github.com/meteor/meteor`
    - Current judgment: useful as a method reference but not the final generic recommendation, because the repository stars reflect Meteor rather than the skill itself.
    - Useful practices: root `AGENTS.md` as minimal always-on context, bridge files such as `CLAUDE.md`, topic skills for detailed on-demand context, and subdirectory `AGENTS.md` for local rules.
- A ArcForge version should probably combine Sentry's concise `AGENTS.md` guidance, ContextDocs lifecycle checks, and OpenHands-style user confirmation.
- Do not silently write durable context. Prefer a proposed patch that the user can review.

## Outcome
