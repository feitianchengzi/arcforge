import { AlertTriangle, Box, Database, HardDrive } from "lucide-react";
import type { InstalledSkillInstallKind, InstalledSkillItem, InstalledSkillOrganizePlan, InstalledSkillsInventory, InstalledSkillsScanOptions } from "../../shared/types";
import type { Dictionary } from "../i18n";

export function InstalledSkills(props: {
  t: Dictionary;
  inventory?: InstalledSkillsInventory;
  scanOptions: InstalledSkillsScanOptions;
  organizePlan?: InstalledSkillOrganizePlan;
  loading: boolean;
  organizing: boolean;
  error?: string;
  onScanOptionsChange: (patch: Partial<InstalledSkillsScanOptions>) => void;
  onCreateOrganizePlan: () => void;
  onRunOrganizePlan: () => void;
}) {
  const { t, inventory } = props;
  const skills = inventory?.skills ?? [];
  const duplicateGroups = inventory?.duplicateGroups ?? [];
  const roots = inventory?.roots ?? [];

  return (
    <div className="grid two">
      {props.error && (
        <section className="panel wide audit-disclaimer">
          <div className="source-summary">
            <AlertTriangle size={18} />
            <div>
              <h3>{t.installedSkillsScanError}</h3>
              <p>{props.error}</p>
            </div>
          </div>
        </section>
      )}

      <section className="panel wide">
        <div className="panel-heading">
          <div>
            <h3>{t.installedSkillScanOptions}</h3>
            <p className="muted">{t.installedSkillScanOptionsHelp}</p>
          </div>
          <div className="actions">
            <button onClick={props.onCreateOrganizePlan} disabled={props.loading || props.organizing}>{props.organizing ? t.installedSkillOrganizing : t.installedSkillOrganize}</button>
            {props.organizePlan && <button className="primary" onClick={props.onRunOrganizePlan} disabled={props.loading || props.organizing || props.organizePlan.actions.length === 0}>{t.installedSkillOrganizeRun}</button>}
          </div>
        </div>
        <div className="installed-options">
          <label className="check-row">
            <input
              type="checkbox"
              checked={Boolean(props.scanOptions.includeAgentSystemSkills)}
              onChange={(event) => props.onScanOptionsChange({ includeAgentSystemSkills: event.currentTarget.checked })}
            />
            <span>{t.installedSkillIncludeSystem}</span>
          </label>
          <label className="check-row">
            <input
              type="checkbox"
              checked={props.scanOptions.includeCodexPluginCache !== false}
              onChange={(event) => props.onScanOptionsChange({ includeCodexPluginCache: event.currentTarget.checked })}
            />
            <span>{t.installedSkillIncludePluginCache}</span>
          </label>
        </div>
      </section>

      {inventory && (
        <section className="panel wide installed-summary">
          <div className="dashboard-metrics">
            <div className="metric">
              <span>{t.installedSkillItems}</span>
              <strong>{skills.length}</strong>
            </div>
            <div className="metric">
              <span>{t.installedSkillRoots}</span>
              <strong>{roots.length}</strong>
            </div>
            <div className="metric">
              <span>{t.installedSkillDuplicates}</span>
              <strong>{duplicateGroups.length}</strong>
            </div>
          </div>
          <p className="muted">{t.installedSkillsSummary(skills.length, roots.length, duplicateGroups.length)}</p>
        </section>
      )}

      {props.organizePlan && (
        <section className="panel wide installed-organize-plan">
          <div className="panel-heading">
            <div>
              <h3>{t.installedSkillOrganizePlan}</h3>
              <p className="muted">{t.installedSkillOrganizePlanSummary(props.organizePlan.actions.length, props.organizePlan.conflicts.length)}</p>
            </div>
          </div>
          <div className="dashboard-metrics">
            <div className="metric">
              <span>{t.installedSkillOrganizeActions}</span>
              <strong>{props.organizePlan.actions.length}</strong>
            </div>
            <div className={`metric ${props.organizePlan.conflicts.length ? "warn" : ""}`}>
              <span>{t.installedSkillOrganizeConflicts}</span>
              <strong>{props.organizePlan.conflicts.length}</strong>
            </div>
          </div>
          <div className="list compact">
            {props.organizePlan.actions.slice(0, 8).map((action) => (
              <article key={`${action.kind}:${action.sourcePath}:${action.targetPath}`} className="row stacked">
                <div>
                  <strong>{action.skillName}</strong>
                  <p>{action.kind} / {action.reason}</p>
                  <span>{action.sourcePath} {"->"} {action.targetPath}</span>
                </div>
              </article>
            ))}
            {props.organizePlan.conflicts.map((conflict) => (
              <article key={conflict.skillName} className="row stacked finding warning">
                <AlertTriangle size={16} />
                <div>
                  <strong>{t.installedSkillOrganizeConflict(conflict.skillName)}</strong>
                  <p>{conflict.reason}</p>
                  <span>{conflict.items.map((item) => `${item.rootName}: ${item.path}`).join(" / ")}</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="panel">
        <h3>{t.installedSkillRoots}</h3>
        <div className="list compact">
          {roots.length === 0 ? <p className="muted">{t.installedSkillsEmpty}</p> : roots.map((root) => (
            <article key={root.id} className="row stacked">
              <div>
                <strong>{root.name}</strong>
                <p>{installKindLabel(root.installKind, t)} / {root.status}</p>
                <span>{root.path}</span>
              </div>
              <span className={root.status === "error" ? "badge warn" : "badge"}>{root.skillCount}</span>
              {root.error && <p className="muted">{root.error}</p>}
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <h3>{t.installedSkillDuplicates}</h3>
        {duplicateGroups.length === 0 ? <p className="muted">{t.installedSkillDuplicatesEmpty}</p> : (
          <div className="list compact">
            {duplicateGroups.map((group) => (
              <article key={group.key} className="row stacked">
                <div>
                  <strong>{group.name}</strong>
                  <p>{t.installedSkillDuplicateCount(group.items.length)}</p>
                  <span>{group.items.map((item) => item.rootName).join(" / ")}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="panel wide">
        <h3>{t.installedSkillItems}</h3>
        {skills.length === 0 ? <p className="muted">{t.installedSkillsEmpty}</p> : (
          <div className="list">
            {skills.map((skill) => <InstalledSkillRow key={`${skill.rootId}:${skill.relativePath}`} skill={skill} t={t} />)}
          </div>
        )}
      </section>
    </div>
  );
}

function InstalledSkillRow({ skill, t }: { skill: InstalledSkillItem; t: Dictionary }) {
  return (
    <article className="row stacked skill-row installed-skill-row">
      <div className="installed-skill-main">
        <div className="installed-skill-heading">
          <div className="installed-skill-title">
            <strong>{skill.name}</strong>
            <span>{skill.rootName}</span>
          </div>
          <InstalledSkillMetadata skill={skill} t={t} />
        </div>
        <p className="installed-skill-description">{skill.description || t.noDescription}</p>
        <InstalledSkillPath path={skill.path} />
        {skill.plugin && <InstalledSkillPlugin plugin={skill.plugin} />}
      </div>
      <div className="installed-skill-icon" aria-hidden="true">{kindIcon(skill.installKind)}</div>
    </article>
  );
}

function InstalledSkillMetadata({ skill, t }: { skill: InstalledSkillItem; t: Dictionary }) {
  return (
    <div className="installed-skill-badges">
      <span>{installKindLabel(skill.installKind, t)}</span>
      {skill.version && <span>v{skill.version}</span>}
      {skill.hasReferences && <span>references</span>}
      {skill.hasScripts && <span>scripts</span>}
    </div>
  );
}

function InstalledSkillPath({ path }: { path: string }) {
  return (
    <div className="installed-skill-path" title={path}>
      {path}
    </div>
  );
}

function InstalledSkillPlugin({ plugin }: { plugin: NonNullable<InstalledSkillItem["plugin"]> }) {
  return (
    <div className="installed-skill-plugin" title={`${plugin.channel} / ${plugin.pluginName} / ${plugin.revision}`}>
      <span>channel {plugin.channel}</span>
      <span>plugin {plugin.pluginName}</span>
      <span>revision {plugin.revision}</span>
    </div>
  );
}

function installKindLabel(kind: InstalledSkillInstallKind, t: Dictionary): string {
  if (kind === "agent-user") return t.installedSkillAgentUser;
  if (kind === "agent-generic") return t.installedSkillAgentGeneric;
  return t.installedSkillPluginCache;
}

function kindIcon(kind: InstalledSkillInstallKind) {
  if (kind === "codex-plugin-cache") return <Database size={18} />;
  if (kind === "agent-generic") return <Box size={18} />;
  return <HardDrive size={18} />;
}

export const readonly = "read-only inventory; no import actions; imports disabled; does not import";
