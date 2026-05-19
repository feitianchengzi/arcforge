import path from "node:path";
import type { AuditFinding, AuditReport, SkillSummary } from "../shared/types.js";
import { listFiles, readText } from "./fs.js";

const SECRET_PATTERNS = [
  { code: "secret.openai", pattern: /sk-[A-Za-z0-9_-]{20,}/ },
  { code: "secret.github", pattern: /gh[pousr]_[A-Za-z0-9_]{20,}/ },
  { code: "secret.private_key", pattern: /-----BEGIN (RSA |OPENSSH |EC |DSA )?PRIVATE KEY-----/ }
];

const RISKY_INSTRUCTIONS = [
  { code: "risk.ignore_safety", pattern: /ignore (all )?(previous|safety|security|system) (instructions|rules|checks)/i },
  { code: "risk.env_access", pattern: /\b(read|open|print|cat)\b.{0,24}\.(env|npmrc|ssh|aws|credentials)\b/i },
  { code: "risk.auto_commit", pattern: /\b(commit|push|merge)\b.{0,24}\b(without asking|automatically|always)\b/i },
  { code: "risk.exfiltration", pattern: /\b(send|upload|post)\b.{0,40}\b(logs|secrets|env|token|credentials)\b/i }
];

export async function auditWorkspace(root: string, skills: SkillSummary[]): Promise<AuditReport> {
  const findings: AuditFinding[] = [];

  for (const skill of skills) {
    const skillFile = path.join(skill.path, "SKILL.md");
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
      if (path.basename(file) === "SKILL.md") continue;
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
    score: score(findings)
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
