// MADE-UP mailbox for the five inbox concepts (docs/design/inbox-concepts). Every person, address and
// message here is invented; example.com, example.net and example.org are reserved for examples.
// By email.design.d@AgentiCCells.dinis, 22 November 2026. Apache-2.0.
const H = 3600e3, D = 24 * H;
export const now = Date.parse('2026-11-22T09:30:00Z');

// trust: 'signed' (their key is in your web of trust and the message is signed), 'known' (you have
// written to each other before), 'new' (first contact). kind: person, notice (automated), news, receipt.
export const people = {
  ana: { name: 'Ana Silva', addr: 'ana@example.com', org: 'Harbour Labs', trust: 'signed', role: 'Pilot customer' },
  bo: { name: 'Bo Chen', addr: 'bo@example.net', org: 'Northwind Legal', trust: 'known', role: 'Lawyer' },
  cy: { name: 'Cy Patel', addr: 'cy@example.com', org: 'Harbour Labs', trust: 'signed', role: 'Engineer' },
  dee: { name: 'Dee Okafor', addr: 'dee@example.org', org: 'Open Builders', trust: 'known', role: 'Event organiser' },
  eli: { name: 'Eli Moreau', addr: 'eli@example.net', org: 'Moreau Studio', trust: 'new', role: '' },
  fay: { name: 'Fay Lind', addr: 'fay@example.org', org: 'Lind Capital', trust: 'new', role: '' },
  gus: { name: 'Gus Romero', addr: 'gus@example.com', org: 'Harbour Labs', trust: 'known', role: 'Finance' },
  ci: { name: 'Build service', addr: 'notify@ci.example.com', org: 'CI', trust: 'known', kind: 'notice' },
  news: { name: 'The Weekly Cell', addr: 'letters@news.example.org', org: 'Newsletter', trust: 'known', kind: 'news' },
  bank: { name: 'Example Bank', addr: 'no-reply@bank.example.net', org: 'Bank', trust: 'known', kind: 'receipt' },
  air: { name: 'Example Air', addr: 'trips@air.example.com', org: 'Airline', trust: 'known', kind: 'receipt' },
  me: { name: 'Me', addr: 'me@example.org', org: 'Me', trust: 'signed' },
};

