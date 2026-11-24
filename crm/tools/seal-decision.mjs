// Seal a decision request (the decisions template's JSON) to one person's browser key, signed by this agent, and add it
// to that person's "For you" list on the CRM site: site/app/for/<fp as sha256-hex>/index.json. Only that browser opens it.
// Dinis Cruz, 24 Nov 2026 (via a.maestro): "you can actually put questions in there for me ... as simple as pick ABC".
//   node crm/tools/seal-decision.mjs --to <file with the person's key QR text> --decision <request.json>
//        --sign-key <file: this agent's ECDSA P-256 signing key, PKCS8 DER> --from-bundle team/keys/<agent>.json
//        --site <Site__Tool__CRM checkout>
// Prints only the decision id and where it was written. By crm.dev.a@AgentiCCells.dinis, 2026-11-24. Apache-2.0.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const M = await import(pathToFileURL(join(ROOT, 'src/app/vendor/pki/v0.2.28/message.js')));
const opt = (k) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : null; };
const need = (k) => opt(k) || (console.error(`seal-decision: --${k} is needed`), process.exit(2));
const q = M.parseQrText(readFileSync(need('to'), 'utf8').trim());
if (q.kind !== 'key') { console.error('seal-decision: --to is not a public key code'); process.exit(1); }
const toBundle = await M.parseKeyCode(q.code);
if (!toBundle || toBundle.signing_fingerprint !== q.fp) { console.error('seal-decision: the key code does not match its fingerprint'); process.exit(1); }
const d = JSON.parse(readFileSync(need('decision'), 'utf8'));
if (d.v !== 1 || !/^[A-Za-z0-9._-]{1,120}$/.test(d.id || '') || !d.title || !Array.isArray(d.options)) { console.error('seal-decision: not a decision request (v, id, title, options)'); process.exit(1); }
const b = JSON.parse(readFileSync(need('from-bundle'), 'utf8'));
const from = { bundle: { v: b.v, encrypt: b.encrypt, sign: b.sign, label: b.label, fingerprint: b.fingerprint, signing_fingerprint: b.signing_fingerprint }, private: { sign: new Uint8Array(readFileSync(need('sign-key'))) } };
const at = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
const until = d.needed_by && Date.parse(d.needed_by) ? new Date(Date.parse(d.needed_by) + 14 * 864e5).toISOString() : new Date(Date.now() + 30 * 864e5).toISOString();
const text = JSON.stringify({ kind: 'crm.decision/1', decision: d });
const msg = await M.compose({ to: toBundle, from, text, at, expires: until });
const { code } = await M.sealMessage(msg, toBundle, from);
const sealed = M.qrSealed({ to: toBundle.signing_fingerprint, from: b.signing_fingerprint, code });
const dir = join(need('site'), 'site', 'app', 'for', toBundle.signing_fingerprint.replace(':', '-'));
mkdirSync(dir, { recursive: true });
const idx = join(dir, 'index.json');
const list = existsSync(idx) ? JSON.parse(readFileSync(idx, 'utf8')) : { schema: 'crm.for-you/1', about: 'Decision requests sealed to one browser key; only that browser opens them. Answers come back signed, through the Requests lane.', items: [] };
list.items = list.items.filter((x) => x.id !== d.id).concat([{ id: d.id, sealed_at: at, needed_by: d.needed_by || null, sealed }]);
writeFileSync(idx, JSON.stringify(list, null, 2) + '\n');
console.log(`sealed ${d.id} to ${toBundle.signing_fingerprint}; written to ${idx}`);
