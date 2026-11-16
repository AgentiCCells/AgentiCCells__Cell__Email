// SIMULATION. Writes the simulated mailbox (sim/messages.mjs) to disk in the twin's
// vault layout (cell/twin/schema.mjs), runs the inbound firewall over every message to
// fill clean/, and builds the correspondents index.
// Usage: node sim/build-mailbox.mjs <out-dir>     (default: _sim/twin, which git ignores)
// The output is generated, not committed: attachment hashes would trip the leak scan's
// high-entropy check, and the source of truth is sim/messages.mjs.
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { MAILBOX, LABELS, MESSAGES, ATTACHMENTS } from './messages.mjs';
import { messagePath, buildCorrespondents, syncFileName } from '../cell/twin/schema.mjs';
import { clean } from '../cell/firewall/clean.mjs';

const put = (p, v) => { mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, typeof v === 'string' || Buffer.isBuffer(v) ? v : JSON.stringify(v, null, 2) + '\n'); };

export function simulatedMessages() {
  return MESSAGES.map((s, i) => ({
    schema: 'twin.message/1',
    id: s.id,
    thread: s.thread,
    direction: s.direction,
    source: { system: 'simulation', id: `sim-${String(i + 1).padStart(4, '0')}`, thread_id: `sim-${s.thread}`, history_id: String(1000 + i) },
    from: s.from,
    to: s.to,
    cc: s.cc || [],
    bcc: [],
    reply_to: [],
    subject: s.subject,
    date: s.date,
    headers: {
      message_id: `<${s.id}@${s.from.address.split('@')[1]}>`,
      in_reply_to: null,
      references: [],
    },
    labels: s.labels,
    language: s.language,
    body: { text: s.text, html: s.html || null },
    attachments: s.attachments || [],
    ...(s.direction === 'inbound' ? { auth: s.auth || { spf: 'pass', dkim: 'pass', dmarc: 'pass' } } : {}),
    simulated: true,
  }));
}

function linkHeaders(messages) {
  const byThread = {};
  for (const m of messages) (byThread[m.thread] ||= []).push(m);
  for (const list of Object.values(byThread)) {
    list.sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
    list.forEach((m, i) => { if (i) { m.headers.in_reply_to = list[i - 1].headers.message_id; m.headers.references = list.slice(0, i).map((x) => x.headers.message_id); } });
  }
  return byThread;
}

export function buildMailbox(out) {
  rmSync(out, { recursive: true, force: true });
  const messages = simulatedMessages();
  const byThread = linkHeaders(messages);
  put(join(out, 'mailbox.json'), {
    schema: 'twin.mailbox/1', simulated: true, address: MAILBOX.address, name: MAILBOX.name,
    source: { system: 'simulation' }, sync: { cursor: String(1000 + messages.length - 1), synced_at: '2026-11-16T12:00:00Z', method: 'simulation' },
    twin_schema: 'twin/1',
  });
  put(join(out, 'labels.json'), { schema: 'twin.labels/1', labels: LABELS });
  for (const m of messages) {
    put(join(out, 'raw/messages', messagePath(m)), m);
    put(join(out, 'clean/messages', messagePath(m)), clean(m));
  }
  for (const [id, list] of Object.entries(byThread)) {
    const participants = [...new Set(list.flatMap((m) => [m.from, ...m.to, ...m.cc].map((p) => p.address.toLowerCase())))].sort();
    put(join(out, 'threads', `${id}.json`), {
      schema: 'twin.thread/1', id, subject: list[0].subject, messages: list.map((m) => m.id), participants,
      labels: [...new Set(list.flatMap((m) => m.labels))].sort(), last_date: list[list.length - 1].date,
    });
  }
  for (const a of ATTACHMENTS) {
    const buf = Buffer.from(a.content, 'utf8');
    put(join(out, 'attachments', `${a.id}.bin`), buf);
    put(join(out, 'attachments', `${a.id}.json`), {
      schema: 'twin.attachment/1', id: a.id, message: a.message, filename: a.filename, mime: a.mime,
      size: buf.length, sha256: 'sha256:' + createHash('sha256').update(buf).digest('hex'),
    });
  }
  put(join(out, 'index/correspondents.json'), buildCorrespondents(messages, MAILBOX.address));
  // Two simulated syncs: everything up to 10 November, then the rest.
  const cut = Date.parse('2026-11-10T00:00:00Z');
  const syncs = [
    { synced_at: '2026-11-10T00:00:00Z', list: messages.filter((m) => Date.parse(m.date) < cut) },
    { synced_at: '2026-11-16T12:00:00Z', list: messages.filter((m) => Date.parse(m.date) >= cut) },
  ];
  let cursor = 1000;
  for (const s of syncs) {
    cursor += s.list.length;
    put(join(out, 'index/syncs', syncFileName(s.synced_at)), {
      schema: 'twin.sync/1', cursor: String(cursor - 1), synced_at: s.synced_at,
      added_messages: s.list.map((m) => m.id), changed_threads: [...new Set(s.list.map((m) => m.thread))].sort(),
    });
  }
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const out = process.argv[2] || '_sim/twin';
  buildMailbox(out);
  console.log(`SIMULATION: wrote the simulated twin to ${out}/ (${MESSAGES.length} made-up messages)`);
}
