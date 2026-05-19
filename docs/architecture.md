# Architecture

## Stack

- Electron for the desktop shell
- React + TypeScript for the renderer
- TypeScript core modules shared by desktop and CLI
- Node.js file system APIs for local workspace operations
- No backend service in the MVP

## Packages

```text
src/core/       shared SkillOps domain logic
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

The renderer has no direct Node.js access. It talks to the main process through a narrow preload API:

- choose workspace
- scan workspace
- init config
- create publish plan
- apply profile
- drift report

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
