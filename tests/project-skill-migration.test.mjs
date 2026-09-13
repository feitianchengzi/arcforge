import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, realpath, mkdir, writeFile, readFile, cp, access, symlink, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { inspectProvisioningPlan, applyProvisioningPlan, planProjectSkillMigration, applyProjectSkillMigration } from '../dist/provider/index.js';
import { catalogDirectoryDigest } from '../dist/core/skill-catalog.js';
import { saveLocalProjectAppliedSources as saveActual, loadLocalProjectState } from '../dist/core/project-store.js';

async function saveLocalProjectAppliedSources(root, records, options) {
 const current=await loadLocalProjectState(root,options);
 return saveActual(root,[...(current?.appliedSources||[]).filter(r=>r.catalogVersions?.length),...records],options);
}

async function fixture(t) {
 const root=await realpath(await mkdtemp(path.join(os.tmpdir(),'arcforge-catalog-')));
 t.after(()=>rm(root,{recursive:true,force:true}));
 const sourceRoot=path.join(root,'source'),consumerRoot=path.join(root,'consumer'),stateRoot=path.join(root,'state'),catalogRoot=path.join(root,'catalog'),project=path.join(root,'project');
 const relative='entry/skills/sample';await mkdir(path.join(sourceRoot,relative),{recursive:true});await mkdir(consumerRoot);await mkdir(project);
 await writeFile(path.join(sourceRoot,relative,'SKILL.md'),'---\nname: sample\ndescription: Same metadata\n---\nOriginal body\n');
 await writeFile(path.join(sourceRoot,'arcforge.skill-project.json'),JSON.stringify({version:1,sourceDir:'.',availability:{defaultMode:'user-ambient',skills:[]}}));
 const options={sourceRoot,consumerRoot,stateRoot,homeDir:path.join(root,'home'),sourceProvenance:{sourceIdentity:'sample-source'},agentTargetIds:['codex'],destinationPolicy:'catalog-only',skills:['sample']};
 const planned=await inspectProvisioningPlan(options);const installed=await applyProvisioningPlan({...options,expectedPlanDigest:planned.planDigest,confirm:true});
 const catalog={root:planned.plan.catalogRoot};
 const migration={consumerRoot,stateRoot,catalogRoot:planned.plan.catalogRoot,sourceId:'sample-source',version:catalog.version,referenceRoot:sourceRoot,projectRoots:[project],trustedSourceRoots:[sourceRoot],skillPaths:[relative]};
 const target=path.join(project,'.codex/skills/sample');
 await cp(path.join(sourceRoot,relative),target,{recursive:true});
 return {root,options,migration,target,project,catalog,sourceRoot,consumerRoot,stateRoot,relative,installedRecord:installed.record};
}
async function apply(o) {const plan=await planProjectSkillMigration(o);return applyProjectSkillMigration({...o,expectedPlanDigest:plan.planDigest,confirm:true});}


test('exact content migrates without backup; changed body with identical metadata is retained',async t=>{
 const f=await fixture(t);
 await writeFile(path.join(f.target,'SKILL.md'),'---\nname: sample\ndescription: Same metadata\n---\nUser body\n');
 assert.equal((await apply(f.migration)).removed.length,0);
 await cp(path.join(f.sourceRoot,f.relative),f.target,{recursive:true});
 assert.equal((await apply(f.migration)).removed.length,1);
 await assert.rejects(access(f.target));assert.equal((await apply(f.migration)).removed.length,0);
});
test('changed plans and linked directories are never removed',async t=>{
 const f=await fixture(t),plan=await planProjectSkillMigration(f.migration);
 await writeFile(path.join(f.target,'new.md'),'local change');
 await assert.rejects(applyProjectSkillMigration({...f.migration,expectedPlanDigest:plan.planDigest,confirm:true}),/changed/);
 await rm(f.target,{recursive:true});await symlink(path.join(f.sourceRoot,f.relative),f.target);
 assert.equal((await apply(f.migration)).removed.length,0);await access(path.join(f.sourceRoot,f.relative));
});
test('managed retired skill baseline is removed and its installation relation is updated',async t=>{
 const f=await fixture(t),retired=path.join(f.project,'.codex/skills/retired');
 await mkdir(retired);await writeFile(path.join(retired,'SKILL.md'),'old body');
 const record={id:'old',sourceRoot:f.sourceRoot,profile:'default',targetDir:path.relative(f.consumerRoot,path.dirname(retired)),skills:['retired'],managedSkillNames:['retired'],updatedAt:new Date().toISOString(),provisioningEvidence:{providerCapabilities:[],targets:[{name:'retired',kind:'skill',path:retired,contentDigest:await catalogDirectoryDigest(retired)}]}};
 await saveLocalProjectAppliedSources(f.consumerRoot,[f.installedRecord,record],{stateRoot:f.stateRoot});
 const result=await apply(f.migration);assert.equal(result.removed.length,2);assert.deepEqual(result.errors,[]);
 const state=await loadLocalProjectState(f.consumerRoot,{stateRoot:f.stateRoot});assert.deepEqual(state.appliedSources.find(r=>r.id==='old').provisioningEvidence.targets,[]);assert.deepEqual(state.appliedSources.find(r=>r.id==='old').managedSkillNames,[]);
});
test('competing ownership and malformed evidence fail closed',async t=>{
 const f=await fixture(t),record={id:'other',sourceRoot:path.join(f.root,'other'),profile:'default',targetDir:path.relative(f.consumerRoot,path.dirname(f.target)),skills:['sample'],updatedAt:new Date().toISOString()};
 await saveLocalProjectAppliedSources(f.consumerRoot,[f.installedRecord,record],{stateRoot:f.stateRoot});
 assert.equal((await apply(f.migration)).removed.length,0);await access(f.target);
 await writeFile(path.join(f.stateRoot,'projects','broken.json'),'{');
 await assert.rejects(planProjectSkillMigration(f.migration));await access(f.target);
});

