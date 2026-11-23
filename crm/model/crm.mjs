// The CRM's model: the crm/ records it owns inside a demo twin or a real CRM vault, their checks, and
// what the lead board, a company's page and follow-ups show. Runs the same in Node and in the browser:
// no imports, input is a map of vault paths to file text.
// Layout read (shared demo twin, agreed with mail.dev.a@AgentiCCells.dinis, 23 Nov 2026):
//   orgs/<id>.json demo.org/1, people/<id>.json demo.person/1, drafts/<person>.json,
//   mail/ the Email Cell's twin format v1 (threads/, raw/messages/ or clean/messages/)
// Layout owned (a proposal until checked against the team CRM's shapes):
//   crm/stages.json             crm.stages/1   the pipeline's stages in order
//   crm/leads/<org-id>.json     crm.lead/1     one row per company: stage, owner, next step
//   crm/links/<thread-id>.json  crm.link/1     a mail thread tied to a company (and person)
// Draft state, last contact and follow-ups are derived, never stored.
// By crm.dev.a@AgentiCCells.dinis, 2026-11-23. Apache-2.0.

export const DAY = 864e5;
export const FOLLOW_UP_DAYS = 5;
export const STAGES = [
  { id: 'new', name: 'New' },
  { id: 'contacted', name: 'Contacted' },
  { id: 'talking', name: 'Talking' },
  { id: 'proposal', name: 'Proposal' },
  { id: 'won', name: 'Won' },
  { id: 'parked', name: 'Parked' },
];

const json = (t) => (typeof t === 'string' ? JSON.parse(t) : t);
const under = (files, prefix) => Object.keys(files).filter((p) => p.startsWith(prefix) && p.endsWith('.json')).sort().map((p) => json(files[p]));
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
const DAYISO = /^\d{4}-\d{2}-\d{2}$/;

// Read a vault (paths to text, or to parsed objects) into records.
export function readVault(files) {
  const messages = new Map();
  for (const m of [...under(files, 'mail/raw/messages/'), ...under(files, 'mail/clean/messages/')]) if (!messages.has(m.id)) messages.set(m.id, m);
  return {
    manifest: files['manifest.json'] ? json(files['manifest.json']) : null,
    mailbox: files['mail/mailbox.json'] ? json(files['mail/mailbox.json']) : null,
    orgs: under(files, 'orgs/'),
    people: under(files, 'people/'),
    drafts: under(files, 'drafts/'),
    threads: under(files, 'mail/threads/'),
    messages,
    stages: files['crm/stages.json'] ? json(files['crm/stages.json']).stages : STAGES,
    leads: under(files, 'crm/leads/'),
    links: under(files, 'crm/links/'),
  };
}

// Check the crm/ records and their references to orgs, people and threads.
export function checkCrm(v) {
  const errors = [];
  const orgs = new Set(v.orgs.map((o) => o.id)), people = new Map(v.people.map((p) => [p.id, p])), threads = new Set(v.threads.map((t) => t.id));
  const stages = new Set(v.stages.map((s) => s.id));
  if (stages.size !== v.stages.length) errors.push('stages: duplicate id');
  const seen = new Set();
  for (const l of v.leads) {
    if (l.schema !== 'crm.lead/1') errors.push(`lead ${l.org}: schema is not crm.lead/1`);
    if (!orgs.has(l.org)) errors.push(`lead ${l.org}: no such org`);
    if (seen.has(l.org)) errors.push(`lead ${l.org}: duplicate`);
    seen.add(l.org);
    if (!stages.has(l.stage)) errors.push(`lead ${l.org}: unknown stage ${l.stage}`);
    if (typeof l.owner !== 'string' || !l.owner) errors.push(`lead ${l.org}: no owner`);
    if (l.next_step != null && typeof l.next_step !== 'string') errors.push(`lead ${l.org}: next_step is not text`);
    if (l.next_step_due != null && !DAYISO.test(l.next_step_due)) errors.push(`lead ${l.org}: next_step_due is not yyyy-mm-dd`);
    if (l.updated_at != null && !ISO.test(l.updated_at)) errors.push(`lead ${l.org}: updated_at is not an ISO time`);
  }
  for (const k of v.links) {
    if (k.schema !== 'crm.link/1') errors.push(`link ${k.thread}: schema is not crm.link/1`);
    if (!threads.has(k.thread)) errors.push(`link ${k.thread}: no such thread`);
    if (!orgs.has(k.org)) errors.push(`link ${k.thread}: no such org ${k.org}`);
    if (k.person != null) {
      const p = people.get(k.person);
      if (!p) errors.push(`link ${k.thread}: no such person ${k.person}`);
      else if (p.org !== k.org) errors.push(`link ${k.thread}: person ${k.person} is not at ${k.org}`);
    }
  }
  return errors;
}

