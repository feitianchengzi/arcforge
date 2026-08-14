# Make on-demand skill selection semantic

Case: CASE-20260814-001
Status: handoff
Artifact Type: mixed
Selected Gap: none
Updated: 2026-08-14T07:05:44.254Z

## User Intent

Correct arcforge-on-demand so an arbitrary user action prompt is semantically matched to the most suitable validated on-demand skill instead of being treated as a literal catalog query.

## Structured Record

```json
{
  "schema_version": "development-case-record/v5",
  "id": "CASE-20260814-001",
  "title": "Make on-demand skill selection semantic",
  "status": "handoff",
  "artifact_type": "mixed",
  "created_at": "2026-08-14T06:47:16.624Z",
  "updated_at": "2026-08-14T07:05:44.254Z",
  "user_intent": "Correct arcforge-on-demand so an arbitrary user action prompt is semantically matched to the most suitable validated on-demand skill instead of being treated as a literal catalog query.",
  "expected_outcome": "On-demand resolution uses Agent semantic analysis over a trustworthy catalog surface, preserves explicit-name lookup, and has regression evidence for natural-language prompts that do not literally match a skill name.",
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
      "statement": "The current arcforge-on-demand workflow can run arcforge catalog resolve --query with the users arbitrary action text and report no skill when the text is not a literal catalog match.",
      "basis": "Direct user report of a recurring observed failure in the current workflow.",
      "evidence": [
        "User request in the current Codex conversation on 2026-08-14."
      ]
    },
    {
      "id": "FACT-002",
      "revision": 1,
      "status": "accepted",
      "statement": "The intended on-demand behavior is for the Agent to semantically analyze arbitrary user intent and choose a suitable validated on-demand skill, while name or alias resolution remains appropriate for explicit identifiers.",
      "basis": "The user explicitly clarified the required product behavior and the distinction between semantic intent and hard string matching.",
      "evidence": [
        "User request in the current Codex conversation on 2026-08-14."
      ]
    },
    {
      "id": "FACT-003",
      "revision": 1,
      "status": "accepted",
      "statement": "The current source and installed arcforge-on-demand skill, product specification, technical solution, and regression tests intentionally define the entry as explicit-only identifier or explicit substring-search resolution and explicitly forbid the Agent from selecting an on-demand skill from ordinary task semantics.",
      "basis": "Direct comparison of the executable skill, installed copy, stable specification, technical contracts, and tests shows the behavior is an aligned design decision rather than catalog corruption or accidental CLI misuse.",
      "evidence": [
        "skills/arcforge-on-demand/SKILL.md",
        "skills/arcforge-on-demand/agents/openai.yaml",
        "/Users/Glare/.codex/skills/arcforge-on-demand/SKILL.md",
        "arckit/spec/profile/skill-availability.md",
        "arckit/tech/profiles-sync/solution.md",
        "tests/skill-availability.test.mjs"
      ]
    },
    {
      "id": "FACT-004",
      "revision": 1,
      "status": "accepted",
      "statement": "resolveCatalogSkill exact mode performs normalized equality against qualifiedName, skillName, and aliases; search mode performs a whole-query substring check against name, aliases, and summary. Neither mode performs semantic matching, so an arbitrary action sentence predictably returns not-found unless that literal sentence happens to be indexed.",
      "basis": "The resolver implementation completely predicts the observed output, and live exact and search commands reproduced not-found for natural-language action/search phrases while a broad literal search returned only substring candidates.",
      "evidence": [
        "src/core/skill-catalog.ts",
        "arckit/tech/_shared/contracts/catalog-resolve.yaml",
        "tests/skill-availability.test.mjs",
        "Live CLI reproductions on 2026-08-14: natural-language exact and search queries returned status not-found; literal query skill returned indexed substring candidates."
      ]
    },
    {
      "id": "FACT-005",
      "revision": 1,
      "status": "accepted",
      "statement": "The correction boundary is Agent-owned semantic selection over validated minimal catalog metadata, followed by deterministic exact resolution of the chosen qualified identity; catalog identity, ambiguity, containment, content-digest, read-only, explicit-invocation, and single-skill-loading safeguards remain in force.",
      "basis": "This boundary directly implements the users semantic-routing requirement while preserving ArcForges local governance role and the proven security properties of the existing resolver.",
      "evidence": [
        "User request in the current Codex conversation on 2026-08-14.",
        "AGENTS.md",
        "arckit/spec/profile/skill-availability.md",
        "src/core/skill-catalog.ts"
      ]
    },
    {
      "id": "FACT-006",
      "revision": 1,
      "status": "accepted",
      "statement": "The ArcForge maintenance source now exposes a read-only catalog list projection containing only skillName, qualifiedName, sourceKey, and summary; arcforge-on-demand treats arbitrary explicit input as task intent for Agent semantic comparison, never as a literal resolve query, and exact-resolves only the selected qualifiedName before loading one skill.",
      "basis": "The source implementation, loader contract, product and technical documentation, types, CLI help, and regression tests are aligned and pass local verification.",
      "evidence": [
        "skills/arcforge-on-demand/SKILL.md",
        "skills/arcforge-on-demand/agents/openai.yaml",
        "src/core/skill-catalog.ts",
        "src/commands/index.ts",
        "src/shared/types.ts",
        "arckit/spec/profile/skill-availability.md",
        "arckit/tech/profiles-sync/solution.md",
        "tests/skill-availability.test.mjs"
      ]
    },
    {
      "id": "FACT-007",
      "revision": 1,
      "status": "accepted",
      "statement": "The current user-level installed arcforge-on-demand copy still contains the pre-change identifier/search-only contract and differs from the updated Git maintenance source; it has not been overwritten in this round.",
      "basis": "A direct source-versus-installed comparison after implementation reported different content, and arcforge-skill-creator forbids apply or target overwrite without governance handoff and user confirmation.",
      "evidence": [
        "skills/arcforge-on-demand/SKILL.md",
        "/Users/Glare/.codex/skills/arcforge-on-demand/SKILL.md",
        "Post-implementation cmp check on 2026-08-14 reported different content."
      ]
    }
  ],
  "state_impacts": [
    {
      "id": "IMPACT-PRODUCT-CAPABILITIES-001",
      "fact_id": "FACT-002",
      "fact_revision": 1,
      "target": {
        "kind": "software_decision",
        "ref": "product_capabilities",
        "revision": 0
      },
      "effect": "upheld",
      "reason": "The clarified on-demand capability is now durably specified and implemented in the maintenance source without claiming the broader open Project capability decision is fully settled.",
      "gap_ids": [],
      "evidence": [
        "arckit/spec/profile/skill-availability.md",
        "skills/arcforge-on-demand/SKILL.md",
        "tests/skill-availability.test.mjs"
      ]
    },
    {
      "id": "IMPACT-TECHNICAL-FOUNDATION-001",
      "fact_id": "FACT-004",
      "fact_revision": 1,
      "target": {
        "kind": "software_decision",
        "ref": "technical_foundation",
        "revision": 0
      },
      "effect": "upheld",
      "reason": "The technical sources and core now preserve deterministic identity and integrity checks while exposing only minimal metadata for Agent-owned semantic selection.",
      "gap_ids": [],
      "evidence": [
        "arckit/tech/profiles-sync/solution.md",
        "arckit/tech/_shared/contracts/catalog-resolve.yaml",
        "src/core/skill-catalog.ts",
        "npm test passed 59 of 59 tests on 2026-08-14."
      ]
    }
  ],
  "gaps": [
    {
      "id": "GAP-SEMANTIC-ROUTING-BOUNDARY",
      "status": "resolved",
      "goal": "Establish the actual on-demand routing contract, code path, and regression boundary needed to distinguish semantic action prompts from explicit skill identifiers.",
      "reason": "The accepted product expectation identifies a design mismatch, but the repository implementation and authoritative contract have not yet been accepted as Case facts; those findings can change the scope and acceptance method of the fix.",
      "derived_from": [
        "FACT-001",
        "FACT-002"
      ],
      "blocked_by": [],
      "priority_basis": {
        "user_impact": "high",
        "dependency": "prerequisite for a correctly scoped implementation change",
        "information_gain": "high"
      },
      "responsibility": "agent",
      "evidence_required": [
        "Trace the current on-demand routing from skill instructions through CLI/catalog behavior.",
        "Identify the authoritative product and technical expectations governing semantic versus identifier-based selection.",
        "Record a concrete regression boundary that can be implemented in a later fresh round."
      ],
      "resolution": {
        "id": "GAP-SEMANTIC-ROUTING-BOUNDARY",
        "status": "resolved",
        "outcome": "The current explicit-only string-resolution design, its exact failure mechanism, and the safe semantic-selection boundary are established with source and live CLI evidence.",
        "reason": "Skill instructions, product/technical contracts, resolver code, deterministic tests, installed-copy parity, commit history, and live commands all agree and fully explain the reported not-found behavior.",
        "evidence": [
          "skills/arcforge-on-demand/SKILL.md",
          "skills/arcforge-on-demand/agents/openai.yaml",
          "arckit/spec/profile/skill-availability.md",
          "arckit/tech/profiles-sync/solution.md",
          "arckit/tech/_shared/contracts/catalog-resolve.yaml",
          "src/core/skill-catalog.ts",
          "tests/skill-availability.test.mjs",
          "Live reproduction: arcforge catalog resolve --query 修复自然语言按需 skill 选择失败 returned status not-found on 2026-08-14."
        ],
        "occurred_at": "2026-08-14T06:52:04.932Z"
      }
    },
    {
      "id": "GAP-ALIGN-SEMANTIC-ON-DEMAND",
      "status": "resolved",
      "goal": "Align the durable product and technical contract, executable on-demand loader, safe catalog metadata surface, and regression coverage so arbitrary explicit action prompts are semantically matched by the Agent before one qualified catalog entry is validated and loaded.",
      "reason": "Accepted diagnosis shows the current contract deliberately routes arbitrary text into deterministic string matching, while the user requires Agent-owned semantic selection; the source contract, executable skill, catalog interface, and tests must change together without weakening catalog containment, digest, or identity validation.",
      "derived_from": [
        "FACT-002",
        "FACT-003",
        "FACT-004",
        "FACT-005"
      ],
      "blocked_by": [],
      "priority_basis": {
        "user_impact": "high",
        "blocking": "directly blocks the requested behavior",
        "risk": "false not-found results and unusable on-demand skills",
        "dependency": "diagnosis boundary is now accepted"
      },
      "responsibility": "agent",
      "evidence_required": [
        "Durable product and technical expectations distinguish arbitrary semantic intent from explicit name, alias, and qualified-name lookup.",
        "The on-demand loader can inspect only validated minimal catalog metadata, select one suitable skill semantically, then validate the selected qualified identity before reading its SKILL.md.",
        "Exact identifier resolution, ambiguity handling, path containment, and content-digest validation remain deterministic and fail closed.",
        "Regression evidence covers a natural-language action prompt that does not literally match the selected skill name, plus explicit-name, no-suitable-candidate, ambiguous-identity, and drift/error paths."
      ],
      "resolution": {
        "id": "GAP-ALIGN-SEMANTIC-ON-DEMAND",
        "status": "resolved",
        "outcome": "The maintenance source now routes arbitrary explicit action prompts through Agent semantic selection over minimal catalog metadata and exact qualified-name validation, with durable contracts and tests aligned.",
        "reason": "Product and technical sources, loader instructions and metadata, core list support, CLI help and routing, public documentation, and regression tests consistently implement the accepted boundary; type checks, build, YAML parsing, full tests, and live catalog commands pass.",
        "evidence": [
          "arckit/spec/profile/skill-availability.md",
          "arckit/tech/cli/solution.md",
          "arckit/tech/profiles-sync/solution.md",
          "arckit/tech/_shared/contracts/catalog-resolve.yaml",
          "arckit/tech/_shared/models/UserSkillCatalog.yaml",
          "skills/arcforge-on-demand/SKILL.md",
          "skills/arcforge-on-demand/agents/openai.yaml",
          "src/core/skill-catalog.ts",
          "src/commands/index.ts",
          "src/shared/types.ts",
          "tests/skill-availability.test.mjs",
          "npm run check passed on 2026-08-14.",
          "npm test passed 59 of 59 tests on 2026-08-14.",
          "npm run build:cli and live catalog list plus qualified exact resolve passed on 2026-08-14."
        ],
        "occurred_at": "2026-08-14T07:05:44.254Z"
      }
    },
    {
      "id": "GAP-AUTHORIZE-INSTALLED-LOADER-UPDATE",
      "status": "open",
      "goal": "Authorize or decline applying the updated ArcForge on-demand loader from the maintenance source to the current user-level installed target for real-world use and validation.",
      "reason": "The maintained source and CLI are aligned and locally verified, but the current installed loader remains the pre-change copy; overwriting an installed target is an ArcForge governance write that requires explicit user confirmation.",
      "derived_from": [
        "FACT-006",
        "FACT-007"
      ],
      "blocked_by": [],
      "priority_basis": {
        "user_impact": "high",
        "responsibility": "only the user can authorize target overwrite",
        "dependency": "source implementation is complete"
      },
      "responsibility": "human",
      "evidence_required": [
        "Explicit user authorization to apply the updated loader to the current user-level agent target, or an explicit decision to leave the installed copy unchanged."
      ],
      "resolution": null
    }
  ],
  "content_revision": 2,
  "completion_review": {
    "status": "pending",
    "policy": {
      "initial_max_cycles": 3,
      "source": "using-arckit default autonomous completion review policy for this Case",
      "snapshotted_at": "2026-08-14T06:47:16.624Z"
    },
    "additional_cycles_authorized": 0,
    "cycle_count": 0,
    "reviewed_content_revision": null,
    "dimensions": {
      "implementation_correctness": "unknown",
      "problem_resolution": "unknown",
      "verification_credibility": "unknown",
      "regression_risk": "unknown",
      "minimality": "unknown"
    },
    "findings": [],
    "cycles": [],
    "evidence": [],
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
      "goal": "Accept an evidence-backed diagnosis of the current on-demand routing contract and define the bounded downstream alignment obligation.",
      "outcome": "completed",
      "gap_selection": {
        "mode": "candidate",
        "basis": "This is the only ready persisted candidate and it establishes the prerequisite implementation and contract facts needed to scope the user-requested correction.",
        "snapshot_token": "8f5c35a6c4f3801ca9aba1d7e67609154d909815391bc25e31f8a178343dc09b",
        "selected_ref": "case-gap:CASE-20260814-001:GAP-SEMANTIC-ROUTING-BOUNDARY",
        "comparison_summary": "The sole persisted Case gap was selected; implementation and durable contract edits were deferred because their exact boundary depended on this rounds unaccepted diagnosis facts.",
        "fresh_discovery_summary": "No competing ready fresh gap was found. Repository inspection exposed one downstream alignment obligation, recorded but not consumed this round.",
        "considered": [
          {
            "ref": "case-gap:CASE-20260814-001:GAP-SEMANTIC-ROUTING-BOUNDARY",
            "source": "persisted",
            "eligibility": "ready",
            "disposition": "selected",
            "reason": "It is the prerequisite with the highest information gain and directly controls the scope and validation of the fix.",
            "priority_basis": {
              "user_impact": "high",
              "dependency": "blocks correct implementation",
              "information_gain": "high"
            }
          }
        ]
      },
      "selected_gap": {
        "id": "GAP-SEMANTIC-ROUTING-BOUNDARY",
        "responsibility": "agent",
        "goal": "Establish the actual on-demand routing contract, code path, and regression boundary needed to distinguish semantic action prompts from explicit skill identifiers.",
        "reason": "The accepted product expectation identifies a design mismatch, but the repository implementation and authoritative contract have not yet been accepted as Case facts; those findings can change the scope and acceptance method of the fix.",
        "derived_from": [
          "FACT-001",
          "FACT-002"
        ],
        "blocked_by": [],
        "priority_basis": {
          "blocking": "",
          "uncertainty": "",
          "risk": "",
          "user_impact": "high",
          "dependency": "prerequisite for a correctly scoped implementation change",
          "information_gain": "high"
        },
        "evidence_required": [
          "Trace the current on-demand routing from skill instructions through CLI/catalog behavior.",
          "Identify the authoritative product and technical expectations governing semantic versus identifier-based selection.",
          "Record a concrete regression boundary that can be implemented in a later fresh round."
        ]
      },
      "planned_transition": {
        "goal": "Accept an evidence-backed diagnosis of the current on-demand routing contract and define the bounded downstream alignment obligation.",
        "expected_state_change": "Resolve GAP-SEMANTIC-ROUTING-BOUNDARY with accepted code, contract, reproduction, and regression-boundary facts; leave one implementation alignment gap open."
      },
      "accepted_state_delta": {
        "resolved_gap": {
          "id": "GAP-SEMANTIC-ROUTING-BOUNDARY",
          "status": "resolved",
          "outcome": "The current explicit-only string-resolution design, its exact failure mechanism, and the safe semantic-selection boundary are established with source and live CLI evidence.",
          "reason": "Skill instructions, product/technical contracts, resolver code, deterministic tests, installed-copy parity, commit history, and live commands all agree and fully explain the reported not-found behavior.",
          "evidence": [
            "skills/arcforge-on-demand/SKILL.md",
            "skills/arcforge-on-demand/agents/openai.yaml",
            "arckit/spec/profile/skill-availability.md",
            "arckit/tech/profiles-sync/solution.md",
            "arckit/tech/_shared/contracts/catalog-resolve.yaml",
            "src/core/skill-catalog.ts",
            "tests/skill-availability.test.mjs",
            "Live reproduction: arcforge catalog resolve --query 修复自然语言按需 skill 选择失败 returned status not-found on 2026-08-14."
          ]
        },
        "facts_added": [
          {
            "id": "FACT-003",
            "revision": 1,
            "status": "accepted",
            "statement": "The current source and installed arcforge-on-demand skill, product specification, technical solution, and regression tests intentionally define the entry as explicit-only identifier or explicit substring-search resolution and explicitly forbid the Agent from selecting an on-demand skill from ordinary task semantics.",
            "basis": "Direct comparison of the executable skill, installed copy, stable specification, technical contracts, and tests shows the behavior is an aligned design decision rather than catalog corruption or accidental CLI misuse.",
            "evidence": [
              "skills/arcforge-on-demand/SKILL.md",
              "skills/arcforge-on-demand/agents/openai.yaml",
              "/Users/Glare/.codex/skills/arcforge-on-demand/SKILL.md",
              "arckit/spec/profile/skill-availability.md",
              "arckit/tech/profiles-sync/solution.md",
              "tests/skill-availability.test.mjs"
            ]
          },
          {
            "id": "FACT-004",
            "revision": 1,
            "status": "accepted",
            "statement": "resolveCatalogSkill exact mode performs normalized equality against qualifiedName, skillName, and aliases; search mode performs a whole-query substring check against name, aliases, and summary. Neither mode performs semantic matching, so an arbitrary action sentence predictably returns not-found unless that literal sentence happens to be indexed.",
            "basis": "The resolver implementation completely predicts the observed output, and live exact and search commands reproduced not-found for natural-language action/search phrases while a broad literal search returned only substring candidates.",
            "evidence": [
              "src/core/skill-catalog.ts",
              "arckit/tech/_shared/contracts/catalog-resolve.yaml",
              "tests/skill-availability.test.mjs",
              "Live CLI reproductions on 2026-08-14: natural-language exact and search queries returned status not-found; literal query skill returned indexed substring candidates."
            ]
          },
          {
            "id": "FACT-005",
            "revision": 1,
            "status": "accepted",
            "statement": "The correction boundary is Agent-owned semantic selection over validated minimal catalog metadata, followed by deterministic exact resolution of the chosen qualified identity; catalog identity, ambiguity, containment, content-digest, read-only, explicit-invocation, and single-skill-loading safeguards remain in force.",
            "basis": "This boundary directly implements the users semantic-routing requirement while preserving ArcForges local governance role and the proven security properties of the existing resolver.",
            "evidence": [
              "User request in the current Codex conversation on 2026-08-14.",
              "AGENTS.md",
              "arckit/spec/profile/skill-availability.md",
              "src/core/skill-catalog.ts"
            ]
          }
        ],
        "facts_superseded": [],
        "impacts_added": [
          {
            "id": "IMPACT-PRODUCT-CAPABILITIES-001",
            "fact_id": "FACT-002",
            "fact_revision": 1,
            "target": {
              "kind": "software_decision",
              "ref": "product_capabilities",
              "revision": 0
            },
            "effect": "undetermined",
            "reason": "The user clarified a core on-demand capability, but the current v5 Project decision is still open and the durable product specification encodes the conflicting identifier-only behavior.",
            "gap_ids": [
              "GAP-ALIGN-SEMANTIC-ON-DEMAND"
            ],
            "evidence": [
              "User request in the current Codex conversation on 2026-08-14.",
              "arckit/spec/profile/skill-availability.md"
            ]
          },
          {
            "id": "IMPACT-TECHNICAL-FOUNDATION-001",
            "fact_id": "FACT-004",
            "fact_revision": 1,
            "target": {
              "kind": "software_decision",
              "ref": "technical_foundation",
              "revision": 0
            },
            "effect": "undetermined",
            "reason": "The current technical decision is open while the implemented exact/search resolver contract cannot supply Agent semantic routing for arbitrary prompts.",
            "gap_ids": [
              "GAP-ALIGN-SEMANTIC-ON-DEMAND"
            ],
            "evidence": [
              "src/core/skill-catalog.ts",
              "arckit/tech/profiles-sync/solution.md",
              "arckit/tech/_shared/contracts/catalog-resolve.yaml"
            ]
          }
        ],
        "impacts_updated": [],
        "gaps_added": [
          {
            "id": "GAP-ALIGN-SEMANTIC-ON-DEMAND",
            "status": "open",
            "goal": "Align the durable product and technical contract, executable on-demand loader, safe catalog metadata surface, and regression coverage so arbitrary explicit action prompts are semantically matched by the Agent before one qualified catalog entry is validated and loaded.",
            "reason": "Accepted diagnosis shows the current contract deliberately routes arbitrary text into deterministic string matching, while the user requires Agent-owned semantic selection; the source contract, executable skill, catalog interface, and tests must change together without weakening catalog containment, digest, or identity validation.",
            "derived_from": [
              "FACT-002",
              "FACT-003",
              "FACT-004",
              "FACT-005"
            ],
            "blocked_by": [],
            "priority_basis": {
              "user_impact": "high",
              "blocking": "directly blocks the requested behavior",
              "risk": "false not-found results and unusable on-demand skills",
              "dependency": "diagnosis boundary is now accepted"
            },
            "responsibility": "agent",
            "evidence_required": [
              "Durable product and technical expectations distinguish arbitrary semantic intent from explicit name, alias, and qualified-name lookup.",
              "The on-demand loader can inspect only validated minimal catalog metadata, select one suitable skill semantically, then validate the selected qualified identity before reading its SKILL.md.",
              "Exact identifier resolution, ambiguity handling, path containment, and content-digest validation remain deterministic and fail closed.",
              "Regression evidence covers a natural-language action prompt that does not literally match the selected skill name, plus explicit-name, no-suitable-candidate, ambiguous-identity, and drift/error paths."
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
        "project_revision": 1,
        "judgments": [
          {
            "invariant_ref": "product-expectations-remain-recoverable",
            "disposition": "threatened",
            "reason": "FACT-002 and FACT-003 establish that the accepted product behavior conflicts with the current durable on-demand specification.",
            "fact_refs": [
              "FACT-002",
              "FACT-003"
            ],
            "evidence": [
              "arckit/spec/profile/skill-availability.md"
            ],
            "gap_refs": [
              "GAP-ALIGN-SEMANTIC-ON-DEMAND"
            ]
          },
          {
            "invariant_ref": "interaction-expectations-remain-recoverable",
            "disposition": "threatened",
            "reason": "The explicit invocation journey currently ends in literal not-found for arbitrary task prompts, while the accepted journey requires Agent semantic selection and load continuation.",
            "fact_refs": [
              "FACT-001",
              "FACT-002",
              "FACT-003"
            ],
            "evidence": [
              "skills/arcforge-on-demand/SKILL.md"
            ],
            "gap_refs": [
              "GAP-ALIGN-SEMANTIC-ON-DEMAND"
            ]
          },
          {
            "invariant_ref": "visual-language-remains-consistent",
            "disposition": "not_relevant",
            "reason": "The accepted facts concern Agent routing, catalog contracts, and CLI behavior; they do not establish or alter any visual-language or presentation expectation.",
            "fact_refs": [],
            "evidence": [],
            "gap_refs": []
          },
          {
            "invariant_ref": "technical-decisions-remain-explainable",
            "disposition": "threatened",
            "reason": "FACT-003 through FACT-005 expose that the current technical contract deliberately lacks the semantic-selection boundary now required by the user.",
            "fact_refs": [
              "FACT-003",
              "FACT-004",
              "FACT-005"
            ],
            "evidence": [
              "arckit/tech/profiles-sync/solution.md",
              "arckit/tech/_shared/contracts/catalog-resolve.yaml",
              "src/core/skill-catalog.ts"
            ],
            "gap_refs": [
              "GAP-ALIGN-SEMANTIC-ON-DEMAND"
            ]
          },
          {
            "invariant_ref": "accepted-facts-are-realized",
            "disposition": "threatened",
            "reason": "The live command and implementation evidence show the accepted semantic-routing expectation is not realized by the current loader and resolver flow.",
            "fact_refs": [
              "FACT-001",
              "FACT-002",
              "FACT-004"
            ],
            "evidence": [
              "skills/arcforge-on-demand/SKILL.md",
              "src/core/skill-catalog.ts",
              "Live exact-query reproduction returned status not-found on 2026-08-14."
            ],
            "gap_refs": [
              "GAP-ALIGN-SEMANTIC-ON-DEMAND"
            ]
          },
          {
            "invariant_ref": "material-risks-have-credible-evidence",
            "disposition": "upheld",
            "reason": "The false-negative risk and its scope are supported by matching source contracts, resolver logic, tests, installed-copy parity, and repeatable live CLI results.",
            "fact_refs": [
              "FACT-001",
              "FACT-003",
              "FACT-004"
            ],
            "evidence": [
              "skills/arcforge-on-demand/SKILL.md",
              "src/core/skill-catalog.ts",
              "tests/skill-availability.test.mjs",
              "Live exact and search reproductions on 2026-08-14."
            ],
            "gap_refs": []
          }
        ]
      },
      "evidence": [
        "skills/arcforge-on-demand/SKILL.md and its installed copy are identical in the routing clauses that reject semantic inference.",
        "src/core/skill-catalog.ts exactMatch uses normalized equality; searchMatch uses normalized whole-query substring matching.",
        "arckit/spec/profile/skill-availability.md and arckit/tech/profiles-sync/solution.md formalize explicit-only loading and exact/search resolution.",
        "tests/skill-availability.test.mjs treats explicit-only resolver-backed loading and substring search as passing behavior.",
        "arcforge catalog resolve --query 修复自然语言按需 skill 选择失败 returned status not-found; a natural-language search phrase also returned not-found on 2026-08-14.",
        "git history identifies the aligned design as part of commit 7a157dd (separate agent semantics from arcforge core)."
      ],
      "runtime_result_ref": "",
      "occurred_at": "2026-08-14T06:52:04.932Z"
    },
    {
      "round": 2,
      "transition_schema_version": "arckit-case-transition/v8",
      "goal": "Implement and verify the accepted Agent-semantic catalog selection boundary in the maintenance source and durable product/technical facts.",
      "outcome": "completed",
      "gap_selection": {
        "mode": "candidate",
        "basis": "This is the only ready persisted candidate and directly implements the accepted semantic-selection boundary across durable contracts, the loader, deterministic core support, and tests.",
        "snapshot_token": "fb4d53a5c4c87c794bd304ce1463bbdf98136fccb315ec2923ad0d7296cc69d0",
        "selected_ref": "case-gap:CASE-20260814-001:GAP-ALIGN-SEMANTIC-ON-DEMAND",
        "comparison_summary": "The sole persisted candidate was selected. Completion Review was deferred until implementation content is accepted; visual, UI, and registry changes were excluded as unrelated.",
        "fresh_discovery_summary": "Implementation verification exposed one new human-owned deployment decision: the updated maintenance source differs from the current installed loader target.",
        "considered": [
          {
            "ref": "case-gap:CASE-20260814-001:GAP-ALIGN-SEMANTIC-ON-DEMAND",
            "source": "persisted",
            "eligibility": "ready",
            "disposition": "selected",
            "reason": "It is the only ready obligation and has direct user impact with no remaining implementation dependency.",
            "priority_basis": {
              "user_impact": "high",
              "blocking": "requested behavior is absent",
              "dependency": "diagnosis accepted"
            }
          }
        ]
      },
      "selected_gap": {
        "id": "GAP-ALIGN-SEMANTIC-ON-DEMAND",
        "responsibility": "agent",
        "goal": "Align the durable product and technical contract, executable on-demand loader, safe catalog metadata surface, and regression coverage so arbitrary explicit action prompts are semantically matched by the Agent before one qualified catalog entry is validated and loaded.",
        "reason": "Accepted diagnosis shows the current contract deliberately routes arbitrary text into deterministic string matching, while the user requires Agent-owned semantic selection; the source contract, executable skill, catalog interface, and tests must change together without weakening catalog containment, digest, or identity validation.",
        "derived_from": [
          "FACT-002",
          "FACT-003",
          "FACT-004",
          "FACT-005"
        ],
        "blocked_by": [],
        "priority_basis": {
          "blocking": "directly blocks the requested behavior",
          "uncertainty": "",
          "risk": "false not-found results and unusable on-demand skills",
          "user_impact": "high",
          "dependency": "diagnosis boundary is now accepted"
        },
        "evidence_required": [
          "Durable product and technical expectations distinguish arbitrary semantic intent from explicit name, alias, and qualified-name lookup.",
          "The on-demand loader can inspect only validated minimal catalog metadata, select one suitable skill semantically, then validate the selected qualified identity before reading its SKILL.md.",
          "Exact identifier resolution, ambiguity handling, path containment, and content-digest validation remain deterministic and fail closed.",
          "Regression evidence covers a natural-language action prompt that does not literally match the selected skill name, plus explicit-name, no-suitable-candidate, ambiguous-identity, and drift/error paths."
        ]
      },
      "planned_transition": {
        "goal": "Implement and verify the accepted Agent-semantic catalog selection boundary in the maintenance source and durable product/technical facts.",
        "expected_state_change": "Resolve GAP-ALIGN-SEMANTIC-ON-DEMAND with aligned spec, tech contract, loader metadata and flow, read-only catalog list support, and regression evidence while preserving deterministic exact safety checks."
      },
      "accepted_state_delta": {
        "resolved_gap": {
          "id": "GAP-ALIGN-SEMANTIC-ON-DEMAND",
          "status": "resolved",
          "outcome": "The maintenance source now routes arbitrary explicit action prompts through Agent semantic selection over minimal catalog metadata and exact qualified-name validation, with durable contracts and tests aligned.",
          "reason": "Product and technical sources, loader instructions and metadata, core list support, CLI help and routing, public documentation, and regression tests consistently implement the accepted boundary; type checks, build, YAML parsing, full tests, and live catalog commands pass.",
          "evidence": [
            "arckit/spec/profile/skill-availability.md",
            "arckit/tech/cli/solution.md",
            "arckit/tech/profiles-sync/solution.md",
            "arckit/tech/_shared/contracts/catalog-resolve.yaml",
            "arckit/tech/_shared/models/UserSkillCatalog.yaml",
            "skills/arcforge-on-demand/SKILL.md",
            "skills/arcforge-on-demand/agents/openai.yaml",
            "src/core/skill-catalog.ts",
            "src/commands/index.ts",
            "src/shared/types.ts",
            "tests/skill-availability.test.mjs",
            "npm run check passed on 2026-08-14.",
            "npm test passed 59 of 59 tests on 2026-08-14.",
            "npm run build:cli and live catalog list plus qualified exact resolve passed on 2026-08-14."
          ]
        },
        "facts_added": [
          {
            "id": "FACT-006",
            "revision": 1,
            "status": "accepted",
            "statement": "The ArcForge maintenance source now exposes a read-only catalog list projection containing only skillName, qualifiedName, sourceKey, and summary; arcforge-on-demand treats arbitrary explicit input as task intent for Agent semantic comparison, never as a literal resolve query, and exact-resolves only the selected qualifiedName before loading one skill.",
            "basis": "The source implementation, loader contract, product and technical documentation, types, CLI help, and regression tests are aligned and pass local verification.",
            "evidence": [
              "skills/arcforge-on-demand/SKILL.md",
              "skills/arcforge-on-demand/agents/openai.yaml",
              "src/core/skill-catalog.ts",
              "src/commands/index.ts",
              "src/shared/types.ts",
              "arckit/spec/profile/skill-availability.md",
              "arckit/tech/profiles-sync/solution.md",
              "tests/skill-availability.test.mjs"
            ]
          },
          {
            "id": "FACT-007",
            "revision": 1,
            "status": "accepted",
            "statement": "The current user-level installed arcforge-on-demand copy still contains the pre-change identifier/search-only contract and differs from the updated Git maintenance source; it has not been overwritten in this round.",
            "basis": "A direct source-versus-installed comparison after implementation reported different content, and arcforge-skill-creator forbids apply or target overwrite without governance handoff and user confirmation.",
            "evidence": [
              "skills/arcforge-on-demand/SKILL.md",
              "/Users/Glare/.codex/skills/arcforge-on-demand/SKILL.md",
              "Post-implementation cmp check on 2026-08-14 reported different content."
            ]
          }
        ],
        "facts_superseded": [],
        "impacts_added": [],
        "impacts_updated": [
          {
            "id": "IMPACT-PRODUCT-CAPABILITIES-001",
            "fact_id": "FACT-002",
            "fact_revision": 1,
            "target": {
              "kind": "software_decision",
              "ref": "product_capabilities",
              "revision": 0
            },
            "effect": "upheld",
            "reason": "The clarified on-demand capability is now durably specified and implemented in the maintenance source without claiming the broader open Project capability decision is fully settled.",
            "gap_ids": [],
            "evidence": [
              "arckit/spec/profile/skill-availability.md",
              "skills/arcforge-on-demand/SKILL.md",
              "tests/skill-availability.test.mjs"
            ]
          },
          {
            "id": "IMPACT-TECHNICAL-FOUNDATION-001",
            "fact_id": "FACT-004",
            "fact_revision": 1,
            "target": {
              "kind": "software_decision",
              "ref": "technical_foundation",
              "revision": 0
            },
            "effect": "upheld",
            "reason": "The technical sources and core now preserve deterministic identity and integrity checks while exposing only minimal metadata for Agent-owned semantic selection.",
            "gap_ids": [],
            "evidence": [
              "arckit/tech/profiles-sync/solution.md",
              "arckit/tech/_shared/contracts/catalog-resolve.yaml",
              "src/core/skill-catalog.ts",
              "npm test passed 59 of 59 tests on 2026-08-14."
            ]
          }
        ],
        "gaps_added": [
          {
            "id": "GAP-AUTHORIZE-INSTALLED-LOADER-UPDATE",
            "status": "open",
            "goal": "Authorize or decline applying the updated ArcForge on-demand loader from the maintenance source to the current user-level installed target for real-world use and validation.",
            "reason": "The maintained source and CLI are aligned and locally verified, but the current installed loader remains the pre-change copy; overwriting an installed target is an ArcForge governance write that requires explicit user confirmation.",
            "derived_from": [
              "FACT-006",
              "FACT-007"
            ],
            "blocked_by": [],
            "priority_basis": {
              "user_impact": "high",
              "responsibility": "only the user can authorize target overwrite",
              "dependency": "source implementation is complete"
            },
            "responsibility": "human",
            "evidence_required": [
              "Explicit user authorization to apply the updated loader to the current user-level agent target, or an explicit decision to leave the installed copy unchanged."
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
        "project_revision": 1,
        "judgments": [
          {
            "invariant_ref": "product-expectations-remain-recoverable",
            "disposition": "upheld",
            "reason": "The accepted semantic-selection behavior, explicit-trigger boundary, no-match behavior, ambiguity handling, and safety constraints are now durably recoverable.",
            "fact_refs": [
              "FACT-002",
              "FACT-005",
              "FACT-006"
            ],
            "evidence": [
              "arckit/spec/profile/skill-availability.md",
              "README.md",
              "docs/zh-CN/README.md",
              "docs/en/README.md"
            ],
            "gap_refs": []
          },
          {
            "invariant_ref": "interaction-expectations-remain-recoverable",
            "disposition": "upheld",
            "reason": "The explicit invocation journey now distinguishes identity and task-intent paths, including unique selection, no suitable candidate, ambiguity, resolver errors, and load continuation.",
            "fact_refs": [
              "FACT-002",
              "FACT-006"
            ],
            "evidence": [
              "skills/arcforge-on-demand/SKILL.md",
              "arckit/spec/profile/skill-availability.md"
            ],
            "gap_refs": []
          },
          {
            "invariant_ref": "visual-language-remains-consistent",
            "disposition": "not_relevant",
            "reason": "The implementation and accepted facts affect Agent/CLI routing and durable contracts only; no visual-language or presentation behavior changed.",
            "fact_refs": [],
            "evidence": [],
            "gap_refs": []
          },
          {
            "invariant_ref": "technical-decisions-remain-explainable",
            "disposition": "upheld",
            "reason": "The technical boundary is explicit: Agent owns semantic relevance; core validates index structure, emits minimal metadata, and exact-validates the selected identity, path containment, and digest without ranking candidates.",
            "fact_refs": [
              "FACT-004",
              "FACT-005",
              "FACT-006"
            ],
            "evidence": [
              "arckit/tech/cli/solution.md",
              "arckit/tech/profiles-sync/solution.md",
              "arckit/tech/_shared/contracts/catalog-resolve.yaml",
              "src/core/skill-catalog.ts"
            ],
            "gap_refs": []
          },
          {
            "invariant_ref": "accepted-facts-are-realized",
            "disposition": "threatened",
            "reason": "The repository maintenance source realizes the accepted behavior, but FACT-007 establishes that the users currently installed loader still runs the old contract until a confirmed apply occurs.",
            "fact_refs": [
              "FACT-006",
              "FACT-007"
            ],
            "evidence": [
              "skills/arcforge-on-demand/SKILL.md",
              "/Users/Glare/.codex/skills/arcforge-on-demand/SKILL.md"
            ],
            "gap_refs": [
              "GAP-AUTHORIZE-INSTALLED-LOADER-UPDATE"
            ]
          },
          {
            "invariant_ref": "material-risks-have-credible-evidence",
            "disposition": "upheld",
            "reason": "Regression and security boundaries are supported by type checking, full tests, minimal-field live list validation, qualified exact live resolution, YAML parsing, and zero debug-marker residue.",
            "fact_refs": [
              "FACT-004",
              "FACT-005",
              "FACT-006",
              "FACT-007"
            ],
            "evidence": [
              "npm run check passed on 2026-08-14.",
              "npm test passed 59 of 59 tests on 2026-08-14.",
              "Live catalog list returned only four allowed candidate fields for five entries.",
              "Live qualified exact resolve returned a digest-validated installed entry.",
              "git diff --check passed and no ARC_DEBUG marker was found."
            ],
            "gap_refs": []
          }
        ]
      },
      "evidence": [
        "TypeScript checks passed for app and Node configurations.",
        "All 59 repository tests passed, including natural-language loader contract and catalog list/resolve coverage.",
        "CLI build passed; live catalog list returned status available with five stable minimal candidates and no sourceRoot, installedPath, or digest fields.",
        "Live exact resolution of a selected qualifiedName returned one contained, digest-validated entry.",
        "YAML parsing passed for loader metadata, catalog contract, and catalog model.",
        "git diff --check passed; no temporary ARC_DEBUG marker or arckit/debug output was introduced."
      ],
      "runtime_result_ref": "",
      "occurred_at": "2026-08-14T07:05:44.254Z"
    }
  ],
  "case_resolution": {
    "status": "unresolved",
    "stage": "working",
    "satisfied": [
      "GAP-SEMANTIC-ROUTING-BOUNDARY",
      "GAP-ALIGN-SEMANTIC-ON-DEMAND"
    ],
    "remaining": [
      "GAP-AUTHORIZE-INSTALLED-LOADER-UPDATE"
    ],
    "blocked": [],
    "reason": "1 Case obligation(s) remain.",
    "candidate_gaps": [
      {
        "id": "GAP-AUTHORIZE-INSTALLED-LOADER-UPDATE",
        "responsibility": "human",
        "goal": "Authorize or decline applying the updated ArcForge on-demand loader from the maintenance source to the current user-level installed target for real-world use and validation.",
        "reason": "The maintained source and CLI are aligned and locally verified, but the current installed loader remains the pre-change copy; overwriting an installed target is an ArcForge governance write that requires explicit user confirmation.",
        "derived_from": [
          "FACT-006",
          "FACT-007"
        ],
        "blocked_by": [],
        "priority_basis": {
          "blocking": "",
          "uncertainty": "",
          "risk": "",
          "user_impact": "high",
          "responsibility": "only the user can authorize target overwrite",
          "dependency": "source implementation is complete"
        },
        "evidence_required": [
          "Explicit user authorization to apply the updated loader to the current user-level agent target, or an explicit decision to leave the installed copy unchanged."
        ]
      }
    ],
    "loop_handoff": {
      "version": "loop-handoff/v2",
      "status": "needs_human",
      "next_responsibility": "human",
      "agent_continuation_available": false,
      "human_decision_required": true,
      "trigger_mode": "user_decision",
      "responsibility_reason": "The maintained source and CLI are aligned and locally verified, but the current installed loader remains the pre-change copy; overwriting an installed target is an ArcForge governance write that requires explicit user confirmation.",
      "next_prompt": "",
      "human_gate": {
        "required": true,
        "reason": "The maintained source and CLI are aligned and locally verified, but the current installed loader remains the pre-change copy; overwriting an installed target is an ArcForge governance write that requires explicit user confirmation.",
        "decision_needed": "Authorize or decline applying the updated ArcForge on-demand loader from the maintenance source to the current user-level installed target for real-world use and validation."
      }
    },
    "updated_at": "2026-08-14T07:05:44.254Z"
  }
}
```

## Round Notes

- Case history is canonical in Structured Record.rounds; keep prose notes exceptional.
