import { promises as fs } from 'node:fs';
import { queryCatalog } from './index.js';

// Read-only transport for hosts resuming threads which cannot add dynamic tools.
const args = process.argv.slice(2);
const arg = (key: string) => args[args.indexOf(key) + 1];
try {
  if (!args.includes('--scope-file')) throw Error('An explicit catalog scope is required.');
  const scope = JSON.parse(await fs.readFile(arg('--scope-file'), 'utf8'));
  if (scope.schema !== 'arcforge-catalog-scope/v1' || typeof scope.stateRoot !== 'string' || !Array.isArray(scope.skills) || scope.skills.some((s: any) => typeof s.qualifiedName !== 'string' || typeof s.catalogDigest !== 'string')) throw Error('Invalid catalog scope.');
  const action = arg('--action');
  if (!['list','resolve'].includes(action)) throw Error('Only list and resolve are supported.');
  const result = await queryCatalog({stateRoot: scope.stateRoot, allowedSkills: scope.skills.map((s: any) => s.qualifiedName), action: action as 'list' | 'resolve', query: args.includes('--query') ? arg('--query') : undefined});
  if (result.status === 'resolved' && 'resolved' in result && result.resolved) {
    const entry = result.resolved;
    const expected = scope.skills.find((s: any) => s.qualifiedName === entry.qualifiedName);
    if (!expected || expected.catalogDigest !== entry.contentDigest || (expected.packageDigest && expected.packageDigest !== entry.packageDigest)) throw Error('Catalog changed after scene binding; refresh the scene.');
  }
  process.stdout.write(JSON.stringify(result) + '\n');
} catch (error) { process.stderr.write((error as Error).message + '\n'); process.exitCode = 1; }
