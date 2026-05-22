# Architecture

## Stack

- Electron for the desktop shell
- React + TypeScript for the renderer
- TypeScript core modules and command runners shared by desktop and CLI
- Node.js file system APIs for local workspace operations
- No backend service in the MVP

## Packages

```text
src/core/       shared SkillOps domain logic
src/commands/   shared command orchestration for CLI and desktop
src/electron/   Electron main process and preload bridge
src/ui/         React desktop UI
src/cli/        command line entrypoint
src/shared/     shared TypeScript types
```

## Data Model

`skillops.config.json` is the workspace control file.

```json
{
  "version": 1,
  "sourceDir": "skills",
  "teamRepo": "github.com/acme/team-skills",
  "profiles": [
    {
      "name": "default",
      "skills": ["*"],
      "targets": ["claude", "codex", "cursor"]
    }
  ]
}
```

## Security Model

The renderer has no direct Node.js access. It talks to the main process through a narrow preload API. The main process maps those calls to the shared command runner or core modules:

- choose workspace
- scan workspace
- init config
- create publish plan
- share project to a Git repository
- apply profile
- drift report

The packaged Electron executable also supports `--cli`. In that mode it does not create a window and instead executes the same command runner used by the terminal entrypoint.

On desktop startup, the main process installs or repairs a user-level `skillops` shim that points back to the packaged executable with `--cli`. The environment check reports shim path, PATH visibility, Git availability, and optional integration tools.

The MVP audit engine is local and rule-based. It detects:

- common secret patterns
- dangerous agent instructions
- missing or weak skill metadata
- risky references to `.env`, credentials, and automatic pushes

Future versions can add pluggable audit rules and CI annotations.

## Integration Strategy

SkillOps should orchestrate existing tools instead of replacing them.

Planned integration points:

- `skillshare` for multi-agent sync
- `npx skills` for public install compatibility
- GitHub CLI or GitHub API for repo creation and releases
- GitHub Actions for audit checks
