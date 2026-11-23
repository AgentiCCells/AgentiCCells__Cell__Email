// The demo mailbox: a synthetic twin of a Gmail account, for demo mode. Everything here is made up
// and generated from a seed: people, organisations, threads and drafts, at reserved example domains
// only (RFC 2606). Nothing is real, nothing is stored, and nothing it does leaves the page.
// Dinis Cruz, 23 November 2026: "when we show this and we demo this, I always have a demo mode, a
// synthetic demo mode. That's super critical".
// FakeGmail answers the few Gmail calls the send screen makes (profile, send, sent today) and records
// every send with simulation: true, so a demo can never be mistaken for a real send.
// By mail.dev.a@AgentiCCells.dinis, 2026-11-23. Apache-2.0.

export const DEMO_ME = { name: 'Demo User', address: 'demo.user@mailbox.example.org' };
export const DEMO_SEED = 20261123;

// mulberry32: small, fast, deterministic; the same seed always gives the same mailbox.
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST = ['Ana', 'Bruno', 'Carla', 'Diogo', 'Eva', 'Filipe', 'Grace', 'Hugo', 'Inês', 'João', 'Kofi', 'Lena', 'Marta', 'Nuno', 'Olu', 'Priya', 'Rui', 'Sofia', 'Tomás', 'Uma'];
const LAST = ['Almeida', 'Brandt', 'Costa', 'Duarte', 'Evans', 'Ferreira', 'Gomes', 'Haddad', 'Ito', 'Jansen', 'Kowalski', 'Lopes', 'Mensah', 'Novak', 'Okoro', 'Pereira', 'Quinn', 'Ramos', 'Silva', 'Teixeira'];
// Made-up organisations, each at a subdomain of a reserved example domain.
const ORGS = [
  ['Harbour Analytics', 'harbour.example.com', 'investor'],
  ['Lisbon Summit', 'summit.example.org', 'event'],
  ['Northlight Security', 'northlight.example.net', 'prospect'],
  ['Open Risk Forum', 'riskforum.example.org', 'community'],
  ['Atlas Insurance', 'atlas.example.com', 'customer'],
  ['Tagus Ventures', 'tagus.example.net', 'investor'],
  ['Civic Data Lab', 'civicdata.example.org', 'partner'],
  ['Meridian Bank', 'meridian.example.com', 'prospect'],
];
const ROLES = ['CISO', 'Head of Risk', 'Founder', 'Programme lead', 'CTO', 'Partner', 'Analyst', 'Director'];
// What each kind of contact gets as a first draft: a follow-up after meeting, in plain words.
const DRAFTS = {
  investor: ['Following up from Lisbon', 'Hi {first},\n\nThank you for the conversation in Lisbon. As promised, here is a short note on where we are: the email cell now sends from the browser with the person\'s own sign-in, and every send is pressed by a person.\n\nWould a 30-minute call next week suit you?\n\nBest wishes,\n{me}'],
  event: ['Thank you for the summit', 'Hi {first},\n\nThank you for having us at the summit. It was a pleasure to meet the team.\n\nIf it helps, I am happy to write a short piece for your newsletter about what we showed.\n\nBest wishes,\n{me}'],
  prospect: ['The demo we talked about', 'Hi {first},\n\nGood to meet you last week. You asked how the review step works before an email leaves: the draft is shown exactly as it will be sent, and nothing goes until a person presses Send.\n\nShall I set up a demo for your team?\n\nBest wishes,\n{me}'],
  community: ['Next forum meeting', 'Hi {first},\n\nI would like to propose a short talk for the next forum meeting on keeping agents to a signed policy.\n\nWould that fit the agenda?\n\nBest wishes,\n{me}'],
  customer: ['Checking in', 'Hi {first},\n\nA quick check-in: is everything working as you expected since the last update? Any rough edges, I would like to hear about them.\n\nBest wishes,\n{me}'],
  partner: ['Working together on open data', 'Hi {first},\n\nFollowing our chat, I have written up two ways we could work together on open data. I will send the page once you say which suits you best.\n\nBest wishes,\n{me}'],
};
const TOPICS = ['Notes from our call', 'Slides for Monday', 'Introductions', 'The pilot plan', 'Dates for the workshop', 'Your question about pricing', 'Agenda for Thursday', 'Draft agreement'];
const SNIPPETS = ['Thanks, that works for me.', 'Here are the notes, let me know what I missed.', 'Could we move it to the afternoon?', 'Attached is the latest version.', 'Happy to help, who else should join?', 'Great to meet you yesterday.'];

const pick = (r, list) => list[Math.floor(r() * list.length)];
const slug = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const pad = (n, w) => String(n).padStart(w, '0');
const BODIES = [
  'Hi {to},\n\n{snippet} I have put the main points below so we do not lose them.\n\n- what we agreed\n- what is still open\n\nBest,\n{from}',
  'Hi {to},\n\n{snippet}\n\nThanks,\n{from}',
  'Hello {to},\n\n{snippet} Shall we pick it up next week?\n\nBest wishes,\n{from}',
];

