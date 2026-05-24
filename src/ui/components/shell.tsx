import type { ComponentType } from "react";
import { AlertTriangle, CheckCircle2, Copy, Download, ExternalLink, FolderOpen, Globe2, MessageSquare, PackageCheck, X } from "lucide-react";
import type { EnvironmentStatus, RecentWorkspace, WorkspaceSnapshot } from "../../shared/types";
import type { Dictionary, Language } from "../i18n";
import type { CliRepairNotice, Tab } from "../types";

export function EmptyState({ t }: { t: Dictionary }) {
  return (
    <section className="empty">
      <PackageCheck size={36} />
      <h3>{t.emptyTitle}</h3>
      <p>{t.emptyBody}</p>
    </section>
  );
}

export function PendingProject({ t, project }: { t: Dictionary; project: RecentWorkspace }) {
  const failed = project.status === "error";
  return (
    <section className="empty">
      <Download size={36} />
      <h3>{project.name}</h3>
      <p>{failed ? t.projectDownloadFailed : t.projectDownloading}</p>
      {project.githubSourceUrl && <pre>{project.githubSourceUrl}</pre>}
      {failed && project.error && <pre>{project.error}</pre>}
    </section>
  );
}

export function EnvironmentNotice({ t, environment, isRepairing, onInstallCli }: { t: Dictionary; environment: EnvironmentStatus; isRepairing: boolean; onInstallCli: () => void }) {
  const gitVersion = environment.git.version ?? "git";
  const cli = environment.cli;
  const title = environment.git.available ? t.environmentReady(gitVersion) : t.environmentGitMissing;
  const cliReady = cli?.available ?? false;
  const cliTitle = cliReady ? t.cliReady : t.cliNeedsRepair;
  return (
    <div className={`environment-status ${environment.git.available && cliReady ? "good" : "warn"}`} title={`${environment.platform} ${environment.arch}${cli?.message ? ` · ${cli.message}` : ""}`}>
      {environment.git.available && cliReady ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
      <span>{title} {cli ? cliTitle : ""}</span>
      {cli && !cliReady && <button className="inline-link" onClick={onInstallCli} disabled={isRepairing}>{isRepairing ? t.cliRepairing : t.repairCli}</button>}
    </div>
  );
}

export function CliRepairDialog(props: {
  t: Dictionary;
  notice: CliRepairNotice;
  onCopy: () => void;
  onClose: () => void;
}) {
  const { t, notice } = props;
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={props.onClose}>
      <section className="modal small" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>{notice.title}</h3>
            <p>{notice.body}</p>
          </div>
          <button className="icon-button light" onClick={props.onClose}>x</button>
        </div>
        <textarea className="copybox" readOnly value={notice.details} onFocus={(event) => event.currentTarget.select()} />
        <div className="actions modal-actions">
          <button onClick={props.onCopy}><Copy size={16} /> {notice.copied ? t.cliRepairCopied : t.cliRepairCopy}</button>
          <button className="primary" onClick={props.onClose}>{t.cancel}</button>
        </div>
      </section>
    </div>
  );
}

