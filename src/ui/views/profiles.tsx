import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import type { ArcForgeConfig, ArcForgeProfile, WorkspaceSnapshot } from "../../shared/types";
import type { Dictionary } from "../i18n";
import { emptyProfile } from "../utils";

export function Profiles(props: {
  t: Dictionary;
  snapshot: WorkspaceSnapshot;
  profile: string;
  setProfile: (value: string) => void;
  saveProfiles: (config: ArcForgeConfig, nextProfile: string) => void | Promise<void>;
}) {
  const { t } = props;
  const sourceProfiles = props.snapshot.config.profiles.length > 0 ? props.snapshot.config.profiles : [emptyProfile("default")];
  const [draftProfiles, setDraftProfiles] = useState<ArcForgeProfile[]>(sourceProfiles);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const nextProfiles = props.snapshot.config.profiles.length > 0 ? props.snapshot.config.profiles : [emptyProfile("default")];
    const nextIndex = Math.max(0, nextProfiles.findIndex((item) => item.name === props.profile));
    setDraftProfiles(nextProfiles);
    setActiveIndex(nextIndex === -1 ? 0 : nextIndex);
  }, [props.snapshot, props.profile]);

  const activeProfile = draftProfiles[activeIndex] ?? draftProfiles[0] ?? emptyProfile("default");

  function updateActiveProfile(patch: Partial<ArcForgeProfile>) {
    setDraftProfiles((current) => current.map((item, index) => index === activeIndex ? { ...item, ...patch } : item));
  }

  function addProfile() {
    const base = "new-profile";
    const existing = new Set(draftProfiles.map((item) => item.name));
    let name = base;
    let index = 2;
    while (existing.has(name)) {
      name = `${base}-${index}`;
      index += 1;
    }
    const nextProfile = emptyProfile(name);
    setDraftProfiles((current) => [...current, nextProfile]);
    setActiveIndex(draftProfiles.length);
  }

  function deleteProfile() {
    if (draftProfiles.length <= 1) return;
    const deletedProfile = draftProfiles[activeIndex];
    if (!window.confirm(t.confirmDeleteProfile(deletedProfile?.name || t.unnamedProfile))) return;
    const nextProfiles = draftProfiles.filter((_item, index) => index !== activeIndex);
    const nextIndex = Math.max(0, activeIndex - 1);
    const nextProfile = nextProfiles[nextIndex] ?? nextProfiles[0] ?? emptyProfile("default");
    setDraftProfiles(nextProfiles);
    setActiveIndex(nextIndex);
    props.saveProfiles(retargetProfileReferences({ ...props.snapshot.config, profiles: nextProfiles }, deletedProfile?.name, nextProfile.name), nextProfile.name);
    props.setProfile(nextProfile.name);
  }

  function toggleSkill(skillName: string) {
    const current = activeProfile.skills.includes("*") ? props.snapshot.skills.map((skill) => skill.name) : activeProfile.skills;
    const next = current.includes(skillName) ? current.filter((item) => item !== skillName) : [...current, skillName];
    updateActiveProfile({ skills: next.length === props.snapshot.skills.length ? ["*"] : next });
  }

  function toggleAllSkills() {
    updateActiveProfile({ skills: activeProfile.skills.includes("*") ? [] : ["*"] });
  }

  function toggleTarget(target: string) {
    const next = activeProfile.targets.includes(target)
      ? activeProfile.targets.filter((item) => item !== target)
      : [...activeProfile.targets, target];
    updateActiveProfile({ targets: next });
  }

  const selectedSkillNames = activeProfile.skills.includes("*")
    ? new Set(props.snapshot.skills.map((skill) => skill.name))
    : new Set(activeProfile.skills);

  function saveDraft() {
    props.saveProfiles({ ...props.snapshot.config, profiles: draftProfiles }, activeProfile.name);
    props.setProfile(activeProfile.name);
  }

  function cancelDraft() {
    setDraftProfiles(sourceProfiles);
    const nextIndex = Math.max(0, sourceProfiles.findIndex((item) => item.name === props.profile));
    setActiveIndex(nextIndex === -1 ? 0 : nextIndex);
  }

  return (
    <div className="grid two">
      <section className="panel">
        <h3>{t.manageProfiles}</h3>
        <p className="muted">{t.profileHelp}</p>
        <div className="profile-list">
          {draftProfiles.map((item, index) => (
            <button key={`${index}-${item.name}`} className={index === activeIndex ? "active" : ""} onClick={() => setActiveIndex(index)}>
              <strong>{item.name || t.unnamedProfile}</strong>
              <span>{item.skills.includes("*") ? t.allSkills : `${item.skills.length} skills`}</span>
            </button>
          ))}
        </div>
        <div className="actions">
          <button onClick={addProfile}>{t.newProfile}</button>
          <button onClick={deleteProfile} disabled={draftProfiles.length <= 1}><Trash2 size={16} /> {t.deleteProfile}</button>
        </div>
      </section>
      <section className="panel">
        <h3>{activeProfile.name || t.unnamedProfile}</h3>
        <label>{t.profileName}</label>
        <input value={activeProfile.name} onChange={(event) => updateActiveProfile({ name: event.target.value })} />
        <label>{t.profileDescription}</label>
        <input value={activeProfile.description ?? ""} onChange={(event) => updateActiveProfile({ description: event.target.value })} />

        <label>{t.includedSkills}</label>
        <label className="check-row">
          <input type="checkbox" checked={activeProfile.skills.includes("*")} onChange={toggleAllSkills} />
          <span>{t.allSkills}</span>
        </label>
        <div className="check-list">
          {props.snapshot.skills.map((skill) => (
            <label key={skill.name} className="check-row">
              <input type="checkbox" checked={selectedSkillNames.has(skill.name)} onChange={() => toggleSkill(skill.name)} disabled={activeProfile.skills.includes("*")} />
              <span>{skill.name}</span>
            </label>
          ))}
        </div>

        <label>{t.profileTargets}</label>
        <div className="check-list inline">
          {["codex", "claude", "cursor"].map((target) => (
            <label key={target} className="check-row">
              <input type="checkbox" checked={activeProfile.targets.includes(target)} onChange={() => toggleTarget(target)} />
              <span>{target}</span>
            </label>
          ))}
        </div>
        <div className="actions">
          <button onClick={cancelDraft}>{t.cancel}</button>
          <button className="primary" onClick={saveDraft}>{t.saveProfiles}</button>
        </div>
      </section>
    </div>
  );
}

function retargetProfileReferences(config: ArcForgeConfig, deletedProfileName: string | undefined, nextProfileName: string): ArcForgeConfig {
  if (!deletedProfileName) return config;
  return {
    ...config,
    applyTargets: config.applyTargets?.map((group) => group.profile === deletedProfileName ? { ...group, profile: nextProfileName } : group),
    shareTargets: config.shareTargets?.map((group) => group.profile === deletedProfileName ? { ...group, profile: nextProfileName } : group)
  };
}