// state: needs-reply (they wait on you), drafted (an agent drafted a reply, waiting for your approval),
// waiting (you wait on them), fyi (nothing to do), done.
// A draft carries the drafting agent, its signature and the policy checks the page would run (C4).
export const threads = [
  { id: 't1', from: 'ana', subject: 'Pilot plan: dates for the first week', at: now - 1.5 * H, unread: true, state: 'drafted', kind: 'person', labels: ['Clients'], att: ['pilot-plan.pdf'],
    snippet: 'Could we start on Monday 30th? I have put the open questions in the plan.',
    body: 'Hi,\n\nCould we start on Monday 30th? I have put the open questions in the attached plan: who signs off the budget, and which mailbox we use for the trial.\n\nBest,\nAna',
    draft: { agent: 'email.workflows.d', signed: true, checks: [['Recipient known and signed', true], ['Reply, not first contact', true], ['No attachments, no key material', true], ['Within today\'s limit (3 of 20)', true]],
      text: 'Hi Ana,\n\nMonday 30th works. Budget sign-off is with me; for the trial we use the test mailbox, not a live one. I will send the access steps on Friday.\n\nBest,\nMe' } },
  { id: 't2', from: 'bo', subject: 'Re: Draft agreement', at: now - 3 * H, unread: true, state: 'needs-reply', kind: 'person', labels: ['Legal'], count: 3,
    snippet: 'Two changes in clause 4. Can you confirm before Wednesday?',
    body: 'Two changes in clause 4: the notice period, and who holds the keys. Can you confirm before Wednesday?\n\nBo' },
  { id: 't3', from: 'eli', subject: 'Design help for your new site?', at: now - 4 * H, unread: true, state: 'needs-reply', kind: 'person', labels: [],
    snippet: 'I saw your article on agentic cells and wondered if you need design help.',
    body: 'Hello, I saw your article on agentic cells and wondered if you need design help. My portfolio is on my site.\n\nEli' },
  { id: 't4', from: 'ci', subject: 'Run failed: Pages - dev (a1b2c3d)', at: now - 5 * H, unread: true, state: 'fyi', kind: 'notice', labels: ['Builds'],
    snippet: 'The run for dev failed in the deploy step after 2 minutes.', body: 'The run for dev failed in the deploy step after 2 minutes.' },
  { id: 't5', from: 'cy', subject: 'Webhook keys for the trial', at: now - 7 * H, unread: false, state: 'drafted', kind: 'person', labels: ['Clients'],
    snippet: 'Which key should we pin for the signed webhooks?',
    body: 'Which key should we pin for the signed webhooks: yours or the cell\'s?\n\nCy',
    draft: { agent: 'email.workflows.d', signed: true, checks: [['Recipient known and signed', true], ['Reply, not first contact', true], ['No attachments, no key material', false], ['Within today\'s limit (4 of 20)', true]],
      text: 'Hi Cy,\n\nPin the cell\'s key. Its public half is attached as a key file.\n\nMe', blocked: 'The draft holds key material; the page refuses to send it.' } },
  { id: 't6', from: 'fay', subject: 'Introduction: Lind Capital', at: now - 9 * H, unread: true, state: 'needs-reply', kind: 'person', labels: [],
    snippet: 'A mutual friend suggested we talk about your email work.',
    body: 'Hi, a mutual friend suggested we talk about your email work. Do you have 20 minutes next week?\n\nFay' },
  { id: 't7', from: 'dee', subject: 'Talk slot on 4 December', at: now - 1 * D, unread: false, state: 'waiting', kind: 'person', labels: ['Events'],
    snippet: 'You: I can do the 4th at 15:00. Shall I send the title?', mine: true,
    body: 'You wrote: I can do the 4th at 15:00. Shall I send the title?' },
  { id: 't8', from: 'news', subject: 'This week: signed agents, quiet inboxes', at: now - 1.2 * D, unread: true, state: 'fyi', kind: 'news', labels: [],
    snippet: 'Five stories on agents that sign their work, and one on inbox zero.', body: 'Five stories on agents that sign their work, and one on inbox zero.' },
  { id: 't9', from: 'gus', subject: 'Invoice 2026-114', at: now - 1.5 * D, unread: false, state: 'drafted', kind: 'person', labels: ['Clients'],
    snippet: 'Attached is the invoice for November. Payment terms are 30 days.',
    body: 'Attached is the invoice for November. Payment terms are 30 days.\n\nGus',
    draft: { agent: 'email.crm.d', signed: true, checks: [['Recipient known', true], ['Reply, not first contact', true], ['No attachments, no key material', true], ['Within today\'s limit (5 of 20)', true]],
      text: 'Thanks Gus, received. I will confirm payment once it is approved.\n\nMe' } },
  { id: 't10', from: 'bank', subject: 'Your statement is ready', at: now - 2 * D, unread: false, state: 'fyi', kind: 'receipt', labels: ['Receipts'],
    snippet: 'Your November statement is ready to view.', body: 'Your November statement is ready to view.' },
  { id: 't11', from: 'air', subject: 'Your trip to Lisbon, 3 December', at: now - 2.5 * D, unread: false, state: 'fyi', kind: 'receipt', labels: ['Travel'],
    snippet: 'Booking ABC123: departs 08:10, seat 14C.', body: 'Booking ABC123: departs 08:10, seat 14C.' },
  { id: 't12', from: 'ana', subject: 'Notes from Tuesday\'s call', at: now - 6 * D, unread: false, state: 'waiting', kind: 'person', labels: ['Clients'], mine: true,
    snippet: 'You: here are my notes; can you check the second point?', body: 'You wrote: here are my notes; can you check the second point?' },
];

export const person = (t) => people[t.from];
export const when = (ms) => {
  const d = now - ms;
  if (d < 20 * H) return new Date(ms).toISOString().slice(11, 16);
  if (d < 2 * D) return 'Yesterday';
  return new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
};
export const ago = (ms) => { const d = (now - ms) / D; return d < 1 ? 'today' : d < 2 ? '1 day' : `${Math.floor(d)} days`; };
export const initials = (n) => n.split(/\s+/).map((w) => w[0]).slice(0, 2).join('');
export const el = (tag, props = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v; else if (k.startsWith('data-') || k.startsWith('aria-') || k === 'role' || k === 'tabindex' || k === 'for' || k === 'type' || k === 'title') e.setAttribute(k, v); else e[k] = v;
  for (const c of kids.flat()) if (c != null && c !== false) e.append(c.nodeType ? c : String(c));
  return e;
};
export const TRUST = { signed: 'Signed, in your web of trust', known: 'Known: you have written before', new: 'First contact' };
