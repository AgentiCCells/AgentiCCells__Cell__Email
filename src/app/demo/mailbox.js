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
const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// The whole synthetic mailbox: { me, contacts, threads, drafts, labels, generated }.
// now is fixed by the caller so tests are stable; the page passes Date.now().
export function demoMailbox({ seed = DEMO_SEED, now = Date.now(), contacts: n = 16 } = {}) {
  const r = rng(seed);
  const used = new Set();
  const contacts = [];
  while (contacts.length < n) {
    const first = pick(r, FIRST), last = pick(r, LAST);
    if (used.has(first + last)) continue;
    used.add(first + last);
    const [org, domain, kind] = ORGS[contacts.length % ORGS.length];
    contacts.push({ id: `c${contacts.length + 1}`, name: `${first} ${last}`, first, address: `${slug(first)}.${slug(last)}@${domain}`, org, role: pick(r, ROLES), kind, last_contact: 0, threads: 0 });
  }
  const threads = [];
  const DAY = 864e5;
  for (let i = 0; i < n * 2; i++) {
    const c = contacts[Math.floor(r() * contacts.length)];
    const at = Math.round(now - r() * 60 * DAY);
    const mine = r() < 0.4;
    threads.push({ id: `t${i + 1}`, subject: pick(r, TOPICS), contact: c.id, from: mine ? DEMO_ME.address : c.address, to: mine ? c.address : DEMO_ME.address, at, snippet: pick(r, SNIPPETS), labels: mine ? ['SENT'] : (r() < 0.3 ? ['INBOX', 'UNREAD'] : ['INBOX']) });
    c.threads++;
    if (at > c.last_contact) c.last_contact = at;
  }
  threads.sort((a, b) => b.at - a.at);
  const drafts = contacts.map((c) => draftFor(c, DEMO_ME));
  return { me: DEMO_ME, contacts, threads, drafts, labels: ['INBOX', 'SENT', 'UNREAD', 'DRAFT'], generated: { seed, at: new Date(now).toISOString(), synthetic: true } };
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