// The thread's org: its link if there is one, else its person's org, else by the other party's domain.
export function threadOrg(v, t, idx = index(v)) {
  const link = idx.linkByThread.get(t.id);
  if (link) return { org: link.org, person: link.person ?? null, linked: true };
  const p = t.person && idx.person.get(t.person);
  if (p) return { org: p.org, person: p.id, linked: false };
  const me = v.mailbox?.address;
  for (const a of t.participants || []) {
    if (a === me) continue;
    const byMail = idx.personByEmail.get(a.toLowerCase());
    if (byMail) return { org: byMail.org, person: byMail.id, linked: false };
    const o = idx.orgByDomain.get(a.split('@')[1]?.toLowerCase());
    if (o) return { org: o.id, person: null, linked: false };
  }
  return null;
}

function index(v) {
  const idx = {
    person: new Map(v.people.map((p) => [p.id, p])),
    personByEmail: new Map(v.people.flatMap((p) => (p.emails || []).map((e) => [e.toLowerCase(), p]))),
    orgByDomain: new Map(v.orgs.map((o) => [o.domain.toLowerCase(), o])),
    linkByThread: new Map(v.links.map((k) => [k.thread, k])),
  };
  return idx;
}

// The last message of a thread, by date.
export function lastMessage(v, t) {
  const list = (t.messages || []).map((id) => v.messages.get(id)).filter(Boolean);
  return list.sort((a, b) => Date.parse(a.date) - Date.parse(b.date)).at(-1) || null;
}

// Threads whose last message is ours and has had no reply for `days` or more, oldest wait first.
export function followUps(v, now, days = FOLLOW_UP_DAYS) {
  const idx = index(v), out = [];
  for (const t of v.threads) {
    const m = lastMessage(v, t);
    if (!m || m.direction !== 'outbound') continue;
    const waited = Math.floor((now - Date.parse(m.date)) / DAY);
    if (waited < days) continue;
    const who = threadOrg(v, t, idx);
    out.push({ thread: t.id, subject: t.subject, sent: m.date, days: waited, org: who?.org ?? null, person: who?.person ?? null });
  }
  return out.sort((a, b) => b.days - a.days || a.thread.localeCompare(b.thread));
}

// Draft state of a company: from drafts/ for its people. 'sent' if any was sent, else 'draft' if any
// waits, else 'none'.
export function draftState(v, orgId) {
  const ds = v.drafts.filter((d) => (d.org ?? v.people.find((p) => p.id === d.person)?.org) === orgId);
  if (ds.some((d) => d.status === 'sent')) return { state: 'sent', count: ds.length };
  if (ds.some((d) => d.status === 'draft' || d.status === 'approved')) return { state: 'draft', count: ds.length };
  return { state: 'none', count: ds.length };
}

