import path from "node:path";
import type { AuditFinding, AuditReport, SkillSummary } from "../shared/types.js";
import { GITHUB_ISSUE_URL } from "../shared/links.js";
import { listFiles, readText } from "./fs.js";
import { findSkillMarkdownFile, isSkillMarkdownName } from "./skill-markdown.js";

const SECRET_PATTERNS = [
  { code: "secret.openai", pattern: /sk-(?!proj-)[A-Za-z0-9_-]{20,}/ },
  { code: "secret.openai_project", pattern: /sk-proj-[A-Za-z0-9_-]{20,}/ },
  { code: "secret.anthropic", pattern: /sk-ant-[A-Za-z0-9_-]{20,}/ },
  { code: "secret.github", pattern: /gh[pousr]_[A-Za-z0-9_]{20,}/ },
  { code: "secret.aws_access_key", pattern: /AKIA[0-9A-Z]{16}/ },
  { code: "secret.slack", pattern: /xox[baprs]-[A-Za-z0-9-]{20,}/ },
  { code: "secret.webhook", pattern: /https:\/\/hooks\.slack\.com\/services\/[A-Za-z0-9/]+/ },
  { code: "secret.private_key", pattern: /-----BEGIN (RSA |OPENSSH |EC |DSA )?PRIVATE KEY-----/ }
];

const RISKY_INSTRUCTIONS = [
  { code: "risk.ignore_safety", pattern: /ignore (all )?(previous|safety|security|system) (instructions|rules|checks)/i },
  { code: "risk.env_access", pattern: /\b(read|open|print|cat)\b.{0,24}\.(env|npmrc|ssh|aws|credentials)\b/i },
  { code: "risk.auto_commit", pattern: /\b(commit|push|merge)\b.{0,24}\b(without asking|automatically|always)\b/i },
  { code: "risk.exfiltration", pattern: /\b(send|upload|post)\b.{0,40}\b(logs|secrets|env|token|credentials)\b/i },
  { code: "risk.destructive_shell", pattern: /\b(rm\s+-rf|chmod\s+-R\s+777|sudo\s+rm|mkfs|diskutil\s+eraseDisk)\b/i },
  { code: "risk.remote_script", pattern: /\b(curl|wget)\b.{0,80}\|\s*(sh|bash|zsh|python|node)\b/i },
  { code: "risk.unreviewed_execution", pattern: /\b(run|execute)\b.{0,40}\b(untrusted|arbitrary|user-provided)\b.{0,20}\b(code|script|command)\b/i },
  { code: "risk.permission_bypass", pattern: /\b(bypass|disable|turn off)\b.{0,32}\b(approval|permission|sandbox|policy|guardrail)\b/i }
];

export const AUDIT_DISCLAIMER = `ArcForge audit is a local rule-based scan. It currently checks known secret patterns, selected risky instruction phrases, high-risk shell command patterns, and basic SKILL.md metadata/structure. It is not a complete security review and can miss issues or report false positives. Treat results as guidance, review skills manually before sharing or publishing, and file an issue on GitHub if you need stronger audit coverage: ${GITHUB_ISSUE_URL}`;

export async function auditWorkspace(root: string, skills: SkillSummary[]): Promise<AuditReport> {
  const findings: AuditFinding[] = [];

  for (const skill of skills) {
    const skillFile = await findSkillMarkdownFile(skill.path);
    if (!skillFile) continue;
    const content = await readText(skillFile);
    findings.push(...auditSkillMarkdown(root, skillFile, content));

    if (!skill.description || skill.description.length < 24) {
      findings.push({
        severity: "warning",
        code: "quality.description_short",
        message: "Skill description is missing or too short for reliable triggering.",
        file: path.relative(root, skillFile)
      });
    }

    const files = await listFiles(skill.path);
    for (const file of files) {
      if (isSkillMarkdownName(path.basename(file))) continue;
      const text = await maybeReadText(file);
      if (!text) continue;
      findings.push(...auditSecrets(root, file, text));
    }
  }

  return {
    root,
    generatedAt: new Date().toISOString(),
    skills,
    findings,
    score: score(findings),
    disclaimer: AUDIT_DISCLAIMER,
    feedbackUrl: GITHUB_ISSUE_URL
  };
}

function auditSkillMarkdown(root: string, file: string, content: string): AuditFinding[] {
  return [
    ...auditSecrets(root, file, content),
    ...auditRiskyInstructions(root, file, content),
    ...auditStructure(root, file, content)
  ];
}

function auditSecrets(root: string, file: string, content: string): AuditFinding[] {
  const findings: AuditFinding[] = [];
  for (const rule of SECRET_PATTERNS) {
    const line = findLine(content, rule.pattern);
    if (line) {
      findings.push({
        severity: "critical",
        code: rule.code,
        message: "Potential secret detected. Remove it before team sharing or public publishing.",
        file: path.relative(root, file),
        line
      });
    }
  }
  return findings;
}

function auditRiskyInstructions(root: string, file: string, content: string): AuditFinding[] {
  const findings: AuditFinding[] = [];
  for (const rule of RISKY_INSTRUCTIONS) {
    const line = findLine(content, rule.pattern);
    if (line) {
      findings.push({
        severity: "warning",
        code: rule.code,
        message: "Risky agent behavior found. Make the instruction narrower or require explicit user approval.",
        file: path.relative(root, file),
        line
      });
    }
  }
  return findings;
}

function auditStructure(root: string, file: string, content: string): AuditFinding[] {
  const findings: AuditFinding[] = [];
  if (!/^---\n[\s\S]+?\n---/m.test(content)) {
    findings.push({
      severity: "warning",
      code: "quality.frontmatter_missing",
      message: "SKILL.md should include frontmatter with name and description.",
      file: path.relative(root, file)
    });
  }
  if (!/^name:/m.test(content)) {
    findings.push({
      severity: "warning",
      code: "quality.name_missing",
      message: "SKILL.md frontmatter should include a stable name.",
      file: path.relative(root, file)
    });
  }
  if (!/^description:\s*[\s\S]{24,}/m.test(content)) {
    findings.push({
      severity: "warning",
      code: "quality.description_missing",
      message: "SKILL.md frontmatter should include a clear trigger-oriented description.",
      file: path.relative(root, file)
    });
  }
  return findings;
}

function findLine(content: string, pattern: RegExp): number | undefined {
  const lines = content.split(/\r?\n/);
  const index = lines.findIndex((line) => pattern.test(line));
  return index === -1 ? undefined : index + 1;
}

async function maybeReadText(file: string): Promise<string | undefined> {
  try {
    const content = await readText(file);
    if (content.includes("\u0000")) return undefined;
    return content;
  } catch {
    return undefined;
  }
}

function score(findings: AuditFinding[]): number {
  const penalty = findings.reduce((total, finding) => {
    if (finding.severity === "critical") return total + 25;
    if (finding.severity === "warning") return total + 8;
    return total + 2;
  }, 0);
  return Math.max(0, 100 - penalty);
}
