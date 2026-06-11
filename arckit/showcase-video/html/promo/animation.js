const canvas = document.getElementById("film");
const ctx = canvas.getContext("2d");
const W = 1920;
const H = 1080;
const DURATION = 18;
const FPS = 30;
const OPENING = 2.2;
const CLOSING = 3.0;
const MAIN = DURATION - OPENING - CLOSING;
const STAGE_HANDOFF = 0.24;
const params = new URLSearchParams(location.search);
const locale = params.get("locale") === "zh" ? "zh" : "en";

const copy = {
  en: {
    outputName: "arcforge-promo",
    brandTitle: "ArcForge",
    brandSubtitle: "Local-first governance for AI agent skills",
    brandPill: "Own the work before distribution",
    openingRepo: "Local skill repo",
    openingCardSub: "governed source",
    openingCaption: "A governed SKILL.md asset starts locally, then moves through the release workflow.",
    closingTitle: "Audit. Profile. Apply. Release-ready.",
    closingSubtitle: "Own the work before distribution.",
    closingNote: "GitHub remains the source of truth.",
    workspace: "governed workspace",
    route: "arcforge://guided-governance",
    markTitle: "ArcForge",
    markSub: "pre-publish skill governance",
    steps: [
      {
        id: "source",
        label: "Source",
        tag: "LOCAL",
        title: "Local skill repository",
        subtitle: "A SKILL.md asset starts in your workspace before it reaches any agent.",
        caption: "ArcForge keeps the governance work local before distribution."
      },
      {
        id: "scan",
        label: "Scan",
        tag: "SCAN",
        title: "Scan local sources",
        subtitle: "References, scripts, assets, metadata, and GitHub source status are mapped.",
        caption: "The source tree is inspected first, without becoming a public registry."
      },
      {
        id: "audit",
        label: "Audit",
        tag: "AUDIT",
        title: "Audit before sharing",
        subtitle: "Risky instructions, weak metadata, and release blockers are fixed at the source.",
        caption: "Audit findings are part of the working surface, not a separate report."
      },
      {
        id: "profile",
        label: "Profile",
        tag: "PROFILE",
        title: "Build approved profiles",
        subtitle: "Approved skills form focused project and team sets.",
        caption: "Profiles decide what should be applied; runtimes still own execution."
      },
      {
        id: "apply",
        label: "Apply",
        tag: "APPLY",
        title: "Apply and detect drift",
        subtitle: "Codex, Claude, Cursor, and project targets receive only approved skills.",
        caption: "Installed copies stay accountable to the governed source profile."
      },
      {
        id: "release",
        label: "Release",
        tag: "RELEASE",
        title: "Prepare GitHub handoff",
        subtitle: "Publish-readiness, PR notes, install commands, and registry hints are generated.",
        caption: "ArcForge owns the work before distribution. GitHub remains the source of truth."
      }
    ]
  },
  zh: {
    outputName: "arcforge-promo-zh",
    brandTitle: "ArcForge",
    brandSubtitle: "本地优先的 AI Agent 技能治理工作台",
    brandPill: "在分发之前，先把治理工作做好",
    openingRepo: "本地技能仓库",
    openingCardSub: "受治理的源文件",
    openingCaption: "一个受治理的 SKILL.md 从本地开始，沿发布流程进入团队使用。",
    closingTitle: "审计、画像、应用、准备发布",
    closingSubtitle: "先治理，再分发。",
    closingNote: "GitHub 仍然是评审、版本和发布的事实源。",
    workspace: "治理工作台",
    route: "arcforge://技能治理流程",
    markTitle: "ArcForge",
    markSub: "预发布技能治理",
    steps: [
      {
        id: "source",
        label: "源仓库",
        tag: "本地",
        title: "本地技能仓库",
        subtitle: "SKILL.md 先在工作区中被整理，再进入任何 Agent。",
        caption: "ArcForge 把治理工作留在本地和 GitHub 工作流中。"
      },
      {
        id: "scan",
        label: "扫描",
        tag: "扫描",
        title: "扫描本地来源",
        subtitle: "引用、脚本、资源、元数据和 GitHub 来源状态被统一映射。",
        caption: "先理解源代码树，不把产品变成公开注册表。"
      },
      {
        id: "audit",
        label: "审计",
        tag: "审计",
        title: "共享前完成审计",
        subtitle: "风险指令、薄弱元数据和发布阻塞项都在源头修复。",
        caption: "审计结果直接进入工作面，而不是孤立报告。"
      },
      {
        id: "profile",
        label: "画像",
        tag: "画像",
        title: "构建已批准画像",
        subtitle: "已批准技能被组织成项目和团队可用的集合。",
        caption: "画像决定哪些技能可应用，运行时仍然负责执行。"
      },
      {
        id: "apply",
        label: "应用",
        tag: "应用",
        title: "应用并发现漂移",
        subtitle: "Codex、Claude、Cursor 和项目目标只接收已批准技能。",
        caption: "已安装副本持续对齐受治理的源画像。"
      },
      {
        id: "release",
        label: "发布",
        tag: "就绪",
        title: "准备 GitHub 交接",
        subtitle: "发布检查、PR 说明、安装命令和注册表提示被自动生成。",
        caption: "ArcForge 负责分发前的治理，GitHub 仍是事实源。"
      }
    ]
  }
};