test('retry repairs already missing managed destinations without deleting unrelated paths',async t=>{
 const f=await fixture(t),record={id:'old',sourceRoot:f.sourceRoot,profile:'default',targetDir:path.relative(f.consumerRoot,path.dirname(f.target)),skills:['sample'],managedSkillNames:['sample'],updatedAt:new Date().toISOString()};
 await saveLocalProjectAppliedSources(f.consumerRoot,[f.installedRecord,record],{stateRoot:f.stateRoot});
 await rm(f.target,{recursive:true});
 const result=await apply(f.migration);assert.deepEqual(result.errors,[]);assert.equal(result.removed.length,0);
 assert.deepEqual((await loadLocalProjectState(f.consumerRoot,{stateRoot:f.stateRoot})).appliedSources.find(r=>r.id==='old').skills,[]);
});
test('linked project skill root preserves the external directory',async t=>{
 const f=await fixture(t);
 await saveLocalProjectAppliedSources(f.consumerRoot,[f.installedRecord,{id:'linked-old',sourceRoot:f.sourceRoot,profile:'default',targetDir:path.relative(f.consumerRoot,path.dirname(f.target)),skills:['sample'],updatedAt:new Date().toISOString()}],{stateRoot:f.stateRoot});
 await rm(path.join(f.project,'.codex'),{recursive:true});
 await mkdir(path.join(f.root,'external/skills'),{recursive:true});await symlink(path.join(f.root,'external'),path.join(f.project,'.codex'));
 const result=await apply(f.migration);assert.equal(result.removed.length,0);assert.equal(result.preserved[0].reason,'linked directory');await access(path.join(f.root,'external/skills'));
});


test('relation cleanup retains another destination of the same skill',async t=>{
 const f=await fixture(t),other=path.join(f.root,'user/sample');await cp(f.target,other,{recursive:true});
 const record={id:'multi',sourceRoot:f.sourceRoot,profile:'default',targetDir:'.codex/skills',skills:['sample'],managedSkillNames:['sample'],availabilityItems:[{skill:'sample',mode:'project-ambient',policyOrigin:'compatibility',destinations:[f.target,other]}],updatedAt:new Date().toISOString()};
 await saveLocalProjectAppliedSources(f.consumerRoot,[f.installedRecord,record],{stateRoot:f.stateRoot});
 assert.equal((await apply(f.migration)).removed.length,1);await access(other);
 const retained=(await loadLocalProjectState(f.consumerRoot,{stateRoot:f.stateRoot})).appliedSources.find(r=>r.id==='multi');
 assert.deepEqual(retained.skills,['sample']);assert.deepEqual(retained.availabilityItems[0].destinations,[other]);
});

