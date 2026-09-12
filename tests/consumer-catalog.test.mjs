import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,realpath,mkdir,writeFile,readFile,access,rm,cp,readdir} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {inspectProvisioningPlan,applyProvisioningPlan,removeManagedProvisioning,planProjectSkillMigration,applyProjectSkillMigration,listProvisioningRelations} from '../dist/provider/index.js';
import {applyAvailabilityFromSource,driftAppliedSources,runAppliedSources} from '../dist/core/sources.js';
import {runArcForgeCommand} from '../dist/commands/index.js';
import {loadUserSkillCatalog,saveUserSkillCatalog,listCatalogSkills} from '../dist/core/skill-catalog.js';
async function fixture(t){
 const root=await realpath(await mkdtemp(path.join(os.tmpdir(),'catalog-only-')));t.after(()=>rm(root,{recursive:true,force:true}));
 const sourceRoot=path.join(root,'source'),stateRoot=path.join(root,'state'),consumerRoot=path.join(root,'consumer'),homeDir=path.join(root,'home');
 await mkdir(consumerRoot);for(const [name,mode] of [['alpha','user-ambient'],['beta','user-on-demand']]){await mkdir(path.join(sourceRoot,'entry/skills',name),{recursive:true});await writeFile(path.join(sourceRoot,'entry/skills',name,'SKILL.md'),`---\nname: ${name}\ndescription: Fixture ${name}\n---\nOriginal body\n`);}
 await writeFile(path.join(sourceRoot,'arcforge.skill-project.json'),JSON.stringify({version:1,sourceDir:'.',availability:{defaultMode:'user-ambient',skills:[{path:'entry/skills/beta',mode:'user-on-demand'}]}}));
 const options={sourceRoot,stateRoot,consumerRoot,homeDir,agentTargetIds:['codex'],destinationPolicy:'catalog-only',sourceProvenance:{sourceIdentity:'fixture'},skills:['alpha','beta']};return {root,options};
}
async function install(options){const s=await inspectProvisioningPlan(options);assert.deepEqual(s.blocking,[]);await applyProvisioningPlan({...options,confirm:true,expectedPlanDigest:s.planDigest,cleanupPaths:[]});return inspectProvisioningPlan(options);}
test('read-only plan includes on-demand installs, then uses standard catalog and relationships',async t=>{
 const f=await fixture(t),before=await readdir(f.root,{recursive:true}),s=await inspectProvisioningPlan(f.options);assert.deepEqual(await readdir(f.root,{recursive:true}),before);assert.equal(s.needsApply,true);assert.deepEqual(s.items.map(i=>i.status),['install','install']);
 await assert.rejects(access(f.options.stateRoot));assert.equal(s.plan.loaderTargets.length,0);
 await assert.rejects(applyProvisioningPlan({...f.options,expectedPlanDigest:s.planDigest}),/confirm/);
 const ready=await install(f.options);assert.equal(ready.ready,true);assert.deepEqual(ready.items.map(i=>i.mode),['user-ambient','user-on-demand']);
 const catalog=await loadUserSkillCatalog({catalogRoot:ready.plan.catalogRoot});assert.equal(catalog.entries.length,2);assert.equal(ready.plan.catalogRoot,path.join(f.options.stateRoot,'catalog'));await assert.rejects(access(path.join(ready.plan.catalogRoot,'consumers')));
 assert.equal((await listProvisioningRelations(f.options)).length,1);assert.equal((await listCatalogSkills({catalogRoot:ready.plan.catalogRoot})).candidates.length,2);
 await assert.rejects(access(path.join(f.options.homeDir,'.codex/skills')));
});
test('update requires a new digest, uses stable paths and does not schedule cleanup',async t=>{
 const f=await fixture(t),before=await install(f.options),old=before.plan.items[0].destinations[0].path;
 await writeFile(path.join(f.options.sourceRoot,'entry/skills/alpha','new.md'),'new source');
 const update=await inspectProvisioningPlan(f.options);assert.equal(update.needsApply,true);assert.equal(update.items[0].status,'update');assert.deepEqual(update.plan.cleanup,[]);
 await assert.rejects(applyProvisioningPlan({...f.options,expectedPlanDigest:before.planDigest,confirm:true}),/changed/);await access(old);
 const after=await install(f.options);assert.equal(after.items[0].path,old);await access(path.join(old,'new.md'));await assert.rejects(access(path.join(after.plan.catalogRoot,'versions')));
});
test('changed installed content is a conflict and cannot be overwritten',async t=>{
 const f=await fixture(t),before=await install(f.options);await writeFile(path.join(before.items[0].path,'SKILL.md'),'user edit');
 const changed=await inspectProvisioningPlan(f.options);assert.equal(changed.ready,false);assert.ok(changed.blocking.some(d=>d.code==='CATALOG_CONTENT_DRIFT'));
 await assert.rejects(applyProvisioningPlan({...f.options,expectedPlanDigest:changed.planDigest,confirm:true}),/diagnostic/);
 assert.equal(await readFile(path.join(before.items[0].path,'SKILL.md'),'utf8'),'user edit');
});
test('cleanup is separately confirmed only after replacement installation',async t=>{
 const f=await fixture(t),planned=await inspectProvisioningPlan(f.options),project=path.join(f.root,'project'),target=path.join(project,'.codex/skills/alpha');
 await cp(path.join(f.options.sourceRoot,'entry/skills/alpha'),target,{recursive:true});
 const m={stateRoot:f.options.stateRoot,consumerRoot:f.options.consumerRoot,sourceId:'fixture',referenceRoot:f.options.sourceRoot,catalogRoot:planned.plan.catalogRoot,version:planned.plan.catalogVersion,projectRoots:[project],trustedSourceRoots:[f.options.sourceRoot],skillPaths:planned.plan.items.map(i=>i.sourcePath)};
 const pending=await planProjectSkillMigration(m);assert.equal(pending.removed.length,1);await access(target);
 await assert.rejects(applyProjectSkillMigration({...m,confirm:true,expectedPlanDigest:pending.planDigest}),/installation/);
 await install(f.options);await access(target);
 const fresh=await planProjectSkillMigration(m);await applyProjectSkillMigration({...m,confirm:true,expectedPlanDigest:fresh.planDigest});await assert.rejects(access(target));
});