// The whole synthetic mailbox: { me, orgs, people, contacts, threads, messages, drafts, labels, generated }.
// orgs and people are the shared shape the CRM demo builds on (demo.org/1, demo.person/1); messages are
// the Email Cell's twin format (twin.message/1); contacts is the send screen's view of people.
// now is fixed by the caller so tests are stable; the page passes Date.now().
export function demoMailbox({ seed = DEMO_SEED, now = Date.now(), contacts: n = 16 } = {}) {
  const r = rng(seed);
  const DAY = 864e5;
  const orgs = ORGS.map(([name, domain, kind], i) => ({ id: `o${pad(i + 1, 2)}`, name, domain, kind }));
  const used = new Set();
  const people = [];
  while (people.length < n) {
    const first = pick(r, FIRST), last = pick(r, LAST);
    if (used.has(first + last)) continue;
    used.add(first + last);
    const o = orgs[people.length % orgs.length];
    people.push({ id: `p${pad(people.length + 1, 2)}`, name: `${first} ${last}`, first, emails: [`${slug(first)}.${slug(last)}@${o.domain}`], org: o.id, role: pick(r, ROLES), kind: o.kind });
  }
  const me = { name: DEMO_ME.name, address: DEMO_ME.address };
  const threads = [], messages = [];
  for (let i = 0; i < n * 2; i++) {
    const p = people[Math.floor(r() * people.length)];
    const them = { name: p.name, address: p.emails[0] };
    const tid = `t-${pad(i + 1, 3)}`, subject = pick(r, TOPICS);
    const count = 1 + Math.floor(r() * 3);
    let at = Math.round(now - (5 + r() * 55) * DAY);
    let outbound = r() < 0.4;
    const ids = [];
    for (let k = 0; k < count; k++) {
      const id = `m-${pad(messages.length + 1, 4)}`;
      const from = outbound ? me : them, to = outbound ? them : me;
      const snippet = pick(r, SNIPPETS);
      const prev = messages[messages.length - 1];
      messages.push({
        schema: 'twin.message/1', id, thread: tid, direction: outbound ? 'outbound' : 'inbound',
        source: { system: 'simulation', id: `demo-${id}`, thread_id: `demo-${tid}`, history_id: String(5000 + messages.length) },
        from, to: [to], cc: [], bcc: [], reply_to: [],
        subject: k ? `Re: ${subject}` : subject, date: new Date(at).toISOString().replace(/\.\d+Z$/, 'Z'),
        headers: { message_id: `<${id}@${from.address.split('@')[1]}>`, in_reply_to: k ? prev.headers.message_id : null, references: k ? [...prev.headers.references, prev.headers.message_id] : [] },
        labels: outbound ? ['SENT'] : (k === count - 1 && r() < 0.4 ? ['INBOX', 'UNREAD'] : ['INBOX']),
        language: 'en',
        body: { text: pick(r, BODIES).replace('{to}', to.name.split(' ')[0]).replace('{from}', from.name).replace('{snippet}', snippet), html: null },
        attachments: [],
        ...(outbound ? {} : { auth: { spf: 'pass', dkim: 'pass', dmarc: 'pass' } }),
        simulated: true,
      });
      ids.push(id);
      at += Math.round((0.1 + r() * 2) * DAY);
      outbound = !outbound;
    }
    const list = messages.slice(-count);
    threads.push({ schema: 'twin.thread/1', id: tid, subject, messages: ids, participants: [me.address, them.address].sort(), labels: [...new Set(list.flatMap((m) => m.labels))].sort(), last_date: list[list.length - 1].date, person: p.id });
  }
  threads.sort((a, b) => Date.parse(b.last_date) - Date.parse(a.last_date));
  const orgName = Object.fromEntries(orgs.map((o) => [o.id, o.name]));
  const contacts = people.map((p) => {
    const mine = threads.filter((t) => t.person === p.id);
    return { id: p.id, name: p.name, first: p.first, address: p.emails[0], org: orgName[p.org], role: p.role, kind: p.kind, threads: mine.length, last_contact: mine.length ? Date.parse(mine[0].last_date) : 0 };
  });
  const drafts = contacts.map((c) => draftFor(c, DEMO_ME));
  const labels = [{ id: 'INBOX', name: 'Inbox', type: 'system' }, { id: 'SENT', name: 'Sent', type: 'system' }, { id: 'UNREAD', name: 'Unread', type: 'system' }];
  return { me: DEMO_ME, orgs, people, contacts, threads, messages, drafts, labels, generated: { seed, at: new Date(now).toISOString(), synthetic: true } };
}

// The first draft for a contact, from its kind.
export function draftFor(c, me = DEMO_ME) {
  const [subject, text] = DRAFTS[c.kind] || DRAFTS.customer;
  const fill = (s) => s.replace(/\{first\}/g, c.first).replace(/\{me\}/g, me.name);
  return { contact: c.id, to: [c.address], subject: fill(subject), text: fill(text), status: 'draft' };
}

const fromB64url = (s) => {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
  return new TextDecoder().decode(Uint8Array.from(bin, (ch) => ch.charCodeAt(0)));
};

// A stand-in for the Gmail API calls the send screen uses. It sends nothing anywhere: each "send" is
// kept in memory, in this tab only, marked simulation: true.
export class FakeGmail {
  constructor({ me = DEMO_ME, now = () => Date.now() } = {}) { this.me = me; this.now = now; this.sent = []; this.n = 0; }
  async profile() { return { emailAddress: this.me.address, simulation: true }; }
  async send(raw) {
    const text = fromB64url(raw);
    const head = text.slice(0, text.indexOf('\r\n\r\n'));
    const header = (name) => (head.match(new RegExp(`^${name}: (.*)$`, 'mi')) || [])[1] || '';
    if (/^Bcc:/mi.test(head)) throw new Error('the demo refuses Bcc, as the page does');
    const rec = { id: `sim-${++this.n}`, threadId: `sim-t${this.n}`, to: header('To'), cc: header('Cc'), subject: header('Subject'), sent_at: new Date(this.now()).toISOString().slice(0, 19) + 'Z', simulation: true };
    this.sent.push(rec);
    return { id: rec.id, threadId: rec.threadId, simulation: true };
  }
  async sentToday() { const day = new Date(this.now()).toISOString().slice(0, 10); return this.sent.filter((s) => s.sent_at.startsWith(day)).length; }
}
