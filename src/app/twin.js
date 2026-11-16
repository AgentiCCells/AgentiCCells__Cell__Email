// From Gmail to the twin: pure functions that turn the Gmail API's answers into the twin's
// files (cell/twin/schema.mjs describes the layout). No page or network access, so the Node
// tests run them on made-up answers. With the gmail.metadata scope there is no body: messages
// carry headers and labels only, and say so (body.available false).
// By cell.email@AgentiCCells.dinis, 2026-11-16. Apache-2.0.
import { messagePath, checkMessage, buildCorrespondents, updateCorrespondents, syncFileName, ADDR } from './cell/model.mjs';
import { clean } from './cell/clean.mjs';

// The headers asked for with format=metadata.
export const HEADERS = ['From', 'To', 'Cc', 'Bcc', 'Reply-To', 'Subject', 'Date', 'Message-ID', 'In-Reply-To', 'References', 'Authentication-Results'];
const AUTH_VALUES = new Set(['pass', 'fail', 'none', 'softfail', 'neutral', 'temperror', 'permerror']);

export const header = (msg, name) => (msg.payload?.headers || []).find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? null;

// "Name <a@b>, c@d, \"Last, First\" <e@f>" into [{ name, address }], dropping what is not an address.
export function parseAddressList(value) {
  if (!value) return [];
  const parts = [];
  let cur = '', quoted = false, angle = 0;
  for (const ch of value) {
    if (ch === '"') quoted = !quoted;
    if (!quoted && ch === '<') angle++;
    if (!quoted && ch === '>') angle = Math.max(0, angle - 1);
    if (ch === ',' && !quoted && !angle) { parts.push(cur); cur = ''; } else cur += ch;
  }
  parts.push(cur);
  const out = [];
  for (const raw of parts.map((p) => p.trim()).filter(Boolean)) {
    const m = raw.match(/^(.*)<([^<>]+)>\s*$/);
    const address = (m ? m[2] : raw).trim();
    const name = m ? m[1].trim().replace(/^"|"$/g, '').trim() : undefined;
    if (!ADDR.test(address)) continue;
    out.push(name ? { name, address } : { address });
  }
  return out;
}

// SPF, DKIM and DMARC from the receiving server's Authentication-Results (Gmail's own, the first).
export function authFrom(value) {
  const get = (k) => { const m = String(value || '').match(new RegExp(`\\b${k}=([a-z]+)`, 'i')); const v = m?.[1]?.toLowerCase(); return AUTH_VALUES.has(v) ? v : 'none'; };
  return { spf: get('spf'), dkim: get('dkim'), dmarc: get('dmarc') };
}

export const twinId = (prefix, gmailId) => `${prefix}-${String(gmailId).toLowerCase().replace(/[^a-z0-9-]/g, '')}`;

// One Gmail message (format=metadata) into a twin.message/1. labelIds outside `known` are dropped.
export function toTwinMessage(msg, ownAddress, known = null) {
  const labels = (msg.labelIds || []).filter((l) => !known || known.has(l));
  const direction = (msg.labelIds || []).includes('SENT') ? 'outbound' : 'inbound';
  const fromList = parseAddressList(header(msg, 'From'));
  const from = fromList[0] || { name: String(header(msg, 'From') || '').slice(0, 200), address: 'unknown@unknown.invalid' };
  let to = parseAddressList(header(msg, 'To'));
  const cc = parseAddressList(header(msg, 'Cc'));
  const bcc = parseAddressList(header(msg, 'Bcc'));
  let inferred = false;
  if (!to.length && !cc.length && !bcc.length) { to = [{ address: ownAddress }]; inferred = true; }
  const refs = String(header(msg, 'References') || '').split(/\s+/).filter(Boolean);
  const m = {
    schema: 'twin.message/1',
    id: twinId('m', msg.id),
    thread: twinId('t', msg.threadId),
    direction,
    source: { system: 'gmail', id: msg.id, thread_id: msg.threadId, history_id: String(msg.historyId || '') },
    from,
    to, cc, bcc,
    reply_to: parseAddressList(header(msg, 'Reply-To')),
    subject: header(msg, 'Subject') || '',
    date: new Date(Number(msg.internalDate)).toISOString(),
    headers: { message_id: header(msg, 'Message-ID') || `<gmail-${msg.id}>`, in_reply_to: header(msg, 'In-Reply-To'), references: refs },
    labels,
    language: null,
    body: { text: '', html: null, available: false, why: 'the grant is gmail.metadata: headers and labels only' },
    attachments: [],
    size_estimate: msg.sizeEstimate ?? null,
  };
  if (direction === 'inbound') m.auth = authFrom(header(msg, 'Authentication-Results'));
  if (inferred) m.recipients_inferred = true;
  return m;
}