// The lead board: one row per company, in stage order then name.
export function leadBoard(v, now) {
  const idx = index(v);
  const lead = new Map(v.leads.map((l) => [l.org, l]));
  const last = new Map(), threads = new Map();
  for (const t of v.threads) {
    const who = threadOrg(v, t, idx);
    if (!who) continue;
    threads.set(who.org, (threads.get(who.org) || 0) + 1);
    const m = lastMessage(v, t);
    if (m && (!last.has(who.org) || Date.parse(m.date) > Date.parse(last.get(who.org).date))) last.set(who.org, { date: m.date, direction: m.direction, thread: t.id });
  }
  const waiting = new Map();
  // Threads at this company still waiting on a reply: how many, and the longest wait (followUps is
  // sorted longest first).
  for (const f of followUps(v, now)) {
    if (!f.org) continue;
    const w = waiting.get(f.org);
    if (w) w.count++; else waiting.set(f.org, { count: 1, days: f.days, thread: f.thread });
  }
  const order = new Map(v.stages.map((s, i) => [s.id, i]));
  return v.orgs.map((o) => {
    const l = lead.get(o.id) || {};
    return {
      org: o.id, name: o.name, domain: o.domain, kind: o.kind,
      stage: l.stage || 'new', owner: l.owner || null,
      draft: draftState(v, o.id),
      last_contact: last.get(o.id) || null,
      threads: threads.get(o.id) || 0,
      people: v.people.filter((p) => p.org === o.id).length,
      next_step: l.next_step || null, next_step_due: l.next_step_due || null,
      overdue: !!(l.next_step_due && Date.parse(l.next_step_due + 'T23:59:59Z') < now),
      waiting: waiting.get(o.id) || null,
      synthetic: !!(o.synthetic || l.synthetic),
    };
  }).sort((a, b) => (order.get(a.stage) ?? 99) - (order.get(b.stage) ?? 99) || a.name.localeCompare(b.name));
}

// A company's page: the board row, its people, its threads (newest first) and its drafts.
export function company(v, orgId, now) {
  const idx = index(v);
  const row = leadBoard(v, now).find((r) => r.org === orgId);
  if (!row) return null;
  const threads = v.threads.filter((t) => threadOrg(v, t, idx)?.org === orgId).map((t) => {
    const m = lastMessage(v, t);
    return { id: t.id, subject: t.subject, last_date: m?.date || t.last_date, direction: m?.direction || null, person: threadOrg(v, t, idx).person, linked: idx.linkByThread.has(t.id) };
  }).sort((a, b) => Date.parse(b.last_date) - Date.parse(a.last_date));
  return { ...row, lead: v.leads.find((l) => l.org === orgId) || null, contacts: v.people.filter((p) => p.org === orgId), threads, drafts: v.drafts.filter((d) => (d.org ?? idx.person.get(d.person)?.org) === orgId) };
}

// The contacts list: one row per person, with their company and last contact.
export function contacts(v) {
  const orgName = new Map(v.orgs.map((o) => [o.id, o.name]));
  return v.people.map((p) => {
    const mine = v.threads.filter((t) => t.person === p.id || (t.participants || []).some((a) => (p.emails || []).includes(a)));
    const dates = mine.map((t) => lastMessage(v, t)?.date || t.last_date).sort();
    return { id: p.id, name: p.name, email: (p.emails || [])[0] || null, role: p.role || null, org: p.org, org_name: orgName.get(p.org) || null, threads: mine.length, last_contact: dates.at(-1) || null };
  }).sort((a, b) => a.name.localeCompare(b.name));
}

// Threads with no crm/links/ record, newest first, with the company they are matched to (if any).
export function unlinkedThreads(v) {
  const idx = index(v);
  return v.threads.filter((t) => !idx.linkByThread.has(t.id)).map((t) => {
    const m = lastMessage(v, t), who = threadOrg(v, t, idx);
    return { id: t.id, subject: t.subject, last_date: m?.date || t.last_date, org: who?.org ?? null, person: who?.person ?? null };
  }).sort((a, b) => Date.parse(b.last_date) - Date.parse(a.last_date));
}

// The exact file a hand-made link writes: { path, record, text }. Throws if it would not check out.
export function linkFile(v, { thread, org, person = null, by, at }) {
  const record = { schema: 'crm.link/1', thread, org, ...(person ? { person } : {}), linked_by: by, linked_at: at };
  const probe = { ...v, links: [...v.links.filter((k) => k.thread !== thread), record] };
  const errors = checkCrm(probe).filter((e) => e.startsWith(`link ${thread}:`));
  if (errors.length) throw new Error(errors.join('; '));
  if (!by || typeof by !== 'string') throw new Error('a link needs the name of who made it');
  if (!ISO.test(at || '')) throw new Error('a link needs its time, as an ISO time');
  return { path: `crm/links/${thread}.json`, record, text: JSON.stringify(record, null, 2) + '\n' };
}