export function AddProjectDialog(props: {
  t: Dictionary;
  title?: string;
  sourceMode: "local" | "github";
  setSourceMode: (value: "local" | "github") => void;
  sharedSourceUrl: string;
  setSharedSourceUrl: (value: string) => void;
  chooseWorkspace: () => void;
  downloadSharedSource: () => void;
  onClose: () => void;
}) {
  const { t } = props;
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={props.onClose}>
      <section className="modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>{props.title ?? t.addSkillProject}</h3>
            <p>{t.emptyBody}</p>
          </div>
          <button className="icon-button light" onClick={props.onClose}>x</button>
        </div>
        <div className="segmented two source-mode">
          <button className={props.sourceMode === "local" ? "active" : ""} onClick={() => props.setSourceMode("local")}><FolderOpen size={16} /> {t.localSource}</button>
          <button className={props.sourceMode === "github" ? "active" : ""} onClick={() => props.setSourceMode("github")}><Download size={16} /> {t.githubSource}</button>
        </div>
        <div className="add-project-options single">
          {props.sourceMode === "local" ? <article className="add-option">
            <div>
              <FolderOpen size={20} />
              <h4>{t.addLocalProject}</h4>
              <p>{t.localProjectHelp}</p>
            </div>
            <button className="primary" onClick={props.chooseWorkspace}>{t.addLocalProject}</button>
          </article> : <article className="add-option">
            <div>
              <Download size={20} />
              <h4>{t.addSharedSource}</h4>
              <p>{t.githubProjectHelp}</p>
            </div>
            <div className="download-source light">
              <input value={props.sharedSourceUrl} placeholder={t.sharedSourcePlaceholder} onChange={(event) => props.setSharedSourceUrl(event.target.value)} />
              <button onClick={props.downloadSharedSource} disabled={!props.sharedSourceUrl.trim()}>{t.downloadSource}</button>
            </div>
          </article>}
        </div>
        <pre>{t.emptyExample}</pre>
      </section>
    </div>
  );
}

export function SettingsDialog(props: {
  t: Dictionary;
  language: Language;
  setLanguage: (value: Language) => void;
  openFeedback: () => void;
  onClose: () => void;
}) {
  const { t } = props;
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={props.onClose}>
      <section className="modal small settings-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>{t.settings}</h3>
          </div>
          <button className="icon-button light" aria-label={t.cancel} onClick={props.onClose}><X size={16} /></button>
        </div>
        <div className="settings-body">
          <div className="settings-row">
            <div className="settings-row-icon">
              <Globe2 size={16} />
            </div>
            <div>
              <label htmlFor="settings-language">{t.language}</label>
            </div>
            <select id="settings-language" value={props.language} onChange={(event) => props.setLanguage(event.target.value as Language)}>
              <option value="en">{t.english}</option>
              <option value="zh-CN">{t.simplifiedChinese}</option>
            </select>
          </div>
          <div className="settings-row feedback-row">
            <div className="settings-row-icon">
              <MessageSquare size={16} />
            </div>
            <div>
              <strong>{t.feedback}</strong>
              <p className="muted">{t.feedbackHelp}</p>
            </div>
            <button onClick={() => props.openFeedback()}><ExternalLink size={16} /> {t.auditOpenIssue}</button>
          </div>
        </div>
      </section>
    </div>
  );
}

export function ProjectHeader(props: {
  t: Dictionary;
  snapshot: WorkspaceSnapshot;
  tabs: ReadonlyArray<readonly [Tab, string, ComponentType<{ size?: number }>]>;
  tab: Tab;
  setTab: (value: Tab) => void;
  criticalCount: number;
  warningCount: number;
}) {
  return (
    <section className="project-header">
      <div className="project-summary">
        <div>
          <span>{props.t.projectPath}</span>
          <p>{props.snapshot.root}</p>
        </div>
        <div className="summary-metrics">
          <div>
            <strong>{props.snapshot.skills.length}</strong>
            <span>{props.t.metrics.skills}</span>
          </div>
          <div>
            <strong>{props.snapshot.audit.score}/100</strong>
            <span>{props.t.metrics.auditScore}</span>
          </div>
          <div className={props.criticalCount ? "bad" : "good"}>
            <strong>{props.criticalCount}</strong>
            <span>{props.t.metrics.critical}</span>
          </div>
          <div className={props.warningCount ? "warn" : "good"}>
            <strong>{props.warningCount}</strong>
            <span>{props.t.metrics.warnings}</span>
          </div>
        </div>
      </div>
      <nav className="project-tabs">
        {props.tabs.map(([id, label, Icon]) => (
          <button key={id} className={props.tab === id ? "active" : ""} onClick={() => props.setTab(id)}>
            <Icon size={16} /> {label}
          </button>
        ))}
      </nav>
    </section>
  );
}

export function Metric({ label, value, tone }: { label: string; value: string | number; tone?: "good" | "warn" | "bad" }) {
  return (
    <section className={`metric ${tone ?? ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </section>
  );
}
