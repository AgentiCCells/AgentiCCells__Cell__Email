#!/usr/bin/env node
// Seal a vault key (and a note) to a person's browser key, signed by this agent, as a pki.sgit.ai QR text that the CRM
// site's "You" page opens. Run by the agent that holds the vault key; the key goes only inside the sealed message.
//   node crm/tools/seal-for.mjs --to <file with the person's key QR text or k1 code> --vault-key-file <file>
//        --sign-key <file: this agent's ECDSA P-256 signing key, PKCS8 DER> --from-bundle team/keys/<agent>.json
//        --for "<who it is for>" --vault-name "<name>" [--out <file>]
// Prints the QR text to stdout (it is sealed: safe to paste), never the vault key. Uses the Email Cell's vendored
// pki.sgit.ai library (v0.2.28, unedited). By crm.dev.a@AgentiCCells.dinis, 2026-11-24. Apache-2.0.
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const M = await import(pathToFileURL(join(ROOT, 'src/app/vendor/pki/v0.2.28/message.js')));
const args = process.argv.slice(2), opt = (k) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : undefined; };
const need = (k) => opt(k) || (console.error(`seal-for: --${k} is needed`), process.exit(2));
const toText = readFileSync(need('to'), 'utf8').trim();
const q = M.parseQrText(toText);
if (q.kind !== 'key') { console.error('seal-for: --to is not a public key code'); process.exit(1); }
const toBundle = await M.parseKeyCode(q.code);
if (!toBundle || toBundle.signing_fingerprint !== q.fp) { console.error('seal-for: the key code does not match its fingerprint'); process.exit(1); }
const key = readFileSync(need('vault-key-file'), 'utf8').trim();
const b = JSON.parse(readFileSync(need('from-bundle'), 'utf8'));
const from = { bundle: { v: b.v, encrypt: b.encrypt, sign: b.sign, label: b.label, fingerprint: b.fingerprint, signing_fingerprint: b.signing_fingerprint }, private: { sign: new Uint8Array(readFileSync(need('sign-key'))) } };
const at = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
const text = `For ${need('for')}: the vault "${need('vault-name')}". This browser key (${toBundle.signing_fingerprint}, "${toBundle.label}") is recognised as ${opt('for')}'s by ${b.agent || b.label}, ${at}.\n${key}\n`;
const msg = await M.compose({ to: toBundle, from, text, at, expires: new Date(Date.now() + 7 * 864e5).toISOString() });
const { code } = await M.sealMessage(msg, toBundle, from);
const out = M.qrSealed({ to: toBundle.signing_fingerprint, from: b.signing_fingerprint, code });
if (opt('out')) writeFileSync(opt('out'), out + '\n');
console.log(out);