test('standard applied drift and reapply keep the stable user catalog destination',async t=>{
 const f=await fixture(t),ready=await install(f.options),record=(await listProvisioningRelations(f.options))[0];
 const drift=await driftAppliedSources(f.options.consumerRoot,record.id,f.options.stateRoot);assert.ok(drift[0].items.every(i=>i.status==='same'));
 await runAppliedSources(f.options.consumerRoot,record.id,true,[],f.options.stateRoot);
 assert.equal((await inspectProvisioningPlan(f.options)).ready,true);
 await assert.rejects(access(path.join(f.options.homeDir,'.codex/skills')));
 assert.equal((await listProvisioningRelations(f.options))[0].availabilityContext.destinationPolicy,'catalog-only');
});

test('CLI resolves the same stable installation and detects changes in dist assets',async t=>{
 const f=await fixture(t);await mkdir(path.join(f.options.sourceRoot,'entry/skills/alpha/dist'));await writeFile(path.join(f.options.sourceRoot,'entry/skills/alpha/dist/tool.js'),'original');
 const ready=await install(f.options);
 const cli=await runArcForgeCommand(['catalog','resolve','--query','alpha','--state-root',f.options.stateRoot],{cwd:f.root});
 assert.equal(cli.value.resolved.installedPath,ready.items[0].path);
 await writeFile(path.join(ready.items[0].path,'dist/tool.js'),'local modification');
 const changed=await inspectProvisioningPlan(f.options);assert.equal(changed.ready,false);assert.ok(changed.blocking.length);
 await assert.rejects(runArcForgeCommand(['catalog','resolve','--query','alpha','--state-root',f.options.stateRoot],{cwd:f.root}),/package|digest/);
});
test('the standard apply transaction restores catalog and relation after an injected failure',async t=>{
 const f=await fixture(t),ready=await install(f.options),index=path.join(ready.plan.catalogRoot,'index.json'),before=await readFile(index,'utf8'),relations=await listProvisioningRelations(f.options);
 await writeFile(path.join(f.options.sourceRoot,'entry/skills/alpha','update.md'),'new');
 await assert.rejects(applyAvailabilityFromSource({root:f.options.consumerRoot,from:f.options.sourceRoot,stateRoot:f.options.stateRoot,homeDir:f.options.homeDir,agentTargetIds:['codex'],destinationPolicy:'catalog-only',sourceProvenance:f.options.sourceProvenance,confirm:true,save:true,allowUnrelatedRoot:true,faultInjector:point=>{if(point==='after-catalog')throw Error('injected failure');}}),/injected/);
 assert.equal(await readFile(index,'utf8'),before);assert.deepEqual(await listProvisioningRelations(f.options),relations);await access(ready.items[0].path);
});

test('explicit payload paths exclude duplicate historical copies in a development repository',async t=>{
 const f=await fixture(t);await cp(path.join(f.options.sourceRoot,'entry/skills/alpha'),path.join(f.options.sourceRoot,'archive/skills/alpha'),{recursive:true});
 const bounded={...f.options,declaredSkillPaths:['entry/skills/alpha','entry/skills/beta']};
 const plan=await inspectProvisioningPlan(bounded);assert.deepEqual(plan.blocking,[]);assert.equal(plan.items.length,2);
 await install(bounded);const record=(await listProvisioningRelations(bounded))[0];
 const drift=await driftAppliedSources(bounded.consumerRoot,record.id,bounded.stateRoot);assert.ok(drift[0].items.every(i=>i.status==='same'));
});

