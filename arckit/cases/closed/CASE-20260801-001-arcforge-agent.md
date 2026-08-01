# 收敛 ArcForge 代码与 Agent 运行时职责边界

Case: CASE-20260801-001
Status: closed
Artifact Type: mixed
Selected Gap: none
Updated: 2026-08-01T04:55:47.128Z

## User Intent

保留用户确认的 arckit 扫描特例和推荐仓库示例，整体修复其余将维护源认定、适用性、整理、清理、验证方式与语义质量判断错误下沉到代码或固定 skill 规则的问题

## Structured Record

```json
{
  "schema_version": "development-case-record/v3",
  "id": "CASE-20260801-001",
  "title": "收敛 ArcForge 代码与 Agent 运行时职责边界",
  "status": "closed",
  "artifact_type": "mixed",
  "created_at": "2026-08-01T03:43:13.509Z",
  "updated_at": "2026-08-01T04:55:47.128Z",
  "user_intent": "保留用户确认的 arckit 扫描特例和推荐仓库示例，整体修复其余将维护源认定、适用性、整理、清理、验证方式与语义质量判断错误下沉到代码或固定 skill 规则的问题",
  "expected_outcome": "",
  "project_state_ref": "arckit/project/state.record.json",
  "current_round": {
    "goal": "",
    "selected_gap": null
  },
  "facets": {
    "product_expectation": {
      "applicability": "required",
      "maturity": "formalized",
      "target_maturity": "formalized",
      "alignment": "aligned",
      "target_alignment": "aligned",
      "resolution": "resolved",
      "reason": "Stable specifications now separate deterministic facts, source-owned natural-language data, Agent runtime assessment, and explicit-plan execution; they preserve the arckit scan exclusion and recommended repositories as intentional product-owned exceptions.",
      "evidence": [
        "User instruction on 2026-08-01 retaining findings 1 and 2 as intentional product behavior and authorizing the remaining optimization.",
        "arckit/spec/profile/skill-availability.md",
        "AGENTS.md",
        "arckit/spec/interface/agent-skill.md",
        "arckit/spec/sources/skill-project-merge.md",
        "arckit/spec/profile/destination-sync.md",
        "arckit/spec/audit/rule-audit.md",
        "arckit/spec/share/github-sharing.md",
        "arckit/spec/interface/desktop-app.md",
        "arckit/spec/GLOSSARY.md",
        "arckit/spec/INDEX.md",
        "arckit/spec/_map/feature-matrix.md",
        "arckit/spec/_map/RELATIONS.md"
      ],
      "next_transition": ""
    },
    "interaction_expectation": {
      "applicability": "required",
      "maturity": "formalized",
      "target_maturity": "formalized",
      "alignment": "aligned",
      "target_alignment": "aligned",
      "resolution": "resolved",
      "reason": "Existing Desktop surfaces now distinguish deterministic facts from Agent assessments and explicit user overrides, preserve assessment evidence through confirmation, and remove score or automatic-organization interaction semantics.",
      "evidence": [
        "src/ui/views/destinations.tsx",
        "arckit/interaction/destinations/interaction.md",
        "src/ui/views/installed.tsx",
        "src/ui/views/share.tsx",
        "src/ui/views/dashboard.tsx",
        "arckit/interaction/share/interaction.md",
        "arckit/interaction/audit/interaction.md",
        "arckit/interaction/INDEX.md",
        "arckit/interaction/_map/feature-matrix.md"
      ],
      "next_transition": ""
    },
    "visual_expectation": {
      "applicability": "not_required",
      "maturity": "unknown",
      "target_maturity": "unknown",
      "alignment": "unknown",
      "target_alignment": "unknown",
      "resolution": "resolved",
      "reason": "The optimization changes responsibility semantics and displayed evidence using existing dialog, diagnostic, badge, and list patterns; it does not introduce a new visual language or component family.",
      "evidence": [
        "src/ui/views/destinations.tsx",
        "arckit/visual/_library/components/workbench-components.yaml"
      ],
      "next_transition": ""
    },
    "technical_expectation": {
      "applicability": "required",
      "maturity": "formalized",
      "target_maturity": "formalized",
      "alignment": "aligned",
      "target_alignment": "aligned",
      "resolution": "resolved",
      "reason": "Technical contracts now keep missing availability unclassified, model project applicability assessments as caller-owned, require explicit installed-skill decisions, return neutral source evidence, constrain cleanup semantics, replace audit scores with coverage, and make publish readiness optional Agent input.",
      "evidence": [
        "src/core/installed-skills.ts",
        "src/core/sources.ts",
        "src/core/skill-availability.ts",
        "src/core/audit.ts",
        "src/core/publish.ts",
        "arckit/tech/profiles-sync/solution.md",
        "arckit/tech/sources/solution.md",
        "arckit/tech/audit/solution.md",
        "arckit/tech/sharing-ipc/solution.md",
        "arckit/tech/_shared/models/SkillProjectManifest.yaml",
        "arckit/tech/_shared/models/SkillProjectApplicabilityAssessment.yaml",
        "arckit/tech/_shared/models/SkillAvailabilityPlan.yaml",
        "arckit/tech/_shared/models/AuditReport.yaml",
        "arckit/tech/_shared/models/PublishPlan.yaml",
        "arckit/tech/_shared/contracts/apply-plan.yaml",
        "arckit/tech/_shared/contracts/apply-run.yaml",
        "arckit/tech/_shared/contracts/share-plan.yaml",
        "arckit/tech/INDEX.md",
        "arckit/tech/_map/feature-matrix.md",
        "arckit/tech/_map/RELATIONS.md",
        "arckit/tech/_map/decision-log.md"
      ],
      "next_transition": ""
    },
    "implementation_state": {
      "applicability": "required",
      "maturity": "formalized",
      "target_maturity": "formalized",
      "alignment": "aligned",
      "target_alignment": "aligned",
      "resolution": "resolved",
      "reason": "Core modules now validate structure and execute explicit plans while source manifests own descriptive policy and caller-provided Agent assessments own semantic judgments; CLI, Desktop, contracts, skills, and tests carry those inputs consistently. The intentional arckit scan exclusion and recommended installer repositories remain.",
      "evidence": [
        "src/shared/types.ts",
        "skills/arcforge/references/project-applicability-policy.md",
        "git status --short on 2026-08-01",
        "src/core/skill-availability.ts",
        "src/core/skill-project-availability.ts",
        "src/core/sources.ts",
        "src/core/installed-skills.ts",
        "src/core/audit.ts",
        "src/core/publish.ts",
        "src/core/share.ts",
        "src/core/share-sync.ts",
        "src/commands/index.ts",
        "src/electron/main.ts",
        "src/electron/preload.cts",
        "src/ui/views/destinations.tsx",
        "src/ui/views/installed.tsx",
        "src/ui/views/share.tsx",
        "skills/arcforge/SKILL.md",
        "skills/arcforge-skill-creator/SKILL.md",
        "skills/arcforge-skill-first/SKILL.md",
        "skills/arcforge/references/skill-project-manifest.schema.json",
        "src/core/config.ts",
        "skills/install-arcforge/scripts/install-from-repo.mjs"
      ],
      "next_transition": ""
    },
    "verification_state": {
      "applicability": "required",
      "maturity": "confirmed",
      "target_maturity": "confirmed",
      "alignment": "aligned",
      "target_alignment": "aligned",
      "resolution": "resolved",
      "reason": "Type checks, all 55 tests, production build, JSON and YAML parsing, whitespace validation, and semantic residue searches pass. Tests explicitly preserve the arckit root exclusion and recommended installer repositories while covering unclassified availability, caller-owned assessments, explicit decisions, factual audit/share outputs, and on-demand installation.",
      "evidence": [
        "tests/arcforge-skill-first.test.mjs",
        "tests/package.test.mjs",
        "tests/install-arcforge.test.mjs",
        "npm run check passed on 2026-08-01",
        "npm test passed 55/55 on 2026-08-01",
        "npm run build passed with 1638 modules transformed on 2026-08-01",
        "All repository JSON parsed successfully on 2026-08-01",
        "All 38 repository YAML documents parsed successfully on 2026-08-01",
        "git diff --check passed on 2026-08-01",
        "tests/skill-availability.test.mjs",
        "tests/installed-skills.test.mjs"
      ],
      "next_transition": ""
    }
  },
  "content_revision": 10,
  "completion_review": {
    "status": "clean",
    "policy": {
      "initial_max_cycles": 3,
      "source": "controller-policy:user-request-2026-08-01-overall-optimization",
      "snapshotted_at": "2026-08-01T03:43:13.509Z"
    },
    "additional_cycles_authorized": 0,
    "cycle_count": 2,
    "reviewed_content_revision": 10,
    "dimensions": {
      "correctness": "clean",
      "completeness": "clean",
      "minimality": "clean"
    },
    "findings": [
      {
        "id": "CR1-ASSESSMENT-CONTEXT",
        "kind": "error",
        "statement": "Saved project assessments are matched against relative project targets using process.cwd instead of the consumer root, and a reapply that reuses an assessment writes a new relation without preserving that reused assessment.",
        "responsibility": "agent",
        "affected_facets": [
          "implementation_state",
          "verification_state"
        ],
        "artifact_refs": [
          "src/core/sources.ts",
          "src/core/skill-availability.ts"
        ],
        "evidence": [
          "reusableProjectAssessments normalizes projectTargetDirs with path.resolve(item) without consumerRoot.",
          "availabilityAppliedRecordFor persists context.projectAssessments rather than the validated assessments present in plan.items."
        ],
        "status": "resolved",
        "resolution_reason": "Assessment roots are normalized from consumerRoot, reuse requires the current source policy digest and exact target context, and saved relations clone assessments from validated plan items so reused assessments persist.",
        "resolution_evidence": [
          "src/core/skill-availability.ts",
          "src/core/sources.ts",
          "tests/skill-availability.test.mjs",
          "npm test passed 57/57 on 2026-08-01"
        ],
        "discovered_in_cycle": 1
      },
      {
        "id": "CR1-DESKTOP-ASSESSMENT",
        "kind": "omission",
        "statement": "The Destinations interaction contract says existing assessments are displayed and unresolved assessments can be explicitly overridden, but the UI neither renders existing assessment evidence nor offers an override when an assessment is unsuitable, needs input, or targets stale roots.",
        "responsibility": "agent",
        "affected_facets": [
          "interaction_expectation",
          "implementation_state"
        ],
        "artifact_refs": [
          "src/ui/views/destinations.tsx",
          "arckit/interaction/destinations/interaction.md"
        ],
        "evidence": [
          "The UI only creates projectAssessmentSkills when item.projectAssessment is absent.",
          "The plan item card renders projectApplicability but not projectAssessment."
        ],
        "status": "resolved",
        "resolution_reason": "Destination cards now render the bound assessment status, decision source, summary, condition evidence, overall evidence, and unknowns. Explicit override is offered for missing, unsuitable, needs-input, or target-mismatched assessments and uses normalized project roots from the reviewed plan.",
        "resolution_evidence": [
          "src/ui/views/destinations.tsx",
          "src/ui/i18n.ts",
          "arckit/interaction/destinations/interaction.md",
          "tests/skill-availability.test.mjs",
          "npm run check passed on 2026-08-01"
        ],
        "discovered_in_cycle": 1
      },
      {
        "id": "CR1-INPUT-VALIDATION",
        "kind": "error",
        "statement": "Caller-owned organize decisions and project assessments are not fully validated as runtime JSON: malformed decision fields can throw before producing a structural conflict, action kinds are not checked, and assessment evidence arrays may be empty despite the evidence-backed contract.",
        "responsibility": "agent",
        "affected_facets": [
          "technical_expectation",
          "implementation_state",
          "verification_state"
        ],
        "artifact_refs": [
          "src/core/installed-skills.ts",
          "src/core/skill-availability.ts",
          "arckit/tech/_shared/models/SkillProjectApplicabilityAssessment.yaml"
        ],
        "evidence": [
          "validateOrganizeDecision calls trim and length on unchecked JSON fields.",
          "validateOrganizeDecision does not reject an unknown action kind.",
          "assessmentMap and validateProjectAssessment check item types but not non-empty evidence arrays."
        ],
        "status": "resolved",
        "resolution_reason": "Organize decisions now validate object shape, all required strings and arrays, known action kinds, evidence, paths, and signatures before use; malformed values become plan conflicts. Project assessments require non-empty overall and per-condition evidence in both runtime validation and the technical model.",
        "resolution_evidence": [
          "src/core/installed-skills.ts",
          "src/core/skill-availability.ts",
          "arckit/tech/_shared/models/SkillProjectApplicabilityAssessment.yaml",
          "tests/installed-skills.test.mjs",
          "tests/skill-availability.test.mjs",
          "npm test passed 57/57 on 2026-08-01"
        ],
        "discovered_in_cycle": 1
      },
      {
        "id": "CR1-DEAD-COMPATIBILITY-LABEL",
        "kind": "excess",
        "statement": "Desktop localization still maps a compatibility availability origin even though new plans cannot emit that origin and the current ResolvedSkillAvailability type excludes it.",
        "responsibility": "agent",
        "affected_facets": [
          "implementation_state"
        ],
        "artifact_refs": [
          "src/ui/i18n.ts",
          "src/shared/types.ts"
        ],
        "evidence": [
          "availabilityPolicyOrigin retains compatibility labels in both locales.",
          "SkillAvailabilityPolicyOrigin now uses unclassified for unresolved new plans."
        ],
        "status": "resolved",
        "resolution_reason": "Both Desktop locale maps now expose unclassified, matching current plan types and behavior, and no longer advertise a legacy fallback origin on the runtime plan surface.",
        "resolution_evidence": [
          "src/ui/i18n.ts",
          "src/shared/types.ts",
          "semantic residue search on 2026-08-01",
          "npm run check passed on 2026-08-01"
        ],
        "discovered_in_cycle": 1
      }
    ],
    "cycles": [
      {
        "cycle": 1,
        "autonomous_cycle": 1,
        "reviewer": "agent",
        "outcome": "findings",
        "content_revision": 6,
        "dimensions": {
          "correctness": "findings",
          "completeness": "findings",
          "minimality": "findings"
        },
        "finding_ids": [
          "CR1-ASSESSMENT-CONTEXT",
          "CR1-DESKTOP-ASSESSMENT",
          "CR1-INPUT-VALIDATION",
          "CR1-DEAD-COMPATIBILITY-LABEL"
        ],
        "evidence": [
          "Focused review of core availability, installed-skill decision validation, Desktop assessment flow, contracts, and semantic residue search.",
          "All automated checks passed before review, so findings concern uncovered cross-call and malformed-input behavior rather than existing test failures."
        ],
        "occurred_at": "2026-08-01T04:47:42.206Z"
      },
      {
        "cycle": 2,
        "autonomous_cycle": 2,
        "reviewer": "agent",
        "outcome": "clean",
        "content_revision": 10,
        "dimensions": {
          "correctness": "clean",
          "completeness": "clean",
          "minimality": "clean"
        },
        "finding_ids": [],
        "evidence": [
          "All four cycle-1 findings are resolved with code, contract, and test evidence.",
          "npm run check passed after repairs.",
          "npm test passed 57/57 after repairs.",
          "npm run build passed after repairs with 1638 modules transformed.",
          "All repository JSON and 38 YAML documents parsed successfully.",
          "git diff --check passed.",
          "Semantic residue search contains only intentional persisted-state compatibility and negative assertions.",
          "The intentional arckit scan exclusion and recommended arckit/arckit-code installer examples remain covered by tests."
        ],
        "occurred_at": "2026-08-01T04:55:47.128Z"
      }
    ],
    "evidence": [
      "Focused review of core availability, installed-skill decision validation, Desktop assessment flow, contracts, and semantic residue search.",
      "All automated checks passed before review, so findings concern uncovered cross-call and malformed-input behavior rather than existing test failures.",
      "All four cycle-1 findings are resolved with code, contract, and test evidence.",
      "npm run check passed after repairs.",
      "npm test passed 57/57 after repairs.",
      "npm run build passed after repairs with 1638 modules transformed.",
      "All repository JSON and 38 YAML documents parsed successfully.",
      "git diff --check passed.",
      "Semantic residue search contains only intentional persisted-state compatibility and negative assertions.",
      "The intentional arckit scan exclusion and recommended arckit/arckit-code installer examples remain covered by tests."
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
      "goal": "Formalize which Case facets are required and bind the optimization to the user-approved responsibility boundary.",
      "outcome": "completed",
      "planned_transition": "Product, interaction, technical, implementation, and verification facets become required with explicit targets; visual becomes evidence-backed not_required.",
      "accepted_state_delta": {
        "facets": [
          {
            "facet": "product_expectation",
            "set": {
              "applicability": "required",
              "maturity": "confirmed",
              "target_maturity": "formalized",
              "alignment": "diverged",
              "target_alignment": "aligned",
              "resolution": "unresolved",
              "reason": "The user explicitly approved retaining the arckit discovery special case and recommended repositories while authorizing correction of the remaining code-versus-Agent responsibility boundary.",
              "next_transition": "Formalize the stable product policy for deterministic evidence, source-owned data, Agent runtime assessment, and explicit-plan execution."
            },
            "evidence": [
              "User instruction on 2026-08-01 retaining findings 1 and 2 as intentional product behavior and authorizing the remaining optimization.",
              "arckit/spec/profile/skill-availability.md",
              "AGENTS.md"
            ]
          },
          {
            "facet": "interaction_expectation",
            "set": {
              "applicability": "required",
              "maturity": "formalized",
              "target_maturity": "formalized",
              "alignment": "stale",
              "target_alignment": "aligned",
              "resolution": "unresolved",
              "reason": "Desktop currently confirms availability and installed-skill actions without carrying all required Agent assessment evidence, so the existing interaction contract needs alignment rather than a new visual design.",
              "next_transition": "Align Desktop review surfaces and confirmation gates with explicit semantic assessment inputs."
            },
            "evidence": [
              "src/ui/views/destinations.tsx",
              "arckit/interaction/destinations/interaction.md"
            ]
          },
          {
            "facet": "visual_expectation",
            "set": {
              "applicability": "not_required",
              "maturity": "unknown",
              "target_maturity": "unknown",
              "alignment": "unknown",
              "target_alignment": "unknown",
              "resolution": "resolved",
              "reason": "The optimization changes responsibility semantics and displayed evidence using existing dialog, diagnostic, badge, and list patterns; it does not introduce a new visual language or component family.",
              "next_transition": ""
            },
            "evidence": [
              "src/ui/views/destinations.tsx",
              "arckit/visual/_library/components/workbench-components.yaml"
            ]
          },
          {
            "facet": "technical_expectation",
            "set": {
              "applicability": "required",
              "maturity": "confirmed",
              "target_maturity": "formalized",
              "alignment": "diverged",
              "target_alignment": "aligned",
              "resolution": "unresolved",
              "reason": "Core modules currently infer maintenance ownership, canonical copies, cleanup semantics, compatibility classifications, audit quality, and publish recommendations from insufficient deterministic evidence.",
              "next_transition": "Update technical contracts so code collects and validates facts while Agent-produced decisions enter as explicit plan inputs."
            },
            "evidence": [
              "src/core/installed-skills.ts",
              "src/core/sources.ts",
              "src/core/skill-availability.ts",
              "src/core/audit.ts",
              "src/core/publish.ts"
            ]
          },
          {
            "facet": "implementation_state",
            "set": {
              "applicability": "required",
              "maturity": "exploratory",
              "target_maturity": "formalized",
              "alignment": "unreconciled",
              "target_alignment": "aligned",
              "resolution": "unresolved",
              "reason": "The repository contains partial projectApplicability schema work, but the broader responsibility boundary remains inconsistently implemented and tested.",
              "next_transition": "Implement the bounded core, skill, Desktop, contract, and test changes without altering the two user-approved special cases."
            },
            "evidence": [
              "src/shared/types.ts",
              "skills/arcforge/references/project-applicability-policy.md",
              "git status --short on 2026-08-01"
            ]
          },
          {
            "facet": "verification_state",
            "set": {
              "applicability": "required",
              "maturity": "exploratory",
              "target_maturity": "confirmed",
              "alignment": "unreconciled",
              "target_alignment": "aligned",
              "resolution": "unresolved",
              "reason": "Tests currently lock several of the incorrect semantics, so verification must prove both the new boundaries and preservation of the approved special cases.",
              "next_transition": "Run targeted tests, full checks, builds, contract parsing, and completion review after implementation."
            },
            "evidence": [
              "tests/arcforge-skill-first.test.mjs",
              "tests/package.test.mjs",
              "tests/install-arcforge.test.mjs"
            ]
          }
        ],
        "resolved_open_questions": [],
        "completed_handoffs": [],
        "completion_review_result": null,
        "resolved_review_findings": [],
        "review_budget_extension": null
      },
      "evidence": [
        "User instruction on 2026-08-01 retaining the arckit discovery special case and recommended repositories.",
        "Read-only responsibility-boundary audit completed on 2026-08-01.",
        "arckit/project/state.record.json",
        "arckit/cases/active/CASE-20260801-001-arcforge-agent.md"
      ],
      "runtime_result_ref": "",
      "occurred_at": "2026-08-01T03:44:21.615Z"
    },
    {
      "round": 2,
      "goal": "Formalize the product responsibility boundary while preserving the two user-approved ArcForge special cases.",
      "outcome": "completed",
      "planned_transition": "Product expectation becomes formalized, aligned, and resolved against updated stable product specifications.",
      "accepted_state_delta": {
        "facets": [
          {
            "facet": "product_expectation",
            "set": {
              "maturity": "formalized",
              "alignment": "aligned",
              "resolution": "resolved",
              "reason": "Stable specifications now separate deterministic facts, source-owned natural-language data, Agent runtime assessment, and explicit-plan execution; they preserve the arckit scan exclusion and recommended repositories as intentional product-owned exceptions.",
              "next_transition": ""
            },
            "evidence": [
              "arckit/spec/interface/agent-skill.md",
              "arckit/spec/profile/skill-availability.md",
              "arckit/spec/sources/skill-project-merge.md",
              "arckit/spec/profile/destination-sync.md",
              "arckit/spec/audit/rule-audit.md",
              "arckit/spec/share/github-sharing.md",
              "arckit/spec/interface/desktop-app.md",
              "arckit/spec/GLOSSARY.md",
              "arckit/spec/INDEX.md",
              "arckit/spec/_map/feature-matrix.md",
              "arckit/spec/_map/RELATIONS.md"
            ]
          }
        ],
        "resolved_open_questions": [],
        "completed_handoffs": [],
        "completion_review_result": null,
        "resolved_review_findings": [],
        "review_budget_extension": null
      },
      "evidence": [
        "User instruction on 2026-08-01 retaining the arckit discovery special case and recommended repositories.",
        "arckit/spec/interface/agent-skill.md",
        "arckit/spec/profile/skill-availability.md",
        "arckit/spec/sources/skill-project-merge.md",
        "arckit/spec/profile/destination-sync.md",
        "arckit/spec/audit/rule-audit.md",
        "arckit/spec/share/github-sharing.md"
      ],
      "runtime_result_ref": "",
      "occurred_at": "2026-08-01T03:48:34.997Z"
    },
    {
      "round": 3,
      "goal": "Formalize the technical contracts for source-owned data, caller-owned Agent decisions, and deterministic explicit-plan execution.",
      "outcome": "completed",
      "planned_transition": "Technical expectation becomes formalized, aligned, and resolved with updated solutions, models, contracts, indexes, relations, and decision records.",
      "accepted_state_delta": {
        "facets": [
          {
            "facet": "technical_expectation",
            "set": {
              "maturity": "formalized",
              "alignment": "aligned",
              "resolution": "resolved",
              "reason": "Technical contracts now keep missing availability unclassified, model project applicability assessments as caller-owned, require explicit installed-skill decisions, return neutral source evidence, constrain cleanup semantics, replace audit scores with coverage, and make publish readiness optional Agent input.",
              "next_transition": ""
            },
            "evidence": [
              "arckit/tech/profiles-sync/solution.md",
              "arckit/tech/sources/solution.md",
              "arckit/tech/audit/solution.md",
              "arckit/tech/sharing-ipc/solution.md",
              "arckit/tech/_shared/models/SkillProjectManifest.yaml",
              "arckit/tech/_shared/models/SkillProjectApplicabilityAssessment.yaml",
              "arckit/tech/_shared/models/SkillAvailabilityPlan.yaml",
              "arckit/tech/_shared/models/AuditReport.yaml",
              "arckit/tech/_shared/models/PublishPlan.yaml",
              "arckit/tech/_shared/contracts/apply-plan.yaml",
              "arckit/tech/_shared/contracts/apply-run.yaml",
              "arckit/tech/_shared/contracts/share-plan.yaml",
              "arckit/tech/INDEX.md",
              "arckit/tech/_map/feature-matrix.md",
              "arckit/tech/_map/RELATIONS.md",
              "arckit/tech/_map/decision-log.md"
            ]
          }
        ],
        "resolved_open_questions": [],
        "completed_handoffs": [],
        "completion_review_result": null,
        "resolved_review_findings": [],
        "review_budget_extension": null
      },
      "evidence": [
        "arckit/tech/profiles-sync/solution.md",
        "arckit/tech/sources/solution.md",
        "arckit/tech/audit/solution.md",
        "arckit/tech/sharing-ipc/solution.md",
        "arckit/tech/_shared/models/SkillProjectApplicabilityAssessment.yaml",
        "arckit/tech/_shared/models/AuditReport.yaml",
        "arckit/tech/_shared/models/PublishPlan.yaml"
      ],
      "runtime_result_ref": "",
      "occurred_at": "2026-08-01T03:54:08.246Z"
    },
    {
      "round": 4,
      "goal": "Align existing Desktop interaction contracts with caller-owned Agent assessments and explicit user overrides.",
      "outcome": "completed",
      "planned_transition": "Interaction expectation becomes formalized, aligned, and resolved without introducing a new visual system.",
      "accepted_state_delta": {
        "facets": [
          {
            "facet": "interaction_expectation",
            "set": {
              "maturity": "formalized",
              "alignment": "aligned",
              "resolution": "resolved",
              "reason": "Existing Desktop surfaces now distinguish deterministic facts from Agent assessments and explicit user overrides, preserve assessment evidence through confirmation, and remove score or automatic-organization interaction semantics.",
              "next_transition": ""
            },
            "evidence": [
              "src/ui/views/destinations.tsx",
              "src/ui/views/installed.tsx",
              "src/ui/views/share.tsx",
              "src/ui/views/dashboard.tsx",
              "arckit/interaction/destinations/interaction.md",
              "arckit/interaction/share/interaction.md",
              "arckit/interaction/audit/interaction.md",
              "arckit/interaction/INDEX.md",
              "arckit/interaction/_map/feature-matrix.md"
            ]
          }
        ],
        "resolved_open_questions": [],
        "completed_handoffs": [],
        "completion_review_result": null,
        "resolved_review_findings": [],
        "review_budget_extension": null
      },
      "evidence": [
        "Desktop review and confirmation code carries caller-owned assessments and explicit user overrides.",
        "Interaction documents and gray wireframes were aligned for destinations, share, audit, home, and overview."
      ],
      "runtime_result_ref": "",
      "occurred_at": "2026-08-01T04:42:45.790Z"
    },
    {
      "round": 5,
      "goal": "Implement the deterministic-core and Agent-runtime responsibility boundary across core, CLI, Desktop, skills, contracts, and tests.",
      "outcome": "completed",
      "planned_transition": "Implementation becomes formalized, aligned, and resolved while retaining the approved arckit and installer examples.",
      "accepted_state_delta": {
        "facets": [
          {
            "facet": "implementation_state",
            "set": {
              "maturity": "formalized",
              "alignment": "aligned",
              "resolution": "resolved",
              "reason": "Core modules now validate structure and execute explicit plans while source manifests own descriptive policy and caller-provided Agent assessments own semantic judgments; CLI, Desktop, contracts, skills, and tests carry those inputs consistently. The intentional arckit scan exclusion and recommended installer repositories remain.",
              "next_transition": ""
            },
            "evidence": [
              "src/shared/types.ts",
              "src/core/skill-availability.ts",
              "src/core/skill-project-availability.ts",
              "src/core/sources.ts",
              "src/core/installed-skills.ts",
              "src/core/audit.ts",
              "src/core/publish.ts",
              "src/core/share.ts",
              "src/core/share-sync.ts",
              "src/commands/index.ts",
              "src/electron/main.ts",
              "src/electron/preload.cts",
              "src/ui/views/destinations.tsx",
              "src/ui/views/installed.tsx",
              "src/ui/views/share.tsx",
              "skills/arcforge/SKILL.md",
              "skills/arcforge-skill-creator/SKILL.md",
              "skills/arcforge-skill-first/SKILL.md",
              "skills/arcforge/references/skill-project-manifest.schema.json",
              "src/core/config.ts",
              "skills/install-arcforge/scripts/install-from-repo.mjs"
            ]
          }
        ],
        "resolved_open_questions": [],
        "completed_handoffs": [],
        "completion_review_result": null,
        "resolved_review_findings": [],
        "review_budget_extension": null
      },
      "evidence": [
        "Implementation diff across core, CLI, Desktop, skills, schemas, and tests.",
        "The two user-approved special cases remain present and documented."
      ],
      "runtime_result_ref": "",
      "occurred_at": "2026-08-01T04:43:00.086Z"
    },
    {
      "round": 6,
      "goal": "Verify the optimized responsibility boundary and preservation of approved special cases.",
      "outcome": "completed",
      "planned_transition": "Verification becomes confirmed, aligned, and resolved, making the Case ready for completion review.",
      "accepted_state_delta": {
        "facets": [
          {
            "facet": "verification_state",
            "set": {
              "maturity": "confirmed",
              "alignment": "aligned",
              "resolution": "resolved",
              "reason": "Type checks, all 55 tests, production build, JSON and YAML parsing, whitespace validation, and semantic residue searches pass. Tests explicitly preserve the arckit root exclusion and recommended installer repositories while covering unclassified availability, caller-owned assessments, explicit decisions, factual audit/share outputs, and on-demand installation.",
              "next_transition": ""
            },
            "evidence": [
              "npm run check passed on 2026-08-01",
              "npm test passed 55/55 on 2026-08-01",
              "npm run build passed with 1638 modules transformed on 2026-08-01",
              "All repository JSON parsed successfully on 2026-08-01",
              "All 38 repository YAML documents parsed successfully on 2026-08-01",
              "git diff --check passed on 2026-08-01",
              "tests/package.test.mjs",
              "tests/skill-availability.test.mjs",
              "tests/installed-skills.test.mjs",
              "tests/install-arcforge.test.mjs",
              "tests/arcforge-skill-first.test.mjs"
            ]
          }
        ],
        "resolved_open_questions": [],
        "completed_handoffs": [],
        "completion_review_result": null,
        "resolved_review_findings": [],
        "review_budget_extension": null
      },
      "evidence": [
        "Latest full verification suite passed after the final implementation changes.",
        "Semantic residue search found only intentional legacy compatibility, negative assertions, and deterministic stale-managed cleanup evidence."
      ],
      "runtime_result_ref": "",
      "occurred_at": "2026-08-01T04:43:54.888Z"
    },
    {
      "round": 7,
      "goal": "Review the complete optimization for correctness, completeness, and minimality.",
      "outcome": "partial",
      "planned_transition": "Record evidence-backed repair findings for content revision 6.",
      "accepted_state_delta": {
        "facets": [],
        "resolved_open_questions": [],
        "completed_handoffs": [],
        "completion_review_result": {
          "outcome": "findings",
          "reviewer": "agent",
          "reviewed_content_revision": 6,
          "dimensions": {
            "correctness": "findings",
            "completeness": "findings",
            "minimality": "findings"
          },
          "findings": [
            {
              "id": "CR1-ASSESSMENT-CONTEXT",
              "kind": "error",
              "statement": "Saved project assessments are matched against relative project targets using process.cwd instead of the consumer root, and a reapply that reuses an assessment writes a new relation without preserving that reused assessment.",
              "responsibility": "agent",
              "affected_facets": [
                "implementation_state",
                "verification_state"
              ],
              "artifact_refs": [
                "src/core/sources.ts",
                "src/core/skill-availability.ts"
              ],
              "evidence": [
                "reusableProjectAssessments normalizes projectTargetDirs with path.resolve(item) without consumerRoot.",
                "availabilityAppliedRecordFor persists context.projectAssessments rather than the validated assessments present in plan.items."
              ]
            },
            {
              "id": "CR1-DESKTOP-ASSESSMENT",
              "kind": "omission",
              "statement": "The Destinations interaction contract says existing assessments are displayed and unresolved assessments can be explicitly overridden, but the UI neither renders existing assessment evidence nor offers an override when an assessment is unsuitable, needs input, or targets stale roots.",
              "responsibility": "agent",
              "affected_facets": [
                "interaction_expectation",
                "implementation_state"
              ],
              "artifact_refs": [
                "src/ui/views/destinations.tsx",
                "arckit/interaction/destinations/interaction.md"
              ],
              "evidence": [
                "The UI only creates projectAssessmentSkills when item.projectAssessment is absent.",
                "The plan item card renders projectApplicability but not projectAssessment."
              ]
            },
            {
              "id": "CR1-INPUT-VALIDATION",
              "kind": "error",
              "statement": "Caller-owned organize decisions and project assessments are not fully validated as runtime JSON: malformed decision fields can throw before producing a structural conflict, action kinds are not checked, and assessment evidence arrays may be empty despite the evidence-backed contract.",
              "responsibility": "agent",
              "affected_facets": [
                "technical_expectation",
                "implementation_state",
                "verification_state"
              ],
              "artifact_refs": [
                "src/core/installed-skills.ts",
                "src/core/skill-availability.ts",
                "arckit/tech/_shared/models/SkillProjectApplicabilityAssessment.yaml"
              ],
              "evidence": [
                "validateOrganizeDecision calls trim and length on unchecked JSON fields.",
                "validateOrganizeDecision does not reject an unknown action kind.",
                "assessmentMap and validateProjectAssessment check item types but not non-empty evidence arrays."
              ]
            },
            {
              "id": "CR1-DEAD-COMPATIBILITY-LABEL",
              "kind": "excess",
              "statement": "Desktop localization still maps a compatibility availability origin even though new plans cannot emit that origin and the current ResolvedSkillAvailability type excludes it.",
              "responsibility": "agent",
              "affected_facets": [
                "implementation_state"
              ],
              "artifact_refs": [
                "src/ui/i18n.ts",
                "src/shared/types.ts"
              ],
              "evidence": [
                "availabilityPolicyOrigin retains compatibility labels in both locales.",
                "SkillAvailabilityPolicyOrigin now uses unclassified for unresolved new plans."
              ]
            }
          ],
          "evidence": [
            "Focused review of core availability, installed-skill decision validation, Desktop assessment flow, contracts, and semantic residue search.",
            "All automated checks passed before review, so findings concern uncovered cross-call and malformed-input behavior rather than existing test failures."
          ]
        },
        "resolved_review_findings": [],
        "review_budget_extension": null
      },
      "evidence": [
        "Completion review covered correctness, completeness, and minimality for content revision 6."
      ],
      "runtime_result_ref": "",
      "occurred_at": "2026-08-01T04:47:42.206Z"
    },
    {
      "round": 8,
      "goal": "Repair assessment context normalization, exact reuse, and persistence.",
      "outcome": "completed",
      "planned_transition": "CR1-ASSESSMENT-CONTEXT becomes resolved.",
      "accepted_state_delta": {
        "facets": [],
        "resolved_open_questions": [],
        "completed_handoffs": [],
        "completion_review_result": null,
        "resolved_review_findings": [
          {
            "id": "CR1-ASSESSMENT-CONTEXT",
            "resolution": "resolved",
            "reason": "Assessment roots are normalized from consumerRoot, reuse requires the current source policy digest and exact target context, and saved relations clone assessments from validated plan items so reused assessments persist.",
            "evidence": [
              "src/core/skill-availability.ts",
              "src/core/sources.ts",
              "tests/skill-availability.test.mjs",
              "npm test passed 57/57 on 2026-08-01"
            ]
          }
        ],
        "review_budget_extension": null
      },
      "evidence": [
        "Relative-root behavior is covered by a runtime test; exact reuse and plan-owned persistence are asserted in source integration contracts."
      ],
      "runtime_result_ref": "",
      "occurred_at": "2026-08-01T04:53:48.814Z"
    },
    {
      "round": 9,
      "goal": "Align Desktop assessment display and override behavior with its interaction contract.",
      "outcome": "completed",
      "planned_transition": "CR1-DESKTOP-ASSESSMENT becomes resolved.",
      "accepted_state_delta": {
        "facets": [],
        "resolved_open_questions": [],
        "completed_handoffs": [],
        "completion_review_result": null,
        "resolved_review_findings": [
          {
            "id": "CR1-DESKTOP-ASSESSMENT",
            "resolution": "resolved",
            "reason": "Destination cards now render the bound assessment status, decision source, summary, condition evidence, overall evidence, and unknowns. Explicit override is offered for missing, unsuitable, needs-input, or target-mismatched assessments and uses normalized project roots from the reviewed plan.",
            "evidence": [
              "src/ui/views/destinations.tsx",
              "src/ui/i18n.ts",
              "arckit/interaction/destinations/interaction.md",
              "tests/skill-availability.test.mjs",
              "npm run check passed on 2026-08-01"
            ]
          }
        ],
        "review_budget_extension": null
      },
      "evidence": [
        "Desktop implementation now matches the existing formalized interaction contract."
      ],
      "runtime_result_ref": "",
      "occurred_at": "2026-08-01T04:54:04.167Z"
    },
    {
      "round": 10,
      "goal": "Harden caller-owned runtime JSON validation without adding semantic inference.",
      "outcome": "completed",
      "planned_transition": "CR1-INPUT-VALIDATION becomes resolved.",
      "accepted_state_delta": {
        "facets": [],
        "resolved_open_questions": [],
        "completed_handoffs": [],
        "completion_review_result": null,
        "resolved_review_findings": [
          {
            "id": "CR1-INPUT-VALIDATION",
            "resolution": "resolved",
            "reason": "Organize decisions now validate object shape, all required strings and arrays, known action kinds, evidence, paths, and signatures before use; malformed values become plan conflicts. Project assessments require non-empty overall and per-condition evidence in both runtime validation and the technical model.",
            "evidence": [
              "src/core/installed-skills.ts",
              "src/core/skill-availability.ts",
              "arckit/tech/_shared/models/SkillProjectApplicabilityAssessment.yaml",
              "tests/installed-skills.test.mjs",
              "tests/skill-availability.test.mjs",
              "npm test passed 57/57 on 2026-08-01"
            ]
          }
        ],
        "review_budget_extension": null
      },
      "evidence": [
        "New runtime tests cover malformed decisions, unknown action kinds, empty condition evidence, empty overall evidence, and relative project roots."
      ],
      "runtime_result_ref": "",
      "occurred_at": "2026-08-01T04:54:17.355Z"
    },
    {
      "round": 11,
      "goal": "Remove the unreachable Desktop compatibility-origin label.",
      "outcome": "completed",
      "planned_transition": "CR1-DEAD-COMPATIBILITY-LABEL becomes resolved and the Case returns to review_ready.",
      "accepted_state_delta": {
        "facets": [],
        "resolved_open_questions": [],
        "completed_handoffs": [],
        "completion_review_result": null,
        "resolved_review_findings": [
          {
            "id": "CR1-DEAD-COMPATIBILITY-LABEL",
            "resolution": "resolved",
            "reason": "Both Desktop locale maps now expose unclassified, matching current plan types and behavior, and no longer advertise a legacy fallback origin on the runtime plan surface.",
            "evidence": [
              "src/ui/i18n.ts",
              "src/shared/types.ts",
              "semantic residue search on 2026-08-01",
              "npm run check passed on 2026-08-01"
            ]
          }
        ],
        "review_budget_extension": null
      },
      "evidence": [
        "The legacy field remains only in persisted AppliedSourceRecord compatibility, not in new plan UI semantics."
      ],
      "runtime_result_ref": "",
      "occurred_at": "2026-08-01T04:54:29.818Z"
    },
    {
      "round": 12,
      "goal": "Perform the fresh completion review after all repair findings were resolved.",
      "outcome": "completed",
      "planned_transition": "Completion review becomes clean for content revision 10 and the Case becomes resolved.",
      "accepted_state_delta": {
        "facets": [],
        "resolved_open_questions": [],
        "completed_handoffs": [],
        "completion_review_result": {
          "outcome": "clean",
          "reviewer": "agent",
          "reviewed_content_revision": 10,
          "dimensions": {
            "correctness": "clean",
            "completeness": "clean",
            "minimality": "clean"
          },
          "findings": [],
          "evidence": [
            "All four cycle-1 findings are resolved with code, contract, and test evidence.",
            "npm run check passed after repairs.",
            "npm test passed 57/57 after repairs.",
            "npm run build passed after repairs with 1638 modules transformed.",
            "All repository JSON and 38 YAML documents parsed successfully.",
            "git diff --check passed.",
            "Semantic residue search contains only intentional persisted-state compatibility and negative assertions.",
            "The intentional arckit scan exclusion and recommended arckit/arckit-code installer examples remain covered by tests."
          ]
        },
        "resolved_review_findings": [],
        "review_budget_extension": null
      },
      "evidence": [
        "Fresh three-dimensional review covered correctness, completeness, and minimality for content revision 10."
      ],
      "runtime_result_ref": "",
      "occurred_at": "2026-08-01T04:55:47.128Z"
    }
  ],
  "case_resolution": {
    "status": "resolved",
    "stage": "resolved",
    "base_ready": true,
    "satisfied": [
      "product_expectation",
      "interaction_expectation",
      "visual_expectation",
      "technical_expectation",
      "implementation_state",
      "verification_state",
      "completion_review"
    ],
    "remaining": [],
    "blocked": [],
    "reason": "All Case content is complete and the current content revision has a clean completion review.",
    "candidate_gaps": [],
    "loop_handoff": {
      "version": "loop-handoff/v2",
      "status": "done",
      "next_responsibility": "none",
      "agent_continuation_available": false,
      "human_decision_required": false,
      "trigger_mode": "none",
      "responsibility_reason": "The Case State has no unresolved content gap and the current content revision has a clean completion review.",
      "next_prompt": "",
      "agent_instruction": {
        "goal": "",
        "required_context_refs": [
          "arckit/project/state.record.json",
          "case:CASE-20260801-001"
        ],
        "required_actions": [],
        "required_checks": [
          "case_transition evidence",
          "derived case_resolution"
        ],
        "stop_condition": "Stop after applying one evidence-backed Case transition or producing a human/external handoff."
      },
      "human_gate": {
        "required": false,
        "reason": "",
        "decision_needed": ""
      },
      "progress_guard": {
        "expected_state_change": "",
        "actual_state_change": "",
        "no_progress_limit": 2,
        "max_auto_rounds": 3
      }
    },
    "updated_at": "2026-08-01T04:55:47.128Z"
  },
  "project_impact_candidate": {
    "status": "none",
    "changes": [],
    "evidence": []
  }
}
```

## Round Notes

- Case history is canonical in Structured Record.rounds; keep prose notes exceptional.