const activeCopy = copy[locale];
const steps = activeCopy.steps;
const sceneCopy = {
  en: {
    localRepository: "Local repository",
    sourceAsset: "source asset",
    teamProfile: "team profile",
    localState: "local state",
    sourceMap: "Source map",
    mapped: "mapped",
    queued: "queued",
    gitRemote: "Git remote",
    scanOutput: "Scan output",
    skills: "skills",
    assets: "assets",
    refs: "refs",
    git: "git",
    auditGate: "Audit gate",
    metadata: "metadata",
    secretPattern: "secret pattern",
    dangerousInstruction: "dangerous instruction",
    internalPath: "internal path",
    fixed: "fixed",
    review: "review",
    profileBuilder: "Profile builder",
    approved: "approved",
    approvedSkills: "6 approved skills",
    localPolicy: "local policy",
    targets: "Targets",
    synced: "synced",
    waiting: "waiting",
    driftReport: "Drift report",
    sourceProfile: "source profile",
    installedCopy: "installed copy",
    customTarget: "custom target",
    trusted: "trusted",
    repaired: "repaired",
    diff: "diff",
    clean: "clean",
    check: "check",
    githubHandoff: "GitHub handoff",
    releaseChecklist: "release checklist",
    publishReadiness: "publish readiness",
    prNotes: "PR notes",
    registryHints: "ClawHub/OpenClaw hints",
    installCommands: "install commands",
    githubTruth: "GitHub source of truth",
    githubTruthSub: "review, versioning, releases",
    distributionReady: "Distribution-ready",
    notRegistry: "without becoming a registry"
  },
  zh: {
    localRepository: "本地仓库",
    sourceAsset: "源技能资产",
    teamProfile: "团队画像",
    localState: "本地状态",
    sourceMap: "来源地图",
    mapped: "已映射",
    queued: "排队",
    gitRemote: "Git 远端",
    scanOutput: "扫描结果",
    skills: "技能",
    assets: "资源",
    refs: "引用",
    git: "Git",
    auditGate: "审计关卡",
    metadata: "元数据",
    secretPattern: "密钥模式",
    dangerousInstruction: "风险指令",
    internalPath: "内部路径",
    fixed: "已修复",
    review: "复核",
    profileBuilder: "画像构建器",
    approved: "已批准",
    approvedSkills: "6 个已批准技能",
    localPolicy: "本地策略",
    targets: "目标",
    synced: "已同步",
    waiting: "等待",
    driftReport: "漂移报告",
    sourceProfile: "源画像",
    installedCopy: "已安装副本",
    customTarget: "自定义目标",
    trusted: "可信",
    repaired: "已修复",
    diff: "差异",
    clean: "干净",
    check: "检查",
    githubHandoff: "GitHub 交接",
    releaseChecklist: "发布清单",
    publishReadiness: "发布就绪",
    prNotes: "PR 说明",
    registryHints: "ClawHub/OpenClaw 提示",
    installCommands: "安装命令",
    githubTruth: "GitHub 事实源",
    githubTruthSub: "评审、版本、发布",
    distributionReady: "分发就绪",
    notRegistry: "不变成注册表"
  }
}[locale];

