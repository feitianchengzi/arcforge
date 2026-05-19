import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { AlertTriangle, CheckCircle2, FolderOpen, GitBranch, Globe2, PackageCheck, Play, RefreshCw, Rocket, ShieldCheck } from "lucide-react";
import type { ApplyProfileResult, DriftReport, PublishPlan, WorkspaceSnapshot } from "../shared/types";
import { dictionaries, type Dictionary, type Language } from "./i18n";
import "./styles.css";

declare global {
  interface Window {
    skillops: {
      chooseWorkspace: () => Promise<string | undefined>;
      scanWorkspace: (root: string) => Promise<WorkspaceSnapshot>;
      initWorkspace: (root: string) => Promise<unknown>;
      createPublishPlan: (root: string, visibility: "private" | "public") => Promise<PublishPlan>;
      applyProfile: (root: string, profile: string, targetDir: string) => Promise<ApplyProfileResult>;
      driftReport: (root: string, profile: string, targetDir: string) => Promise<DriftReport>;
    };
  }
}

type Tab = "overview" | "audit" | "profiles" | "publish";

function initialLanguage(): Language {
  const stored = window.localStorage.getItem("skillops.language");
  if (stored === "en" || stored === "zh-CN") return stored;
  return navigator.language.toLowerCase().startsWith("zh") ? "zh-CN" : "en";
}

