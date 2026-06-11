# Security Policy

ArcForge works with AI agent skills, which can influence agent behavior. Treat skills as executable workflow instructions.

## Reporting

Please report security issues privately to the maintainers. Do not open a public issue for vulnerabilities.

## Current Scope

The MVP audit engine checks for:

- common API key and private key patterns
- risky instructions around secrets, automatic commits, and data exfiltration
- weak or missing `SKILL.md` metadata

Audit results are best-effort and do not guarantee that a skill is safe.

## User Guidance

- review third-party skills before installing
- do not publish private company paths, URLs, or process details
- require human review before syncing skills across a team
- run `arcforge audit` in CI before merging skill changes
