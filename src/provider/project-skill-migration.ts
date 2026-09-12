import { promises as fs } from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { catalogPackageDigest, catalogDirectoryDigest, resolveCatalogSkill, loadUserSkillCatalog } from "../core/skill-catalog.js";
import { saveLocalProjectAppliedSources, type LocalProjectState } from "../core/project-store.js";
import type { AppliedSourceRecord } from "../shared/types.js";

const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const inside = (root: string, target: string) => { const r = path.relative(root, target); return !path.isAbsolute(r) && r !== ".." && !r.startsWith(`..${path.sep}`); };
async function atomic(file: string, value: unknown) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temp = `${file}.${randomUUID()}.tmp`;
  try { await fs.writeFile(temp, JSON.stringify(value, null, 2) + "\n"); await fs.rename(temp, file); }
  finally { await fs.rm(temp, { force: true }); }
}
async function noLinks(target: string) {
  for (let current = path.resolve(target); ; current = path.dirname(current)) {
    try { if ((await fs.lstat(current)).isSymbolicLink()) throw Error(`Linked path: ${current}`); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
    if (current === path.dirname(current)) break;
  }
}
async function manifest(root: string): Promise<Array<{ path: string; sha256: string }>> {
  await noLinks(root);
  const result: Array<{ path: string; sha256: string }> = [];
  async function walk(folder: string) {
    for (const e of await fs.readdir(folder, { withFileTypes: true })) {
      const file = path.join(folder, e.name);
      if (e.isDirectory()) await walk(file);
      else if (e.isFile()) result.push({ path: path.relative(root, file).split(path.sep).join("/"), sha256: createHash("sha256").update(await fs.readFile(file)).digest("hex") });
      else throw Error(`Unsupported or linked package entry: ${file}`);
    }
  }
  await walk(root); return result.sort((a, b) => a.path.localeCompare(b.path, "en"));
}
export interface ProjectSkillMigrationOptions {
  referenceRoot: string;
  stateRoot: string;
  consumerRoot: string;
  sourceId: string;
  catalogRoot: string;
  version?: string;
  projectRoots: string[];
  trustedSourceRoots: string[];
  skillPaths: string[];
}
interface MigrationItem { path: string; reason: string; digest?: string; claims?: string[] }
interface MigrationPlan { planDigest: string; removed: MigrationItem[]; preserved: MigrationItem[]; errors: Array<{ path: string; message: string }>; relationsDigest: string }
// Read all records, fail closed on malformed evidence instead of silently losing competing claims.
async function states(stateRoot: string): Promise<LocalProjectState[]> {
  const root = path.join(stateRoot, "projects"); await noLinks(root);
  let names: string[];
  try { names = await fs.readdir(root); } catch (e) { if ((e as NodeJS.ErrnoException).code === "ENOENT") return []; throw e; }
  const result = [];
  for (const name of names.filter(n => n.endsWith(".json")).sort()) {
    await noLinks(path.join(root, name));
    const s = JSON.parse(await fs.readFile(path.join(root, name), "utf8"));
    if (!path.isAbsolute(s.root || "") || !Array.isArray(s.appliedSources || [])) throw Error(`Invalid migration ownership record: ${name}`);
    result.push(s as LocalProjectState);
  }
  return result;
}
function destinations(s: LocalProjectState, r: AppliedSourceRecord) {
  return [...(r.availabilityItems || []).flatMap(i => i.destinations), ...(r.availabilityAssets || []).flatMap(i => i.destinations), ...(r.provisioningEvidence?.targets || []).map(i => i.path),
    ...(r.targetDir ? (r.managedSkillNames || r.skills || []).map(n => path.resolve(s.root, r.targetDir, n)) : [])].map(p => path.resolve(p));
}
async function verifiedCatalog(o: ProjectSkillMigrationOptions) {
  const root = o.catalogRoot;
  const records = await states(o.stateRoot);
  const ownerRecords = records.filter(s => path.resolve(s.root) === path.resolve(o.consumerRoot)).flatMap(s => s.appliedSources || []);
  const relation = ownerRecords.find(r => r.sourceRoot === o.referenceRoot && r.availabilityContext?.destinationPolicy === "catalog-only");
  const targets = relation?.provisioningEvidence?.targets.filter(t => inside(root, t.path)) || [];
  if (!targets.length) throw Error("Confirmed catalog installation relation required before cleanup.");
  for (const target of targets) {
    await manifest(target.path);
    if (target.packageDigest ? await catalogPackageDigest(target.path) !== target.packageDigest : await catalogDirectoryDigest(target.path) !== target.contentDigest) throw Error("Installed catalog content changed; cleanup refused.");
  }
  for (const relative of o.skillPaths) {
    const name = path.basename(relative), resolved = await resolveCatalogSkill(name, "exact", {catalogRoot: root});
    if (resolved.status !== "resolved" || !targets.some(t => t.path === path.join(root, name)) || resolved.resolved?.installedPath !== path.join(root, name)) throw Error("Catalog installation relation does not cover requested skill.");
  }
  return root;
}
export async function planProjectSkillMigration(o: ProjectSkillMigrationOptions): Promise<MigrationPlan> {
  for (const value of [o.stateRoot, o.consumerRoot, o.catalogRoot, ...o.projectRoots, ...o.trustedSourceRoots]) if (!path.isAbsolute(value)) throw Error("Explicit absolute migration paths are required.");
  if (!o.trustedSourceRoots.includes(o.referenceRoot)) throw Error("Explicit trusted reference source required.");
  const catalog = o.referenceRoot, records = await states(o.stateRoot);
  await noLinks(catalog);
  const expected = new Map<string, string>();
  for (const relative of o.skillPaths) {
    if (path.isAbsolute(relative) || !inside(catalog, path.resolve(catalog, relative))) throw Error("Invalid migration reference.");
    const folder = path.join(catalog, relative); await manifest(folder);
    expected.set(path.basename(relative), hash(await manifest(folder)));
  }
  const trusted = new Set(o.trustedSourceRoots.map(p => path.resolve(p)));
  const result: Omit<MigrationPlan, "planDigest"> = { removed: [], preserved: [], errors: [], relationsDigest: hash(records) };
  for (const project of [...new Set(o.projectRoots.map(p => path.resolve(p)))].sort()) {
    const root = path.join(project, ".codex", "skills");
    try {
      try { await noLinks(root); } catch { result.preserved.push({ path: root, reason: "linked directory" }); continue; }
      for (const e of (await fs.readdir(root, { withFileTypes: true })).sort((a,b) => a.name.localeCompare(b.name))) {
        const target = path.join(root, e.name);
        if (!e.isDirectory()) { result.preserved.push({ path: target, reason: "linked or non-directory entry" }); continue; }
        const claims = records.flatMap(s => (s.appliedSources || []).filter(r => destinations(s, r).includes(target)).map(r => ({ s, r })));
        if (claims.some(({r}) => !path.isAbsolute(r.sourceRoot || "") || !trusted.has(path.resolve(r.sourceRoot)))) { result.preserved.push({ path: target, reason: "conflicting or unknown source ownership" }); continue; }
        let observed: string;
        try { await manifest(target); observed = await catalogDirectoryDigest(target); }
        catch { result.preserved.push({ path: target, reason: "unreadable or linked package contents" }); continue; }
        const baselines = claims.flatMap(({r}) => (r.provisioningEvidence?.targets || []).filter(t => path.resolve(t.path) === target).map(t => t.contentDigest));
        const completeManifest = await manifest(target), completeDigest = hash(completeManifest);
        const fullyCovered = completeManifest.every(f => !f.path.split('/').some(p => ['.git','node_modules','dist'].includes(p)));
        const exact = expected.get(e.name) === completeDigest;
        const matches = baselines.length ? baselines.every(d => d === observed) && (fullyCovered || exact) : exact;
        if (!matches) { result.preserved.push({ path: target, digest: observed, reason: claims.length ? "managed copy modified or baseline unavailable" : "not proven source-owned" }); continue; }
        result.removed.push({ path: target, digest: completeDigest, reason: claims.length ? "unchanged managed installation" : "exact trusted package content", claims: claims.map(({s,r}) => `${s.root}:${r.id}`) });
      }
    } catch (e) { if ((e as NodeJS.ErrnoException).code !== "ENOENT") result.errors.push({ path: root, message: (e as Error).message }); }
  }
  // Historical catalog targets are listed separately from installation and never inferred from names.
  const activePaths = new Set((await loadUserSkillCatalog({catalogRoot: o.catalogRoot})).entries.map(e => path.resolve(e.installedPath)));
  for (const owner of records.filter(s => path.resolve(s.root) === path.resolve(o.consumerRoot))) for (const record of owner.appliedSources || []) {
    if (!trusted.has(path.resolve(record.sourceRoot))) continue;
    for (const target of record.retiredTargets || []) {
      if (!["versions", "consumers"].some(dir => inside(path.join(o.catalogRoot, dir), target.path))) continue;
      if (result.removed.some(i => i.path === target.path)) continue;
      try {
        if (activePaths.has(path.resolve(target.path)) || records.some(s => (s.appliedSources || []).some(r => destinations(s,r).includes(path.resolve(target.path))))) {
          result.preserved.push({path:target.path, reason:"catalog target still referenced"});continue;
        }
        await manifest(target.path);
        if (!target.packageDigest || await catalogPackageDigest(target.path) !== target.packageDigest) { result.preserved.push({path:target.path,reason:"historical catalog content modified or full baseline unavailable"});continue; }
        result.removed.push({path:target.path,digest:hash(await manifest(target.path)),reason:"unchanged retired catalog installation",claims:[`${owner.root}:${record.id}`]});
      } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") result.preserved.push({path:target.path,reason:"unreadable or linked historical catalog target"}); }
    }
  }
  return { ...result, planDigest: hash([o, result]) };
}
export async function applyProjectSkillMigration(o: ProjectSkillMigrationOptions & { expectedPlanDigest: string; confirm: true }) {
  const { expectedPlanDigest, confirm, ...input } = o;
  await verifiedCatalog(input);
  const plan = await planProjectSkillMigration(input);
  if (!confirm || plan.planDigest !== expectedPlanDigest) throw Error("Migration plan changed; inspect a fresh plan.");
  if (plan.errors.length) throw Error("Migration plan contains errors.");
  const result: { removed: MigrationItem[]; preserved: MigrationItem[]; errors: Array<{path: string; message: string}> } = { removed: [], preserved: plan.preserved, errors: [] };
  for (const item of plan.removed) {
    try {
      await verifiedCatalog(input);
      const current = await states(o.stateRoot);
      await manifest(item.path);
      if (hash(current) !== plan.relationsDigest || hash(await manifest(item.path)) !== item.digest) throw Error("Migration evidence changed.");
      await fs.rm(item.path, { recursive: true });
      result.removed.push(item);
    } catch (e) { result.errors.push({ path: item.path, message: (e as Error).message }); }
  }
  // Remove only successful destinations from all affected relation owners.
  const removed = new Set(result.removed.map(i => i.path));
  const latestStates = await states(o.stateRoot);
  // A retry also repairs relations whose target was deleted before a prior state-write failure.
  for (const s of latestStates) for (const r of s.appliedSources || []) for (const target of destinations(s, r)) {
    if (!o.projectRoots.some(p => path.dirname(target) === path.join(path.resolve(p), ".codex", "skills"))) continue;
    const claims = latestStates.flatMap(owner => (owner.appliedSources || []).filter(record => destinations(owner, record).includes(target)));
    if (!claims.length || claims.some(record => !path.isAbsolute(record.sourceRoot || "") || !o.trustedSourceRoots.map(p => path.resolve(p)).includes(path.resolve(record.sourceRoot)))) continue;
    try { await noLinks(path.dirname(target)); } catch { continue; }
    try { await fs.lstat(target); } catch (e) { if ((e as NodeJS.ErrnoException).code === "ENOENT") removed.add(target); else throw e; }
  }
  for (const s of latestStates) {
    if (!(s.appliedSources || []).some(r => destinations(s, r).some(p => removed.has(p)) || r.retiredTargets?.some(t => removed.has(t.path)))) continue;
    const next = s.appliedSources!.map(r => {
      const availabilityItems = r.availabilityItems?.map(i => ({ ...i, destinations: i.destinations.filter(p => !removed.has(path.resolve(p))) })).filter(i => i.destinations.length);
      const availabilityAssets = r.availabilityAssets?.map(i => ({ ...i, destinations: i.destinations.filter(p => !removed.has(path.resolve(p))) })).filter(i => i.destinations.length);
      const keep = (n: string) => {
        if (r.availabilityItems?.some(i => i.skill === n)) return availabilityItems!.some(i => i.skill === n);
        if (r.availabilityAssets?.some(i => i.name === n)) return availabilityAssets!.some(i => i.name === n);
        return !r.targetDir || !removed.has(path.resolve(s.root, r.targetDir, n));
      };
      return { ...r, retiredTargets: r.retiredTargets?.filter(t => !removed.has(t.path)), skills: (r.skills || []).filter(keep), managedSkillNames: r.managedSkillNames?.filter(keep), availabilityItems,
        availabilityAssets,
        provisioningEvidence: r.provisioningEvidence ? { ...r.provisioningEvidence, targets: r.provisioningEvidence.targets.filter(t => !removed.has(path.resolve(t.path))) } : undefined };
    });
    try { await saveLocalProjectAppliedSources(s.root, next, { stateRoot: o.stateRoot }); }
    catch (e) { result.errors.push({ path: s.root, message: `Relationship update failed: ${(e as Error).message}` }); }
  }
  await atomic(path.join(o.stateRoot, "migrations", `${hash([o.consumerRoot, o.sourceId])}.json`), { ...result, planDigest: expectedPlanDigest, observedAt: new Date().toISOString() });
  return result;
}