function App() {
  const [language, setLanguageState] = useState<Language>(initialLanguage);
  const t = dictionaries[language];
  const [root, setRoot] = useState("");
  const [snapshot, setSnapshot] = useState<WorkspaceSnapshot | undefined>();
  const [tab, setTab] = useState<Tab>("overview");
  const [status, setStatus] = useState<string>(t.chooseStatus);
  const [targetDir, setTargetDir] = useState(".skillops/skills");
  const [profile, setProfile] = useState("default");
  const [publishPlan, setPublishPlan] = useState<PublishPlan | undefined>();
  const [drift, setDrift] = useState<DriftReport | undefined>();
  const [applyResult, setApplyResult] = useState<ApplyProfileResult | undefined>();

  const criticalCount = snapshot?.audit.findings.filter((item) => item.severity === "critical").length ?? 0;
  const warningCount = snapshot?.audit.findings.filter((item) => item.severity === "warning").length ?? 0;
  const profileOptions = snapshot?.config.profiles.map((item) => item.name) ?? ["default"];

  function setLanguage(next: Language) {
    setLanguageState(next);
    window.localStorage.setItem("skillops.language", next);
    if (!snapshot) setStatus(dictionaries[next].chooseStatus);
  }

  async function chooseWorkspace() {
    try {
      if (!window.skillops) {
        setStatus(t.desktopRequired);
        return;
      }
      setStatus(t.choosingWorkspace);
      const selected = await window.skillops.chooseWorkspace();
      if (!selected) {
        setStatus(t.chooseCanceled);
        return;
      }
      setRoot(selected);
      await scan(selected);
    } catch (error) {
      setStatus(t.errorStatus(errorMessage(error)));
    }
  }

  async function scan(nextRoot = root) {
    if (!nextRoot) return;
    try {
      if (!window.skillops) {
        setStatus(t.desktopRequired);
        return;
      }
      setStatus(t.scanning);
      const result = await window.skillops.scanWorkspace(nextRoot);
      setSnapshot(result);
      setProfile(result.config.profiles[0]?.name ?? "default");
      setStatus(t.foundStatus(result.skills.length, result.audit.score));
    } catch (error) {
      setStatus(t.errorStatus(errorMessage(error)));
    }
  }

  async function init() {
    if (!root) return;
    try {
      if (!window.skillops) {
        setStatus(t.desktopRequired);
        return;
      }
      await window.skillops.initWorkspace(root);
      await scan(root);
    } catch (error) {
      setStatus(t.errorStatus(errorMessage(error)));
    }
  }

  async function planPublish(visibility: "private" | "public") {
    if (!root) return;
    try {
      if (!window.skillops) {
        setStatus(t.desktopRequired);
        return;
      }
      setPublishPlan(await window.skillops.createPublishPlan(root, visibility));
    } catch (error) {
      setStatus(t.errorStatus(errorMessage(error)));
    }
  }

  async function runDrift() {
    if (!root) return;
    try {
      if (!window.skillops) {
        setStatus(t.desktopRequired);
        return;
      }
      setDrift(await window.skillops.driftReport(root, profile, targetDir));
    } catch (error) {
      setStatus(t.errorStatus(errorMessage(error)));
    }
  }

  async function applySelectedProfile() {
    if (!root) return;
    try {
      if (!window.skillops) {
        setStatus(t.desktopRequired);
        return;
      }
      setApplyResult(await window.skillops.applyProfile(root, profile, targetDir));
      await runDrift();
    } catch (error) {
      setStatus(t.errorStatus(errorMessage(error)));
    }
  }

  const tabs = useMemo(() => [
    ["overview", t.tabs.overview, PackageCheck] as const,
    ["audit", t.tabs.audit, ShieldCheck] as const,
    ["profiles", t.tabs.profiles, GitBranch] as const,
    ["publish", t.tabs.publish, Rocket] as const
  ], [t]);

  return (
    <main>
      <aside className="sidebar">
        <div className="brand">
          <div className="logo">SO</div>
          <div>
            <h1>SkillOps</h1>
            <p>{t.appSubtitle}</p>
          </div>
        </div>
        <button className="primary" onClick={chooseWorkspace}><FolderOpen size={16} /> {t.openWorkspace}</button>
        <div className="pathbox">{root || t.noWorkspace}</div>
        <nav>
          {tabs.map(([id, label, Icon]) => (
            <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>
              <Icon size={16} /> {label}
            </button>
          ))}
        </nav>
      </aside>

      <section className="content">
        <header className="topbar">
          <div>
            <h2>{tabs.find(([id]) => id === tab)?.[1]}</h2>
            <p>{status}</p>
          </div>
          <div className="actions">
            <label className="language-select">
              <Globe2 size={16} />
              <span>{t.language}</span>
              <select value={language} onChange={(event) => setLanguage(event.target.value as Language)}>
                <option value="en">{t.english}</option>
                <option value="zh-CN">{t.simplifiedChinese}</option>
              </select>
            </label>
            <button onClick={() => scan()} disabled={!root}><RefreshCw size={16} /> {t.rescan}</button>
            <button onClick={init} disabled={!root}><Play size={16} /> {t.initConfig}</button>
          </div>
        </header>

        {!snapshot ? <EmptyState t={t} /> : (
          <>
            {tab === "overview" && <Overview t={t} snapshot={snapshot} criticalCount={criticalCount} warningCount={warningCount} />}
            {tab === "audit" && <Audit t={t} snapshot={snapshot} criticalCount={criticalCount} warningCount={warningCount} />}
            {tab === "profiles" && (
              <Profiles
                t={t}
                profile={profile}
                setProfile={setProfile}
                profileOptions={profileOptions}
                targetDir={targetDir}
                setTargetDir={setTargetDir}
                drift={drift}
                applyResult={applyResult}
                runDrift={runDrift}
                applySelectedProfile={applySelectedProfile}
              />
            )}
            {tab === "publish" && <Publish t={t} plan={publishPlan} planPublish={planPublish} />}
          </>
        )}
      </section>
    </main>
  );
}

