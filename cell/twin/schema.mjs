// The twin: the mailbox as files in a vault. Schema checks and a loader.
// Status: built and tested on the simulated mailbox in sim/mailbox/; no real mailbox
// has been synced (that needs the Google OAuth app and the sgit vault, see docs/plan/needs.md).
//
// Layout (all paths relative to the twin root):
//   mailbox.json                              twin.mailbox/1   the mailbox and the sync cursor
//   labels.json                               twin.labels/1    label definitions
//   raw/messages/<yyyy>/<mm>/<id>.json        twin.message/1   one file per message, as received
//   clean/messages/<yyyy>/<mm>/<id>.json      twin.clean/1     the inbound firewall's cleaned copy
//   threads/<thread-id>.json                  twin.thread/1    one file per thread
//   attachments/<attachment-id>.json          twin.attachment/1  metadata; the bytes sit beside it
//   attachments/<attachment-id>.bin
//   index/correspondents.json                 twin.correspondents/1  derived, rebuildable
// Agents get the read key for clean/ only; raw/ is for the gateway, the firewall and people.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { createHash } from 'node:crypto';

const ID = /^[a-z]-[a-z0-9-]{1,64}$/;
const ADDR = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/;
const LANG = /^[a-z]{2}$/;
const iso = (s) => typeof s === 'string' && !Number.isNaN(Date.parse(s)) && /Z$/.test(s);