window.demoVideoSpec = { width: 1920, height: 1080, fps: 30, duration: 18, outputName: activeCopy.outputName, locale };

const nodes = [
  { x: 390, y: 635 },
  { x: 610, y: 520 },
  { x: 850, y: 635 },
  { x: 1090, y: 520 },
  { x: 1320, y: 635 },
  { x: 1530, y: 520 }
];

function renderFrameInternal(seconds) {
  const t = clamp(seconds, 0, DURATION);
  drawBackground(t);

  if (t < OPENING) {
    drawOpening(t / OPENING, t);
    return;
  }

  if (t >= DURATION - CLOSING) {
    const close = (t - (DURATION - CLOSING)) / CLOSING;
    drawTopStages(steps.length - 1, t, true);
    drawMainStage(steps[steps.length - 1], steps.length - 1, 1, t);
    drawTimelinePath(steps.length - 1, 1, t);
    drawToken(nodes[nodes.length - 1].x, nodes[nodes.length - 1].y, "READY", t);
    drawClosing(close, t);
    return;
  }

  const mainT = t - OPENING;
  const raw = Math.min(steps.length - 0.0001, (mainT / MAIN) * steps.length);
  const index = Math.floor(raw);
  const local = raw - index;
  const transition = smooth(clamp((local - 0.16) / 0.68, 0, 1));
  const current = steps[index];
  const token = tokenPosition(raw);
  const firstReveal = 1;

  withAlpha(firstReveal, () => {
    drawTopStages(index, t, false);
    drawMainStage(current, index, local, t);
    drawTimelinePath(index, transition, t);
  });
  drawToken(token.x, token.y, current.tag, t);
  drawStageSubtitle(index, local);
  drawBrandMark(t / DURATION);
}

function tokenPosition(raw) {
  const index = Math.floor(raw);
  const local = raw - index;
  const from = nodes[Math.min(index, nodes.length - 1)];
  const to = nodes[Math.min(index + 1, nodes.length - 1)];
  const move = smooth(clamp((local - 0.08) / 0.72, 0, 1));
  const x = lerp(from.x, to.x, move);
  const y = lerp(from.y, to.y, move) + Math.sin(move * Math.PI) * -44;
  return { x, y };
}

function drawBackground(t) {
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#060b12");
  bg.addColorStop(0.5, "#0a1422");
  bg.addColorStop(1, "#071018");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.globalAlpha = 0.34;
  for (let x = -120; x < W + 120; x += 92) {
    line(x + Math.sin(t * 0.2) * 12, 0, x - 260, H, "rgba(71,85,105,0.28)", 1);
  }
  for (let y = 190; y < H; y += 86) {
    line(0, y + Math.sin(t * 0.4 + y) * 4, W, y, "rgba(20,184,166,0.11)", 1);
  }
  ctx.restore();

  glow(290, 840, 520, "rgba(20,184,166,0.11)");
  glow(1500, 210, 680, "rgba(56,189,248,0.09)");
}

