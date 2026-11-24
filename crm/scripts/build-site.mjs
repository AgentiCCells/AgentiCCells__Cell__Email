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
  cpSync(join(ROOT, 'src/app/vendor/jsqr'), join(out, 'vendor/jsqr'), { recursive: true });
  cpSync(join(ROOT, 'src/app/vendor/qrcode-generator'), join(out, 'vendor/qrcode-generator'), { recursive: true });
  // The senders whose sealed codes this site opens: the CRM agent's published key (team/keys/).
  const TRUSTED = ['crm-dev-a-agenticcells'].map((n) => { const b = JSON.parse(readFileSync(join(ROOT, `team/keys/${n}.json`), 'utf8')); return { label: b.agent || b.label, bundle: { v: b.v, encrypt: b.encrypt, sign: b.sign, label: b.label, fingerprint: b.fingerprint, signing_fingerprint: b.signing_fingerprint } }; });
  writeFileSync(join(out, 'trusted.js'), `// Built by crm/scripts/build-site.mjs from team/keys/: the senders whose sealed codes this site opens.\nexport const TRUSTED = ${JSON.stringify(TRUSTED, null, 2)};\n`);
  let version = 'dev';
  try { version = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(); } catch {}
  writeFileSync(join(out, 'pki.js'), readFileSync(join(ROOT, 'src/app/pki.js'), 'utf8').replaceAll('__VERSION__', version));
  writeFileSync(join(out, 'version.json'), JSON.stringify({ site: 'crm.tool.sovereignweb.site', commit: version, built: new Date().toISOString().slice(0, 19) + 'Z', from: 'AgentiCCells__Cell__Email work/crm.dev.a crm/' }, null, 2) + '\n');
  return out;
}
if (import.meta.url === `file://${process.argv[1]}`) console.log('built', buildSite(process.argv[2]));
