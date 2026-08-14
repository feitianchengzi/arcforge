# Unify catalog skill identity and version selection

Case: CASE-20260814-002
Status: closed
Artifact Type: mixed
Selected Gap: none
Updated: 2026-08-14T12:36:22.011Z

## User Intent

Analyze why ArcForge catalog exposes two arckit-git-branching entries from different installation paths, then optimize catalog storage and identity so one logical skill is shown while version evidence helps select the newest differing copy.

## Structured Record

```json
{
  "schema_version": "development-case-record/v5",
  "id": "CASE-20260814-002",
  "title": "Unify catalog skill identity and version selection",
  "status": "closed",
  "artifact_type": "mixed",
  "created_at": "2026-08-14T10:43:59.531Z",
  "updated_at": "2026-08-14T12:36:22.011Z",
  "user_intent": "Analyze why ArcForge catalog exposes two arckit-git-branching entries from different installation paths, then optimize catalog storage and identity so one logical skill is shown while version evidence helps select the newest differing copy.",
  "expected_outcome": "ArcForge uses a canonical logical skill identity independent of sourceKey-based catalog subfolders, stores skills directly under the catalog projection, and exposes trustworthy version comparison for differing copies without losing provenance or integrity.",
  "project_state_ref": "arckit/project/state.record.json",
  "current_round": {
    "goal": "",
    "selected_gap": null
  },
  "facts": [
    {
      "id": "FACT-001",
      "revision": 1,
      "status": "accepted",
      "statement": "The user currently observes two ArcForge catalog entries named arckit-git-branching with different sources after installing provider ArcForge; one is believed to be a prior direct installation and one to have arrived through a provider-integrated App.",
      "basis": "Direct user report from the current ArcForge environment.",
      "evidence": [
        "User report on 2026-08-14."
      ]
    },
    {
      "id": "FACT-002",
      "revision": 1,
      "status": "accepted",
      "statement": "The intended behavior is one logical catalog entry per skill name, catalog skills stored directly rather than partitioned by sourceKey subfolders, and explicit skill version metadata that helps determine the newest copy when contents differ.",
      "basis": "The user explicitly stated the expected optimization outcomes.",
      "evidence": [
        "User requirements on 2026-08-14."
      ]
    },
    {
      "id": "FACT-003",
      "revision": 1,
      "status": "accepted",
      "statement": "The two live arckit-git-branching candidates are deterministic products of the v1 design: the provider payload at the App-managed current path has sourceKey 13d0269626c6498125c44fee, the direct Git checkout has sourceKey e3a18f888a3e4ab6858235ee, availability maps each to catalog/<sourceKey>/<skillName>, and the catalog validates sourceKey plus skillPath as unique, so the same logical name is intentionally retained twice.",
      "basis": "The live index, physical directories, catalog list output, applied relation records, source identity implementation, availability destination mapping, and catalog uniqueness validator agree on trigger, state change, location, and ordering with no competing explanation.",
      "evidence": [
        "/Users/Glare/.arcforge/catalog/index.json",
        "/Users/Glare/.arcforge/projects/de09ef435cd57a8f80524040.json",
        "/Users/Glare/.arcforge/projects/e3a18f888a3e4ab6858235ee.json",
        "src/core/skill-availability.ts",
        "src/core/skill-catalog.ts",
        "arcforge catalog list returned two arckit-git-branching candidates on 2026-08-14."
      ]
    },
    {
      "id": "FACT-004",
      "revision": 1,
      "status": "accepted",
      "statement": "ArcForge discovery already reads an optional SKILL.md frontmatter version into SkillSummary, but v1 availability plans, catalog entries, list/resolve projections, and conflict handling neither persist nor compare it; neither live arckit-git-branching copy nor any of the 75 scanned arckit SKILL.md files declares version.",
      "basis": "Static tracing from frontmatter discovery through shared types and catalog code, plus a repository-wide version-field count and direct inspection of both installed SKILL.md files, demonstrates the disconnected version metadata path.",
      "evidence": [
        "src/core/skills.ts",
        "src/shared/types.ts",
        "src/core/skill-availability.ts",
        "src/core/skill-catalog.ts",
        "/Users/Glare/.arcforge/catalog/13d0269626c6498125c44fee/arckit-git-branching/SKILL.md",
        "/Users/Glare/.arcforge/catalog/e3a18f888a3e4ab6858235ee/arckit-git-branching/SKILL.md",
        "Repository scan on 2026-08-14 found 0 version fields across 75 arckit skill files."
      ]
    },
    {
      "id": "FACT-005",
      "revision": 1,
      "status": "accepted",
      "statement": "The accepted catalog contract uses normalized case-insensitive skillName as the one logical identity and catalog/<skillName> as the one active path; sourceKey is provenance only, equal content merges source claims, differing valid SemVer upgrades only to the higher version and blocks downgrade, equal-version or unknown-version differences become one fail-closed conflict record, and v1 sourceKey directories migrate without silent deletion.",
      "basis": "The user explicitly required one entry, a flat catalog, and version assistance; the durable product and technical sources now express a coherent model that preserves provenance, path containment, content integrity, compatibility, and explicit cleanup boundaries.",
      "evidence": [
        "arckit/spec/profile/skill-availability.md",
        "arckit/tech/profiles-sync/solution.md",
        "arckit/tech/sources/solution.md",
        "arckit/tech/cli/solution.md",
        "arckit/tech/_shared/models/UserSkillCatalog.yaml",
        "arckit/tech/_shared/models/SkillAvailabilityPlan.yaml",
        "arckit/tech/_shared/models/CatalogVersionDecision.yaml",
        "arckit/tech/_shared/contracts/apply-plan.yaml",
        "arckit/tech/_shared/contracts/apply-run.yaml",
        "arckit/tech/_shared/contracts/apply-drift.yaml",
        "arckit/tech/_shared/contracts/catalog-resolve.yaml",
        "arckit/tech/_map/decision-log.md"
      ]
    },
    {
      "id": "FACT-006",
      "revision": 1,
      "status": "accepted",
      "statement": "The accepted interaction contract presents one normalized-name catalog candidate and flat path, labels valid higher SemVer as an upgrade, blocks lower-version overwrite, fails closed when differing content cannot be ordered safely, requires a snapshot-bound explicit source choice before replanning, and separates legacy sourceKey-directory cleanup from active catalog writes.",
      "basis": "The Destinations interaction strategy and gray wireframe now provide aligned trigger, progression, feedback, recovery, Agent/CLI boundary, and confirmation states for every catalog v2 decision required by FACT-005.",
      "evidence": [
        "arckit/interaction/destinations/interaction.md",
        "arckit/interaction/destinations/default.html",
        "arckit/interaction/_map/feature-matrix.md",
        "arckit/interaction/_map/RELATIONS.md"
      ]
    },
    {
      "id": "FACT-007",
      "revision": 1,
      "status": "accepted",
      "statement": "The repository implementation now projects each normalized skillName to one catalog v2 record and catalog/<skillName> directory, retains source claims including provider payload commit provenance, propagates optional SKILL.md SemVer into plan and catalog decisions, upgrades only to higher differing versions, blocks downgrade and unresolved differences, migrates v1 entries without silent legacy-directory deletion, and fails closed during conflicted resolution.",
      "basis": "The TypeScript implementation, isolated direct/provider migration and plan/apply tests, full regression suite, type checks, CLI build, diff hygiene, and read-only execution against the live v1 index agree on identity, path, ordering, provenance, rollback, and conflict behavior.",
      "evidence": [
        "src/core/skill-catalog.ts",
        "src/core/skill-availability.ts",
        "src/core/skill-availability-apply.ts",
        "src/provider/index.ts",
        "tests/skill-availability.test.mjs",
        "tests/provider.test.mjs",
        "npm run check passed on 2026-08-14.",
        "npm test passed 61 of 61 tests on 2026-08-14.",
        "Read-only live catalog list returned one arckit-git-branching conflict candidate and exact resolve failed closed on 2026-08-14."
      ]
    },
    {
      "id": "FACT-008",
      "revision": 1,
      "status": "accepted",
      "statement": "A caller can now explicitly select the fresh incoming source for a conflicted or downgrade-blocked logical catalog skill using skill, sourceKey, incoming content digest, and expected current catalog digest; matching evidence produces source-selected and is executable, while malformed, duplicate, mismatched, or stale evidence remains blocking.",
      "basis": "The type and technical model define the four-field selection, plan and provider paths propagate it, Desktop presents current/incoming source evidence and requires an explicit checkbox, apply recomputes and validates the choice, and isolated tests prove stale rejection plus successful selected replacement.",
      "evidence": [
        "src/shared/types.ts",
        "src/core/skill-catalog.ts",
        "src/core/skill-availability.ts",
        "src/provider/index.ts",
        "src/ui/views/destinations.tsx",
        "arckit/tech/_shared/models/CatalogSourceSelection.yaml",
        "tests/skill-availability.test.mjs"
      ]
    },
    {
      "id": "FACT-009",
      "revision": 1,
      "status": "accepted",
      "statement": "Legacy sourceKey catalog directories remain confirmation-gated cleanup candidates after the index is already v2, and catalog apply now chooses an incoming active claim directly or a retained claim by both activeSourceKey and active contentDigest, preventing stale version selection when one sourceKey has claims for multiple skill paths.",
      "basis": "The planner no longer depends on transient migratedFromVersion state, apply disambiguates active claims with digest evidence, and the expanded isolated version-plan test exercises both persisted cleanup and same-source old/new path claims through execution.",
      "evidence": [
        "src/core/skill-availability.ts",
        "src/core/skill-availability-apply.ts",
        "tests/skill-availability.test.mjs",
        "npm test passed 61 of 61 tests on 2026-08-14."
      ]
    }
  ],
  "state_impacts": [
    {
      "id": "IMPACT-PRODUCT-CAPABILITIES-001",
      "fact_id": "FACT-005",
      "fact_revision": 1,
      "target": {
        "kind": "software_decision",
        "ref": "product_capabilities",
        "revision": 0
      },
      "effect": "upheld",
      "reason": "The requested one-entry catalog behavior, version comparison, and conflict semantics are now durably specified without claiming the broader open Project capability decision is complete.",
      "gap_ids": [],
      "evidence": [
        "arckit/spec/profile/skill-availability.md"
      ]
    },
    {
      "id": "IMPACT-TECHNICAL-FOUNDATION-001",
      "fact_id": "FACT-005",
      "fact_revision": 1,
      "target": {
        "kind": "software_decision",
        "ref": "technical_foundation",
        "revision": 0
      },
      "effect": "upheld",
      "reason": "The logical identity, provenance, version comparison, migration, path containment, and contract relationships are coherently captured in the technical source of truth.",
      "gap_ids": [],
      "evidence": [
        "arckit/tech/profiles-sync/solution.md",
        "arckit/tech/_shared/models/UserSkillCatalog.yaml",
        "arckit/tech/_shared/models/CatalogVersionDecision.yaml"
      ]
    },
    {
      "id": "IMPACT-INTERACTION-001",
      "fact_id": "FACT-006",
      "fact_revision": 1,
      "target": {
        "kind": "software_invariant",
        "ref": "interaction-expectations-remain-recoverable",
        "revision": null
      },
      "effect": "upheld",
      "reason": "The authoritative Destinations strategy and lineframe make the one-candidate, upgrade, downgrade-blocked, conflict, source-selection, and cleanup journey recoverable across affected surfaces.",
      "gap_ids": [],
      "evidence": [
        "arckit/interaction/destinations/interaction.md",
        "arckit/interaction/destinations/default.html"
      ]
    },
    {
      "id": "IMPACT-REALIZATION-001",
      "fact_id": "FACT-009",
      "fact_revision": 1,
      "target": {
        "kind": "software_invariant",
        "ref": "accepted-facts-are-realized",
        "revision": null
      },
      "effect": "upheld",
      "reason": "Flat identity, version ordering, explicit source recovery, persistent confirmed cleanup, and exact active-provenance binding now realize the complete accepted catalog behavior.",
      "gap_ids": [],
      "evidence": [
        "src/core/skill-catalog.ts",
        "src/core/skill-availability.ts",
        "src/core/skill-availability-apply.ts",
        "src/ui/views/destinations.tsx"
      ]
    },
    {
      "id": "IMPACT-RISK-001",
      "fact_id": "FACT-009",
      "fact_revision": 1,
      "target": {
        "kind": "software_invariant",
        "ref": "material-risks-have-credible-evidence",
        "revision": null
      },
      "effect": "upheld",
      "reason": "Migration persistence, same-source path changes, explicit selection staleness, version decisions, rollback, provider isolation, path containment, and resolver blocking all have repeatable regression evidence.",
      "gap_ids": [],
      "evidence": [
        "tests/skill-availability.test.mjs",
        "tests/provider.test.mjs",
        "npm run check passed on 2026-08-14.",
        "npm test passed 61 of 61 tests on 2026-08-14."
      ]
    }
  ],
  "gaps": [
    {
      "id": "GAP-ESTABLISH-CATALOG-IDENTITY-CAUSE",
      "status": "resolved",
      "goal": "Establish the evidence-backed cause of duplicate logical skills and define the required canonical identity, flat catalog layout, provenance retention, and version-comparison contract that downstream implementation must satisfy.",
      "reason": "The duplicate may originate in discovery, source application, catalog materialization, identity keys, or provider/App integration; those facts determine the safe implementation and migration scope.",
      "derived_from": [
        "FACT-001",
        "FACT-002"
      ],
      "blocked_by": [],
      "priority_basis": {
        "blocking": "high",
        "uncertainty": "high",
        "risk": "medium",
        "user_impact": "high"
      },
      "responsibility": "agent",
      "evidence_required": [
        "Reproduce or inspect the two arckit-git-branching catalog records and their on-disk paths.",
        "Trace sourceKey, installed path, and skill-name identity through discovery, apply, catalog materialization, and provider/App integration.",
        "Document a durable product and technical contract for one logical skill entry, direct catalog layout, provenance, version semantics, and compatibility/migration constraints."
      ],
      "resolution": {
        "id": "GAP-ESTABLISH-CATALOG-IDENTITY-CAUSE",
        "status": "resolved",
        "outcome": "The duplicate was reproduced and fully explained by sourceKey-scoped identity and paths; the durable contract now defines one normalized-name catalog record, a flat skill path, sourceKey-only provenance, SemVer comparison, fail-closed conflicts, and v1 migration behavior.",
        "reason": "Live catalog/index evidence exactly matches the current sourceKey plus skillPath uniqueness and sourceKey directory implementation, while the updated spec, solution, models, contracts, maps, and decision log make the intended replacement behavior recoverable.",
        "evidence": [
          "/Users/Glare/.arcforge/catalog/index.json",
          "src/core/skill-availability.ts",
          "src/core/skill-catalog.ts",
          "src/provider/index.ts",
          "arckit/spec/profile/skill-availability.md",
          "arckit/tech/profiles-sync/solution.md",
          "arckit/tech/_shared/models/UserSkillCatalog.yaml",
          "arckit/tech/_shared/models/CatalogVersionDecision.yaml",
          "arckit/tech/_shared/contracts/catalog-resolve.yaml"
        ],
        "occurred_at": "2026-08-14T10:55:46.081Z"
      }
    },
    {
      "id": "GAP-DEFINE-CATALOG-CONFLICT-INTERACTION",
      "status": "resolved",
      "goal": "Define the authoritative Agent/CLI/Desktop interaction states for one logical catalog candidate, version upgrade or downgrade blocking, unresolved same-name conflict, explicit source selection, and confirmed legacy cleanup.",
      "reason": "The accepted identity and version contract changes user progression, feedback, and recovery behavior, which must be recoverable before implementation fixes response surfaces.",
      "derived_from": [
        "FACT-005"
      ],
      "blocked_by": [],
      "priority_basis": {
        "blocking": "high",
        "uncertainty": "medium",
        "user_impact": "high",
        "risk": "medium"
      },
      "responsibility": "agent",
      "evidence_required": [
        "Updated arckit interaction artifact covering ready, upgrade, downgrade-blocked, conflict, explicit resolution, and cleanup confirmation states."
      ],
      "resolution": {
        "id": "GAP-DEFINE-CATALOG-CONFLICT-INTERACTION",
        "status": "resolved",
        "outcome": "Destinations now defines and projects one logical catalog candidate, equal-content source merging, explicit version upgrades, downgrade blocking, fail-closed unresolved conflicts, snapshot-bound source selection, and separately confirmed legacy sourceKey-directory cleanup across Desktop, Agent, and CLI behavior.",
        "reason": "The interaction strategy, normative states, wireframe, index, feature matrix, and relations consistently project every interaction state required by the accepted catalog v2 contract.",
        "evidence": [
          "arckit/interaction/destinations/interaction.md",
          "arckit/interaction/destinations/default.html",
          "arckit/interaction/INDEX.md",
          "arckit/interaction/_map/feature-matrix.md",
          "arckit/interaction/_map/RELATIONS.md"
        ],
        "occurred_at": "2026-08-14T11:02:10.943Z"
      }
    },
    {
      "id": "GAP-IMPLEMENT-CATALOG-V2",
      "status": "resolved",
      "goal": "Implement and verify the flat logical-name catalog, version propagation and comparison, provider provenance handoff, v1 migration, resolver fail-closed behavior, and regression coverage without mutating the real user catalog during tests.",
      "reason": "The root cause and durable contract are accepted, but the code and existing v1 state do not yet realize them.",
      "derived_from": [
        "FACT-003",
        "FACT-004",
        "FACT-005"
      ],
      "blocked_by": [
        "GAP-DEFINE-CATALOG-CONFLICT-INTERACTION"
      ],
      "priority_basis": {
        "blocking": "high",
        "risk": "high",
        "user_impact": "high",
        "dependency": "interaction states must be accepted first"
      },
      "responsibility": "agent",
      "evidence_required": [
        "TypeScript models and core paths implement one normalized-name entry and catalog/<skillName> destination while retaining source provenance.",
        "Availability plan, apply, drift, provider integration, list, and resolve propagate version and enforce merge, upgrade, downgrade-blocked, and conflict decisions.",
        "Version 1 catalog migration is atomic, deterministic, compatible with legacy qualified names, and never silently deletes unresolved legacy directories.",
        "Tests cover direct plus provider copies of the same skill, equal content, higher and lower SemVer, equal-version differing content, missing version, path containment, rollback, and resolver conflict behavior using isolated ARCFORGE_HOME.",
        "Type checks, relevant tests, full regression tests, and diff hygiene pass with no temporary debug marker or real user catalog mutation."
      ],
      "resolution": {
        "id": "GAP-IMPLEMENT-CATALOG-V2",
        "status": "resolved",
        "outcome": "Catalog v2 now uses one normalized logical skill entry and catalog/<skillName> projection, retains per-source provenance, propagates optional skill versions, applies fail-closed SemVer decisions, migrates v1 deterministically, and updates provider, loader, UI, rollback, and removal behavior.",
        "reason": "The implementation matches the accepted contract and is supported by isolated direct/provider migration and plan/apply tests, the full regression suite, type checking, diff hygiene, and a read-only projection of the live v1 catalog that returns one conflicting arckit-git-branching candidate.",
        "evidence": [
          "src/core/skill-catalog.ts",
          "src/core/skill-availability.ts",
          "src/core/skill-availability-apply.ts",
          "src/core/sources.ts",
          "src/provider/index.ts",
          "src/shared/types.ts",
          "src/ui/views/destinations.tsx",
          "skills/arcforge-on-demand/SKILL.md",
          "tests/skill-availability.test.mjs",
          "tests/provider.test.mjs",
          "npm run check passed on 2026-08-14.",
          "npm test passed 61 of 61 tests on 2026-08-14.",
          "Read-only live catalog list returned one arckit-git-branching candidate with status conflict on 2026-08-14.",
          "git diff --check passed and no temporary debug marker was found."
        ],
        "occurred_at": "2026-08-14T11:23:18.766Z"
      }
    },
    {
      "id": "CASE-20260814-002:review-finding:CONFLICT-RESOLUTION-MISSING",
      "status": "resolved",
      "goal": "Resolve review finding: Provide a snapshot-bound explicit source selection that can turn one conflicted logical catalog record into an executable replan; without it, the live missing-version conflict is fail-closed but permanently stuck even after one source is intentionally chosen.",
      "reason": "omission found by completion review",
      "derived_from": [
        "completion_review",
        "content_revision:3"
      ],
      "blocked_by": [],
      "priority_basis": {
        "blocking": "high",
        "risk": "high"
      },
      "responsibility": "agent",
      "evidence_required": [
        "src/core/skill-availability.ts",
        "src/core/skill-catalog.ts",
        "src/provider/index.ts",
        "src/ui/views/destinations.tsx",
        "arckit/interaction/destinations/interaction.md",
        "CatalogVersionDecision has no explicit-resolution action or selected source input.",
        "CreateSkillAvailabilityPlanOptions and ProvisioningOptions have no catalog conflict selection field.",
        "The live arckit-git-branching entry lists once as conflict and exact resolve fails closed, but no current plan input can resolve it."
      ],
      "resolution": {
        "id": "CASE-20260814-002:review-finding:CONFLICT-RESOLUTION-MISSING",
        "status": "resolved",
        "outcome": "CatalogSourceSelection now binds skill, incoming sourceKey and content digest to the observed current catalog digest; core emits source-selected only when fresh evidence matches, provider and Desktop pass the choice through, stale choices block, and apply materializes the explicitly selected incoming source.",
        "reason": "The shared type, planner, catalog decision, apply path, provider options, Desktop confirmation, technical model/contracts, type checks, and isolated plan/apply regressions now form one executable and stale-safe recovery path.",
        "evidence": [
          "src/shared/types.ts",
          "src/core/skill-catalog.ts",
          "src/core/skill-availability.ts",
          "src/core/skill-availability-apply.ts",
          "src/core/sources.ts",
          "src/provider/index.ts",
          "src/ui/views/destinations.tsx",
          "src/ui/main.tsx",
          "arckit/tech/_shared/models/CatalogSourceSelection.yaml",
          "arckit/tech/_shared/contracts/apply-plan.yaml",
          "arckit/tech/_shared/contracts/apply-run.yaml",
          "tests/skill-availability.test.mjs",
          "npm run check passed on 2026-08-14.",
          "Targeted availability and provider tests passed 26 of 26 on 2026-08-14."
        ],
        "occurred_at": "2026-08-14T12:30:48.338Z"
      }
    },
    {
      "id": "CASE-20260814-002:review-finding:MIGRATION-CLAIM-HARDENING",
      "status": "resolved",
      "goal": "Resolve review finding: Keep discovering confirmed-cleanup candidates for extant legacy sourceKey directories after the index has already become v2, and select an active source claim by sourceKey plus active digest so a same-source skill path change cannot retain the old claim version.",
      "reason": "error found by completion review",
      "derived_from": [
        "completion_review",
        "content_revision:3"
      ],
      "blocked_by": [],
      "priority_basis": {
        "blocking": "high",
        "risk": "high"
      },
      "responsibility": "agent",
      "evidence_required": [
        "src/core/skill-availability.ts",
        "src/core/skill-availability-apply.ts",
        "tests/skill-availability.test.mjs",
        "legacyCatalogCleanupItems returns early unless migratedFromVersion is present, which is transient and absent after the first v2 index write.",
        "createCatalogEntries selects activeClaim using sourceKey alone even though sourceClaims can contain the same sourceKey with different skillPath values."
      ],
      "resolution": {
        "id": "CASE-20260814-002:review-finding:MIGRATION-CLAIM-HARDENING",
        "status": "resolved",
        "outcome": "Availability planning now derives legacy cleanup candidates from every extant sourceKey directory represented by catalog source claims regardless of index version, and apply binds active provenance to the exact incoming claim or retained sourceKey plus content digest.",
        "reason": "The two faulty conditions were replaced directly, the technical migration contract was clarified, and isolated tests prove post-v2 cleanup persistence plus correct active version under same-source path changes; all 61 regressions and type checks pass.",
        "evidence": [
          "src/core/skill-availability.ts",
          "src/core/skill-availability-apply.ts",
          "arckit/tech/profiles-sync/solution.md",
          "arckit/tech/_shared/models/UserSkillCatalog.yaml",
          "arckit/tech/_shared/contracts/apply-plan.yaml",
          "tests/skill-availability.test.mjs",
          "npm run check passed on 2026-08-14.",
          "Targeted availability and provider tests passed 26 of 26 on 2026-08-14.",
          "npm test passed 61 of 61 tests on 2026-08-14.",
          "git diff --check passed on 2026-08-14."
        ],
        "occurred_at": "2026-08-14T12:34:28.344Z"
      }
    }
  ],
  "content_revision": 5,
  "completion_review": {
    "status": "clean",
    "policy": {
      "initial_max_cycles": 3,
      "source": "using-arckit autonomous completion review policy",
      "snapshotted_at": "2026-08-14T10:43:59.531Z"
    },
    "additional_cycles_authorized": 0,
    "cycle_count": 2,
    "reviewed_content_revision": 5,
    "dimensions": {
      "implementation_correctness": "clean",
      "problem_resolution": "clean",
      "verification_credibility": "clean",
      "regression_risk": "clean",
      "minimality": "clean"
    },
    "findings": [],
    "cycles": [
      {
        "cycle": 1,
        "autonomous_cycle": 1,
        "reviewer": "agent",
        "outcome": "findings",
        "content_revision": 3,
        "dimensions": {
          "implementation_correctness": "findings",
          "problem_resolution": "findings",
          "verification_credibility": "clean",
          "regression_risk": "findings",
          "minimality": "clean"
        },
        "finding_ids": [
          "CONFLICT-RESOLUTION-MISSING",
          "MIGRATION-CLAIM-HARDENING"
        ],
        "evidence": [
          "src/core/skill-catalog.ts",
          "src/core/skill-availability.ts",
          "src/core/skill-availability-apply.ts",
          "src/provider/index.ts",
          "src/ui/views/destinations.tsx",
          "arckit/spec/profile/skill-availability.md",
          "arckit/interaction/destinations/interaction.md",
          "tests/skill-availability.test.mjs",
          "Read-only live exact resolve remains fail-closed for arckit-git-branching."
        ],
        "occurred_at": "2026-08-14T11:25:57.153Z"
      },
      {
        "cycle": 2,
        "autonomous_cycle": 2,
        "reviewer": "agent",
        "outcome": "clean",
        "content_revision": 5,
        "dimensions": {
          "implementation_correctness": "clean",
          "problem_resolution": "clean",
          "verification_credibility": "clean",
          "regression_risk": "clean",
          "minimality": "clean"
        },
        "finding_ids": [],
        "evidence": [
          "Normalized v1 entries produce one logical candidate and flat v2 destinations; resolver rejects conflict, path escape, and digest drift.",
          "SemVer install, merge, upgrade, downgrade block, equal-version conflict, missing-version conflict, explicit source selection, and stale selection are covered by isolated execution tests.",
          "Provider payload provenance, isolated state, apply, removal, and rollback behavior are covered by provider and availability tests.",
          "Post-v2 legacy cleanup persistence and same-source multi-path claim selection are exercised by the final regression.",
          "npm run check passed on 2026-08-14.",
          "npm test passed 61 of 61 tests on 2026-08-14.",
          "npm run build passed on 2026-08-14.",
          "Read-only live catalog projection returned exactly one arckit-git-branching candidate with status conflict.",
          "git diff --check passed and no temporary debug marker was found."
        ],
        "occurred_at": "2026-08-14T12:36:22.011Z"
      }
    ],
    "evidence": [
      "src/core/skill-catalog.ts",
      "src/core/skill-availability.ts",
      "src/core/skill-availability-apply.ts",
      "src/provider/index.ts",
      "src/ui/views/destinations.tsx",
      "arckit/spec/profile/skill-availability.md",
      "arckit/interaction/destinations/interaction.md",
      "tests/skill-availability.test.mjs",
      "Read-only live exact resolve remains fail-closed for arckit-git-branching.",
      "Normalized v1 entries produce one logical candidate and flat v2 destinations; resolver rejects conflict, path escape, and digest drift.",
      "SemVer install, merge, upgrade, downgrade block, equal-version conflict, missing-version conflict, explicit source selection, and stale selection are covered by isolated execution tests.",
      "Provider payload provenance, isolated state, apply, removal, and rollback behavior are covered by provider and availability tests.",
      "Post-v2 legacy cleanup persistence and same-source multi-path claim selection are exercised by the final regression.",
      "npm run check passed on 2026-08-14.",
      "npm test passed 61 of 61 tests on 2026-08-14.",
      "npm run build passed on 2026-08-14.",
      "Read-only live catalog projection returned exactly one arckit-git-branching candidate with status conflict.",
      "git diff --check passed and no temporary debug marker was found."
    ],
    "escalation": null,
    "human_authorizations": []
  },
  "open_questions": [],
  "decisions": [],
  "pending_handoffs": [],
  "process_notes": [],
  "rounds": [
    {
      "round": 1,
      "transition_schema_version": "arckit-case-transition/v8",
      "goal": "Reproduce the duplicate, trace its complete identity path, and persist the resulting logical identity, version-selection, provenance, and migration contract.",
      "outcome": "completed",
      "gap_selection": {
        "mode": "candidate",
        "basis": "The duplicate catalog identity blocks the requested behavior and its unknown cause determines the safe model, migration, and provider integration scope; the unrelated installed-loader authorization remains a separate human decision.",
        "snapshot_token": "972e550a5e673c7038f810d2c6e6ffeb3a4c0b9637de39abf7009691ee13f0c8",
        "selected_ref": "case-gap:CASE-20260814-002:GAP-ESTABLISH-CATALOG-IDENTITY-CAUSE",
        "comparison_summary": "Selected the agent-ready catalog identity diagnosis over the unrelated CASE-001 human authorization because it directly serves the current request and removes the highest implementation uncertainty.",
        "fresh_discovery_summary": "No additional fresh candidate was selected at opening; diagnosis later exposed separate interaction-realization and implementation obligations, which are recorded as future gaps without being executed in this round.",
        "considered": [
          {
            "ref": "case-gap:CASE-20260814-001:GAP-AUTHORIZE-INSTALLED-LOADER-UPDATE",
            "source": "persisted",
            "eligibility": "ready",
            "disposition": "deferred",
            "priority_basis": {
              "responsibility": "human",
              "user_impact": "high",
              "relevance": "separate on-demand loader installation Case"
            },
            "reason": "This is a user-level overwrite authorization for a prior Case and does not establish the cause or contract of the newly reported duplicate catalog identity."
          },
          {
            "ref": "case-gap:CASE-20260814-002:GAP-ESTABLISH-CATALOG-IDENTITY-CAUSE",
            "source": "persisted",
            "eligibility": "ready",
            "disposition": "selected",
            "priority_basis": {
              "blocking": "high",
              "uncertainty": "high",
              "user_impact": "high",
              "risk": "medium"
            },
            "reason": "It directly establishes the prerequisite identity, provenance, version, and migration facts needed before a safe implementation can be chosen."
          }
        ]
      },
      "selected_gap": {
        "id": "GAP-ESTABLISH-CATALOG-IDENTITY-CAUSE",
        "responsibility": "agent",
        "goal": "Establish the evidence-backed cause of duplicate logical skills and define the required canonical identity, flat catalog layout, provenance retention, and version-comparison contract that downstream implementation must satisfy.",
        "reason": "The duplicate may originate in discovery, source application, catalog materialization, identity keys, or provider/App integration; those facts determine the safe implementation and migration scope.",
        "derived_from": [
          "FACT-001",
          "FACT-002"
        ],
        "blocked_by": [],
        "priority_basis": {
          "blocking": "high",
          "uncertainty": "high",
          "risk": "medium",
          "user_impact": "high"
        },
        "evidence_required": [
          "Reproduce or inspect the two arckit-git-branching catalog records and their on-disk paths.",
          "Trace sourceKey, installed path, and skill-name identity through discovery, apply, catalog materialization, and provider/App integration.",
          "Document a durable product and technical contract for one logical skill entry, direct catalog layout, provenance, version semantics, and compatibility/migration constraints."
        ]
      },
      "planned_transition": {
        "goal": "Reproduce the duplicate, trace its complete identity path, and persist the resulting logical identity, version-selection, provenance, and migration contract.",
        "expected_state_change": "The Case accepts an evidence-backed root cause and durable product/technical contract, resolves the diagnosis gap, and records but does not execute the newly exposed interaction and implementation obligations."
      },
      "accepted_state_delta": {
        "resolved_gap": {
          "id": "GAP-ESTABLISH-CATALOG-IDENTITY-CAUSE",
          "status": "resolved",
          "outcome": "The duplicate was reproduced and fully explained by sourceKey-scoped identity and paths; the durable contract now defines one normalized-name catalog record, a flat skill path, sourceKey-only provenance, SemVer comparison, fail-closed conflicts, and v1 migration behavior.",
          "reason": "Live catalog/index evidence exactly matches the current sourceKey plus skillPath uniqueness and sourceKey directory implementation, while the updated spec, solution, models, contracts, maps, and decision log make the intended replacement behavior recoverable.",
          "evidence": [
            "/Users/Glare/.arcforge/catalog/index.json",
            "src/core/skill-availability.ts",
            "src/core/skill-catalog.ts",
            "src/provider/index.ts",
            "arckit/spec/profile/skill-availability.md",
            "arckit/tech/profiles-sync/solution.md",
            "arckit/tech/_shared/models/UserSkillCatalog.yaml",
            "arckit/tech/_shared/models/CatalogVersionDecision.yaml",
            "arckit/tech/_shared/contracts/catalog-resolve.yaml"
          ]
        },
        "facts_added": [
          {
            "id": "FACT-003",
            "revision": 1,
            "status": "accepted",
            "statement": "The two live arckit-git-branching candidates are deterministic products of the v1 design: the provider payload at the App-managed current path has sourceKey 13d0269626c6498125c44fee, the direct Git checkout has sourceKey e3a18f888a3e4ab6858235ee, availability maps each to catalog/<sourceKey>/<skillName>, and the catalog validates sourceKey plus skillPath as unique, so the same logical name is intentionally retained twice.",
            "basis": "The live index, physical directories, catalog list output, applied relation records, source identity implementation, availability destination mapping, and catalog uniqueness validator agree on trigger, state change, location, and ordering with no competing explanation.",
            "evidence": [
              "/Users/Glare/.arcforge/catalog/index.json",
              "/Users/Glare/.arcforge/projects/de09ef435cd57a8f80524040.json",
              "/Users/Glare/.arcforge/projects/e3a18f888a3e4ab6858235ee.json",
              "src/core/skill-availability.ts",
              "src/core/skill-catalog.ts",
              "arcforge catalog list returned two arckit-git-branching candidates on 2026-08-14."
            ]
          },
          {
            "id": "FACT-004",
            "revision": 1,
            "status": "accepted",
            "statement": "ArcForge discovery already reads an optional SKILL.md frontmatter version into SkillSummary, but v1 availability plans, catalog entries, list/resolve projections, and conflict handling neither persist nor compare it; neither live arckit-git-branching copy nor any of the 75 scanned arckit SKILL.md files declares version.",
            "basis": "Static tracing from frontmatter discovery through shared types and catalog code, plus a repository-wide version-field count and direct inspection of both installed SKILL.md files, demonstrates the disconnected version metadata path.",
            "evidence": [
              "src/core/skills.ts",
              "src/shared/types.ts",
              "src/core/skill-availability.ts",
              "src/core/skill-catalog.ts",
              "/Users/Glare/.arcforge/catalog/13d0269626c6498125c44fee/arckit-git-branching/SKILL.md",
              "/Users/Glare/.arcforge/catalog/e3a18f888a3e4ab6858235ee/arckit-git-branching/SKILL.md",
              "Repository scan on 2026-08-14 found 0 version fields across 75 arckit skill files."
            ]
          },
          {
            "id": "FACT-005",
            "revision": 1,
            "status": "accepted",
            "statement": "The accepted catalog contract uses normalized case-insensitive skillName as the one logical identity and catalog/<skillName> as the one active path; sourceKey is provenance only, equal content merges source claims, differing valid SemVer upgrades only to the higher version and blocks downgrade, equal-version or unknown-version differences become one fail-closed conflict record, and v1 sourceKey directories migrate without silent deletion.",
            "basis": "The user explicitly required one entry, a flat catalog, and version assistance; the durable product and technical sources now express a coherent model that preserves provenance, path containment, content integrity, compatibility, and explicit cleanup boundaries.",
            "evidence": [
              "arckit/spec/profile/skill-availability.md",
              "arckit/tech/profiles-sync/solution.md",
              "arckit/tech/sources/solution.md",
              "arckit/tech/cli/solution.md",
              "arckit/tech/_shared/models/UserSkillCatalog.yaml",
              "arckit/tech/_shared/models/SkillAvailabilityPlan.yaml",
              "arckit/tech/_shared/models/CatalogVersionDecision.yaml",
              "arckit/tech/_shared/contracts/apply-plan.yaml",
              "arckit/tech/_shared/contracts/apply-run.yaml",
              "arckit/tech/_shared/contracts/apply-drift.yaml",
              "arckit/tech/_shared/contracts/catalog-resolve.yaml",
              "arckit/tech/_map/decision-log.md"
            ]
          }
        ],
        "facts_superseded": [],
        "impacts_added": [
          {
            "id": "IMPACT-PRODUCT-CAPABILITIES-001",
            "fact_id": "FACT-005",
            "fact_revision": 1,
            "target": {
              "kind": "software_decision",
              "ref": "product_capabilities",
              "revision": 0
            },
            "effect": "upheld",
            "reason": "The requested one-entry catalog behavior, version comparison, and conflict semantics are now durably specified without claiming the broader open Project capability decision is complete.",
            "gap_ids": [],
            "evidence": [
              "arckit/spec/profile/skill-availability.md"
            ]
          },
          {
            "id": "IMPACT-TECHNICAL-FOUNDATION-001",
            "fact_id": "FACT-005",
            "fact_revision": 1,
            "target": {
              "kind": "software_decision",
              "ref": "technical_foundation",
              "revision": 0
            },
            "effect": "upheld",
            "reason": "The logical identity, provenance, version comparison, migration, path containment, and contract relationships are coherently captured in the technical source of truth.",
            "gap_ids": [],
            "evidence": [
              "arckit/tech/profiles-sync/solution.md",
              "arckit/tech/_shared/models/UserSkillCatalog.yaml",
              "arckit/tech/_shared/models/CatalogVersionDecision.yaml"
            ]
          },
          {
            "id": "IMPACT-INTERACTION-001",
            "fact_id": "FACT-005",
            "fact_revision": 1,
            "target": {
              "kind": "software_invariant",
              "ref": "interaction-expectations-remain-recoverable",
              "revision": null
            },
            "effect": "threatened",
            "reason": "The new conflict and version-decision states change what users and Agents see and how they recover, but the authoritative interaction artifact has not yet been updated.",
            "gap_ids": [
              "GAP-DEFINE-CATALOG-CONFLICT-INTERACTION"
            ],
            "evidence": [
              "arckit/spec/profile/skill-availability.md",
              "arckit/interaction/skills/interaction.md"
            ]
          },
          {
            "id": "IMPACT-REALIZATION-001",
            "fact_id": "FACT-005",
            "fact_revision": 1,
            "target": {
              "kind": "software_invariant",
              "ref": "accepted-facts-are-realized",
              "revision": null
            },
            "effect": "threatened",
            "reason": "The current TypeScript implementation and live v1 catalog still use sourceKey-scoped identities and do not implement the accepted version contract.",
            "gap_ids": [
              "GAP-IMPLEMENT-CATALOG-V2"
            ],
            "evidence": [
              "src/core/skill-availability.ts",
              "src/core/skill-catalog.ts",
              "/Users/Glare/.arcforge/catalog/index.json"
            ]
          },
          {
            "id": "IMPACT-RISK-001",
            "fact_id": "FACT-005",
            "fact_revision": 1,
            "target": {
              "kind": "software_invariant",
              "ref": "material-risks-have-credible-evidence",
              "revision": null
            },
            "effect": "threatened",
            "reason": "The migration and downgrade/conflict safety rules are accepted, but their atomicity, compatibility, and regression behavior are not yet implemented or tested.",
            "gap_ids": [
              "GAP-IMPLEMENT-CATALOG-V2"
            ],
            "evidence": [
              "arckit/tech/profiles-sync/solution.md",
              "arckit/tech/_shared/contracts/apply-run.yaml"
            ]
          }
        ],
        "impacts_updated": [],
        "gaps_added": [
          {
            "id": "GAP-DEFINE-CATALOG-CONFLICT-INTERACTION",
            "status": "open",
            "goal": "Define the authoritative Agent/CLI/Desktop interaction states for one logical catalog candidate, version upgrade or downgrade blocking, unresolved same-name conflict, explicit source selection, and confirmed legacy cleanup.",
            "reason": "The accepted identity and version contract changes user progression, feedback, and recovery behavior, which must be recoverable before implementation fixes response surfaces.",
            "derived_from": [
              "FACT-005"
            ],
            "blocked_by": [],
            "priority_basis": {
              "blocking": "high",
              "uncertainty": "medium",
              "user_impact": "high",
              "risk": "medium"
            },
            "responsibility": "agent",
            "evidence_required": [
              "Updated arckit interaction artifact covering ready, upgrade, downgrade-blocked, conflict, explicit resolution, and cleanup confirmation states."
            ],
            "resolution": null
          },
          {
            "id": "GAP-IMPLEMENT-CATALOG-V2",
            "status": "open",
            "goal": "Implement and verify the flat logical-name catalog, version propagation and comparison, provider provenance handoff, v1 migration, resolver fail-closed behavior, and regression coverage without mutating the real user catalog during tests.",
            "reason": "The root cause and durable contract are accepted, but the code and existing v1 state do not yet realize them.",
            "derived_from": [
              "FACT-003",
              "FACT-004",
              "FACT-005"
            ],
            "blocked_by": [
              "GAP-DEFINE-CATALOG-CONFLICT-INTERACTION"
            ],
            "priority_basis": {
              "blocking": "high",
              "risk": "high",
              "user_impact": "high",
              "dependency": "interaction states must be accepted first"
            },
            "responsibility": "agent",
            "evidence_required": [
              "TypeScript models and core paths implement one normalized-name entry and catalog/<skillName> destination while retaining source provenance.",
              "Availability plan, apply, drift, provider integration, list, and resolve propagate version and enforce merge, upgrade, downgrade-blocked, and conflict decisions.",
              "Version 1 catalog migration is atomic, deterministic, compatible with legacy qualified names, and never silently deletes unresolved legacy directories.",
              "Tests cover direct plus provider copies of the same skill, equal content, higher and lower SemVer, equal-version differing content, missing version, path containment, rollback, and resolver conflict behavior using isolated ARCFORGE_HOME.",
              "Type checks, relevant tests, full regression tests, and diff hygiene pass with no temporary debug marker or real user catalog mutation."
            ],
            "resolution": null
          }
        ],
        "gaps_cancelled": [],
        "resolved_open_questions": [],
        "completed_handoffs": [],
        "completion_review_result": null,
        "resolved_review_findings": [],
        "review_budget_extension": null
      },
      "project_state_delta": {
        "software_definition_changes": [],
        "software_invariant_changes": [],
        "project_gap_changes": [],
        "selection_context_change": null,
        "evidence": []
      },
      "invariant_assessment": {
        "project_revision": 2,
        "judgments": [
          {
            "invariant_ref": "product-expectations-remain-recoverable",
            "disposition": "upheld",
            "reason": "The one-entry catalog identity, flat path, version-selection rules, conflict behavior, provenance, and migration acceptance meaning are durable and unambiguous.",
            "fact_refs": [
              "FACT-002",
              "FACT-005"
            ],
            "evidence": [
              "arckit/spec/profile/skill-availability.md",
              "arckit/spec/INDEX.md"
            ],
            "gap_refs": []
          },
          {
            "invariant_ref": "interaction-expectations-remain-recoverable",
            "disposition": "threatened",
            "reason": "The accepted version and conflict states materially change user and Agent progression, but the interaction source still reflects the previous catalog behavior.",
            "fact_refs": [
              "FACT-005"
            ],
            "evidence": [],
            "gap_refs": [
              "GAP-DEFINE-CATALOG-CONFLICT-INTERACTION"
            ]
          },
          {
            "invariant_ref": "visual-language-remains-consistent",
            "disposition": "not_relevant",
            "reason": "The accepted facts define catalog identity, data, version, migration, and response semantics; they do not establish or revise any visual-language rule.",
            "fact_refs": [],
            "evidence": [],
            "gap_refs": []
          },
          {
            "invariant_ref": "technical-decisions-remain-explainable",
            "disposition": "upheld",
            "reason": "The technical sources explain the sourceKey root cause and the replacement logical identity, SemVer, provenance, migration, compatibility, containment, and rollback boundaries.",
            "fact_refs": [
              "FACT-003",
              "FACT-004",
              "FACT-005"
            ],
            "evidence": [
              "arckit/tech/profiles-sync/solution.md",
              "arckit/tech/_shared/models/UserSkillCatalog.yaml",
              "arckit/tech/_shared/models/CatalogVersionDecision.yaml",
              "arckit/tech/_shared/contracts/catalog-resolve.yaml"
            ],
            "gap_refs": []
          },
          {
            "invariant_ref": "accepted-facts-are-realized",
            "disposition": "threatened",
            "reason": "The current implementation and live catalog still realize v1 sourceKey-scoped behavior rather than the newly accepted contract.",
            "fact_refs": [
              "FACT-003",
              "FACT-005"
            ],
            "evidence": [],
            "gap_refs": [
              "GAP-IMPLEMENT-CATALOG-V2"
            ]
          },
          {
            "invariant_ref": "material-risks-have-credible-evidence",
            "disposition": "threatened",
            "reason": "Root-cause evidence is credible, but migration atomicity, downgrade prevention, conflict fail-closed behavior, and compatibility still require implementation and repeatable tests.",
            "fact_refs": [
              "FACT-004",
              "FACT-005"
            ],
            "evidence": [],
            "gap_refs": [
              "GAP-IMPLEMENT-CATALOG-V2"
            ]
          }
        ]
      },
      "evidence": [
        "Live ~/.arcforge/catalog/index.json contains two arckit-git-branching entries with sourceKeys 13d0269626c6498125c44fee and e3a18f888a3e4ab6858235ee and different content digests.",
        "The provider entry points to the App-managed payload source while the direct entry points to the local Git checkout; both use delivery/skills/arckit-git-branching.",
        "Source analysis shows resolveSourceIdentity falls back to payload realpath without Git metadata, availabilityDestinations emits catalog/sourceKey/skillName, and catalog v1 accepts sourceKey plus skillPath uniqueness.",
        "Both catalog copies and all 75 scanned arckit skills lack a frontmatter version even though discovery reads an optional version into SkillSummary.",
        "Updated product and technical Markdown/YAML facts pass YAML parsing and git diff --check; no runtime code or real catalog files were modified."
      ],
      "runtime_result_ref": "",
      "occurred_at": "2026-08-14T10:55:46.081Z"
    },
    {
      "round": 2,
      "transition_schema_version": "arckit-case-transition/v8",
      "goal": "Make catalog v2 progression, feedback, conflict resolution, and legacy cleanup recoverable across Desktop, Agent, and CLI surfaces.",
      "outcome": "completed",
      "gap_selection": {
        "mode": "candidate",
        "basis": "The interaction gap is the only agent-ready candidate in this Case and directly unblocks implementation; the other ready persisted candidate belongs to an unrelated Case and requires human authorization.",
        "snapshot_token": "c554dc5d511939475c7c76f599c59cbf0ccfddd13523efa8cfa24153786ad4ed",
        "selected_ref": "case-gap:CASE-20260814-002:GAP-DEFINE-CATALOG-CONFLICT-INTERACTION",
        "comparison_summary": "Selected the catalog conflict interaction gap because it is the highest-priority ready dependency for implementation; deferred the unrelated installed-loader authorization.",
        "fresh_discovery_summary": "No higher-priority fresh gap was discovered; implementation remains the next obligation after this interaction dependency resolves.",
        "considered": [
          {
            "ref": "case-gap:CASE-20260814-001:GAP-AUTHORIZE-INSTALLED-LOADER-UPDATE",
            "source": "persisted",
            "eligibility": "ready",
            "disposition": "deferred",
            "priority_basis": {
              "responsibility": "human",
              "relevance": "separate Case"
            },
            "reason": "It governs overwriting a separately installed loader and is outside this catalog interaction transition."
          },
          {
            "ref": "case-gap:CASE-20260814-002:GAP-DEFINE-CATALOG-CONFLICT-INTERACTION",
            "source": "persisted",
            "eligibility": "ready",
            "disposition": "selected",
            "priority_basis": {
              "blocking": "high",
              "user_impact": "high"
            },
            "reason": "It makes progression, feedback, conflict resolution, and cleanup recoverable and unblocks implementation."
          }
        ]
      },
      "selected_gap": {
        "id": "GAP-DEFINE-CATALOG-CONFLICT-INTERACTION",
        "responsibility": "agent",
        "goal": "Define the authoritative Agent/CLI/Desktop interaction states for one logical catalog candidate, version upgrade or downgrade blocking, unresolved same-name conflict, explicit source selection, and confirmed legacy cleanup.",
        "reason": "The accepted identity and version contract changes user progression, feedback, and recovery behavior, which must be recoverable before implementation fixes response surfaces.",
        "derived_from": [
          "FACT-005"
        ],
        "blocked_by": [],
        "priority_basis": {
          "blocking": "high",
          "uncertainty": "medium",
          "risk": "medium",
          "user_impact": "high"
        },
        "evidence_required": [
          "Updated arckit interaction artifact covering ready, upgrade, downgrade-blocked, conflict, explicit resolution, and cleanup confirmation states."
        ]
      },
      "planned_transition": {
        "goal": "Make catalog v2 progression, feedback, conflict resolution, and legacy cleanup recoverable across Desktop, Agent, and CLI surfaces.",
        "expected_state_change": "Resolve the interaction gap, uphold the interaction invariant, and make implementation ready without changing runtime behavior in this round."
      },
      "accepted_state_delta": {
        "resolved_gap": {
          "id": "GAP-DEFINE-CATALOG-CONFLICT-INTERACTION",
          "status": "resolved",
          "outcome": "Destinations now defines and projects one logical catalog candidate, equal-content source merging, explicit version upgrades, downgrade blocking, fail-closed unresolved conflicts, snapshot-bound source selection, and separately confirmed legacy sourceKey-directory cleanup across Desktop, Agent, and CLI behavior.",
          "reason": "The interaction strategy, normative states, wireframe, index, feature matrix, and relations consistently project every interaction state required by the accepted catalog v2 contract.",
          "evidence": [
            "arckit/interaction/destinations/interaction.md",
            "arckit/interaction/destinations/default.html",
            "arckit/interaction/INDEX.md",
            "arckit/interaction/_map/feature-matrix.md",
            "arckit/interaction/_map/RELATIONS.md"
          ]
        },
        "facts_added": [
          {
            "id": "FACT-006",
            "revision": 1,
            "status": "accepted",
            "statement": "The accepted interaction contract presents one normalized-name catalog candidate and flat path, labels valid higher SemVer as an upgrade, blocks lower-version overwrite, fails closed when differing content cannot be ordered safely, requires a snapshot-bound explicit source choice before replanning, and separates legacy sourceKey-directory cleanup from active catalog writes.",
            "basis": "The Destinations interaction strategy and gray wireframe now provide aligned trigger, progression, feedback, recovery, Agent/CLI boundary, and confirmation states for every catalog v2 decision required by FACT-005.",
            "evidence": [
              "arckit/interaction/destinations/interaction.md",
              "arckit/interaction/destinations/default.html",
              "arckit/interaction/_map/feature-matrix.md",
              "arckit/interaction/_map/RELATIONS.md"
            ]
          }
        ],
        "facts_superseded": [],
        "impacts_added": [],
        "impacts_updated": [
          {
            "id": "IMPACT-INTERACTION-001",
            "fact_id": "FACT-006",
            "fact_revision": 1,
            "target": {
              "kind": "software_invariant",
              "ref": "interaction-expectations-remain-recoverable",
              "revision": null
            },
            "effect": "upheld",
            "reason": "The authoritative Destinations strategy and lineframe make the one-candidate, upgrade, downgrade-blocked, conflict, source-selection, and cleanup journey recoverable across affected surfaces.",
            "gap_ids": [],
            "evidence": [
              "arckit/interaction/destinations/interaction.md",
              "arckit/interaction/destinations/default.html"
            ]
          }
        ],
        "gaps_added": [],
        "gaps_cancelled": [],
        "resolved_open_questions": [],
        "completed_handoffs": [],
        "completion_review_result": null,
        "resolved_review_findings": [],
        "review_budget_extension": null
      },
      "project_state_delta": {
        "software_definition_changes": [],
        "software_invariant_changes": [],
        "project_gap_changes": [],
        "selection_context_change": null,
        "evidence": []
      },
      "invariant_assessment": {
        "project_revision": 2,
        "judgments": [
          {
            "invariant_ref": "product-expectations-remain-recoverable",
            "disposition": "upheld",
            "reason": "The interaction projection preserves the accepted one-entry, flat catalog, SemVer, provenance, conflict, and explicit cleanup product meaning.",
            "fact_refs": [
              "FACT-002",
              "FACT-005",
              "FACT-006"
            ],
            "evidence": [
              "arckit/spec/profile/skill-availability.md",
              "arckit/interaction/destinations/interaction.md"
            ],
            "gap_refs": []
          },
          {
            "invariant_ref": "interaction-expectations-remain-recoverable",
            "disposition": "upheld",
            "reason": "Destinations exposes ready, upgrade, downgrade-blocked, conflict, explicit source selection, replanning, and legacy cleanup with matching strategy and wireframe states.",
            "fact_refs": [
              "FACT-005",
              "FACT-006"
            ],
            "evidence": [
              "arckit/interaction/destinations/interaction.md",
              "arckit/interaction/destinations/default.html",
              "arckit/interaction/INDEX.md"
            ],
            "gap_refs": []
          },
          {
            "invariant_ref": "visual-language-remains-consistent",
            "disposition": "upheld",
            "reason": "The new state uses existing gray lineframe components and preserves the required details, canvas, single device-frame, component-list, and interaction structure without a new visual rule.",
            "fact_refs": [
              "FACT-006"
            ],
            "evidence": [
              "arckit/interaction/destinations/default.html",
              "arckit/interaction/wireframe-style.css"
            ],
            "gap_refs": []
          },
          {
            "invariant_ref": "technical-decisions-remain-explainable",
            "disposition": "upheld",
            "reason": "The interaction states use the same normalized identity, flat path, version decision, provenance evidence, conflict, and migration boundaries as the technical source of truth.",
            "fact_refs": [
              "FACT-005",
              "FACT-006"
            ],
            "evidence": [
              "arckit/tech/profiles-sync/solution.md",
              "arckit/tech/_shared/models/CatalogVersionDecision.yaml",
              "arckit/interaction/destinations/interaction.md"
            ],
            "gap_refs": []
          },
          {
            "invariant_ref": "accepted-facts-are-realized",
            "disposition": "threatened",
            "reason": "The durable sources agree, but the TypeScript implementation and live v1 catalog still use sourceKey-scoped entries and omit enforced version decisions.",
            "fact_refs": [
              "FACT-003",
              "FACT-005",
              "FACT-006"
            ],
            "evidence": [],
            "gap_refs": [
              "GAP-IMPLEMENT-CATALOG-V2"
            ]
          },
          {
            "invariant_ref": "material-risks-have-credible-evidence",
            "disposition": "threatened",
            "reason": "Migration atomicity, path safety, downgrade prevention, fail-closed resolver behavior, and compatibility still require implementation and repeatable tests.",
            "fact_refs": [
              "FACT-004",
              "FACT-005",
              "FACT-006"
            ],
            "evidence": [],
            "gap_refs": [
              "GAP-IMPLEMENT-CATALOG-V2"
            ]
          }
        ]
      },
      "evidence": [
        "Destinations interaction source defines the full catalog v2 decision and recovery flow.",
        "The gray wireframe projects all required states in seven executable details blocks.",
        "INDEX counts, feature matrix, and relations are synchronized; git diff --check passed.",
        "No real ~/.arcforge/catalog file was modified."
      ],
      "runtime_result_ref": "",
      "occurred_at": "2026-08-14T11:02:10.943Z"
    },
    {
      "round": 3,
      "transition_schema_version": "arckit-case-transition/v8",
      "goal": "Realize the accepted catalog-v2 contract across core, provider, UI, loader, migration, and verification surfaces.",
      "outcome": "completed",
      "gap_selection": {
        "mode": "candidate",
        "basis": "The accepted product, technical, and interaction contracts are complete, so implementing and verifying catalog v2 is the only remaining Agent-owned gap for the current user request; the other persisted candidate is a separate Case requiring human authorization.",
        "snapshot_token": "b5fb5e3f75be9afafc56ab2522f337796838deefef7482276c13fe400a1e4309",
        "selected_ref": "case-gap:CASE-20260814-002:GAP-IMPLEMENT-CATALOG-V2",
        "comparison_summary": "Selected the ready catalog-v2 implementation gap because it directly realizes the current Case and controls the migration and overwrite risks; deferred the unrelated installed-loader authorization in CASE-001.",
        "fresh_discovery_summary": "Implementation and verification exposed no additional unresolved product, interaction, technical, realization, or risk obligation; deterministic completion review remains the next derived check.",
        "considered": [
          {
            "ref": "case-gap:CASE-20260814-001:GAP-AUTHORIZE-INSTALLED-LOADER-UPDATE",
            "source": "persisted",
            "eligibility": "ready",
            "disposition": "deferred",
            "priority_basis": {
              "responsibility": "human",
              "user_impact": "high",
              "relevance": "separate on-demand loader installation Case"
            },
            "reason": "It requires a user-authorized overwrite for another Case and does not block the repository implementation requested here."
          },
          {
            "ref": "case-gap:CASE-20260814-002:GAP-IMPLEMENT-CATALOG-V2",
            "source": "persisted",
            "eligibility": "ready",
            "disposition": "selected",
            "priority_basis": {
              "blocking": "high",
              "risk": "high",
              "user_impact": "high",
              "dependency": "accepted product, technical, and interaction contracts"
            },
            "reason": "It is the remaining accepted implementation obligation and has direct isolated and live read-only verification paths."
          }
        ]
      },
      "selected_gap": {
        "id": "GAP-IMPLEMENT-CATALOG-V2",
        "responsibility": "agent",
        "goal": "Implement and verify the flat logical-name catalog, version propagation and comparison, provider provenance handoff, v1 migration, resolver fail-closed behavior, and regression coverage without mutating the real user catalog during tests.",
        "reason": "The root cause and durable contract are accepted, but the code and existing v1 state do not yet realize them.",
        "derived_from": [
          "FACT-003",
          "FACT-004",
          "FACT-005"
        ],
        "blocked_by": [
          "GAP-DEFINE-CATALOG-CONFLICT-INTERACTION"
        ],
        "priority_basis": {
          "blocking": "high",
          "uncertainty": "",
          "risk": "high",
          "user_impact": "high",
          "dependency": "interaction states must be accepted first"
        },
        "evidence_required": [
          "TypeScript models and core paths implement one normalized-name entry and catalog/<skillName> destination while retaining source provenance.",
          "Availability plan, apply, drift, provider integration, list, and resolve propagate version and enforce merge, upgrade, downgrade-blocked, and conflict decisions.",
          "Version 1 catalog migration is atomic, deterministic, compatible with legacy qualified names, and never silently deletes unresolved legacy directories.",
          "Tests cover direct plus provider copies of the same skill, equal content, higher and lower SemVer, equal-version differing content, missing version, path containment, rollback, and resolver conflict behavior using isolated ARCFORGE_HOME.",
          "Type checks, relevant tests, full regression tests, and diff hygiene pass with no temporary debug marker or real user catalog mutation."
        ]
      },
      "planned_transition": {
        "goal": "Realize the accepted catalog-v2 contract across core, provider, UI, loader, migration, and verification surfaces.",
        "expected_state_change": "The implementation gap is resolved, a verified implementation fact is accepted, and the realization and risk impacts become upheld while the Case remains open only for deterministic completion review."
      },
      "accepted_state_delta": {
        "resolved_gap": {
          "id": "GAP-IMPLEMENT-CATALOG-V2",
          "status": "resolved",
          "outcome": "Catalog v2 now uses one normalized logical skill entry and catalog/<skillName> projection, retains per-source provenance, propagates optional skill versions, applies fail-closed SemVer decisions, migrates v1 deterministically, and updates provider, loader, UI, rollback, and removal behavior.",
          "reason": "The implementation matches the accepted contract and is supported by isolated direct/provider migration and plan/apply tests, the full regression suite, type checking, diff hygiene, and a read-only projection of the live v1 catalog that returns one conflicting arckit-git-branching candidate.",
          "evidence": [
            "src/core/skill-catalog.ts",
            "src/core/skill-availability.ts",
            "src/core/skill-availability-apply.ts",
            "src/core/sources.ts",
            "src/provider/index.ts",
            "src/shared/types.ts",
            "src/ui/views/destinations.tsx",
            "skills/arcforge-on-demand/SKILL.md",
            "tests/skill-availability.test.mjs",
            "tests/provider.test.mjs",
            "npm run check passed on 2026-08-14.",
            "npm test passed 61 of 61 tests on 2026-08-14.",
            "Read-only live catalog list returned one arckit-git-branching candidate with status conflict on 2026-08-14.",
            "git diff --check passed and no temporary debug marker was found."
          ]
        },
        "facts_added": [
          {
            "id": "FACT-007",
            "revision": 1,
            "status": "accepted",
            "statement": "The repository implementation now projects each normalized skillName to one catalog v2 record and catalog/<skillName> directory, retains source claims including provider payload commit provenance, propagates optional SKILL.md SemVer into plan and catalog decisions, upgrades only to higher differing versions, blocks downgrade and unresolved differences, migrates v1 entries without silent legacy-directory deletion, and fails closed during conflicted resolution.",
            "basis": "The TypeScript implementation, isolated direct/provider migration and plan/apply tests, full regression suite, type checks, CLI build, diff hygiene, and read-only execution against the live v1 index agree on identity, path, ordering, provenance, rollback, and conflict behavior.",
            "evidence": [
              "src/core/skill-catalog.ts",
              "src/core/skill-availability.ts",
              "src/core/skill-availability-apply.ts",
              "src/provider/index.ts",
              "tests/skill-availability.test.mjs",
              "tests/provider.test.mjs",
              "npm run check passed on 2026-08-14.",
              "npm test passed 61 of 61 tests on 2026-08-14.",
              "Read-only live catalog list returned one arckit-git-branching conflict candidate and exact resolve failed closed on 2026-08-14."
            ]
          }
        ],
        "facts_superseded": [],
        "impacts_added": [],
        "impacts_updated": [
          {
            "id": "IMPACT-REALIZATION-001",
            "fact_id": "FACT-007",
            "fact_revision": 1,
            "target": {
              "kind": "software_invariant",
              "ref": "accepted-facts-are-realized",
              "revision": null
            },
            "effect": "upheld",
            "reason": "Catalog v2, flat destinations, version decisions, provider provenance, conflict handling, and loader/UI projections now realize the accepted product, technical, and interaction facts in repository code.",
            "gap_ids": [],
            "evidence": [
              "src/core/skill-catalog.ts",
              "src/core/skill-availability.ts",
              "src/provider/index.ts",
              "src/ui/views/destinations.tsx",
              "skills/arcforge-on-demand/SKILL.md"
            ]
          },
          {
            "id": "IMPACT-RISK-001",
            "fact_id": "FACT-007",
            "fact_revision": 1,
            "target": {
              "kind": "software_invariant",
              "ref": "material-risks-have-credible-evidence",
              "revision": null
            },
            "effect": "upheld",
            "reason": "Repeatable tests cover migration grouping, equal-content provenance merge, upgrade, downgrade block, same-version and missing-version conflicts, path containment, rollback, provider isolation, and fail-closed resolution, while live verification remained read-only.",
            "gap_ids": [],
            "evidence": [
              "tests/skill-availability.test.mjs",
              "tests/provider.test.mjs",
              "npm run check passed on 2026-08-14.",
              "npm test passed 61 of 61 tests on 2026-08-14.",
              "git diff --check passed on 2026-08-14."
            ]
          }
        ],
        "gaps_added": [],
        "gaps_cancelled": [],
        "resolved_open_questions": [],
        "completed_handoffs": [],
        "completion_review_result": null,
        "resolved_review_findings": [],
        "review_budget_extension": null
      },
      "project_state_delta": {
        "software_definition_changes": [],
        "software_invariant_changes": [],
        "project_gap_changes": [],
        "selection_context_change": null,
        "evidence": []
      },
      "invariant_assessment": {
        "project_revision": 2,
        "judgments": [
          {
            "invariant_ref": "product-expectations-remain-recoverable",
            "disposition": "upheld",
            "reason": "The implementation preserves the accepted one-entry, flat catalog, provenance, SemVer, fail-closed conflict, and explicit cleanup product meaning.",
            "fact_refs": [
              "FACT-002",
              "FACT-005",
              "FACT-006",
              "FACT-007"
            ],
            "evidence": [
              "arckit/spec/profile/skill-availability.md",
              "src/core/skill-catalog.ts",
              "src/core/skill-availability.ts"
            ],
            "gap_refs": []
          },
          {
            "invariant_ref": "interaction-expectations-remain-recoverable",
            "disposition": "upheld",
            "reason": "Desktop and Agent loader surfaces expose the accepted version decision and conflict states and refuse to load unresolved candidates.",
            "fact_refs": [
              "FACT-006",
              "FACT-007"
            ],
            "evidence": [
              "arckit/interaction/destinations/interaction.md",
              "src/ui/views/destinations.tsx",
              "skills/arcforge-on-demand/SKILL.md"
            ],
            "gap_refs": []
          },
          {
            "invariant_ref": "visual-language-remains-consistent",
            "disposition": "upheld",
            "reason": "The implementation uses the existing availability-applicability block and badge states, matching the accepted gray lineframe without introducing a new visual rule.",
            "fact_refs": [
              "FACT-006",
              "FACT-007"
            ],
            "evidence": [
              "arckit/interaction/destinations/default.html",
              "src/ui/views/destinations.tsx"
            ],
            "gap_refs": []
          },
          {
            "invariant_ref": "technical-decisions-remain-explainable",
            "disposition": "upheld",
            "reason": "Core, provider, models, and contracts consistently separate logical name identity from source provenance and use explicit Semantic Version and digest rules.",
            "fact_refs": [
              "FACT-005",
              "FACT-007"
            ],
            "evidence": [
              "arckit/tech/profiles-sync/solution.md",
              "arckit/tech/_shared/models/UserSkillCatalog.yaml",
              "arckit/tech/_shared/models/CatalogVersionDecision.yaml",
              "src/core/skill-catalog.ts"
            ],
            "gap_refs": []
          },
          {
            "invariant_ref": "accepted-facts-are-realized",
            "disposition": "upheld",
            "reason": "Repository code and read-only live projection now realize one logical catalog candidate, flat future installation paths, provider provenance, version ordering, and fail-closed conflict behavior.",
            "fact_refs": [
              "FACT-003",
              "FACT-004",
              "FACT-005",
              "FACT-006",
              "FACT-007"
            ],
            "evidence": [
              "src/core/skill-catalog.ts",
              "src/core/skill-availability.ts",
              "src/provider/index.ts",
              "Read-only live catalog list returned one arckit-git-branching conflict candidate on 2026-08-14."
            ],
            "gap_refs": []
          },
          {
            "invariant_ref": "material-risks-have-credible-evidence",
            "disposition": "upheld",
            "reason": "Type checks, 61 regression tests, isolated direct/provider and rollback coverage, path validation, live read-only conflict projection, and diff hygiene provide proportionate repeatable evidence.",
            "fact_refs": [
              "FACT-004",
              "FACT-005",
              "FACT-006",
              "FACT-007"
            ],
            "evidence": [
              "tests/skill-availability.test.mjs",
              "tests/provider.test.mjs",
              "npm run check passed on 2026-08-14.",
              "npm test passed 61 of 61 tests on 2026-08-14.",
              "git diff --check passed on 2026-08-14."
            ],
            "gap_refs": []
          }
        ]
      },
      "evidence": [
        "src/core/skill-catalog.ts",
        "src/core/skill-availability.ts",
        "src/core/skill-availability-apply.ts",
        "src/provider/index.ts",
        "tests/skill-availability.test.mjs",
        "tests/provider.test.mjs",
        "npm run check passed on 2026-08-14.",
        "npm test passed 61 of 61 tests on 2026-08-14.",
        "Read-only live catalog list and exact resolve verified one fail-closed arckit-git-branching candidate on 2026-08-14.",
        "git diff --check passed on 2026-08-14."
      ],
      "runtime_result_ref": "",
      "occurred_at": "2026-08-14T11:23:18.766Z"
    },
    {
      "round": 4,
      "transition_schema_version": "arckit-case-transition/v8",
      "goal": "Semantically review catalog v2 against the accepted result and record any correctness or resolution findings without changing implementation content.",
      "outcome": "completed",
      "gap_selection": {
        "mode": "candidate",
        "basis": "All ordinary gaps are closed, so the protocol-derived completion review is the only Agent-owned candidate that can establish whether the implementation genuinely resolves the accepted catalog contract.",
        "snapshot_token": "5ab33d9780c25cc97f6ae00c6b4a37d70327d9f5ab2a8c526f66f604ca5ff58c",
        "selected_ref": "case-gap:CASE-20260814-002:CASE-20260814-002:completion-review:1",
        "comparison_summary": "Selected the current Case completion review and deferred the unrelated CASE-001 human authorization.",
        "fresh_discovery_summary": "Review found one missing conflict-resolution path and one migration/source-claim edge-hardening defect; both become future Agent-owned findings rather than being repaired inside the review round.",
        "considered": [
          {
            "ref": "case-gap:CASE-20260814-001:GAP-AUTHORIZE-INSTALLED-LOADER-UPDATE",
            "source": "persisted",
            "eligibility": "ready",
            "disposition": "deferred",
            "priority_basis": {
              "responsibility": "human",
              "relevance": "separate Case"
            },
            "reason": "It is unrelated to evaluating the current catalog-v2 result and requires user authorization."
          },
          {
            "ref": "case-gap:CASE-20260814-002:CASE-20260814-002:completion-review:1",
            "source": "persisted",
            "eligibility": "ready",
            "disposition": "selected",
            "priority_basis": {
              "blocking": "high",
              "risk": "high",
              "user_impact": "high"
            },
            "reason": "It is the required semantic check after all ordinary implementation obligations closed."
          }
        ]
      },
      "selected_gap": {
        "id": "CASE-20260814-002:completion-review:1",
        "responsibility": "agent",
        "goal": "Review the completed implementation for correctness, real problem resolution, verification credibility, regression risk, and minimality.",
        "reason": "All ordinary Case gaps and state impacts are closed.",
        "derived_from": [
          "case_result",
          "content_revision:3"
        ],
        "blocked_by": [],
        "priority_basis": {
          "blocking": "high",
          "uncertainty": "low",
          "risk": "high",
          "user_impact": "high"
        },
        "evidence_required": [
          "review evidence for all five completion dimensions"
        ]
      },
      "planned_transition": {
        "goal": "Semantically review catalog v2 against the accepted result and record any correctness or resolution findings without changing implementation content.",
        "expected_state_change": "The completion review records two Agent-owned findings and reopens concrete ordinary gaps for explicit conflict resolution and migration/source-claim hardening."
      },
      "accepted_state_delta": {
        "resolved_gap": null,
        "facts_added": [],
        "facts_superseded": [],
        "impacts_added": [],
        "impacts_updated": [],
        "gaps_added": [],
        "gaps_cancelled": [],
        "resolved_open_questions": [],
        "completed_handoffs": [],
        "completion_review_result": {
          "outcome": "findings",
          "reviewer": "agent",
          "reviewed_content_revision": 3,
          "dimensions": {
            "implementation_correctness": "findings",
            "problem_resolution": "findings",
            "verification_credibility": "clean",
            "regression_risk": "findings",
            "minimality": "clean"
          },
          "findings": [
            {
              "id": "CONFLICT-RESOLUTION-MISSING",
              "kind": "omission",
              "statement": "Provide a snapshot-bound explicit source selection that can turn one conflicted logical catalog record into an executable replan; without it, the live missing-version conflict is fail-closed but permanently stuck even after one source is intentionally chosen.",
              "responsibility": "agent",
              "artifact_refs": [
                "src/core/skill-availability.ts",
                "src/core/skill-catalog.ts",
                "src/provider/index.ts",
                "src/ui/views/destinations.tsx",
                "arckit/interaction/destinations/interaction.md"
              ],
              "evidence": [
                "CatalogVersionDecision has no explicit-resolution action or selected source input.",
                "CreateSkillAvailabilityPlanOptions and ProvisioningOptions have no catalog conflict selection field.",
                "The live arckit-git-branching entry lists once as conflict and exact resolve fails closed, but no current plan input can resolve it."
              ]
            },
            {
              "id": "MIGRATION-CLAIM-HARDENING",
              "kind": "error",
              "statement": "Keep discovering confirmed-cleanup candidates for extant legacy sourceKey directories after the index has already become v2, and select an active source claim by sourceKey plus active digest so a same-source skill path change cannot retain the old claim version.",
              "responsibility": "agent",
              "artifact_refs": [
                "src/core/skill-availability.ts",
                "src/core/skill-availability-apply.ts",
                "tests/skill-availability.test.mjs"
              ],
              "evidence": [
                "legacyCatalogCleanupItems returns early unless migratedFromVersion is present, which is transient and absent after the first v2 index write.",
                "createCatalogEntries selects activeClaim using sourceKey alone even though sourceClaims can contain the same sourceKey with different skillPath values."
              ]
            }
          ],
          "evidence": [
            "src/core/skill-catalog.ts",
            "src/core/skill-availability.ts",
            "src/core/skill-availability-apply.ts",
            "src/provider/index.ts",
            "src/ui/views/destinations.tsx",
            "arckit/spec/profile/skill-availability.md",
            "arckit/interaction/destinations/interaction.md",
            "tests/skill-availability.test.mjs",
            "Read-only live exact resolve remains fail-closed for arckit-git-branching."
          ]
        },
        "resolved_review_findings": [],
        "review_budget_extension": null
      },
      "project_state_delta": {
        "software_definition_changes": [],
        "software_invariant_changes": [],
        "project_gap_changes": [],
        "selection_context_change": null,
        "evidence": []
      },
      "invariant_assessment": {
        "project_revision": 2,
        "judgments": [
          {
            "invariant_ref": "product-expectations-remain-recoverable",
            "disposition": "upheld",
            "reason": "The durable product contract still accurately requires one logical entry, explicit conflict resolution, version evidence, and confirmed legacy cleanup.",
            "fact_refs": [
              "FACT-002",
              "FACT-005"
            ],
            "evidence": [
              "arckit/spec/profile/skill-availability.md"
            ],
            "gap_refs": []
          },
          {
            "invariant_ref": "interaction-expectations-remain-recoverable",
            "disposition": "upheld",
            "reason": "The authoritative interaction source still recovers the explicit source-selection and cleanup journey even though implementation realization is incomplete.",
            "fact_refs": [
              "FACT-006"
            ],
            "evidence": [
              "arckit/interaction/destinations/interaction.md",
              "arckit/interaction/destinations/default.html"
            ],
            "gap_refs": []
          },
          {
            "invariant_ref": "visual-language-remains-consistent",
            "disposition": "upheld",
            "reason": "The review found no visual-language inconsistency; the gray lineframe remains the durable presentation source.",
            "fact_refs": [
              "FACT-006"
            ],
            "evidence": [
              "arckit/interaction/destinations/default.html",
              "arckit/interaction/wireframe-style.css"
            ],
            "gap_refs": []
          },
          {
            "invariant_ref": "technical-decisions-remain-explainable",
            "disposition": "upheld",
            "reason": "The technical identity, SemVer, provenance, migration, and explicit-resolution decisions remain coherent; the findings concern incomplete realization.",
            "fact_refs": [
              "FACT-005",
              "FACT-007"
            ],
            "evidence": [
              "arckit/tech/profiles-sync/solution.md",
              "arckit/tech/_shared/models/UserSkillCatalog.yaml",
              "arckit/tech/_shared/models/CatalogVersionDecision.yaml"
            ],
            "gap_refs": []
          },
          {
            "invariant_ref": "accepted-facts-are-realized",
            "disposition": "threatened",
            "reason": "The current code cannot execute the accepted explicit source-selection recovery and contains two edge inconsistencies in cleanup persistence and active-claim selection.",
            "fact_refs": [
              "FACT-005",
              "FACT-006",
              "FACT-007"
            ],
            "evidence": [
              "src/core/skill-availability.ts",
              "src/core/skill-availability-apply.ts",
              "src/provider/index.ts"
            ],
            "gap_refs": [
              "CASE-20260814-002:review-finding:CONFLICT-RESOLUTION-MISSING",
              "CASE-20260814-002:review-finding:MIGRATION-CLAIM-HARDENING"
            ]
          },
          {
            "invariant_ref": "material-risks-have-credible-evidence",
            "disposition": "threatened",
            "reason": "Existing tests do not cover persisted post-v2 legacy cleanup, same-source path changes, or executable explicit conflict resolution.",
            "fact_refs": [
              "FACT-005",
              "FACT-006",
              "FACT-007"
            ],
            "evidence": [
              "tests/skill-availability.test.mjs",
              "tests/provider.test.mjs"
            ],
            "gap_refs": [
              "CASE-20260814-002:review-finding:CONFLICT-RESOLUTION-MISSING",
              "CASE-20260814-002:review-finding:MIGRATION-CLAIM-HARDENING"
            ]
          }
        ]
      },
      "evidence": [
        "src/core/skill-catalog.ts",
        "src/core/skill-availability.ts",
        "src/core/skill-availability-apply.ts",
        "src/provider/index.ts",
        "src/ui/views/destinations.tsx",
        "arckit/interaction/destinations/interaction.md",
        "tests/skill-availability.test.mjs"
      ],
      "runtime_result_ref": "",
      "occurred_at": "2026-08-14T11:25:57.153Z"
    },
    {
      "round": 5,
      "transition_schema_version": "arckit-case-transition/v8",
      "goal": "Add a caller-explicit, digest-bound incoming-source selection across plan, apply, provider, Desktop, contracts, and isolated tests.",
      "outcome": "completed",
      "gap_selection": {
        "mode": "candidate",
        "basis": "Executable conflict resolution has the highest direct user impact because the live arckit-git-branching record is currently stuck in fail-closed conflict; migration and claim edge hardening remains independent and ready for the next round.",
        "snapshot_token": "92d2fc67f6bb28328d145347f54bfd62defd4af4203238ac370a7058cc81ce6c",
        "selected_ref": "case-gap:CASE-20260814-002:CASE-20260814-002:review-finding:CONFLICT-RESOLUTION-MISSING",
        "comparison_summary": "Selected explicit conflict source selection before migration edge hardening because it restores the missing user recovery path for the observed live conflict.",
        "fresh_discovery_summary": "No new candidate was discovered while implementing the snapshot-bound selection; the already accepted migration and source-claim hardening finding remains deferred.",
        "considered": [
          {
            "ref": "case-gap:CASE-20260814-002:CASE-20260814-002:review-finding:CONFLICT-RESOLUTION-MISSING",
            "source": "persisted",
            "eligibility": "ready",
            "disposition": "selected",
            "priority_basis": {
              "blocking": "high",
              "risk": "high",
              "user_impact": "high"
            },
            "reason": "It is required to move the user's current single conflict record from safe blocking to an intentional executable source choice."
          },
          {
            "ref": "case-gap:CASE-20260814-002:CASE-20260814-002:review-finding:MIGRATION-CLAIM-HARDENING",
            "source": "persisted",
            "eligibility": "ready",
            "disposition": "deferred",
            "priority_basis": {
              "blocking": "high",
              "risk": "high",
              "user_impact": "medium"
            },
            "reason": "It is an independent cleanup and provenance edge correction that does not determine the explicit selection protocol implemented this round."
          }
        ]
      },
      "selected_gap": {
        "id": "CASE-20260814-002:review-finding:CONFLICT-RESOLUTION-MISSING",
        "responsibility": "agent",
        "goal": "Resolve review finding: Provide a snapshot-bound explicit source selection that can turn one conflicted logical catalog record into an executable replan; without it, the live missing-version conflict is fail-closed but permanently stuck even after one source is intentionally chosen.",
        "reason": "omission found by completion review",
        "derived_from": [
          "completion_review",
          "content_revision:3"
        ],
        "blocked_by": [],
        "priority_basis": {
          "blocking": "high",
          "uncertainty": "",
          "risk": "high",
          "user_impact": ""
        },
        "evidence_required": [
          "src/core/skill-availability.ts",
          "src/core/skill-catalog.ts",
          "src/provider/index.ts",
          "src/ui/views/destinations.tsx",
          "arckit/interaction/destinations/interaction.md",
          "CatalogVersionDecision has no explicit-resolution action or selected source input.",
          "CreateSkillAvailabilityPlanOptions and ProvisioningOptions have no catalog conflict selection field.",
          "The live arckit-git-branching entry lists once as conflict and exact resolve fails closed, but no current plan input can resolve it."
        ]
      },
      "planned_transition": {
        "goal": "Add a caller-explicit, digest-bound incoming-source selection across plan, apply, provider, Desktop, contracts, and isolated tests.",
        "expected_state_change": "The conflict-resolution review finding is resolved; a fresh matching choice produces source-selected and can apply, while stale choices remain blocking and the separate migration hardening finding remains open."
      },
      "accepted_state_delta": {
        "resolved_gap": {
          "id": "CASE-20260814-002:review-finding:CONFLICT-RESOLUTION-MISSING",
          "status": "resolved",
          "outcome": "CatalogSourceSelection now binds skill, incoming sourceKey and content digest to the observed current catalog digest; core emits source-selected only when fresh evidence matches, provider and Desktop pass the choice through, stale choices block, and apply materializes the explicitly selected incoming source.",
          "reason": "The shared type, planner, catalog decision, apply path, provider options, Desktop confirmation, technical model/contracts, type checks, and isolated plan/apply regressions now form one executable and stale-safe recovery path.",
          "evidence": [
            "src/shared/types.ts",
            "src/core/skill-catalog.ts",
            "src/core/skill-availability.ts",
            "src/core/skill-availability-apply.ts",
            "src/core/sources.ts",
            "src/provider/index.ts",
            "src/ui/views/destinations.tsx",
            "src/ui/main.tsx",
            "arckit/tech/_shared/models/CatalogSourceSelection.yaml",
            "arckit/tech/_shared/contracts/apply-plan.yaml",
            "arckit/tech/_shared/contracts/apply-run.yaml",
            "tests/skill-availability.test.mjs",
            "npm run check passed on 2026-08-14.",
            "Targeted availability and provider tests passed 26 of 26 on 2026-08-14."
          ]
        },
        "facts_added": [
          {
            "id": "FACT-008",
            "revision": 1,
            "status": "accepted",
            "statement": "A caller can now explicitly select the fresh incoming source for a conflicted or downgrade-blocked logical catalog skill using skill, sourceKey, incoming content digest, and expected current catalog digest; matching evidence produces source-selected and is executable, while malformed, duplicate, mismatched, or stale evidence remains blocking.",
            "basis": "The type and technical model define the four-field selection, plan and provider paths propagate it, Desktop presents current/incoming source evidence and requires an explicit checkbox, apply recomputes and validates the choice, and isolated tests prove stale rejection plus successful selected replacement.",
            "evidence": [
              "src/shared/types.ts",
              "src/core/skill-catalog.ts",
              "src/core/skill-availability.ts",
              "src/provider/index.ts",
              "src/ui/views/destinations.tsx",
              "arckit/tech/_shared/models/CatalogSourceSelection.yaml",
              "tests/skill-availability.test.mjs"
            ]
          }
        ],
        "facts_superseded": [],
        "impacts_added": [],
        "impacts_updated": [
          {
            "id": "IMPACT-REALIZATION-001",
            "fact_id": "FACT-008",
            "fact_revision": 1,
            "target": {
              "kind": "software_invariant",
              "ref": "accepted-facts-are-realized",
              "revision": null
            },
            "effect": "threatened",
            "reason": "Explicit conflict recovery now realizes the accepted interaction, but persistent legacy-cleanup discovery and same-source active-claim selection still require the remaining review finding.",
            "gap_ids": [
              "CASE-20260814-002:review-finding:MIGRATION-CLAIM-HARDENING"
            ],
            "evidence": [
              "src/core/skill-availability.ts",
              "src/ui/views/destinations.tsx",
              "tests/skill-availability.test.mjs"
            ]
          },
          {
            "id": "IMPACT-RISK-001",
            "fact_id": "FACT-008",
            "fact_revision": 1,
            "target": {
              "kind": "software_invariant",
              "ref": "material-risks-have-credible-evidence",
              "revision": null
            },
            "effect": "threatened",
            "reason": "Stale source choices are covered, while the remaining post-v2 cleanup and same-source path-change cases still lack corrected implementation and regression evidence.",
            "gap_ids": [
              "CASE-20260814-002:review-finding:MIGRATION-CLAIM-HARDENING"
            ],
            "evidence": [
              "tests/skill-availability.test.mjs",
              "src/core/skill-availability-apply.ts"
            ]
          }
        ],
        "gaps_added": [],
        "gaps_cancelled": [],
        "resolved_open_questions": [],
        "completed_handoffs": [],
        "completion_review_result": null,
        "resolved_review_findings": [
          {
            "id": "CONFLICT-RESOLUTION-MISSING",
            "resolution": "resolved",
            "reason": "Fresh digest-bound incoming-source selection is implemented across core, provider, Desktop, documentation, and tests.",
            "evidence": [
              "src/core/skill-availability.ts",
              "src/ui/views/destinations.tsx",
              "tests/skill-availability.test.mjs"
            ]
          }
        ],
        "review_budget_extension": null
      },
      "project_state_delta": {
        "software_definition_changes": [],
        "software_invariant_changes": [],
        "project_gap_changes": [],
        "selection_context_change": null,
        "evidence": []
      },
      "invariant_assessment": {
        "project_revision": 2,
        "judgments": [
          {
            "invariant_ref": "product-expectations-remain-recoverable",
            "disposition": "upheld",
            "reason": "The product contract remains accurate and the explicit source-selection recovery now has a concrete implementation.",
            "fact_refs": [
              "FACT-002",
              "FACT-005",
              "FACT-008"
            ],
            "evidence": [
              "arckit/spec/profile/skill-availability.md",
              "src/core/skill-availability.ts"
            ],
            "gap_refs": []
          },
          {
            "invariant_ref": "interaction-expectations-remain-recoverable",
            "disposition": "upheld",
            "reason": "Desktop displays current and incoming version/source evidence and provides an explicit incoming-source choice that is rebound during fresh apply.",
            "fact_refs": [
              "FACT-006",
              "FACT-008"
            ],
            "evidence": [
              "arckit/interaction/destinations/interaction.md",
              "src/ui/views/destinations.tsx",
              "src/ui/main.tsx"
            ],
            "gap_refs": []
          },
          {
            "invariant_ref": "visual-language-remains-consistent",
            "disposition": "upheld",
            "reason": "The source choice uses the existing check-row, badge, and availability detail components represented in the accepted lineframe.",
            "fact_refs": [
              "FACT-006",
              "FACT-008"
            ],
            "evidence": [
              "arckit/interaction/destinations/default.html",
              "src/ui/views/destinations.tsx"
            ],
            "gap_refs": []
          },
          {
            "invariant_ref": "technical-decisions-remain-explainable",
            "disposition": "upheld",
            "reason": "CatalogSourceSelection and source-selected explicitly encode the fresh-evidence boundary without introducing source-type or time-based ranking.",
            "fact_refs": [
              "FACT-005",
              "FACT-008"
            ],
            "evidence": [
              "arckit/tech/_shared/models/CatalogSourceSelection.yaml",
              "arckit/tech/_shared/models/CatalogVersionDecision.yaml",
              "arckit/tech/profiles-sync/solution.md"
            ],
            "gap_refs": []
          },
          {
            "invariant_ref": "accepted-facts-are-realized",
            "disposition": "threatened",
            "reason": "Explicit conflict resolution is realized, but the accepted cleanup and active-provenance edge behavior still has one open review finding.",
            "fact_refs": [
              "FACT-005",
              "FACT-007",
              "FACT-008"
            ],
            "evidence": [
              "src/core/skill-availability.ts",
              "src/ui/views/destinations.tsx"
            ],
            "gap_refs": [
              "CASE-20260814-002:review-finding:MIGRATION-CLAIM-HARDENING"
            ]
          },
          {
            "invariant_ref": "material-risks-have-credible-evidence",
            "disposition": "threatened",
            "reason": "Selection staleness and execution are tested, while persistent legacy cleanup and same-source path changes remain open and unverified.",
            "fact_refs": [
              "FACT-005",
              "FACT-007",
              "FACT-008"
            ],
            "evidence": [
              "tests/skill-availability.test.mjs",
              "npm run check passed on 2026-08-14."
            ],
            "gap_refs": [
              "CASE-20260814-002:review-finding:MIGRATION-CLAIM-HARDENING"
            ]
          }
        ]
      },
      "evidence": [
        "src/core/skill-catalog.ts",
        "src/core/skill-availability.ts",
        "src/core/skill-availability-apply.ts",
        "src/provider/index.ts",
        "src/ui/views/destinations.tsx",
        "arckit/tech/_shared/models/CatalogSourceSelection.yaml",
        "tests/skill-availability.test.mjs",
        "npm run check passed on 2026-08-14.",
        "Targeted availability and provider tests passed 26 of 26 on 2026-08-14.",
        "git diff --check passed on 2026-08-14."
      ],
      "runtime_result_ref": "",
      "occurred_at": "2026-08-14T12:30:48.338Z"
    },
    {
      "round": 6,
      "transition_schema_version": "arckit-case-transition/v8",
      "goal": "Make legacy cleanup discovery persistent across v2 writes and bind retained or incoming active claims by sourceKey plus active digest, with isolated regression evidence.",
      "outcome": "completed",
      "gap_selection": {
        "mode": "candidate",
        "basis": "The migration and source-claim hardening finding is the only remaining persisted candidate in the current Case and directly carries both threatened realization and risk impacts.",
        "snapshot_token": "d0527365f9b3e109978380754c99d491d10b14c9de0fc981e2f4d60867cd1a6e",
        "selected_ref": "case-gap:CASE-20260814-002:CASE-20260814-002:review-finding:MIGRATION-CLAIM-HARDENING",
        "comparison_summary": "Selected the sole ready current-Case gap; no competing Agent-owned catalog obligation remains.",
        "fresh_discovery_summary": "No additional candidate was discovered; the fixes and expanded regression establish the evidence needed for a repeat completion review.",
        "considered": [
          {
            "ref": "case-gap:CASE-20260814-002:CASE-20260814-002:review-finding:MIGRATION-CLAIM-HARDENING",
            "source": "persisted",
            "eligibility": "ready",
            "disposition": "selected",
            "priority_basis": {
              "blocking": "high",
              "risk": "high",
              "user_impact": "medium"
            },
            "reason": "It is the final implementation defect and the only support for the remaining threatened impacts."
          }
        ]
      },
      "selected_gap": {
        "id": "CASE-20260814-002:review-finding:MIGRATION-CLAIM-HARDENING",
        "responsibility": "agent",
        "goal": "Resolve review finding: Keep discovering confirmed-cleanup candidates for extant legacy sourceKey directories after the index has already become v2, and select an active source claim by sourceKey plus active digest so a same-source skill path change cannot retain the old claim version.",
        "reason": "error found by completion review",
        "derived_from": [
          "completion_review",
          "content_revision:3"
        ],
        "blocked_by": [],
        "priority_basis": {
          "blocking": "high",
          "uncertainty": "",
          "risk": "high",
          "user_impact": ""
        },
        "evidence_required": [
          "src/core/skill-availability.ts",
          "src/core/skill-availability-apply.ts",
          "tests/skill-availability.test.mjs",
          "legacyCatalogCleanupItems returns early unless migratedFromVersion is present, which is transient and absent after the first v2 index write.",
          "createCatalogEntries selects activeClaim using sourceKey alone even though sourceClaims can contain the same sourceKey with different skillPath values."
        ]
      },
      "planned_transition": {
        "goal": "Make legacy cleanup discovery persistent across v2 writes and bind retained or incoming active claims by sourceKey plus active digest, with isolated regression evidence.",
        "expected_state_change": "The last review finding and both threatened impacts become upheld, leaving only a fresh deterministic completion review."
      },
      "accepted_state_delta": {
        "resolved_gap": {
          "id": "CASE-20260814-002:review-finding:MIGRATION-CLAIM-HARDENING",
          "status": "resolved",
          "outcome": "Availability planning now derives legacy cleanup candidates from every extant sourceKey directory represented by catalog source claims regardless of index version, and apply binds active provenance to the exact incoming claim or retained sourceKey plus content digest.",
          "reason": "The two faulty conditions were replaced directly, the technical migration contract was clarified, and isolated tests prove post-v2 cleanup persistence plus correct active version under same-source path changes; all 61 regressions and type checks pass.",
          "evidence": [
            "src/core/skill-availability.ts",
            "src/core/skill-availability-apply.ts",
            "arckit/tech/profiles-sync/solution.md",
            "arckit/tech/_shared/models/UserSkillCatalog.yaml",
            "arckit/tech/_shared/contracts/apply-plan.yaml",
            "tests/skill-availability.test.mjs",
            "npm run check passed on 2026-08-14.",
            "Targeted availability and provider tests passed 26 of 26 on 2026-08-14.",
            "npm test passed 61 of 61 tests on 2026-08-14.",
            "git diff --check passed on 2026-08-14."
          ]
        },
        "facts_added": [
          {
            "id": "FACT-009",
            "revision": 1,
            "status": "accepted",
            "statement": "Legacy sourceKey catalog directories remain confirmation-gated cleanup candidates after the index is already v2, and catalog apply now chooses an incoming active claim directly or a retained claim by both activeSourceKey and active contentDigest, preventing stale version selection when one sourceKey has claims for multiple skill paths.",
            "basis": "The planner no longer depends on transient migratedFromVersion state, apply disambiguates active claims with digest evidence, and the expanded isolated version-plan test exercises both persisted cleanup and same-source old/new path claims through execution.",
            "evidence": [
              "src/core/skill-availability.ts",
              "src/core/skill-availability-apply.ts",
              "tests/skill-availability.test.mjs",
              "npm test passed 61 of 61 tests on 2026-08-14."
            ]
          }
        ],
        "facts_superseded": [],
        "impacts_added": [],
        "impacts_updated": [
          {
            "id": "IMPACT-REALIZATION-001",
            "fact_id": "FACT-009",
            "fact_revision": 1,
            "target": {
              "kind": "software_invariant",
              "ref": "accepted-facts-are-realized",
              "revision": null
            },
            "effect": "upheld",
            "reason": "Flat identity, version ordering, explicit source recovery, persistent confirmed cleanup, and exact active-provenance binding now realize the complete accepted catalog behavior.",
            "gap_ids": [],
            "evidence": [
              "src/core/skill-catalog.ts",
              "src/core/skill-availability.ts",
              "src/core/skill-availability-apply.ts",
              "src/ui/views/destinations.tsx"
            ]
          },
          {
            "id": "IMPACT-RISK-001",
            "fact_id": "FACT-009",
            "fact_revision": 1,
            "target": {
              "kind": "software_invariant",
              "ref": "material-risks-have-credible-evidence",
              "revision": null
            },
            "effect": "upheld",
            "reason": "Migration persistence, same-source path changes, explicit selection staleness, version decisions, rollback, provider isolation, path containment, and resolver blocking all have repeatable regression evidence.",
            "gap_ids": [],
            "evidence": [
              "tests/skill-availability.test.mjs",
              "tests/provider.test.mjs",
              "npm run check passed on 2026-08-14.",
              "npm test passed 61 of 61 tests on 2026-08-14."
            ]
          }
        ],
        "gaps_added": [],
        "gaps_cancelled": [],
        "resolved_open_questions": [],
        "completed_handoffs": [],
        "completion_review_result": null,
        "resolved_review_findings": [
          {
            "id": "MIGRATION-CLAIM-HARDENING",
            "resolution": "resolved",
            "reason": "Post-v2 legacy cleanup remains discoverable and same-source claims are disambiguated by the active digest.",
            "evidence": [
              "src/core/skill-availability.ts",
              "src/core/skill-availability-apply.ts",
              "tests/skill-availability.test.mjs"
            ]
          }
        ],
        "review_budget_extension": null
      },
      "project_state_delta": {
        "software_definition_changes": [],
        "software_invariant_changes": [],
        "project_gap_changes": [],
        "selection_context_change": null,
        "evidence": []
      },
      "invariant_assessment": {
        "project_revision": 2,
        "judgments": [
          {
            "invariant_ref": "product-expectations-remain-recoverable",
            "disposition": "upheld",
            "reason": "The complete one-entry, version, explicit-choice, and confirmed-cleanup behavior remains durably specified and is now implemented.",
            "fact_refs": [
              "FACT-002",
              "FACT-005",
              "FACT-008",
              "FACT-009"
            ],
            "evidence": [
              "arckit/spec/profile/skill-availability.md",
              "arckit/tech/profiles-sync/solution.md"
            ],
            "gap_refs": []
          },
          {
            "invariant_ref": "interaction-expectations-remain-recoverable",
            "disposition": "upheld",
            "reason": "Conflict recovery, stale selection feedback, flat destination, and independently confirmed cleanup remain coherent across durable interaction and Desktop behavior.",
            "fact_refs": [
              "FACT-006",
              "FACT-008",
              "FACT-009"
            ],
            "evidence": [
              "arckit/interaction/destinations/interaction.md",
              "src/ui/views/destinations.tsx"
            ],
            "gap_refs": []
          },
          {
            "invariant_ref": "visual-language-remains-consistent",
            "disposition": "upheld",
            "reason": "No new visual rule was introduced by the core hardening; the explicit selection remains aligned with the accepted lineframe.",
            "fact_refs": [
              "FACT-006",
              "FACT-008"
            ],
            "evidence": [
              "arckit/interaction/destinations/default.html",
              "src/ui/views/destinations.tsx"
            ],
            "gap_refs": []
          },
          {
            "invariant_ref": "technical-decisions-remain-explainable",
            "disposition": "upheld",
            "reason": "Cleanup derives from durable source claims and active provenance uses sourceKey plus digest, preserving the documented identity and integrity boundaries.",
            "fact_refs": [
              "FACT-005",
              "FACT-008",
              "FACT-009"
            ],
            "evidence": [
              "arckit/tech/profiles-sync/solution.md",
              "arckit/tech/_shared/models/UserSkillCatalog.yaml",
              "src/core/skill-availability-apply.ts"
            ],
            "gap_refs": []
          },
          {
            "invariant_ref": "accepted-facts-are-realized",
            "disposition": "upheld",
            "reason": "All accepted catalog identity, version, conflict recovery, provider provenance, cleanup, and resolver facts are represented in repository code with no remaining ordinary gap.",
            "fact_refs": [
              "FACT-005",
              "FACT-006",
              "FACT-007",
              "FACT-008",
              "FACT-009"
            ],
            "evidence": [
              "src/core/skill-catalog.ts",
              "src/core/skill-availability.ts",
              "src/core/skill-availability-apply.ts",
              "src/provider/index.ts",
              "src/ui/views/destinations.tsx"
            ],
            "gap_refs": []
          },
          {
            "invariant_ref": "material-risks-have-credible-evidence",
            "disposition": "upheld",
            "reason": "Type checks, all 61 regressions, focused migration/version/provider tests, read-only live projection, and diff hygiene cover the material identity, overwrite, migration, provenance, rollback, and resolver risks.",
            "fact_refs": [
              "FACT-005",
              "FACT-007",
              "FACT-008",
              "FACT-009"
            ],
            "evidence": [
              "tests/skill-availability.test.mjs",
              "tests/provider.test.mjs",
              "npm run check passed on 2026-08-14.",
              "npm test passed 61 of 61 tests on 2026-08-14.",
              "git diff --check passed on 2026-08-14."
            ],
            "gap_refs": []
          }
        ]
      },
      "evidence": [
        "src/core/skill-availability.ts",
        "src/core/skill-availability-apply.ts",
        "tests/skill-availability.test.mjs",
        "npm run check passed on 2026-08-14.",
        "Targeted availability and provider tests passed 26 of 26 on 2026-08-14.",
        "npm test passed 61 of 61 tests on 2026-08-14.",
        "git diff --check passed on 2026-08-14."
      ],
      "runtime_result_ref": "",
      "occurred_at": "2026-08-14T12:34:28.344Z"
    },
    {
      "round": 7,
      "transition_schema_version": "arckit-case-transition/v8",
      "goal": "Perform the repeat completion review against content revision 5 and close the Case only if all five dimensions are clean.",
      "outcome": "completed",
      "gap_selection": {
        "mode": "candidate",
        "basis": "All ordinary gaps and impacts are closed after the two first-review findings were resolved, so the fresh completion review is the only current-Case candidate and the required final semantic check.",
        "snapshot_token": "5d7387893f20081901efe0d3520937ddb06b1ef032fd1bb44a769964d4ac60b1",
        "selected_ref": "case-gap:CASE-20260814-002:CASE-20260814-002:completion-review:2",
        "comparison_summary": "Selected the current Case completion review and deferred the unrelated CASE-001 user authorization.",
        "fresh_discovery_summary": "Final source, contract, UI, test, build, live read-only, and diff review found no new error, omission, or excess.",
        "considered": [
          {
            "ref": "case-gap:CASE-20260814-001:GAP-AUTHORIZE-INSTALLED-LOADER-UPDATE",
            "source": "persisted",
            "eligibility": "ready",
            "disposition": "deferred",
            "priority_basis": {
              "responsibility": "human",
              "relevance": "separate Case"
            },
            "reason": "It concerns a different installed loader overwrite and does not affect this Case completion review."
          },
          {
            "ref": "case-gap:CASE-20260814-002:CASE-20260814-002:completion-review:2",
            "source": "persisted",
            "eligibility": "ready",
            "disposition": "selected",
            "priority_basis": {
              "blocking": "high",
              "risk": "high",
              "user_impact": "high"
            },
            "reason": "It is the deterministic final check for the now-updated content revision."
          }
        ]
      },
      "selected_gap": {
        "id": "CASE-20260814-002:completion-review:2",
        "responsibility": "agent",
        "goal": "Review the completed implementation for correctness, real problem resolution, verification credibility, regression risk, and minimality.",
        "reason": "All ordinary Case gaps and state impacts are closed.",
        "derived_from": [
          "case_result",
          "content_revision:5"
        ],
        "blocked_by": [],
        "priority_basis": {
          "blocking": "high",
          "uncertainty": "low",
          "risk": "high",
          "user_impact": "high"
        },
        "evidence_required": [
          "review evidence for all five completion dimensions"
        ]
      },
      "planned_transition": {
        "goal": "Perform the repeat completion review against content revision 5 and close the Case only if all five dimensions are clean.",
        "expected_state_change": "The completion review becomes clean and the deterministic Case audit moves CASE-20260814-002 to closed."
      },
      "accepted_state_delta": {
        "resolved_gap": null,
        "facts_added": [],
        "facts_superseded": [],
        "impacts_added": [],
        "impacts_updated": [],
        "gaps_added": [],
        "gaps_cancelled": [],
        "resolved_open_questions": [],
        "completed_handoffs": [],
        "completion_review_result": {
          "outcome": "clean",
          "reviewer": "agent",
          "reviewed_content_revision": 5,
          "dimensions": {
            "implementation_correctness": "clean",
            "problem_resolution": "clean",
            "verification_credibility": "clean",
            "regression_risk": "clean",
            "minimality": "clean"
          },
          "findings": [],
          "evidence": [
            "Normalized v1 entries produce one logical candidate and flat v2 destinations; resolver rejects conflict, path escape, and digest drift.",
            "SemVer install, merge, upgrade, downgrade block, equal-version conflict, missing-version conflict, explicit source selection, and stale selection are covered by isolated execution tests.",
            "Provider payload provenance, isolated state, apply, removal, and rollback behavior are covered by provider and availability tests.",
            "Post-v2 legacy cleanup persistence and same-source multi-path claim selection are exercised by the final regression.",
            "npm run check passed on 2026-08-14.",
            "npm test passed 61 of 61 tests on 2026-08-14.",
            "npm run build passed on 2026-08-14.",
            "Read-only live catalog projection returned exactly one arckit-git-branching candidate with status conflict.",
            "git diff --check passed and no temporary debug marker was found."
          ]
        },
        "resolved_review_findings": [],
        "review_budget_extension": null
      },
      "project_state_delta": {
        "software_definition_changes": [],
        "software_invariant_changes": [],
        "project_gap_changes": [],
        "selection_context_change": null,
        "evidence": []
      },
      "invariant_assessment": {
        "project_revision": 2,
        "judgments": [
          {
            "invariant_ref": "product-expectations-remain-recoverable",
            "disposition": "upheld",
            "reason": "The final repository and durable product sources agree on one logical catalog entry, flat storage, SemVer ordering, fail-closed ambiguity, explicit recovery, and confirmed cleanup.",
            "fact_refs": [
              "FACT-002",
              "FACT-005",
              "FACT-008",
              "FACT-009"
            ],
            "evidence": [
              "arckit/spec/profile/skill-availability.md",
              "src/core/skill-catalog.ts",
              "src/core/skill-availability.ts"
            ],
            "gap_refs": []
          },
          {
            "invariant_ref": "interaction-expectations-remain-recoverable",
            "disposition": "upheld",
            "reason": "Desktop, loader, and resolver behavior expose version/source evidence, explicit choice, stale rejection, conflict blocking, and cleanup confirmation coherently.",
            "fact_refs": [
              "FACT-006",
              "FACT-008",
              "FACT-009"
            ],
            "evidence": [
              "arckit/interaction/destinations/interaction.md",
              "src/ui/views/destinations.tsx",
              "skills/arcforge-on-demand/SKILL.md"
            ],
            "gap_refs": []
          },
          {
            "invariant_ref": "visual-language-remains-consistent",
            "disposition": "upheld",
            "reason": "The final UI uses existing badges, check rows, and availability detail containers and remains consistent with the accepted gray lineframe.",
            "fact_refs": [
              "FACT-006",
              "FACT-008"
            ],
            "evidence": [
              "arckit/interaction/destinations/default.html",
              "src/ui/views/destinations.tsx",
              "npm run build passed on 2026-08-14."
            ],
            "gap_refs": []
          },
          {
            "invariant_ref": "technical-decisions-remain-explainable",
            "disposition": "upheld",
            "reason": "Logical identity, source provenance, SemVer/digest decisions, explicit selection binding, migration persistence, atomic rollback, and resolver integrity remain aligned across models, contracts, solution, and code.",
            "fact_refs": [
              "FACT-005",
              "FACT-007",
              "FACT-008",
              "FACT-009"
            ],
            "evidence": [
              "arckit/tech/profiles-sync/solution.md",
              "arckit/tech/_shared/models/UserSkillCatalog.yaml",
              "arckit/tech/_shared/models/CatalogSourceSelection.yaml",
              "src/core/skill-catalog.ts"
            ],
            "gap_refs": []
          },
          {
            "invariant_ref": "accepted-facts-are-realized",
            "disposition": "upheld",
            "reason": "The final implementation covers all accepted identity, version, provider, recovery, cleanup, and loading facts, and the live v1 index projects as one safe conflict candidate without mutation.",
            "fact_refs": [
              "FACT-003",
              "FACT-004",
              "FACT-005",
              "FACT-006",
              "FACT-007",
              "FACT-008",
              "FACT-009"
            ],
            "evidence": [
              "src/core/skill-catalog.ts",
              "src/core/skill-availability.ts",
              "src/core/skill-availability-apply.ts",
              "src/provider/index.ts",
              "src/ui/views/destinations.tsx",
              "Read-only live catalog projection returned one arckit-git-branching conflict candidate."
            ],
            "gap_refs": []
          },
          {
            "invariant_ref": "material-risks-have-credible-evidence",
            "disposition": "upheld",
            "reason": "Type checks, 61 regressions, production build, targeted identity/version/provider tests, live read-only projection, path and digest validation, rollback coverage, and diff hygiene provide repeatable proportionate evidence.",
            "fact_refs": [
              "FACT-005",
              "FACT-007",
              "FACT-008",
              "FACT-009"
            ],
            "evidence": [
              "tests/skill-availability.test.mjs",
              "tests/provider.test.mjs",
              "npm run check passed on 2026-08-14.",
              "npm test passed 61 of 61 tests on 2026-08-14.",
              "npm run build passed on 2026-08-14.",
              "git diff --check passed on 2026-08-14."
            ],
            "gap_refs": []
          }
        ]
      },
      "evidence": [
        "src/core/skill-catalog.ts",
        "src/core/skill-availability.ts",
        "src/core/skill-availability-apply.ts",
        "src/provider/index.ts",
        "src/ui/views/destinations.tsx",
        "tests/skill-availability.test.mjs",
        "tests/provider.test.mjs",
        "npm run check passed on 2026-08-14.",
        "npm test passed 61 of 61 tests on 2026-08-14.",
        "npm run build passed on 2026-08-14.",
        "Read-only live catalog projection returned one arckit-git-branching conflict candidate.",
        "git diff --check passed on 2026-08-14."
      ],
      "runtime_result_ref": "",
      "occurred_at": "2026-08-14T12:36:22.011Z"
    }
  ],
  "case_resolution": {
    "status": "resolved",
    "stage": "resolved",
    "satisfied": [
      "GAP-ESTABLISH-CATALOG-IDENTITY-CAUSE",
      "GAP-DEFINE-CATALOG-CONFLICT-INTERACTION",
      "GAP-IMPLEMENT-CATALOG-V2",
      "CASE-20260814-002:review-finding:CONFLICT-RESOLUTION-MISSING",
      "CASE-20260814-002:review-finding:MIGRATION-CLAIM-HARDENING"
    ],
    "remaining": [],
    "blocked": [],
    "reason": "All dynamic gaps and state impacts are closed and the current implementation passed completion review.",
    "candidate_gaps": [],
    "loop_handoff": {
      "version": "loop-handoff/v2",
      "status": "done",
      "next_responsibility": "none",
      "agent_continuation_available": false,
      "human_decision_required": false,
      "trigger_mode": "none",
      "responsibility_reason": "The current Case revision passed completion review.",
      "next_prompt": "",
      "human_gate": {
        "required": false,
        "reason": "",
        "decision_needed": ""
      }
    },
    "updated_at": "2026-08-14T12:36:22.011Z"
  }
}
```

## Round Notes

- Case history is canonical in Structured Record.rounds; keep prose notes exceptional.
