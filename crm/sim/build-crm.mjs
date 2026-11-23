// Add the CRM's synthetic records to a demo twin folder written by sim/build-demo-vault.mjs (mail.dev.a's
// generator), and write the whole twin as one JSON bundle for the site's demo mode.
// Use: node crm/sim/build-crm.mjs <demo-vault-folder> [bundle.json]
// Only crm/ is written into the folder. By crm.dev.a@AgentiCCells.dinis, 2026-11-23. Apache-2.0.
import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync, rmSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { crmFiles } from '../model/generate.mjs';
import { readVault, checkCrm } from '../model/crm.mjs';

const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });

export function buildCrm(root) {
  const read = () => Object.fromEntries(walk(root).filter((p) => /\.(json|md)$/.test(p)).map((p) => [relative(root, p), readFileSync(p, 'utf8')]));
  const before = readVault(read());
  if (!before.manifest?.synthetic) throw new Error('refusing: the folder is not a synthetic demo twin (manifest.synthetic is not true)');
  rmSync(join(root, 'crm'), { recursive: true, force: true });
  const out = crmFiles({ seed: before.manifest.seed, generatedAt: before.manifest.generated_at, orgs: before.orgs, people: before.people, threads: before.threads });
  for (const [p, o] of Object.entries(out)) { mkdirSync(dirname(join(root, p)), { recursive: true }); writeFileSync(join(root, p), JSON.stringify(o, null, 2) + '\n'); }
  const files = read();
  const errors = checkCrm(readVault(files));
  if (errors.length) throw new Error('crm checks failed:\n' + errors.join('\n'));
  return files;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [root, bundle] = process.argv.slice(2);
  if (!root) { console.error('use: node crm/sim/build-crm.mjs <demo-vault-folder> [bundle.json]'); process.exit(2); }
  const files = buildCrm(root);
  if (bundle) { mkdirSync(dirname(bundle), { recursive: true }); writeFileSync(bundle, JSON.stringify({ schema: 'crm.demo-bundle/1', synthetic: true, files }) + '\n'); }
  console.log(`crm/ written; ${Object.keys(files).length} files in the twin${bundle ? `; bundle ${bundle}` : ''}`);
}