function drawOpening(local, t) {
  const e = smooth(local);
  const bridge = smooth(clamp((local - 0.56) / 0.44, 0, 1));
  const tokenX = lerp(1040, nodes[0].x, e);
  const tokenY = lerp(610, nodes[0].y, e) + Math.sin(e * Math.PI) * -38;
  ctx.save();
  ctx.globalAlpha = 1 - bridge;
  text(activeCopy.brandTitle, 690, 292, 88, "#f8fafc", "880");
  text(activeCopy.brandSubtitle, 690, 350, 31, "#cbd5e1", "650");
  roundedRect(690, 388, 580, 58, 14, "rgba(8,47,73,0.72)", "rgba(34,211,238,0.68)", 1.4);
  text(activeCopy.brandPill, 980, 425, 25, "#a7f3d0", "780", "sans", "center");
  glow(tokenX, tokenY, 210, `rgba(34,211,238,${0.12 + e * 0.12})`);
  panel(315, 505, 460, 250, activeCopy.openingRepo);
  repoRow(355, 575, "skills/code-review/SKILL.md", "#22d3ee");
  repoRow(355, 631, "references/", "#64748b");
  repoRow(355, 687, "profiles/team.json", "#64748b");
  smallCard(990, 558, 260, 92, "SKILL.md", activeCopy.openingCardSub, "#22d3ee");
  ctx.restore();
  if (bridge > 0) {
    withAlpha(bridge, () => {
      ctx.translate(0, (1 - bridge) * 42);
      drawTopStages(0, t, false);
      drawMainStage(steps[0], 0, 0, t);
      drawTimelinePath(0, 0, t);
    });
  }
  drawToken(tokenX, tokenY, local > 0.65 ? steps[0].tag : locale === "zh" ? "新建" : "NEW", t);
  drawSubtitle(activeCopy.openingCaption, local);
}

function drawTopStages(active, t, complete) {
  const totalWidth = 6 * 144 + 5 * 26;
  const startX = (W - totalWidth) / 2;
  text(activeCopy.route, startX, 72, 21, "#94a3b8", "760", "mono");
  for (let i = 0; i < steps.length; i += 1) {
    const x = startX + i * 170;
    const on = complete ? false : i === active;
    const done = complete ? true : i < active;
    const fill = on ? "rgba(8,47,73,0.88)" : done ? "rgba(20,83,45,0.42)" : "rgba(15,23,42,0.78)";
    const stroke = on ? "rgba(34,211,238,0.9)" : done ? "rgba(52,211,153,0.55)" : "rgba(71,85,105,0.58)";
    roundedRect(x, 96, 144, 40, 10, fill, stroke, 1.5);
    text(steps[i].label, x + 20, 122, 17, on ? "#e0f2fe" : done ? "#bbf7d0" : "#94a3b8", "780");
    if (i < steps.length - 1) {
      line(x + 150, 116, x + 166, 116, done ? "rgba(52,211,153,0.7)" : "rgba(71,85,105,0.45)", 2);
    }
  }
}

function drawClosing(local, t) {
  const e = smooth(local);
  ctx.save();
  ctx.globalAlpha = e;
  roundedRect(530, 344, 860, 258, 28, "rgba(7,15,26,0.94)", "rgba(52,211,153,0.55)", 1.6);
  text(activeCopy.closingTitle, 960, 438, locale === "zh" ? 45 : 46, "#f8fafc", "850", "sans", "center");
  text(activeCopy.closingSubtitle, 960, 500, 30, "#a7f3d0", "760", "sans", "center");
  text(activeCopy.closingNote, 960, 548, 23, "#cbd5e1", "640", "sans", "center");
  ctx.restore();
}