export const messagePath = (m) => {
  const d = new Date(m.date);
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${d.getUTCFullYear()}/${mm}/${m.id}.json`;
};

function party(p, where, errors) {
  if (!p || typeof p !== 'object') { errors.push(`${where}: not a party`); return; }
  if (!ADDR.test(p.address || '')) errors.push(`${where}: bad address`);
  if (p.name !== undefined && typeof p.name !== 'string') errors.push(`${where}: name must be a string`);
}

export function checkMessage(m) {
  const e = [];
  const w = `message ${m?.id}`;
  if (m?.schema !== 'twin.message/1') e.push(`${w}: schema is not twin.message/1`);
  if (!ID.test(m?.id || '') || !m.id.startsWith('m-')) e.push(`${w}: id must look like m-...`);
  if (!ID.test(m?.thread || '') || !m.thread.startsWith('t-')) e.push(`${w}: thread must look like t-...`);
  if (!['inbound', 'outbound'].includes(m?.direction)) e.push(`${w}: direction must be inbound or outbound`);
  party(m?.from, `${w}.from`, e);
  for (const k of ['to', 'cc', 'bcc', 'reply_to']) {
    if (!Array.isArray(m?.[k])) { e.push(`${w}.${k}: must be a list`); continue; }
    m[k].forEach((p, i) => party(p, `${w}.${k}[${i}]`, e));
  }
  if (!m?.to?.length && !m?.cc?.length && !m?.bcc?.length) e.push(`${w}: no recipients`);
  if (typeof m?.subject !== 'string') e.push(`${w}: subject must be a string`);
  if (!iso(m?.date)) e.push(`${w}: date must be ISO 8601 UTC`);
  if (!m?.source || typeof m.source.system !== 'string') e.push(`${w}: source.system missing`);
  if (!m?.headers || typeof m.headers.message_id !== 'string') e.push(`${w}: headers.message_id missing`);
  if (m?.headers && m.headers.in_reply_to !== null && typeof m.headers.in_reply_to !== 'string') e.push(`${w}: headers.in_reply_to must be a string or null`);
  if (!Array.isArray(m?.headers?.references)) e.push(`${w}: headers.references must be a list`);
  if (!Array.isArray(m?.labels) || m.labels.some((l) => typeof l !== 'string')) e.push(`${w}: labels must be a list of label ids`);
  if (m?.language !== null && !LANG.test(m?.language || '')) e.push(`${w}: language must be a two-letter code or null`);
  if (!m?.body || typeof m.body.text !== 'string') e.push(`${w}: body.text missing`);
  if (m?.body && m.body.html !== null && typeof m.body.html !== 'string') e.push(`${w}: body.html must be a string or null`);
  if (!Array.isArray(m?.attachments) || m.attachments.some((a) => !ID.test(a) || !a.startsWith('a-'))) e.push(`${w}: attachments must be a list of a-... ids`);
  return e;
}

export function checkThread(t) {
  const e = [];
  const w = `thread ${t?.id}`;
  if (t?.schema !== 'twin.thread/1') e.push(`${w}: schema is not twin.thread/1`);
  if (!ID.test(t?.id || '') || !t.id.startsWith('t-')) e.push(`${w}: id must look like t-...`);
  if (!Array.isArray(t?.messages) || !t.messages.length) e.push(`${w}: messages must be a non-empty list`);
  if (!Array.isArray(t?.participants)) e.push(`${w}: participants must be a list`);
  if (typeof t?.subject !== 'string') e.push(`${w}: subject must be a string`);
  if (!iso(t?.last_date)) e.push(`${w}: last_date must be ISO 8601 UTC`);
  return e;
}

export function checkAttachment(a) {
  const e = [];
  const w = `attachment ${a?.id}`;
  if (a?.schema !== 'twin.attachment/1') e.push(`${w}: schema is not twin.attachment/1`);
  if (!ID.test(a?.id || '') || !a.id.startsWith('a-')) e.push(`${w}: id must look like a-...`);
  if (!ID.test(a?.message || '')) e.push(`${w}: message missing`);
  for (const k of ['filename', 'mime']) if (typeof a?.[k] !== 'string' || !a[k]) e.push(`${w}: ${k} missing`);
  if (!Number.isSafeInteger(a?.size) || a.size < 0) e.push(`${w}: size must be a whole number`);
  if (!/^sha256:[0-9a-f]{64}$/.test(a?.sha256 || '')) e.push(`${w}: sha256 must be sha256:<64 hex>`);
  return e;
}

export function checkLabels(l) {
  const e = [];
  if (l?.schema !== 'twin.labels/1') e.push('labels: schema is not twin.labels/1');
  if (!Array.isArray(l?.labels)) e.push('labels: labels must be a list');
  else for (const x of l.labels) {
    if (typeof x.id !== 'string' || typeof x.name !== 'string') e.push(`labels: ${JSON.stringify(x)} needs id and name`);
    if (!['system', 'user', 'cell'].includes(x.type)) e.push(`labels: ${x.id} type must be system, user or cell`);
  }
  return e;
}

export function checkMailbox(mb) {
  const e = [];
  if (mb?.schema !== 'twin.mailbox/1') e.push('mailbox: schema is not twin.mailbox/1');
  if (!ADDR.test(mb?.address || '')) e.push('mailbox: bad address');
  if (!mb?.sync || typeof mb.sync.cursor !== 'string') e.push('mailbox: sync.cursor missing');
  if (typeof mb?.simulated !== 'boolean') e.push('mailbox: simulated must be true or false');
  return e;
}

const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));
const walk = (d) => (existsSync(d) ? readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; }) : []);

// The correspondents index: who wrote to us and whom we wrote to. The email policy uses
// it to tell a first contact from a reply. Derived from raw/; rebuild it, never edit it.
export function buildCorrespondents(messages, ownAddress) {
  const own = ownAddress.toLowerCase();
  const idx = {};
  const touch = (addr) => (idx[addr.toLowerCase()] ||= { inbound: 0, outbound: 0, first_seen: null, last_inbound: null, last_outbound: null });
  for (const m of [...messages].sort((a, b) => Date.parse(a.date) - Date.parse(b.date))) {
    if (m.direction === 'inbound') {
      const c = touch(m.from.address);
      c.inbound++; c.last_inbound = m.date; c.first_seen ||= m.date;
    } else {
      for (const p of [...m.to, ...m.cc, ...m.bcc]) {
        if (p.address.toLowerCase() === own) continue;
        const c = touch(p.address);
        c.outbound++; c.last_outbound = m.date; c.first_seen ||= m.date;
      }
    }
  }
  return { schema: 'twin.correspondents/1', mailbox: ownAddress, correspondents: Object.fromEntries(Object.entries(idx).sort()) };
}

// Load a twin from disk and check every file and every cross-reference.
export function loadTwin(root) {
  const errors = [];
  const mailbox = readJson(join(root, 'mailbox.json'));
  errors.push(...checkMailbox(mailbox));
  const labels = readJson(join(root, 'labels.json'));
  errors.push(...checkLabels(labels));
  const labelIds = new Set((labels.labels || []).map((l) => l.id));
  const messages = new Map();
  for (const p of walk(join(root, 'raw/messages')).filter((f) => f.endsWith('.json'))) {
    const m = readJson(p);
    errors.push(...checkMessage(m));
    const want = join(root, 'raw/messages', messagePath(m));
    if (relative(want, p) !== '') errors.push(`message ${m.id}: file should be at raw/messages/${messagePath(m)}`);
    if (messages.has(m.id)) errors.push(`message ${m.id}: duplicate id`);
    for (const l of m.labels || []) if (!labelIds.has(l)) errors.push(`message ${m.id}: unknown label ${l}`);
    messages.set(m.id, m);
  }
  const threads = new Map();
  for (const p of walk(join(root, 'threads')).filter((f) => f.endsWith('.json'))) {
    const t = readJson(p);
    errors.push(...checkThread(t));
    for (const id of t.messages || []) {
      const m = messages.get(id);
      if (!m) errors.push(`thread ${t.id}: message ${id} is not in raw/`);
      else if (m.thread !== t.id) errors.push(`thread ${t.id}: message ${id} says it belongs to ${m.thread}`);
    }
    threads.set(t.id, t);
  }
  for (const m of messages.values()) if (!threads.has(m.thread)) errors.push(`message ${m.id}: thread ${m.thread} has no file`);
  const attachments = new Map();
  for (const p of walk(join(root, 'attachments')).filter((f) => f.endsWith('.json'))) {
    const a = readJson(p);
    errors.push(...checkAttachment(a));
    const bin = p.replace(/\.json$/, '.bin');
    if (!existsSync(bin)) errors.push(`attachment ${a.id}: no .bin beside it`);
    else {
      const buf = readFileSync(bin);
      if (buf.length !== a.size) errors.push(`attachment ${a.id}: size does not match`);
      if ('sha256:' + createHash('sha256').update(buf).digest('hex') !== a.sha256) errors.push(`attachment ${a.id}: sha256 does not match`);
    }
    if (!messages.get(a.message)?.attachments.includes(a.id)) errors.push(`attachment ${a.id}: its message does not list it`);
    attachments.set(a.id, a);
  }
  for (const m of messages.values()) for (const a of m.attachments) if (!attachments.has(a)) errors.push(`message ${m.id}: attachment ${a} has no file`);
  const clean = new Map();
  for (const p of walk(join(root, 'clean/messages')).filter((f) => f.endsWith('.json'))) {
    const c = readJson(p);
    if (c.schema !== 'twin.clean/1') errors.push(`clean ${c.id}: schema is not twin.clean/1`);
    if (!messages.has(c.id)) errors.push(`clean ${c.id}: no raw message`);
    clean.set(c.id, c);
  }
  const correspondents = buildCorrespondents([...messages.values()], mailbox.address);
  const idxPath = join(root, 'index/correspondents.json');
  if (existsSync(idxPath) && JSON.stringify(readJson(idxPath)) !== JSON.stringify(correspondents)) errors.push('index/correspondents.json is stale: rebuild it');
  return { root, mailbox, labels, messages, threads, attachments, clean, correspondents, errors };
}
