// Build the CRM tool site into crm/_build/site (ignored by git): its own pages (crm/site), the model
// (crm/model/crm.mjs), and, unedited, the Email Cell's page key code (src/app/pki.js) and pinned
// vendor libraries (src/app/vendor/sg-vault, src/app/vendor/pki), so the CRM reuses them instead
// of keeping copies. Use: node crm/scripts/build-site.mjs [out]. Serve the output folder as is.
// By crm.dev.a@AgentiCCells.dinis, 2026-11-23. Apache-2.0.
import { cpSync, rmSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export function buildSite(out = join(ROOT, 'crm/_build/site')) {
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  cpSync(join(ROOT, 'crm/site'), out, { recursive: true });
  cpSync(join(ROOT, 'crm/model/crm.mjs'), join(out, 'crm.mjs'));
  cpSync(join(ROOT, 'src/app/vendor/sg-vault'), join(out, 'vendor/sg-vault'), { recursive: true });
  cpSync(join(ROOT, 'src/app/vendor/pki'), join(out, 'vendor/pki'), { recursive: true });
  let version = 'dev';
  try { version = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(); } catch {}
  writeFileSync(join(out, 'pki.js'), readFileSync(join(ROOT, 'src/app/pki.js'), 'utf8').replaceAll('__VERSION__', version));
  writeFileSync(join(out, 'version.json'), JSON.stringify({ site: 'crm.tool.sovereignweb.site', commit: version, built: new Date().toISOString().slice(0, 19) + 'Z', from: 'AgentiCCells__Cell__Email work/crm.dev.a crm/' }, null, 2) + '\n');
  return out;
}
if (import.meta.url === `file://${process.argv[1]}`) console.log('built', buildSite(process.argv[2]));
