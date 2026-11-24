// Signed batches (a proposal; demo only until Dinis approves ABP line C9). Pure functions, no page access.
// Dinis, 24 Nov 2026 (relayed by a.maestro): "I should be able to sign them off ... once I'm happy with
// it, we can just send the emails from there ... maybe even in batches ... PDFs, screenshots, images".
// An outbox entry carries signoff.json: an ECDSA P-256 (SHA-256) signature, by a key the person pinned
// in this page, over the entry's exact content (canonical bytes below, attachments by SHA-256). The page
// sends only entries it can verify, one confirmation per batch, within the daily limit, stopping at the
// first error. Plan: team/mail.conductor.a/notes/2026-11-24-signed-batch-send-plan.md.
// By mail.dev.a@AgentiCCells.dinis, 2026-11-24. Apache-2.0.
import { messageOf, problems, MAX_PER_DAY } from './send.js?v=__VERSION__';

export const MAX_ATTACH_BYTES = 10 * 1024 * 1024; // per email, all attachments together
export const ATTACH_TYPES = { 'application/pdf': [0x25, 0x50, 0x44, 0x46], 'image/png': [0x89, 0x50, 0x4e, 0x47], 'image/jpeg': [0xff, 0xd8, 0xff] };
const SIGN = { name: 'ECDSA', hash: 'SHA-256' };
const KEY = { name: 'ECDSA', namedCurve: 'P-256' };
const subtle = globalThis.crypto.subtle;
const enc = new TextEncoder();
const hex = (buf) => Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
export const b64 = (bytes) => { let s = ''; for (const b of new Uint8Array(bytes)) s += String.fromCharCode(b); return btoa(s); };
export const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

// sgit's fingerprint: the first 16 hex characters of SHA-256 over the key's SPKI DER.
export async function fingerprint(spki) { return 'sha256:' + hex(await subtle.digest('SHA-256', spki)).slice(0, 16); }
export const pemToSpki = (pem) => unb64(String(pem).replace(/-----[^-]+-----|\s/g, ''));

// The attachment checks: a known type whose first bytes match it, and a total size within the limit.
export function attachmentProblems(atts = []) {
  const out = [];
  let total = 0;
  for (const a of atts) {
    total += a.bytes.length;
    const magic = ATTACH_TYPES[a.mime];
    if (!magic) out.push(`${a.filename}: only PDF, PNG and JPEG may be attached`);
    else if (!magic.every((b, i) => a.bytes[i] === b)) out.push(`${a.filename}: its content is not a ${a.mime} file`);
    if (!/^[^\\/\r\n"]{1,120}$/.test(a.filename || '')) out.push('an attachment has a bad file name');
  }
  if (total > MAX_ATTACH_BYTES) out.push(`attachments come to ${(total / 1048576).toFixed(1)} MB; at most 10 MB`);
  return out;
}

// The exact content that is signed: recipients, subject, text and each attachment by name, type, size and
// SHA-256, as canonical JSON (fixed key order). Any changed byte changes the signature's input.
export async function signedBytes(m, atts = []) {
  const files = [];
  for (const a of atts) files.push({ filename: a.filename, mime: a.mime, size: a.bytes.length, sha256: hex(await subtle.digest('SHA-256', a.bytes)) });
  return enc.encode(JSON.stringify({ v: 1, to: m.to, cc: m.cc, subject: m.subject, text: m.text, in_reply_to: m.inReplyTo || '', attachments: files }));
}

export async function signEntry(privateKey, publicSpki, m, atts = [], at = new Date()) {
  const sig = await subtle.sign(SIGN, privateKey, await signedBytes(m, atts));
  return { v: 1, alg: 'ECDSA-P256-SHA256', signer: await fingerprint(publicSpki), sig: b64(sig), signed_at: at.toISOString().slice(0, 19) + 'Z' };
}

// pinned: [{ fingerprint, spki (Uint8Array), name }]. Returns { ok, signer, reason }.
export async function verifyEntry(signoff, m, atts, pinned) {
  if (!signoff) return { ok: false, reason: 'not signed' };
  if (signoff.alg !== 'ECDSA-P256-SHA256') return { ok: false, reason: `unknown signature type ${signoff.alg}` };
  const pin = pinned.find((p) => p.fingerprint === signoff.signer);
  if (!pin) return { ok: false, reason: `signed by ${signoff.signer}, a key not pinned in this page` };
  if ((await fingerprint(pin.spki)) !== pin.fingerprint) return { ok: false, reason: 'the pinned key does not match its fingerprint' };
  const key = await subtle.importKey('spki', pin.spki, KEY, false, ['verify']);
  let good = false;
  try { good = await subtle.verify(SIGN, key, unb64(signoff.sig), await signedBytes(m, atts)); } catch { good = false; }
  return good ? { ok: true, signer: pin.name || pin.fingerprint } : { ok: false, reason: 'the signature does not match this exact email (changed after signing?)' };
}

// The batch: every entry with its verdict, and which ones the next press would send. Entries already
// done are skipped; the rest are checked; at most the day's remaining allowance is taken, in order.
export async function planBatch(entries, { pinned = [], sentToday = 0 } = {}) {
  const rows = [];
  let room = Math.max(0, MAX_PER_DAY - sentToday);
  for (const e of entries) {
    const m = messageOf(e.meta, e.text);
    const why = problems(m, { sentToday: 0 }).concat(attachmentProblems(e.attachments));
    const v = await verifyEntry(e.signoff, m, e.attachments || [], pinned);
    if (!v.ok) why.push(v.reason);
    let send = why.length === 0 && room > 0;
    if (why.length === 0 && room === 0) why.push(`the daily limit of ${MAX_PER_DAY} is reached; it waits for tomorrow`);
    if (send) room--;
    rows.push({ id: e.id, m, signer: v.signer || '', send, why });
  }
  return { rows, toSend: rows.filter((r) => r.send).length };
}

// The RFC 5322 message with attachments (multipart/mixed), as Gmail's messages.send takes it.
export function rawWithAttachments(m, atts = [], boundary = 'cell-' + Math.random().toString(36).slice(2)) {
  const word = (s) => (/^[\x20-\x7e]*$/.test(s) ? s : `=?UTF-8?B?${b64(enc.encode(s))}?=`);
  const wrap = (s) => s.replace(/.{76}/g, '$&\r\n');
  const head = [`To: ${m.to.join(', ')}`, ...(m.cc.length ? [`Cc: ${m.cc.join(', ')}`] : []), `Subject: ${word(m.subject)}`,
    ...(m.inReplyTo ? [`In-Reply-To: ${m.inReplyTo}`, `References: ${m.inReplyTo}`] : []), 'MIME-Version: 1.0'];
  const textPart = ['Content-Type: text/plain; charset="UTF-8"', 'Content-Transfer-Encoding: base64', '', wrap(b64(enc.encode(m.text.replace(/\r?\n/g, '\r\n'))))].join('\r\n');
  let raw;
  if (!atts.length) raw = [...head, textPart].join('\r\n');
  else {
    const parts = [textPart, ...atts.map((a) => [`Content-Type: ${a.mime}; name="${a.filename}"`, `Content-Disposition: attachment; filename="${a.filename}"`, 'Content-Transfer-Encoding: base64', '', wrap(b64(a.bytes))].join('\r\n'))];
    raw = [...head, `Content-Type: multipart/mixed; boundary="${boundary}"`, '', ...parts.map((p) => `--${boundary}\r\n${p}`), `--${boundary}--`, ''].join('\r\n');
  }
  return b64(enc.encode(raw)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
