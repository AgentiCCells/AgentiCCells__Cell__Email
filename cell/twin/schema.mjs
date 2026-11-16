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
//   index/syncs/<yyyymmddThhmmssZ>.json       twin.sync/1      change feed: one file per sync
// Agents get the read key for clean/ only; raw/ is for the gateway, the firewall and people.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { createHash } from 'node:crypto';

import { messagePath, checkMessage, checkThread, checkAttachment, checkLabels, checkMailbox, checkSync, syncFileName, buildCorrespondents } from '../../src/app/cell/model.mjs';
export * from '../../src/app/cell/model.mjs';

const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));
const walk = (d) => (existsSync(d) ? readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; }) : []);

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
  const syncs = [];
  for (const p of walk(join(root, 'index/syncs')).filter((f) => f.endsWith('.json')).sort()) {
    const s = readJson(p);
    errors.push(...checkSync(s));
    if (!p.endsWith('/' + syncFileName(s.synced_at || ''))) errors.push(`sync ${s.synced_at}: file name should be ${syncFileName(s.synced_at || '')}`);
    for (const id of s.added_messages || []) if (!messages.has(id)) errors.push(`sync ${s.synced_at}: added message ${id} is not in raw/`);
    for (const id of s.changed_threads || []) if (!threads.has(id)) errors.push(`sync ${s.synced_at}: changed thread ${id} has no file`);
    syncs.push(s);
  }
  const correspondents = buildCorrespondents([...messages.values()], mailbox.address);
  const idxPath = join(root, 'index/correspondents.json');
  if (existsSync(idxPath) && JSON.stringify(readJson(idxPath)) !== JSON.stringify(correspondents)) errors.push('index/correspondents.json is stale: rebuild it');
  return { root, mailbox, labels, messages, threads, attachments, clean, correspondents, syncs, errors };
}
