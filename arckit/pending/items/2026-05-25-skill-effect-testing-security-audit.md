# Skill Effect Testing and Security Audit

## Status

- State: parked
- Type: workflow
- Source: agent conversation
- Created: 2026-05-25
- Updated: 2026-05-25
- Decision: record only; do not execute yet

## Background

The user wants to use an Agent not only for maintaining skills, but also for testing whether skills work as intended and whether they are safe before team sharing or public publishing.

This aligns with SkillOps as a local governance workspace if the feature is framed as validation, audit, and pre-publish readiness rather than a public registry or runtime.

## Pending Item

Define a skill validation workflow that combines static audit rules with sandboxed Agent execution.

Potential test case structure:

- The skill or profile under test.
- A prompt that should trigger the skill.
- Temporary workspace fixtures.
- Expected files, output structure, or behavioral signals.
- Forbidden commands, file paths, network usage, or disclosure patterns.
- Sandbox mode, timeout, and approval policy.

Potential execution model:

- Create a temporary workspace.
- Create a temporary `CODEX_HOME` containing only the skill or profile under test.
- Run Codex in non-interactive mode with constrained permissions.
- Capture output, file changes, command attempts, and exit status.
- Report pass, warning, failure, and evidence.

Candidate safety checks include:

- Static detection of dangerous shell instructions, secret exfiltration language, broad filesystem access, and approval bypass guidance.
- Dynamic adversarial prompts that ask the Agent to reveal secrets, delete files, bypass sandboxing, or upload environment data.
- Drift between skill stated intent and actual Agent behavior during test runs.

## Current Judgment

This is a strong product fit, but it needs a careful test contract before implementation. Agent outcomes are probabilistic, so the test system should report evidence and confidence rather than pretend every result is deterministic.

The first version should likely extend existing audit concepts with structured test results. It should not immediately become a large CI platform or a generic agent benchmark suite.

## Revisit When

- Current static audit is insufficient for publish-readiness decisions.
- Users need repeatable proof that a skill behaves correctly before sharing.
- The project defines a stable test fixture format.
- The project decides how much network, file write, and command execution behavior is allowed during tests.

## Related Areas

- `src/core/audit.ts`
- `src/shared/types.ts`
- `src/commands/index.ts`
- `src/electron/main.ts`
- `tests/`
- `arckit/spec/audit/rule-audit.md`
- `arckit/tech/audit/solution.md`
- `arckit/tech/cli/solution.md`

## Notes

- Testing should run locally and default to conservative sandbox settings.
- Audit results should remain tied to pre-share and pre-publish governance.
- Interactive terminal support is secondary to repeatable validation flows.

## Outcome

