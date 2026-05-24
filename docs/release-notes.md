# Release Notes

This document records the user-facing changes for SkillOps releases. SkillOps is still pre-1.0, so versioned notes focus on workflow capability, packaging behavior, and documentation changes rather than a stable public API guarantee.

## v0.1.6 - 2026-05-25

### Added

- Added GitHub Pull Request sharing for Skill projects.
- Added CLI share planning and execution split:
  - `skillops share plan` previews the release plan, GitHub access, recommended delivery method, branch, target path, and follow-up command.
  - `skillops share run --confirm` performs the remote write.
- Added GitHub permission detection through GitHub CLI, including authenticated state, repository permission, recommended delivery method, and fallback options.
- Added delivery modes for target repository Pull Request, fork Pull Request, direct branch push, and local branch.
- Added desktop share confirmation flow before GitHub writes.
- Added PR links, checkout path, commit hash, delivery method, and manual recovery commands to share results.

### Changed

- Sharing now uses an isolated share checkout instead of writing directly in the user's current workspace checkout.
- Desktop and CLI sharing now follow the same plan-first, confirm-before-write workflow.
- The Electron preload bridge and IPC handlers now expose a separate share-plan operation before confirmed sharing.
- ArcKit specs, interaction docs, and technical contracts now describe the GitHub PR workflow and updated `ShareResult`.

## v0.1.5 - 2026-05-24

### Added

- Added workspace skill-file browsing, reading, writing, and independent editor window support.
- Added profile-aware dashboard, destinations, profiles, and share view modules.
- Added reusable UI shell components and app-state persistence helpers.
- Added dedicated share core modules for Git operations, remote parsing, and share-target synchronization.
- Added SkillOps config support for saved share target groups.
- Added the `skill-file` IPC contract and expanded sharing IPC documentation.

### Changed

- Split the large desktop UI implementation into focused view/component modules.
- Reworked sharing internals so path parsing, Git execution, and file synchronization are separate core responsibilities.
- Expanded project review and profiles-targets interaction specs to cover editor and target workflow states.
- Updated desktop app specs and architecture docs to include file editing, saved share targets, and split view behavior.

### Fixed

- Fixed CLI release installer shims so release-installed CLI entrypoints resolve correctly.

## v0.1.4 - 2026-05-22

### Added

- Added the shared command orchestration layer in `src/commands`.
- Added CLI-first sharing from terminal and desktop entrypoints.
- Added desktop CLI repair flow for local shim repair.
- Added GitHub Release CLI installer assets and install scripts.
- Added persisted desktop app state for recent projects and project UI context.
- Added system environment checks for Git, CLI shim, `skillshare`, `npx`, and `clawhub`.
- Added CLI and desktop demo video assets.
- Added `build:cli` packaging support and CLI-only release asset staging.

### Changed

- Moved CLI execution through the shared command layer so desktop `--cli` and terminal CLI use the same command behavior.
- Reworked share execution into a core `share` module instead of keeping it only in Electron main process code.
- Reworked Electron main process responsibilities around CLI mode, environment checks, app state, and command delegation.
- Updated README and roadmap content in English and Chinese to document CLI installation, CLI repair, demos, and release packaging.
- Refined target group state handling.
- Refreshed README usage assets.

## v0.1.3 - 2026-05-22

### Added

- Added the ArcKit visual design system, including design tokens, component catalog, light/dark theme notes, and a style preview page.
- Added overview and workflow SVG assets for README and documentation.
- Added same-source sharing support so compatible current checkout workflows can avoid unnecessary copied worktrees.

### Changed

- Applied the visual system to the desktop app shell styling.
- Reworked README, comparison, product, and roadmap docs in English and Chinese around SkillOps positioning.
- Updated sharing specs and technical notes for same-source sharing behavior.

## v0.1.2 - 2026-05-21

### Added

- Added ArcKit product, interaction, and technical documentation.
- Added generated release-note configuration for GitHub releases.
- Added interaction wireframes for app shell, project review, profiles and targets, and sharing.
- Added technical contracts and models for workspace scan, profile apply/drift, publish plan/share, source download, and environment status.
- Added shared-asset ownership metadata handling for shared skill collaboration.
- Added share progress feedback in the publish plan panel.

### Changed

- Regenerated ArcKit interaction documentation from templates.
- Hardened shared skill collaboration behavior.
- Synced shared skills by individual entries instead of coarse whole-source replacement.
- Updated Electron sharing handlers and profile application internals to align with the new ArcKit contracts.

### Fixed

- Fixed profile apply replacement behavior.
- Fixed share target path handling.

## v0.1.1 - 2026-05-20

### Changed

- `v0.1.1` points to the same commit as `v0.1.0`; there is no code diff between the two tags.
- The tagged release state publishes only packaged release assets from the GitHub release workflow.

## v0.1.0 - 2026-05-20

### Added

- Added the initial SkillOps MVP.
- Added local Skill project scanning, default config loading, and example `skillops.config` shape.
- Added `SKILL.md` discovery with frontmatter parsing, version metadata, references, and scripts detection.
- Added rule-based audit checks for secrets, dangerous instructions, and missing metadata.
- Added profile-based skill grouping, profile application, and drift comparison against installed targets.
- Added GitHub-first publish-plan generation with install commands and release checklist items.
- Added an Electron desktop shell with workspace selection, scan, audit, profile, apply, drift, and publish-plan UI.
- Added an initial JSON CLI for init, scan, audit, publish plan, drift, and apply-profile workflows.
- Added bilingual README and docs for product direction, architecture, comparison, and roadmap.
- Added CI and cross-platform packaging workflow foundations.

### Fixed

- Fixed Electron packaging dependency scope.
- Set Linux package maintainer metadata.
- Optimized packaging release workflow.
- Read release version base from the app manifest.
- Checked out the repository before creating releases.
- Uploaded only packaged release assets.
