# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html)
while it remains in the `0.x` pre-1.0 release line.

## [Unreleased]

### Added

- Added CLI-first source maintenance commands: `skillops source status` reports upstream ahead/behind commit counts and previous fetch age, and `skillops source update --confirm` performs a fast-forward-only update.
- Added shared source update models and desktop IPC hooks so the desktop app can present the same check-before-update decision point without owning separate Git logic.

### Changed

- GitHub source cache reuse now fetches remote refs without automatically pulling file changes into the local checkout.

## [0.1.6] - 2026-05-25

### Added

- Added GitHub Pull Request sharing for Skill projects, including plan-first CLI commands, desktop confirmation, permission detection through GitHub CLI, and delivery support for target-repository PRs, fork PRs, direct branch pushes, and local branches.
- Added same-repository sharing so compatible local project and target workflows can reuse the current checkout instead of creating unnecessary copied worktrees.
- Added single-skill project source support, allowing SkillOps to scan and govern repositories or folders that contain one standalone `SKILL.md`.
- Added share target drift checks across CLI, desktop, IPC, contracts, and the share view so teams can see whether shared targets still match source skills.
- Added audit report help links, richer audit findings, and UI affordances that connect audit output to remediation guidance.
- Added pending ArcKit notes for future agent workbench maintenance, skill effect testing, and security audit follow-up.

### Changed

- Reworked sharing around an isolated share checkout for GitHub writes, with plan results carrying PR links, checkout paths, commit hashes, delivery methods, and manual recovery commands.
- Updated desktop and CLI sharing to use the same plan-first, confirm-before-write flow and to preserve recovery guidance when remote delivery fails.
- Improved the settings dialog layout and responsive styling.
- Updated ArcKit specs, interaction wireframes, technical contracts, and data models for GitHub PR sharing, same-repository sharing, share drift, single-skill source discovery, and audit feedback.
- Expanded release note history for previous `0.1.x` releases.

### Fixed

- Fixed share target list wrapping in the desktop UI.
- Fixed profile deletion so removed profiles persist correctly.

## [0.1.5] - 2026-05-24

### Added

- Added workspace skill-file browsing, reading, writing, and independent editor window support.
- Added profile-aware dashboard, destinations, profiles, and share view modules.
- Added reusable UI shell components and app-state persistence helpers.
- Added dedicated share core modules for Git operations, remote parsing, and share-target synchronization.
- Added SkillOps config support for saved share target groups.
- Added the `skill-file` IPC contract and expanded sharing IPC documentation.

### Changed

- Split the large desktop UI implementation into focused view and component modules.
- Reworked sharing internals so path parsing, Git execution, and file synchronization are separate core responsibilities.
- Expanded project review and profile-target interaction specs to cover editor and target workflow states.
- Updated desktop app specs and architecture docs for file editing, saved share targets, and split view behavior.

### Fixed

- Fixed CLI release installer shims so release-installed CLI entrypoints resolve correctly.

## [0.1.4] - 2026-05-22

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

## [0.1.3] - 2026-05-22

### Added

- Added the ArcKit visual design system, including design tokens, component catalog, light and dark theme notes, and a style preview page.
- Added overview and workflow SVG assets for README and documentation.
- Added same-source sharing support so compatible current checkout workflows can avoid unnecessary copied worktrees.

### Changed

- Applied the visual system to the desktop app shell styling.
- Reworked README, comparison, product, and roadmap docs in English and Chinese around SkillOps positioning.
- Updated sharing specs and technical notes for same-source sharing behavior.

## [0.1.2] - 2026-05-21

### Added

- Added ArcKit product, interaction, and technical documentation.
- Added generated release-note configuration for GitHub releases.
- Added interaction wireframes for app shell, project review, profiles and targets, and sharing.
- Added technical contracts and models for workspace scan, profile apply and drift, publish plan and share, source download, and environment status.
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

## [0.1.1] - 2026-05-20

### Changed

- `v0.1.1` points to the same commit as `v0.1.0`; there is no code diff between the two tags.
- The tagged release state publishes only packaged release assets from the GitHub release workflow.

## [0.1.0] - 2026-05-20

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

[0.1.6]: https://github.com/feitianchengzi/skillops/compare/v0.1.5...HEAD
[0.1.5]: https://github.com/feitianchengzi/skillops/compare/v0.1.4...v0.1.5
[0.1.4]: https://github.com/feitianchengzi/skillops/compare/v0.1.3...v0.1.4
[0.1.3]: https://github.com/feitianchengzi/skillops/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/feitianchengzi/skillops/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/feitianchengzi/skillops/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/feitianchengzi/skillops/releases/tag/v0.1.0