// Companies and people a person adds by hand, in their own CRM vault. The fields are the shared demo
// twin's (demo.org/1, demo.person/1, agreed with mail.dev.a), under the CRM's own schema names, so a
// reader of one reads the other. Ids are random, so two devices adding at once do not collide.
export const KINDS = ['prospect', 'customer', 'investor', 'partner', 'event', 'community', 'other'];
const EMAIL = /^[^\s@<>"]+@[a-z0-9-]+(\.[a-z0-9-]+)+$/i;
const DOMAIN = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/;
export const newId = (prefix, rand = () => crypto.getRandomValues(new Uint8Array(4))) =>
  prefix + '-' + Array.from(rand(), (b) => b.toString(16).padStart(2, '0')).join('');

// A new company and its lead row: two files, written together. Throws with a plain reason.
export function companyFiles(v, { id, name, domain = '', kind = 'prospect', owner, at, stage = 'new', next_step = '' }) {
  name = String(name || '').trim(); domain = String(domain || '').trim().toLowerCase();
  if (!name) throw new Error('a company needs a name');
  if (domain && !DOMAIN.test(domain)) throw new Error(`"${domain}" is not a domain (like example.com)`);
  if (domain && v.orgs.some((o) => (o.domain || '').toLowerCase() === domain)) throw new Error(`a company with domain ${domain} is already here`);
  if (v.orgs.some((o) => o.name.toLowerCase() === name.toLowerCase())) throw new Error(`"${name}" is already here`);
  if (!KINDS.includes(kind)) throw new Error(`unknown kind ${kind}`);
  if (!owner) throw new Error('a lead needs an owner');
  if (!ISO.test(at || '')) throw new Error('needs the time, as an ISO time');
  const org = { schema: 'crm.org/1', id, name, ...(domain ? { domain } : {}), kind, added_by: owner, added_at: at };
  const lead = { schema: 'crm.lead/1', org: id, stage, owner, ...(next_step ? { next_step } : {}), updated_at: at };
  return [
    { path: `orgs/${id}.json`, record: org, text: JSON.stringify(org, null, 2) + '\n' },
    { path: `crm/leads/${id}.json`, record: lead, text: JSON.stringify(lead, null, 2) + '\n' },
  ];
}

// A new person at a company: one file.
export function personFile(v, { id, name, email, org, role = '', by, at }) {
  name = String(name || '').trim(); email = String(email || '').trim().toLowerCase();
  if (!name) throw new Error('a person needs a name');
  if (!EMAIL.test(email)) throw new Error(`"${email}" is not an email address`);
  if (!v.orgs.some((o) => o.id === org)) throw new Error(`no such company ${org}`);
  if (v.people.some((p) => (p.emails || []).map((e) => e.toLowerCase()).includes(email))) throw new Error(`${email} is already here`);
  if (!ISO.test(at || '')) throw new Error('needs the time, as an ISO time');
  const first = name.split(/\s+/)[0];
  const person = { schema: 'crm.person/1', id, name, first, emails: [email], org, ...(role ? { role: String(role).trim() } : {}), added_by: by, added_at: at };
  return [{ path: `people/${id}.json`, record: person, text: JSON.stringify(person, null, 2) + '\n' }];
}

// A new CRM vault's first files: its manifest (which marks it as a CRM vault the page may write to)
// and the stages.
export function newVaultFiles({ owner, at }) {
  if (!owner) throw new Error('a CRM vault needs an owner name');
  const manifest = { schema: 'crm.vault/1', synthetic: false, owner, created_at: at, created_by: 'CRM tool site (crm.tool.sovereignweb.site)', twin: null };
  return [
    { path: 'manifest.json', text: JSON.stringify(manifest, null, 2) + '\n' },
    { path: 'crm/stages.json', text: JSON.stringify({ schema: 'crm.stages/1', stages: STAGES }, null, 2) + '\n' },
  ];
}
