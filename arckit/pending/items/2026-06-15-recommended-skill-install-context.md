# Recommended Skill Install Context and History Reuse

## Status

- State: parked
- Type: workflow
- Source: agent conversation
- Created: 2026-06-15
- Updated: 2026-06-15
- Decision: record only; optimize later

## Background

During ArcForge core installation follow-up, two agent outputs exposed gaps in the recommended skill project installation flow.

The first output reported that ArcForge core installation had completed and been verified, then immediately asked the user to choose among quick install, strict governance, or no installation for recommended skill projects. It listed generated artifacts such as user-level ArcForge skills, CLI/Desktop launchers, build outputs, and successful `doctor`, `scan`, and `--verify` results.

The second output entered strict governance mode and asked the user to confirm endpoints before running drift/apply or import:

- Which projects to process: `arckit`, `arckit-code`, or both.
- Whether a local persistent maintenance source is needed, and what root should be used.
- Whether the application target is `/Users/Glare/.codex/skills`.
- Whether to save an applied source record, and where the relationship record should belong.

## Pending Item

Improve the recommended skill project installation and governance handoff so the agent does not jump straight to endpoint confirmation.

Two user-observed issues should be addressed:

- The agent did not introduce the recommended skill projects before asking how to install them. It should briefly explain what each recommended project is, why it is being recommended, what skills or profiles it contains, and what operational consequences each install mode has.
- The agent asked the user to confirm endpoints even though the user had installed related skills before. ArcForge should be able to read historical installation or applied-source configuration and prefill likely source, maintenance, target, profile, and relationship-record choices.

## Current Judgment

This is a workflow and product-experience gap rather than an immediate implementation request.

The optimization should preserve ArcForge's explicit confirmation boundaries for real writes, but those confirmations should be informed by local history. The flow should distinguish between:

- unknown endpoint information that genuinely requires user input;
- historical configuration that can be presented as a detected default;
- risky or destructive changes that still require explicit confirmation.

## Revisit When

- Optimizing the post-install recommended skill flow.
- Implementing or revising applied source record discovery.
- Improving strict governance prompts for install/import/apply workflows.
- Adding UI or CLI summaries for recommended skill projects.

## Related Areas

- `skills/arcforge/SKILL.md`
- `skills/arcforge-install/SKILL.md`
- `skills/arcforge-skill-first/SKILL.md`
- `arckit/tech/_shared/models/AppliedSourceRecord.yaml`
- `arckit/spec/sources/skill-project-merge.md`
- `arckit/spec/profile/destination-sync.md`

## Notes

- Keep the flow local-first and GitHub-first.
- Do not reduce write confirmation rigor; improve defaults and explanations before confirmation.
- A future implementation should likely read existing applied source records, installed user-level skills, and known maintenance roots before asking endpoint questions.

## Outcome

