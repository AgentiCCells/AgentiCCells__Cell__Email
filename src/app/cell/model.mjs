// The twin's model: schema checks and derived indexes, as pure functions with no file or
// network access, shared by the Node tools (cell/twin/schema.mjs) and the browser gateway
// (/app/), so both write the same format. The layout is described in cell/twin/schema.mjs.
// By cell.email@AgentiCCells.dinis, 2026-11-16. Apache-2.0.
export const ID = /^[a-z]-[a-z0-9-]{1,64}$/;
export const ADDR = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/;
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
  if (m?.direction === 'inbound') {
    const okv = ['pass', 'fail', 'none', 'softfail', 'neutral', 'temperror', 'permerror'];
    if (!m.auth || !['spf', 'dkim', 'dmarc'].every((k) => okv.includes(m.auth[k]))) e.push(`${w}: inbound messages need auth {spf, dkim, dmarc} from the receiving server's Authentication-Results`);
  }
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

// The change feed (asked for by crm.ios@sgit.dinis, 16 November 2026): one file per sync,
// so a client reads only what is new instead of walking raw/ or diffing commits.
export const syncFileName = (syncedAt) => syncedAt.replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z') + '.json';
export function checkSync(s) {
  const e = [];
  const w = `sync ${s?.synced_at}`;
  if (s?.schema !== 'twin.sync/1') e.push(`${w}: schema is not twin.sync/1`);
  if (typeof s?.cursor !== 'string') e.push(`${w}: cursor must be a string`);
  if (!iso(s?.synced_at)) e.push(`${w}: synced_at must be ISO 8601 UTC`);
  for (const k of ['added_messages', 'changed_threads']) if (!Array.isArray(s?.[k]) || s[k].some((x) => typeof x !== 'string')) e.push(`${w}: ${k} must be a list of ids`);
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


// The correspondents index: who wrote to us and whom we wrote to. The email policy uses
// it to tell a first contact from a reply. Derived from raw/; rebuild it, never edit it.
export function buildCorrespondents(messages, ownAddress) {
  const own = ownAddress.toLowerCase();
  const idx = {};
  const touch = (addr) => (idx[addr.toLowerCase()] ||= { inbound: 0, inbound_verified: 0, outbound: 0, first_seen: null, last_inbound: null, last_outbound: null });
  for (const m of [...messages].sort((a, b) => Date.parse(a.date) - Date.parse(b.date))) {
    if (m.direction === 'inbound') {
      const c = touch(m.from.address);
      c.inbound++; c.last_inbound = m.date; c.first_seen ||= m.date;
      // Verified: DMARC passed, so the From address is not forged. Only these count as correspondence.
      if (m.auth?.dmarc === 'pass') c.inbound_verified++;
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


// Add new messages to an existing correspondents index, for a re-sync that fetched only the
// messages it did not have. Gives the same result as buildCorrespondents over all of them.
export function updateCorrespondents(index, newMessages, ownAddress) {
  const fresh = buildCorrespondents(newMessages, ownAddress).correspondents;
  const out = structuredClone(index?.correspondents || {});
  const later = (a, b) => (!a ? b : !b ? a : (Date.parse(a) >= Date.parse(b) ? a : b));
  const earlier = (a, b) => (!a ? b : !b ? a : (Date.parse(a) <= Date.parse(b) ? a : b));
  for (const [addr, c] of Object.entries(fresh)) {
    const o = out[addr] || { inbound: 0, inbound_verified: 0, outbound: 0, first_seen: null, last_inbound: null, last_outbound: null };
    out[addr] = {
      inbound: o.inbound + c.inbound,
      inbound_verified: (o.inbound_verified || 0) + c.inbound_verified,
      outbound: o.outbound + c.outbound,
      first_seen: earlier(o.first_seen, c.first_seen),
      last_inbound: later(o.last_inbound, c.last_inbound),
      last_outbound: later(o.last_outbound, c.last_outbound),
    };
  }
  return { schema: 'twin.correspondents/1', mailbox: ownAddress, correspondents: Object.fromEntries(Object.entries(out).sort()) };
}