export function labelsFile(gmailLabels) {
  return { schema: 'twin.labels/1', labels: gmailLabels.map((l) => ({ id: l.id, name: l.name, type: l.type === 'system' ? 'system' : 'user' })) };
}

// Thread files, merging new messages into what the vault already holds.
export function threadFiles(newMessages, existing = {}) {
  const by = {};
  for (const m of newMessages) (by[m.thread] ||= []).push(m);
  const out = {};
  for (const [id, list] of Object.entries(by)) {
    const old = existing[id];
    const all = [...(old?.messages_detail || []), ...list.map((m) => ({ id: m.id, date: m.date }))];
    const seen = new Map(all.map((x) => [x.id, x]));
    const sorted = [...seen.values()].sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
    const participants = new Set(old?.participants || []);
    const labels = new Set(old?.labels || []);
    for (const m of list) { for (const p of [m.from, ...m.to, ...m.cc]) participants.add(p.address.toLowerCase()); for (const l of m.labels) labels.add(l); }
    out[id] = {
      schema: 'twin.thread/1', id,
      subject: old?.subject ?? [...list].sort((a, b) => Date.parse(a.date) - Date.parse(b.date))[0].subject,
      messages: sorted.map((x) => x.id), messages_detail: sorted,
      participants: [...participants].sort(), labels: [...labels].sort(),
      last_date: sorted[sorted.length - 1].date,
    };
  }
  return out;
}

// Everything one sync writes, as [{ folder, name, data }] plus a summary. `state` is what the
// vault already holds: { ids: { gmailId: path }, threads: { id: file }, correspondents }.
export function syncPlan({ profile, gmailLabels, messages, state = {}, syncedAt = new Date().toISOString() }) {
  const own = profile.emailAddress;
  const known = new Set(gmailLabels.map((l) => l.id));
  const ids = { ...(state.ids || {}) };
  const twinMessages = [];
  const problems = [];
  for (const g of messages) {
    if (ids[g.id] || (g.labelIds || []).includes('DRAFT')) continue;
    const m = toTwinMessage(g, own, known);
    const errs = checkMessage(m);
    if (errs.length) { problems.push(...errs); continue; }
    twinMessages.push(m);
    ids[g.id] = `raw/messages/${messagePath(m)}`;
  }
  const files = [];
  const put = (path, obj) => { const i = path.lastIndexOf('/'); files.push({ folder: i < 0 ? '/' : '/' + path.slice(0, i), name: path.slice(i + 1), data: JSON.stringify(obj, null, 2) + '\n' }); };
  for (const m of twinMessages) {
    put(`raw/messages/${messagePath(m)}`, m);
    put(`clean/messages/${messagePath(m)}`, clean(m));
  }
  const threads = threadFiles(twinMessages, state.threads || {});
  for (const t of Object.values(threads)) put(`threads/${t.id}.json`, t);
  const correspondents = state.correspondents ? updateCorrespondents(state.correspondents, twinMessages, own) : buildCorrespondents(twinMessages, own);
  put('index/correspondents.json', correspondents);
  put('index/messages.json', { schema: 'twin.message-index/1', note: 'Gmail message id to the twin file; derived, rebuildable', ids });
  put(`index/syncs/${syncFileName(syncedAt)}`, { schema: 'twin.sync/1', cursor: String(profile.historyId), synced_at: syncedAt, added_messages: twinMessages.map((m) => m.id), changed_threads: Object.keys(threads).sort() });
  put('labels.json', labelsFile(gmailLabels));
  put('mailbox.json', { schema: 'twin.mailbox/1', simulated: false, address: own, source: { system: 'gmail' }, sync: { cursor: String(profile.historyId), synced_at: syncedAt, method: 'browser gateway, gmail.metadata' }, twin_schema: 'twin/1' });
  return { files, added: twinMessages.length, threads: Object.keys(threads).length, problems, hostile: twinMessages.filter((m) => clean(m).verdict === 'hostile').length };
}