function EmptyState({ t }: { t: Dictionary }) {
  return (
    <section className="empty">
      <PackageCheck size={36} />
      <h3>{t.emptyTitle}</h3>
      <p>{t.emptyBody}</p>
      <pre>{t.emptyExample}</pre>
    </section>
  );
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function Overview({ t, snapshot, criticalCount, warningCount }: { t: Dictionary; snapshot: WorkspaceSnapshot; criticalCount: number; warningCount: number }) {
  return (
    <div className="grid">
      <Metric label={t.metrics.skills} value={snapshot.skills.length} />
      <Metric label={t.metrics.auditScore} value={`${snapshot.audit.score}/100`} />
      <Metric label={t.metrics.critical} value={criticalCount} tone={criticalCount ? "bad" : "good"} />
      <Metric label={t.metrics.warnings} value={warningCount} tone={warningCount ? "warn" : "good"} />
      <section className="panel wide">
        <h3>{t.skillsTitle}</h3>
        <div className="list">
          {snapshot.skills.map((skill) => (
            <article key={skill.path} className="row">
              <div>
                <strong>{skill.name}</strong>
                <p>{skill.description || t.noDescription}</p>
              </div>
              <span>{skill.relativePath}</span>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function Audit({ t, snapshot, criticalCount, warningCount }: { t: Dictionary; snapshot: WorkspaceSnapshot; criticalCount: number; warningCount: number }) {
  return (
    <div className="grid">
      <Metric label={t.metrics.score} value={`${snapshot.audit.score}/100`} />
      <Metric label={t.metrics.criticalFindings} value={criticalCount} tone={criticalCount ? "bad" : "good"} />
      <Metric label={t.metrics.warnings} value={warningCount} tone={warningCount ? "warn" : "good"} />
      <section className="panel wide">
        <h3>{t.findingsTitle}</h3>
        {snapshot.audit.findings.length === 0 ? <p className="muted">{t.noFindings}</p> : (
          <div className="list">
            {snapshot.audit.findings.map((finding, index) => (
              <article key={`${finding.code}-${index}`} className={`finding ${finding.severity}`}>
                {finding.severity === "critical" ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
                <div>
                  <strong>{finding.code}</strong>
                  <p>{finding.message}</p>
                  <span>{finding.file}{finding.line ? `:${finding.line}` : ""}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Profiles(props: {
  t: Dictionary;
  profile: string;
  setProfile: (value: string) => void;
  profileOptions: string[];
  targetDir: string;
  setTargetDir: (value: string) => void;
  drift?: DriftReport;
  applyResult?: ApplyProfileResult;
  runDrift: () => void;
  applySelectedProfile: () => void;
}) {
  const { t } = props;
  return (
    <div className="grid two">
      <section className="panel">
        <h3>{t.applyProfile}</h3>
        <label>{t.profile}</label>
        <select value={props.profile} onChange={(event) => props.setProfile(event.target.value)}>
          {props.profileOptions.map((name) => <option key={name}>{name}</option>)}
        </select>
        <label>{t.targetDirectory}</label>
        <input value={props.targetDir} onChange={(event) => props.setTargetDir(event.target.value)} />
        <div className="actions">
          <button onClick={props.runDrift}>{t.checkDrift}</button>
          <button className="primary" onClick={props.applySelectedProfile}>{t.apply}</button>
        </div>
        {props.applyResult && <p className="muted">{t.copiedSkipped(props.applyResult.copied.length, props.applyResult.skipped.length)}</p>}
      </section>
      <section className="panel">
        <h3>{t.drift}</h3>
        {!props.drift ? <p className="muted">{t.driftEmpty}</p> : (
          <div className="list">
            {props.drift.items.map((item) => (
              <article key={item.skill} className="row">
                <strong>{item.skill}</strong>
                <span className={item.status === "missing" ? "badge warn" : "badge good"}>{item.status}</span>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Publish({ t, plan, planPublish }: { t: Dictionary; plan?: PublishPlan; planPublish: (visibility: "private" | "public") => void }) {
  return (
    <div className="grid two">
      <section className="panel">
        <h3>{t.publishPlan}</h3>
        <p className="muted">{t.publishHelp}</p>
        <div className="actions">
          <button onClick={() => planPublish("private")}>{t.privateTeamRepo}</button>
          <button className="primary" onClick={() => planPublish("public")}>{t.publicRelease}</button>
        </div>
      </section>
      <section className="panel">
        <h3>{t.planOutput}</h3>
        {!plan ? <p className="muted">{t.noPublishPlan}</p> : (
          <>
            <h4>{t.installCommands}</h4>
            {plan.installCommands.map((command) => <pre key={command}>{command}</pre>)}
            <h4>{t.checklist}</h4>
            <ul>
              {plan.checklist.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string | number; tone?: "good" | "warn" | "bad" }) {
  return (
    <section className={`metric ${tone ?? ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </section>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
