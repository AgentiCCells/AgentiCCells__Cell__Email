// The simple send screen (/app/send.html): pick a contact, see the draft, edit, press Send.
// Two modes. Demo: the synthetic mailbox (demo/mailbox.js) and FakeGmail, no sign-in, every send
// recorded as a simulation. Real: the Google token the gateway keeps sealed to the page's own key,
// a recipient typed by hand (no lookup), Gmail's messages.send. In both, send.js's checks run and
// the person confirms before anything is sent.
// By mail.dev.a@AgentiCCells.dinis, 2026-11-23. Apache-2.0.
import { DEMO, REAL, modeFor, contactFrom, filterContacts, toMessage, check, confirmText, sendRecord, sentTodayQuery, dayCounter, MAX_PER_DAY } from './compose.js?v=__VERSION__';
import { demoMailbox, FakeGmail } from './demo/mailbox.js?v=__VERSION__';
import { rawMessage } from './send.js?v=__VERSION__';
import { existingIdentity, recall, keep } from './pki.js?v=__VERSION__';

const $ = (id) => document.getElementById(id);
const el = (tag, props = {}, ...kids) => { const e = Object.assign(document.createElement(tag), props); e.append(...kids); return e; };

let mode = DEMO, token = null, from = '', canRead = false;
let box = null, gmail = null, chosen = null, draft = { to: '', subject: '', text: '' };
let sentToday = 0, counter = null, countFailed = false; // counter: real mode only, sealed per UTC day