function drawMainStage(step, index, local, t) {
  const x = 210;
  const y = 190;
  const w = 1500;
  const h = 700;
  roundedRect(x, y, w, h, 30, "rgba(8,15,27,0.82)", "rgba(148,163,184,0.28)", 1.5);
  line(x + 1, y + 72, x + w - 1, y + 72, "rgba(148,163,184,0.20)", 1);
  traffic(x + 28, y + 34);
  text(activeCopy.workspace, x + 96, y + 43, 18, "#cbd5e1", "760", "mono");

  ctx.save();
  ctx.globalAlpha = 0.22;
  for (let i = 0; i < 18; i += 1) {
    line(x + 50 + i * 84, y + 210, x + 20 + i * 78, y + h - 48, "rgba(71,85,105,0.48)", 1);
  }
  ctx.restore();

  if (index > 0 && local < STAGE_HANDOFF) {
    const blend = smooth(clamp(local / STAGE_HANDOFF, 0, 1));
    drawStageHeader(step, 1, 0);
    drawStageContent(steps[index - 1], index - 1, 1, t, 1 - blend, -24 * blend);
    drawStageContent(step, index, local, t, blend, 26 * (1 - blend));
  } else {
    drawStageHeader(step, 1, 0);
    drawStageContent(step, index, local, t, 1, 0);
  }

  drawLocalMotion(index, local, t);
}

function drawStageHeader(step, alpha, yOffset) {
  withAlpha(alpha, () => {
    ctx.translate(0, yOffset);
    const x = 210;
    const y = 190;
    text(step.title, x + 64, y + 128, 44, "#f8fafc", "850");
    text(step.subtitle, x + 64, y + 165, 23, "#cbd5e1", "600");
  });
}

function drawStageContent(step, index, local, t, alpha, yOffset) {
  withAlpha(alpha, () => {
    ctx.translate(0, yOffset);
    ctx.save();
    ctx.translate(0, 58);
    if (step.id === "source") sceneSource(local, t);
    if (step.id === "scan") sceneScan(local, t);
    if (step.id === "audit") sceneAudit(local, t);
    if (step.id === "profile") sceneProfile(local, t);
    if (step.id === "apply") sceneApply(local, t);
    if (step.id === "release") sceneRelease(local, t);
    ctx.restore();
  });
}

function drawStageSubtitle(index, local) {
  drawSubtitle(steps[index].caption, local);
}

function drawTimelinePath(active, transition, t) {
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "rgba(71,85,105,0.78)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(nodes[0].x, nodes[0].y);
  for (let i = 1; i < nodes.length; i += 1) {
    const prev = nodes[i - 1];
    const next = nodes[i];
    const midX = (prev.x + next.x) / 2;
    ctx.quadraticCurveTo(midX, prev.y - 105, next.x, next.y);
  }
  ctx.stroke();

  for (let i = 0; i < nodes.length; i += 1) {
    const done = i <= active;
    const n = nodes[i];
    glow(n.x, n.y, done ? 90 : 45, done ? "rgba(34,211,238,0.18)" : "rgba(71,85,105,0.10)");
    roundedRect(n.x - 54, n.y - 24, 108, 48, 12, done ? "rgba(8,47,73,0.88)" : "rgba(15,23,42,0.88)", done ? "rgba(34,211,238,0.8)" : "rgba(71,85,105,0.55)", 1.5);
    text(String(i + 1).padStart(2, "0"), n.x - 33, n.y + 7, 20, done ? "#67e8f9" : "#64748b", "820", "mono");
    if (i === active) ring(n.x, n.y, 70 + Math.sin(t * 5) * 8, "#22d3ee", 0.68);
  }
  ctx.restore();
}