async function retire(t, {upgrade = true} = {}) {
 const f = await fixture(t);
 const old = path.join(f.catalog.root,'sample');
 await rm(path.join(f.sourceRoot,f.relative),{recursive:true});
 const relative='entry/skills/replacement';
 await mkdir(path.join(f.sourceRoot,relative),{recursive:true});
 await writeFile(path.join(f.sourceRoot,relative,'SKILL.md'),'---\nname: replacement\ndescription: Replacement\n---\nNew body\n');
 f.options.skills=['replacement'];f.migration.skillPaths=[relative];f.migration.projectRoots=[];
 if(upgrade){const plan=await inspectProvisioningPlan(f.options);await applyProvisioningPlan({...f.options,expectedPlanDigest:plan.planDigest,confirm:true});}
 return {...f,old};
}
test('stable catalog retirement is detected before upgrade and survives installation until separate confirmation',async t=>{
 const f=await retire(t,{upgrade:false});
 assert.deepEqual((await planProjectSkillMigration(f.migration)).removed.map(x=>x.path),[f.old]);
 const installation=await inspectProvisioningPlan(f.options);
 await applyProvisioningPlan({...f.options,expectedPlanDigest:installation.planDigest,confirm:true});
 await access(f.old);
 const record=(await loadLocalProjectState(f.consumerRoot,{stateRoot:f.stateRoot})).appliedSources[0];
 assert.ok(record.retiredTargets.some(x=>x.path===f.old));
 const result=await apply(f.migration);assert.deepEqual(result.errors,[]);assert.deepEqual(result.removed.map(x=>x.path),[f.old]);
 await assert.rejects(access(f.old));
 const index=JSON.parse(await readFile(path.join(f.catalog.root,'index.json'),'utf8'));
 assert.ok(!index.entries.some(x=>x.skillName==='sample'));
 const after=(await loadLocalProjectState(f.consumerRoot,{stateRoot:f.stateRoot})).appliedSources[0];
 assert.ok(!after.managedSkillNames.includes('sample'));assert.equal(after.retiredTargets.length,0);
 assert.equal((await apply(f.migration)).removed.length,0);
});
test('stable retirement preserves local modifications and invalidates consent on catalog claim changes',async t=>{
 const f=await retire(t),plan=await planProjectSkillMigration(f.migration);
 const file=path.join(f.catalog.root,'index.json'),index=JSON.parse(await readFile(file,'utf8'));
 index.entries.find(x=>x.skillName==='sample').appliedRecordIds.push('another-consumer');
 await writeFile(file,JSON.stringify(index));
 await assert.rejects(applyProjectSkillMigration({...f.migration,expectedPlanDigest:plan.planDigest,confirm:true}),/changed/);
 assert.equal((await planProjectSkillMigration(f.migration)).removed.length,0);
 index.entries.find(x=>x.skillName==='sample').appliedRecordIds.pop();await writeFile(file,JSON.stringify(index));
 await writeFile(path.join(f.old,'local.txt'),'user edit');
 const changed=await planProjectSkillMigration(f.migration);assert.equal(changed.removed.length,0);assert.match(changed.preserved[0].reason,/modified/);
});
test('stable retirement repairs missing package metadata and protects packages excluded only by selection',async t=>{
 const f=await retire(t);await rm(f.old,{recursive:true});
 assert.equal((await planProjectSkillMigration(f.migration)).removed[0].missing,true);
 assert.deepEqual((await apply(f.migration)).errors,[]);
 const g=await fixture(t);g.migration.skillPaths=[];g.migration.projectRoots=[];
 assert.equal((await planProjectSkillMigration(g.migration)).removed.length,0);
});
test('retry repairs relationship after package and catalog entry were already removed',async t=>{
 const f=await retire(t);await rm(f.old,{recursive:true});
 const file=path.join(f.catalog.root,'index.json'),index=JSON.parse(await readFile(file,'utf8'));
 index.entries=index.entries.filter(e=>e.skillName!=='sample');await writeFile(file,JSON.stringify(index));
 const plan=await planProjectSkillMigration(f.migration);assert.equal(plan.removed[0].missing,true);
 assert.deepEqual((await apply(f.migration)).errors,[]);
 const record=(await loadLocalProjectState(f.consumerRoot,{stateRoot:f.stateRoot})).appliedSources[0];
 assert.equal(record.retiredTargets.length,0);assert.ok(!record.managedSkillNames.includes('sample'));
});
test('stable retirement protects another consumer, missing full evidence, and linked packages',async t=>{
 const f=await retire(t);
 const other=path.join(f.root,'other-consumer');await mkdir(other);
 const foreign={...f.installedRecord,id:'other-consumer'};
 await saveActual(other,[foreign],{stateRoot:f.stateRoot});
 assert.equal((await planProjectSkillMigration(f.migration)).removed.length,0);
 await saveActual(other,[],{stateRoot:f.stateRoot});
 const state=await loadLocalProjectState(f.consumerRoot,{stateRoot:f.stateRoot});
 const baseline=state.appliedSources[0].retiredTargets[0].packageDigest;
 delete state.appliedSources[0].retiredTargets[0].packageDigest;
 await saveActual(f.consumerRoot,state.appliedSources,{stateRoot:f.stateRoot});
 assert.equal((await planProjectSkillMigration(f.migration)).removed.length,0);
 state.appliedSources[0].retiredTargets[0].packageDigest=baseline;
 await saveActual(f.consumerRoot,state.appliedSources,{stateRoot:f.stateRoot});
 const external=path.join(f.root,'external');await cp(f.old,external,{recursive:true});await rm(f.old,{recursive:true});await symlink(external,f.old);
 assert.equal((await planProjectSkillMigration(f.migration)).removed.length,0);await access(external);
});