// ------------------------------------------------------------ the real Gmail, with the person's token
async function real(path, opts = {}) {
  const r = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/${path}`, { ...opts, headers: { Authorization: `Bearer ${token.token}`, ...(opts.headers || {}) }, referrerPolicy: 'no-referrer' });
  if (r.status === 401) throw new Error('the Google token has expired (they last an hour); connect again on the gateway');
  if (!r.ok) throw new Error(`Gmail answered ${r.status}`);
  return r.json();
}
const realGmail = {
  async profile() { return real('profile'); },
  async send(raw) { return real('messages/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ raw }) }); },
  async sentToday() {
    if (!canRead) return null; // a send-only token cannot search; the page counts its own sends instead
    const r = await real(`messages?maxResults=100&q=${encodeURIComponent(sentTodayQuery())}`);
    return (r.messages || []).length;
  },
};

// ------------------------------------------------------------ the screen
function showContacts() {
  const list = filterContacts(box.contacts, $('q').value);
  $('contacts').replaceChildren(...list.map((c) => {
    const b = el('button', { type: 'button', className: 'contact' + (chosen?.id === c.id ? ' on' : '') },
      el('span', { className: 'name', textContent: c.name }),
      el('span', { className: 'muted small', textContent: `${c.role}, ${c.org}` }),
      el('span', { className: 'muted small addr', textContent: c.address }));
    b.setAttribute('aria-pressed', String(chosen?.id === c.id));
    b.addEventListener('click', () => choose(c));
    return el('li', {}, b);
  }));
  if (!list.length) $('contacts').append(el('li', { className: 'muted', textContent: 'Nobody matches.' }));
}

function choose(c) {
  chosen = c;
  $('draft').classList.remove('waiting');
  // Not everyone has a draft waiting; then the page starts one with only To filled in.
  const d = box.drafts.find((x) => x.contact === c.id);
  draft = d ? { to: d.to.join(', '), subject: d.subject, text: d.text } : { to: c.address, subject: '', text: '' };
  $('status').textContent = d ? '' : `No draft waiting for ${c.first}: write one.`;
  fill();
  showContacts();
  $('text').focus();
}

function fill() { $('to').value = draft.to; $('subject').value = draft.subject; $('text').value = draft.text; review(); }

function message() { return toMessage({ to: $('to').value, subject: $('subject').value, text: $('text').value }); }

// The checks, live as the person types; Send is pressable only when there is nothing in the way.
function review() {
  const why = check(message(), { sentToday });
  if (countFailed) why.push('the page cannot read how many were sent today, so it cannot keep to the daily limit');
  $('problems').replaceChildren(...why.map((w) => el('li', { textContent: `Not sendable: ${w}.` })));
  $('send').disabled = why.length > 0;
  $('today').textContent = countFailed ? '?' : String(sentToday);
  return why;
}

async function send() {
  const m = message();
  if (review().length) return;
  if (!confirm(confirmText(m, from, mode))) { $('status').textContent = 'Not sent.'; return; }
  $('send').disabled = true; $('status').textContent = mode === DEMO ? 'Sending to the demo mailbox (simulation)...' : 'Sending...';
  let res;
  try { res = await gmail.send(rawMessage(m)); }
  catch (e) { $('status').textContent = `Not sent: ${e.message}.`; review(); return; }
  let counted = true;
  if (counter) { try { await counter.add(); } catch { counted = false; countFailed = true; } }
  const rec = sendRecord(m, res, { mode, from });
  $('status').textContent = mode === DEMO ? `Simulation: "sent" to the demo mailbox (id ${rec.gmail_id}). Nothing left this page.` : `Sent (Gmail id ${rec.gmail_id}). It is in your Gmail Sent folder.${counted ? '' : ' The page could not record it in today\'s count, so it will not send again until reloaded.'}`;
  const li = el('li', {}, el('span', { textContent: `${rec.sent_at.slice(11, 16)} UTC, to ${rec.to.join(', ')}: ${rec.subject}` }));
  if (rec.simulation) li.prepend(el('span', { className: 'tag', textContent: 'simulation' }), ' ');
  $('sent').prepend(li);
  if (counted) await recount();
  review();
}

// Today's count: in real mode max(the sealed count, Gmail's Sent count when the token can read);
// in demo mode FakeGmail's own count.
async function recount() {
  let g = null;
  try { g = await gmail.sentToday(); } catch { /* fall back to the sealed count */ }
  if (!counter) { sentToday = g || 0; return; }
  try { sentToday = await counter.count(g); countFailed = false; } catch { countFailed = true; }
}

function setMode(why) {
  const demo = mode === DEMO;
  document.body.classList.toggle('is-demo', demo);
  $('mode').hidden = false; $('mode').textContent = demo ? 'Demo mode' : 'Your Gmail';
  $('demo-banner').hidden = !demo; $('real-banner').hidden = demo;
  $('switch').textContent = demo ? 'Use my Gmail' : 'Try the demo';
  $('switch').href = demo ? 'send.html' : 'send.html?demo';
  $('why').hidden = !(demo && why && why !== 'asked for');
  $('why').textContent = demo ? `Opened in demo mode: ${why}.` : '';
  $('contacts-box').hidden = !demo; $('no-lookup').hidden = demo;
  $('max').textContent = String(MAX_PER_DAY);
}

async function start() {
  const id = await existingIdentity().catch(() => null);
  token = id ? JSON.parse((await recall(id, 'google:token').catch(() => null)) || 'null') : null;
  const m = modeFor({ search: location.search, token });
  mode = m.mode;
  if (mode === REAL) {
    gmail = realGmail; canRead = !!token.can_read;
    try { from = (await gmail.profile()).emailAddress; } catch { from = 'your Gmail address'; }
    counter = dayCounter({ load: (k) => recall(id, k), save: (k, v) => keep(id, k, v) });
    await recount();
    $('today-src').textContent = canRead ? ' (the larger of your Gmail Sent folder and this page\'s own count)' : ' (this page\'s own count, kept sealed in this browser; this token cannot read Sent)';
    $('real-from').textContent = from;
  } else {
    box = demoMailbox(); gmail = new FakeGmail({ me: box.me }); from = box.me.address;
    $('today-src').textContent = ' (in this demo)';
    showContacts();
  }
  $('from').textContent = `From ${from}${mode === DEMO ? ' (made up)' : ''}.`;
  setMode(m.why);
  // G3's order: the page opens on the contact list; the draft shows once a contact is picked.
  // ?contact=<id> opens straight on that contact's draft (for links from the CRM demo).
  const linked = mode === DEMO ? contactFrom(location.search, box.contacts) : null;
  if (linked) choose(linked);
  $('draft').classList.toggle('waiting', mode === DEMO && !chosen);
  review();
}

for (const f of ['to', 'subject', 'text']) $(f).addEventListener('input', review);
$('q').addEventListener('input', showContacts);
$('send').addEventListener('click', send);
$('reset').addEventListener('click', () => { if (chosen) choose(chosen); else { draft = { to: '', subject: '', text: '' }; fill(); } });
start().catch((e) => { $('status').textContent = `The page could not start: ${e.message}.`; });