function drawLocalMotion(index, local, t) {
  const start = nodes[index];
  const end = nodes[Math.min(index + 1, nodes.length - 1)];
  const energy = smooth(clamp((local - 0.10) / 0.65, 0, 1));
  const x = lerp(start.x, end.x, energy);
  const y = lerp(start.y, end.y, energy) - 54;
  for (let i = 0; i < 12; i += 1) {
    const p = i / 12;
    const px = lerp(start.x, x, p) - i * 8;
    const py = lerp(start.y, y, p) + Math.sin(t * 4 + i) * 9;
    ctx.fillStyle = `rgba(34,211,238,${0.06 + p * 0.22})`;
    ctx.beginPath();
    ctx.arc(px, py, 3 + p * 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function sceneSource(local, t) {
  panel(360, 365, 460, 330, sceneCopy.localRepository);
  const rows = ["skills/code-review/SKILL.md", "skills/release-writer/references/", "scripts/check-release.mjs", "profiles/team.json"];
  rows.forEach((row, i) => repoRow(400, 430 + i * 56, row, i === 0 ? "#22d3ee" : "#64748b"));
  smallCard(900, 452, 260, 104, "SKILL.md", sceneCopy.sourceAsset, "#22d3ee");
  smallCard(900, 586, 260, 86, sceneCopy.teamProfile, sceneCopy.localState, "#34d399");
}

function sceneScan(local, t) {
  panel(340, 360, 520, 350, sceneCopy.sourceMap);
  const labels = ["SKILL.md", "references/", "assets/", "scripts/", sceneCopy.gitRemote, "config"];
  labels.forEach((label, i) => {
    const mapped = local > i * 0.11;
    statusRow(390, 420 + i * 43, 420, label, mapped ? sceneCopy.mapped : sceneCopy.queued, mapped ? "#34d399" : "#64748b");
  });
  const beamX = 350 + local * 460;
  const grad = ctx.createLinearGradient(beamX - 60, 365, beamX + 80, 700);
  grad.addColorStop(0, "rgba(34,211,238,0)");
  grad.addColorStop(0.5, "rgba(34,211,238,0.75)");
  grad.addColorStop(1, "rgba(34,211,238,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(beamX - 60, 380, 140, 310);
  panel(1030, 405, 420, 230, sceneCopy.scanOutput);
  metric(1080, 466, sceneCopy.skills, Math.round(4 + local * 20));
  metric(1230, 466, sceneCopy.assets, Math.round(2 + local * 16));
  metric(1080, 560, sceneCopy.refs, Math.round(3 + local * 13));
  metric(1230, 560, sceneCopy.git, local > 0.45 ? "ok" : "...");
}

function sceneAudit(local, t) {
  panel(330, 365, 470, 340, sceneCopy.auditGate);
  const score = Math.round(42 + smooth(local) * 55);
  ring(500, 535, 128, "#22d3ee", 0.76);
  ring(500, 535, 96, "#34d399", 0.48);
  text(String(score), 437, 552, 72, "#f8fafc", "850");
  text("/100", 565, 548, 24, "#94a3b8", "700");
  const risks = [sceneCopy.metadata, sceneCopy.secretPattern, sceneCopy.dangerousInstruction, sceneCopy.internalPath];
  risks.forEach((risk, i) => {
    const fixed = local > 0.2 + i * 0.13;
    statusRow(900, 414 + i * 58, 430, risk, fixed ? sceneCopy.fixed : sceneCopy.review, fixed ? "#34d399" : "#f59e0b");
  });
}

function sceneProfile(local, t) {
  panel(325, 360, 610, 350, sceneCopy.profileBuilder);
  const skills = ["code-review", "release-writer", "figma-use", "demo-video", "audit-rules"];
  skills.forEach((skill, i) => {
    const angle = i * 1.24 + t * 0.9;
    const gather = smooth(local);
    const x = lerp(370 + (i % 3) * 170, 580 + Math.cos(angle) * 120, gather);
    const y = lerp(430 + Math.floor(i / 3) * 86, 520 + Math.sin(angle) * 88, gather);
    smallCard(x, y, 150, 58, skill, sceneCopy.approved, "#22d3ee");
  });
  smallCard(1050, 435, 310, 90, "profile: release", sceneCopy.approvedSkills, "#34d399");
  smallCard(1050, 560, 310, 90, "profile: agent-maint", sceneCopy.localPolicy, "#22d3ee");
}

function sceneApply(local, t) {
  panel(335, 350, 430, 380, sceneCopy.targets);
  const targets = ["Codex", "Claude", "Cursor", "Project"];
  targets.forEach((target, i) => {
    const synced = local > i * 0.14;
    statusRow(405, 430 + i * 68, 280, target, synced ? sceneCopy.synced : sceneCopy.waiting, synced ? "#34d399" : "#64748b");
    if (synced) {
      line(765, 450 + i * 68, 1030, 545, "rgba(34,211,238,0.55)", 3);
    }
  });
  panel(1040, 390, 420, 270, sceneCopy.driftReport);
  statusRow(1090, 460, 320, sceneCopy.sourceProfile, sceneCopy.trusted, "#34d399");
  statusRow(1090, 522, 320, sceneCopy.installedCopy, local > 0.58 ? sceneCopy.repaired : sceneCopy.diff, local > 0.58 ? "#34d399" : "#f59e0b");
  statusRow(1090, 584, 320, sceneCopy.customTarget, local > 0.72 ? sceneCopy.clean : sceneCopy.check, local > 0.72 ? "#34d399" : "#f59e0b");
}

function sceneRelease(local, t) {
  panel(355, 355, 560, 355, sceneCopy.githubHandoff);
  const items = [sceneCopy.releaseChecklist, sceneCopy.publishReadiness, sceneCopy.prNotes, sceneCopy.registryHints, sceneCopy.installCommands, sceneCopy.driftReport];
  items.forEach((item, i) => {
    const done = local > i * 0.11;
    checkRow(400 + (i % 2) * 260, 430 + Math.floor(i / 2) * 76, 230, item, done);
  });
  smallCard(1045, 448, 370, 104, sceneCopy.githubTruth, sceneCopy.githubTruthSub, "#34d399");
  smallCard(1045, 590, 370, 86, sceneCopy.distributionReady, sceneCopy.notRegistry, "#22d3ee");
}

function drawToken(x, y, tag, t) {
  glow(x, y, 150, "rgba(34,211,238,0.22)");
  glow(x, y, 86, "rgba(52,211,153,0.18)");
  roundedRect(x - 92, y - 60, 184, 120, 18, "rgba(7,15,26,0.98)", "rgba(103,232,249,0.92)", 2);
  text("SKILL.md", x - 58, y - 7, 27, "#f8fafc", "850");
  text(tag, x - 34, y + 28, 13, "#67e8f9", "820", "mono");
  ctx.save();
  ctx.strokeStyle = "rgba(52,211,153,0.78)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, 78, t * 2.1, t * 2.1 + Math.PI * 1.28);
  ctx.stroke();
  ctx.restore();
}

function drawSubtitle(value, local, extraAlpha = 1, forceVisible = false) {
  const w = Math.min(1180, Math.max(620, 220 + measure(value, 24, "650")));
  const x = (W - w) / 2;
  const y = 928;
  const baseAlpha = forceVisible ? 1 : clamp(local / 0.18, 0, 1) * clamp((1 - local) / 0.12, 0, 1);
  const alpha = baseAlpha * extraAlpha;
  if (alpha <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = 0.94 * alpha;
  roundedRect(x, y, w, 72, 18, "rgba(7,15,26,0.92)", "rgba(148,163,184,0.26)", 1);
  text(value, W / 2, y + 45, 24, "#e2e8f0", "650", "sans", "center");
  ctx.restore();
}

function drawBrandMark(global) {
  ctx.save();
  ctx.globalAlpha = 0.8;
  text(activeCopy.markTitle, 1545, 974, 28, "#f8fafc", "850");
  text(activeCopy.markSub, 1545, 1006, 16, "#94a3b8", "680");
  ctx.restore();
}

function panel(x, y, w, h, label) {
  roundedRect(x, y, w, h, 22, "rgba(10,19,32,0.88)", "rgba(148,163,184,0.30)", 1.4);
  text(label, x + 24, y + 38, 18, "#94a3b8", "820");
}

function repoRow(x, y, name, color) {
  roundedRect(x, y, 370, 40, 10, "rgba(30,41,59,0.80)", "rgba(71,85,105,0.40)", 1);
  text(name, x + 14, y + 26, 15, "#e2e8f0", "700", "mono");
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x + 344, y + 20, 5, 0, Math.PI * 2);
  ctx.fill();
}

function statusRow(x, y, w, title, status, color) {
  roundedRect(x, y, w, 44, 10, color === "#f59e0b" ? "rgba(120,53,15,0.25)" : "rgba(30,41,59,0.82)", hexToRgba(color, 0.48), 1);
  text(title, x + 16, y + 28, 16, "#e2e8f0", "720");
  text(status, x + w - 78, y + 28, 13, color, "820", "mono");
}

function checkRow(x, y, w, title, done) {
  roundedRect(x, y, w, 52, 10, done ? "rgba(20,83,45,0.40)" : "rgba(30,41,59,0.82)", done ? "rgba(52,211,153,0.58)" : "rgba(71,85,105,0.46)", 1);
  roundedRect(x + 16, y + 16, 20, 20, 5, done ? "#34d399" : "rgba(15,23,42,0.95)", done ? "#34d399" : "#64748b", 2);
  if (done) {
    line(x + 20, y + 26, x + 25, y + 31, "#052e16", 2.5);
    line(x + 25, y + 31, x + 35, y + 21, "#052e16", 2.5);
  }
  text(title, x + 48, y + 32, 15, done ? "#dcfce7" : "#cbd5e1", "720");
}

function smallCard(x, y, w, h, title, sub, accent) {
  roundedRect(x, y, w, h, 14, "rgba(15,23,42,0.92)", hexToRgba(accent, 0.56), 1.4);
  text(title, x + 16, y + h * 0.46, Math.min(21, Math.max(14, 210 / title.length)), "#f8fafc", "780");
  text(sub, x + 16, y + h * 0.74, 14, accent, "800");
}

function metric(x, y, label, value) {
  text(String(value), x, y, 44, "#f8fafc", "850");
  text(label, x, y + 30, 16, "#94a3b8", "700");
}

function traffic(x, y) {
  ["#ef4444", "#f59e0b", "#22c55e"].forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(x + i * 20, y, 6, 0, Math.PI * 2);
    ctx.fill();
  });
}

function roundedRect(x, y, w, h, r, fill, stroke, lineWidth) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke && lineWidth > 0) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

function text(value, x, y, size, color, weight = "600", family = "sans", align = "left") {
  ctx.save();
  ctx.fillStyle = color;
  ctx.textAlign = align;
  const stack = fontStack(family);
  ctx.font = `${weight} ${size}px ${stack}`;
  ctx.fillText(value, x, y);
  ctx.restore();
}

function measure(value, size, weight = "600", family = "sans") {
  ctx.save();
  ctx.font = `${weight} ${size}px ${fontStack(family)}`;
  const width = ctx.measureText(value).width;
  ctx.restore();
  return width;
}

function fontStack(family) {
  if (family === "mono") return "Menlo, Monaco, Consolas, monospace";
  return "Inter, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, PingFang SC, Hiragino Sans GB, Microsoft YaHei, sans-serif";
}

function line(x1, y1, x2, y2, color, width) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function ring(x, y, r, color, alpha) {
  ctx.strokeStyle = hexToRgba(color, alpha);
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
}

function glow(x, y, r, color) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function withAlpha(alpha, draw) {
  ctx.save();
  ctx.globalAlpha *= clamp(alpha, 0, 1);
  draw();
  ctx.restore();
}

function hexToRgba(hex, alpha) {
  const clean = hex.replace("#", "");
  const n = parseInt(clean, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function lerp(a, b, t) { return a + (b - a) * t; }
function smooth(t) { return t * t * (3 - 2 * t); }

function preview() {
  const start = performance.now();
  const tick = () => {
    renderFrameInternal(((performance.now() - start) / 1000) % DURATION);
    requestAnimationFrame(tick);
  };
  tick();
}

window.renderFrame = function renderFrameProxy(timeSeconds) {
  renderFrameInternal(timeSeconds);
};
renderFrameInternal(0);
if (!new URLSearchParams(location.search).has("capture")) preview();
