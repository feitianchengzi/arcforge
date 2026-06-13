# Security Policy

ArcForge works with AI agent skills, which can influence agent behavior. Treat skills as executable workflow instructions.

## Reporting

Please report security issues privately to the maintainers. Do not open a public issue for vulnerabilities.

## Current Scope

The default audit engine checks for:

- common API key and private key patterns
- risky instructions around secrets, automatic commits, and data exfiltration
- weak or missing `SKILL.md` metadata

The CLI can also run optional Agent-assisted diagnosis with `arcforge audit --mode hybrid` to look for semantic risks such as prompt injection, approval bypass guidance, over-broad triggers, and unsafe governance actions. If the local Agent CLI needs a network proxy, pass `--proxy http://127.0.0.1:7890` or configure it in the Desktop audit page. Agent findings are advisory and should be reviewed by a human.

Audit results are best-effort and do not guarantee that a skill is safe.

## User Guidance

- review third-party skills before installing
- do not publish private company paths, URLs, or process details
- require human review before syncing skills across a team
- run `arcforge audit` in CI before merging skill changes, and use `arcforge audit --mode hybrid` for pre-share or pre-publish review when an approved local Agent CLI is available
