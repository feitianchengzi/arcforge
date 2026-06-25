# Skill Token Budget Governance

## Status

- State: parked
- Type: workflow
- Source: user note
- Created: 2026-06-24
- Updated: 2026-06-24
- Decision: record only; do not execute yet

## Background

The user identified token cost as a major skill adoption and maintenance problem. Skills can preserve important workflow behavior, but long instructions, broad reference loading, and repeated validation loops can consume large context budgets.

This is especially relevant to ArcForge because skill authoring, skill validation, and profile application all depend on agent instructions staying usable under real context limits.

## Pending Item

Explore a token governance model for skills:

- Measure expected token cost for each skill, including `SKILL.md`, mandatory references, optional references, generated prompts, and validation artifacts.
- Define lightweight budgets by skill type, such as routing skill, authoring skill, validation skill, governance skill, and technical implementation skill.
- Encourage progressive disclosure so agents read only the references required for the current task.
- Identify core capability rules that must never be dropped, versus examples, background, or edge cases that can move to optional references.
- Add review checks for high-token sections, duplicated rules, oversized examples, and broad "always read" instructions.
- Preserve capability by testing whether a reduced skill still triggers correctly, follows hard constraints, and produces the expected artifact shape.

## Current Judgment

This is a strong fit for ArcForge's pre-publish and team-governance role. It should not become a generic model cost optimizer. The useful product boundary is local skill maintainability: reveal token risk, suggest compression, and retest whether the compressed skill still works.

## Revisit When

- Skills become difficult to use because they consume too much context.
- `arcforge-skill-creator` needs authoring rules for concise but reliable skills.
- `arcforge-skill-first` adds regression tests that can compare full and reduced skill behavior.
- ArcForge audit needs a publish-readiness warning for token-heavy skills.

## Related Areas

- `skills/arcforge-skill-creator/SKILL.md`
- `skills/arcforge-skill-creator/references/skill-authoring-rules.md`
- `skills/arcforge-skill-first/SKILL.md`
- `arckit/pending/items/2026-05-25-skill-effect-testing-security-audit.md`

## Notes

- 2026-06-24 user note: skill token consumption is a relatively large problem; ArcForge should explore how to control token use reasonably without losing core capability.

## Outcome