test('managed removal updates the shared user catalog',async t=>{
 const f=await fixture(t),ready=await install(f.options),target=ready.items.find(i=>i.skill==='beta').path;
 const request={stateRoot:f.options.stateRoot,consumerRoot:f.options.consumerRoot,sourceRoot:f.options.sourceRoot,managedPaths:[target]};
 const plan=await removeManagedProvisioning(request);await access(target);
 await removeManagedProvisioning({...request,confirmationDigest:plan.confirmationDigest,confirm:true});
 await assert.rejects(access(target));assert.deepEqual((await loadUserSkillCatalog({catalogRoot:ready.plan.catalogRoot})).entries.map(e=>e.skillName),['alpha']);
 await access(path.join(f.options.stateRoot,'catalog/index.json'));
});


test('two consumers share one index and installation while retaining distinct relation claims',async t=>{
 const f=await fixture(t),first=await install(f.options);
 const other={...f.options,consumerRoot:path.join(f.root,'other-consumer')};await mkdir(other.consumerRoot);
 const second=await install(other);
 assert.equal(second.plan.catalogRoot,first.plan.catalogRoot);assert.equal(second.items[0].path,first.items[0].path);
 const catalog=await loadUserSkillCatalog({catalogRoot:path.join(f.options.stateRoot,'catalog')});
 assert.equal(catalog.entries.length,2);assert.equal(catalog.entries[0].appliedRecordIds.length,2);
 const cli=await runArcForgeCommand(['catalog','list','--state-root',f.options.stateRoot],{cwd:f.root});assert.equal(cli.value.candidates.length,2);
 const target=first.items.find(i=>i.skill==='beta').path;
 const request={...f.options,managedPaths:[target]},removal=await removeManagedProvisioning(request);
 await removeManagedProvisioning({...request,confirm:true,confirmationDigest:removal.confirmationDigest});
 await access(target);assert.equal((await loadUserSkillCatalog({catalogRoot:first.plan.catalogRoot})).entries.length,2);
});

test('unified catalog reports conflicting sources instead of creating consumer namespaces',async t=>{
 const f=await fixture(t),first=await install(f.options),before=await readFile(path.join(first.plan.catalogRoot,'index.json'),'utf8');
 const otherSource=path.join(f.root,'other-source');await cp(f.options.sourceRoot,otherSource,{recursive:true});
 await writeFile(path.join(otherSource,'entry/skills/alpha','SKILL.md'),'---\nname: alpha\ndescription: Different source\n---\nConflicting body\n');
 const options={...f.options,sourceRoot:otherSource,sourceProvenance:{sourceIdentity:'other-source'}};
 const plan=await inspectProvisioningPlan(options);assert.ok(plan.blocking.some(d=>d.code==='CATALOG_VERSION_CONFLICT'));
 assert.equal(await readFile(path.join(first.plan.catalogRoot,'index.json'),'utf8'),before);
});


test('old version directories are retained through installation and cleaned only by separate confirmed evidence',async t=>{
 const f=await fixture(t),ready=await install(f.options),catalogRoot=ready.plan.catalogRoot;
 const {saveLocalProjectAppliedSources}=await import('../dist/core/project-store.js');
 const old=path.join(catalogRoot,'versions','a'.repeat(64),'entry/skills/alpha');
 await cp(ready.items[0].path,old,{recursive:true});
 const records=await listProvisioningRelations(f.options),record=records[0];
 const original=record.provisioningEvidence.targets.find(t=>t.name==='alpha');
 record.provisioningEvidence.targets=record.provisioningEvidence.targets.map(t=>t.name==='alpha'?{...t,path:old}:t);
 record.availabilityItems=record.availabilityItems.map(i=>i.skill==='alpha'?{...i,destinations:[old]}:i);
 record.catalogVersions=[{root:path.join(catalogRoot,'versions','a'.repeat(64)),version:'a'.repeat(64)}];
 await saveLocalProjectAppliedSources(f.options.consumerRoot,records,{stateRoot:f.options.stateRoot});
 const previous=await loadUserSkillCatalog({catalogRoot});const entry=previous.entries.find(e=>e.skillName==='alpha');entry.catalogVersion='a'.repeat(64);entry.installedPath=old;
 await saveUserSkillCatalog(previous.entries,{catalogRoot});await rm(ready.items[0].path,{recursive:true});
 const request={stateRoot:f.options.stateRoot,consumerRoot:f.options.consumerRoot,sourceId:'fixture',referenceRoot:f.options.sourceRoot,catalogRoot,projectRoots:[],trustedSourceRoots:[f.options.sourceRoot],skillPaths:ready.plan.items.map(i=>i.sourcePath)};
 await install(f.options);await access(old);assert.ok((await listProvisioningRelations(f.options))[0].retiredTargets.some(t=>t.path===old));
 const plan=await planProjectSkillMigration(request);assert.deepEqual(plan.removed.map(i=>i.path),[old]);await access(old);
 await writeFile(path.join(old,'local.md'),'changed after review');
 await assert.rejects(applyProjectSkillMigration({...request,confirm:true,expectedPlanDigest:plan.planDigest}),/changed/);await access(old);
 await rm(path.join(old,'local.md'));const fresh=await planProjectSkillMigration(request);
 await applyProjectSkillMigration({...request,confirm:true,expectedPlanDigest:fresh.planDigest});await assert.rejects(access(old));await access(ready.items[0].path);
});
