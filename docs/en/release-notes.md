# Release Notes

[简体中文](../release-notes.md)

This document records the user-facing changes for ArcForge releases. ArcForge is still pre-1.0, so versioned notes focus on workflow capability, packaging behavior, and documentation changes rather than a stable public API guarantee.

## Unreleased

### Added

- Added CLI-first source maintenance for GitHub/Git-backed skill projects:
  - `arcforge source status` reports upstream ahead/behind commit counts.
  - `arcforge source update --confirm` performs a fast-forward-only update after explicit confirmation.
- Source status includes the previous fetch timestamp and elapsed time since that fetch.
- Added desktop IPC hooks and shared models for source update status and update results.

### Changed

- Reopening a cached GitHub source now fetches remote refs without automatically pulling file changes into the local checkout.

## v0.1.6 - 2026-05-25

### Summary

This release turns sharing into a fuller GitHub review workflow while keeping
ArcForge focused on local-first skill governance before distribution. It adds
Pull Request delivery, same-repository sharing, single-skill source discovery,
share target drift checks, and clearer audit feedback.

### Highlights

- GitHub PR sharing now starts with a plan, checks access through GitHub CLI,
  recommends a delivery method, and only writes after explicit confirmation.
- Same-repository sharing and single-skill sources reduce setup friction for
  small teams and standalone skill repositories.
- Share target drift checks help teams see whether shared skill copies still
  match their source before another review or release.
- Audit findings now include clearer feedback and links to remediation guidance.

### Added

- Added GitHub Pull Request sharing for Skill projects.
- Added CLI share planning and execution split:
  - `arcforge share plan` previews the release plan, GitHub access, recommended delivery method, branch, target path, and follow-up command.
  - `arcforge share run --confirm` performs the remote write.
- Added GitHub permission detection through GitHub CLI, including authenticated state, repository permission, recommended delivery method, and fallback options.
- Added delivery modes for target repository Pull Request, fork Pull Request, direct branch push, and local branch.
- Added desktop share confirmation flow before GitHub writes.
- Added PR links, checkout path, commit hash, delivery method, and manual recovery commands to share results.
- Added same-repository sharing so compatible local project and target workflows can reuse the current checkout.
- Added single-skill project source support for repositories or folders that contain one standalone `SKILL.md`.
- Added share target drift checks in core, CLI, desktop, IPC, and technical contracts.
- Added audit finding help links and richer audit feedback in CLI, desktop, and shared report models.
- Added pending ArcKit notes for agent workbench maintenance, skill effect testing, and security audit follow-up.

### Changed

- Sharing now uses an isolated share checkout instead of writing directly in the user's current workspace checkout.
- Desktop and CLI sharing now follow the same plan-first, confirm-before-write workflow.
- Desktop sharing now uses the GitHub access recommendation automatically instead of requiring users to choose a delivery method before permission detection.
- CLI share execution now preserves manual recovery guidance when direct push or Pull Request delivery fails.
- The Electron preload bridge and IPC handlers now expose a separate share-plan operation before confirmed sharing.
- ArcKit specs, interaction docs, and technical contracts now describe the GitHub PR workflow and updated `ShareResult`.
- ArcKit specs and technical contracts now also cover same-repository sharing, single-skill discovery, share drift, and audit feedback.
- The settings dialog has improved layout, spacing, and responsive behavior.
- Release note history now covers earlier `0.1.x` releases.

### Fixed

- Fixed share target list wrapping in the desktop UI.
- Fixed profile deletion so removed profiles persist correctly.

### Breaking Changes

None.

### Upgrade Guide

No special migration is required. Existing ArcForge workspaces can continue using
their current config; teams using GitHub sharing should review the new plan step
before running confirmed writes.

### Dependencies Updated

None.

### Known Issues

None.

### Release Status

This `v0.1.6` entry documents changes currently on `main` after `v0.1.5`. The
release tag has not been created yet.

## v0.1.5 - 2026-05-24

### Added

- Added workspace skill-file browsing, reading, writing, and independent editor window support.
- Added profile-aware dashboard, destinations, profiles, and share view modules.
- Added reusable UI shell components and app-state persistence helpers.
- Added dedicated share core modules for Git operations, remote parsing, and share-target synchronization.
- Added ArcForge config support for saved share target groups.
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
- Reworked README, comparison, product, and roadmap docs in English and Chinese around ArcForge positioning.
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

- Added the initial ArcForge MVP.
- Added local Skill project scanning, default config loading, and example `arcforge.config` shape.
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
