// The email policy checker: altitude 4 (what an email may be) and the automatic part of
// altitude 5 (which sends may go without a person). The gateway runs it before every
// send; the policy simulator runs it over past mail.
// Status: built and tested against the simulated mailbox. Not yet wired to a gateway.
//
// check(proposal, ctx) returns { decision, reasons, first_contact, automation }:
//   deny   the email must never be sent as proposed; the gateway refuses and says why
//   hold   it may be sent only with a person's signature on the approvals lane
//   allow  it may be sent under a signed automation policy, with no person
// Deny by default: anything the policy does not allow is held or denied, never allowed.
import { scanText } from '../../scripts/leak-scan.mjs';
import { guessLanguage } from './language.mjs';

const DAY = 24 * 60 * 60 * 1000;
const lower = (s) => s.toLowerCase();
const domainOf = (a) => lower(a.split('@')[1] || '');

export function renderTemplate(tpl, slots) {
  const missing = [];
  const fill = (s) => s.replace(/\{\{(\w+)\}\}/g, (_, k) => { if (typeof slots[k] !== 'string') { missing.push(k); return ''; } return slots[k]; });
  return { subject: fill(tpl.subject), text: fill(tpl.text), missing: [...new Set(missing)] };
}

// ctx: { policy, twin: { mailbox, messages: Map, threads: Map, correspondents }, outbox: [{at, author, to}], stopped, now }
export function check(p, ctx) {
  const { policy, twin } = ctx;
  const reasons = [];
  const deny = (rule, detail) => reasons.push({ level: 'deny', rule, detail });
  const hold = (rule, detail) => reasons.push({ level: 'hold', rule, detail });
  const now = Date.parse(p.at || ctx.now || new Date().toISOString());
  const to = p.to || [], cc = p.cc || [], bcc = p.bcc || [];
  const recipients = [...to, ...cc, ...bcc].map(lower);

  // Kill switch: nothing sends while the gateway is stopped.
  if (ctx.stopped) deny('kill switch', 'the gateway is stopped; a person must start it again');

  // Who may propose at all (altitude 3 is enforced on the lanes; repeated here so the simulator sees it).
  if (!policy.senders?.includes(p.author)) deny('sender', `${p.author} may not propose emails under this policy`);
  if (!['reply', 'send', 'forward'].includes(p.kind)) deny('kind', `unknown kind ${p.kind}`);
  if (p.kind === 'forward' && !policy.allow_forward) deny('kind', 'forwarding is not allowed by this policy');

  // Recipients and domains.
  const r = policy.recipients || {};
  if (!recipients.length) deny('recipients', 'no recipients');
  if (recipients.length > (r.max ?? 1)) deny('recipients', `${recipients.length} recipients, the most allowed is ${r.max ?? 1}`);
  if (bcc.length && !r.allow_bcc) deny('recipients', 'bcc is not allowed');
  for (const a of recipients) {
    if (!/^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(a)) { deny('recipients', `${a} is not an address`); continue; }
    if ((r.deny_addresses || []).map(lower).includes(a)) deny('recipients', `${a} is on the deny list`);
    else if ((r.deny_domains || []).includes(domainOf(a))) deny('recipients', `${domainOf(a)} is a denied domain`);
    else if (!(r.allow_domains || []).includes(domainOf(a)) && !(r.allow_addresses || []).map(lower).includes(a)) deny('recipients', `${a} is not in an allowed domain or on the allow list`);
    if (a === lower(twin.mailbox.address)) deny('recipients', 'the mailbox may not send to itself');
  }

  // First contact or reply. A recipient who has never written to us is a first contact.
  const known = (a) => (twin.correspondents.correspondents[a]?.inbound || 0) > 0;
  const firstContacts = recipients.filter((a) => !known(a));
  if (p.kind === 'reply') {
    const parent = twin.messages.get(p.in_reply_to);
    if (!parent) deny('reply', `in_reply_to ${p.in_reply_to} is not a message in the twin`);
    else {
      const thread = twin.threads.get(parent.thread);
      const inThread = new Set();
      for (const id of thread?.messages || []) { const m = twin.messages.get(id); for (const x of [m.from, ...m.to, ...m.cc]) inThread.add(lower(x.address)); }
      for (const a of recipients) if (!inThread.has(a)) hold('reply', `${a} is not in the thread being answered`);
      if (!/^re:/i.test(p.subject)) hold('reply', 'a reply\'s subject should start with Re:');
    }
  }
  if (firstContacts.length) hold('first contact', `${firstContacts.join(', ')} never wrote to this mailbox: a person approves every first contact`);

  // Language: allowed, declared, and what the text actually reads as.
  const languages = policy.languages || [];
  if (!languages.includes(p.language)) deny('language', `${p.language} is not an allowed language (${languages.join(', ')})`);
  const guess = guessLanguage(p.text || '').language;
  if (guess === null) hold('language', 'the language of the text could not be confirmed');
  else if (guess !== p.language) deny('language', `declared ${p.language} but the text reads as ${guess}`);

  // Templates.
  const t = policy.templates || {};
  let template = null;
  if (p.template) {
    template = t[p.template.id];
    if (!template) deny('template', `unknown template ${p.template.id}`);
    else {
      if (template.language !== p.language) deny('template', `template ${p.template.id} is in ${template.language}, the email is in ${p.language}`);
      const out = renderTemplate(template, p.template.slots || {});
      if (out.missing.length) deny('template', `slots not filled: ${out.missing.join(', ')}`);
      for (const [k, v] of Object.entries(p.template.slots || {})) {
        if (/https?:\/\//i.test(v)) deny('template', `slot ${k} holds a link; links go in the template, never in a slot`);
        if (v.length > (policy.max_slot_length ?? 400)) deny('template', `slot ${k} is longer than ${policy.max_slot_length ?? 400} characters`);
      }
      if (out.text !== p.text || out.subject !== p.subject) deny('template', `the email is not the template ${p.template.id} with its slots filled`);
    }
  } else if (policy.require_template) hold('template', 'no template: free text needs a person');

  // Attachments: by default none; files go as vault links.
  for (const a of p.attachments || []) {
    const ok = (policy.attachments?.allow_mime || []).includes(a.mime);
    if (!ok) deny('attachments', `${a.filename} (${a.mime}) may not be attached; send a vault link`);
  }

  // Data-loss checks: no secret, key or private note leaves in an email.
  for (const [where, s] of [['subject', p.subject || ''], ['body', p.text || '']]) {
    for (const f of scanText('outbound-email', s)) deny('data loss', `${where} line ${f.line}: ${f.kind}`);
    for (const re of policy.dlp_markers || []) if (new RegExp(re, 'i').test(s)) deny('data loss', `${where} holds a marked private note (${re})`);
  }

  // Rates, counted from the outbox (sent entries only).
  const rates = policy.rates || {};
  const sent = (ctx.outbox || []).filter((o) => now - Date.parse(o.at) < DAY && Date.parse(o.at) <= now);
  if (sent.length >= (rates.per_day ?? 0)) deny('rate', `${sent.length} emails sent in the last 24 hours, the limit is ${rates.per_day ?? 0}`);
  const mine = sent.filter((o) => o.author === p.author).length;
  if (mine >= (rates.per_agent_per_day ?? 0)) deny('rate', `${p.author} sent ${mine} in the last 24 hours, the limit is ${rates.per_agent_per_day ?? 0}`);
  for (const a of recipients) {
    const n = sent.filter((o) => o.to.map(lower).includes(a)).length;
    if (n >= (rates.per_recipient_per_day ?? 0)) deny('rate', `${a} was sent ${n} in the last 24 hours, the limit is ${rates.per_recipient_per_day ?? 0}`);
  }

  // Altitude 5: may this go without a person? Only under a matching automation.
  let automation = null;
  if (!reasons.length) {
    automation = (policy.automations || []).find((x) => x.agents.includes(p.author) && x.kinds.includes(p.kind)
      && x.languages.includes(p.language) && (!x.templates || (p.template && x.templates.includes(p.template.id)))
      && (x.first_contact === true ? true : firstContacts.length === 0)) || null;
    if (!automation) hold('approval', 'no signed automation covers this email: a person approves it');
  }
  const decision = reasons.some((x) => x.level === 'deny') ? 'deny' : reasons.length ? 'hold' : 'allow';
  return { decision, reasons, first_contact: firstContacts, automation: automation?.id || null };
}
