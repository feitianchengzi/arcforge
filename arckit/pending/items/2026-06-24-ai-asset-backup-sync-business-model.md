# AI Asset Backup, Sync, and Team Sharing Business Model

## Status

- State: parked
- Type: product
- Source: user note
- Created: 2026-06-24
- Updated: 2026-06-24
- Decision: record only; do not execute yet

## Background

The user identified a possible commercial direction around AI-generated assets produced by frameworks or skills. These assets may be valuable but fragile: users need independent backup, multi-device sync, and team sharing so work is not lost and can be reused across environments.

This touches ArcForge's skill and shared-asset governance direction, but it also may be broader than ArcForge itself. It should be evaluated carefully against ArcForge's product boundary: ArcForge should remain local-first and GitHub-first, and should not become a hosted marketplace, public registry, search engine, or agent runtime.

## Pending Item

Explore whether a paid auxiliary product could support AI asset durability and collaboration:

- Independently back up AI-generated assets produced by skills, frameworks, agents, and local workflows.
- Sync assets across devices while preserving provenance, version history, and ownership.
- Share assets with a team using reviewable permissions and clear source-of-truth rules.
- Keep the core framework open source to build adoption, while charging for backup, sync, team collaboration, or managed durability tools.
- Clarify which assets belong in GitHub/team repositories versus which need a separate durability layer.

## Current Judgment

The idea has commercial potential, but it should be treated as a separate product or auxiliary service unless it can stay aligned with ArcForge's local-first governance role. The strongest fit is not a marketplace; it is durable private asset management around agent-produced work.

## Revisit When

- Users repeatedly lose AI-generated assets or need cross-device reuse.
- Teams need private sharing and audit history for generated skill assets, prompts, references, media, or workflow outputs.
- ArcForge's GitHub-first team sharing leaves gaps around non-code assets, personal workspaces, or multi-device continuity.
- The project is ready to evaluate an open-core or adjacent paid tooling model.

## Related Areas

- `arckit/spec/workspace/discovery.md`
- `arckit/spec/share/github-sharing.md`
- `arckit/spec/profile/destination-sync.md`
- `docs/product.md`
- `docs/comparison.md`

## Notes

- 2026-06-24 user note: AI assets produced by frameworks or skills may need independent backup, loss prevention, multi-device sync, and team sharing. This could be a good business model: open-source the framework to drive adoption, then monetize auxiliary durability and collaboration tools.
- Keep the positioning distinct from a public marketplace or registry competitor.

## Outcome
