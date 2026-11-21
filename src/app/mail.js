// The mail client: read and send straight from Gmail in this browser, without the vault.
// Dinis Cruz, 21 November 2026: "can you add a Web UI email client (pure JS, HTML, CSS), that does
// not use the vault store? (for now) ... make it look as much possible with popular and effective
// web email clients (since we should also support using this without a vault)".
// - The Google token is the one the gateway (connect.html) keeps sealed to the page's own key; it
//   must carry gmail.readonly ("Allow reading"). This page never asks Google itself.
// - Message text is untrusted: HTML is shown only in a sandboxed frame with no scripts; the page's
//   policy, which the frame inherits, blocks every remote image, font and request (no tracking).
// - With gmail.readonly, opening a message does not mark it read, and there is no archive or star.
// By cell.email.b@AgentiCCells.dinis, 2026-11-21. Apache-2.0.
import { existingIdentity, recall } from './pki.js?v=__VERSION__';
import { partsOf, header, displayName, parseAddress, splitAddresses, shortDate, longDate, size, respond, frameDoc, b64urlBytes } from './mailparse.js?v=__VERSION__';
import { problems, rawMessage } from './send.js?v=__VERSION__';

const $ = (id) => document.getElementById(id);
const el = (tag, props = {}, ...kids) => { const e = Object.assign(document.createElement(tag), props); e.append(...kids.filter((k) => k != null)); return e; };
const API = 'https://gmail.googleapis.com/gmail/v1/users/me/';
const PAGE = 50, PARALLEL = 10;
// Icons from the sprite in mail.html (design round 1, design.b.rounds@SovereignWebsite.dinis, 21 November 2026).
const NS = 'http://www.w3.org/2000/svg';
const icon = (name, cls = 'i') => { const s = document.createElementNS(NS, 'svg'); s.setAttribute('class', cls); s.setAttribute('aria-hidden', 'true'); const u = document.createElementNS(NS, 'use'); u.setAttribute('href', '#i-' + name); s.append(u); return s; };
const FOLDERS = [['INBOX', 'Inbox', 'inbox'], ['STARRED', 'Starred', 'star'], ['SENT', 'Sent', 'sent'], ['DRAFT', 'Drafts', 'draft'], ['', 'All mail', 'all'], ['SPAM', 'Spam', 'spam'], ['TRASH', 'Bin', 'bin']];
const iconOf = (label) => (FOLDERS.find((f) => f[0] === label) || [0, 0, 'inbox'])[2];

let token = '', canSend = false, me = '';
let view = { label: 'INBOX', q: '', title: 'Inbox', pages: [''], page: 0 };
let rows = [], focus = -1, openId = '';

// ------------------------------------------------------------ Gmail
async function api(path, opts = {}) {
  for (let attempt = 0; ; attempt++) {
    const r = await fetch(API + path, { ...opts, headers: { Authorization: `Bearer ${token}`, ...(opts.headers || {}) }, referrerPolicy: 'no-referrer' });
    if (r.ok) return r.json();
    const body = await r.json().catch(() => null);
    const reason = body?.error?.errors?.[0]?.reason || body?.error?.status || '';
    if (r.status === 401) { gate('The Google token has expired (they last an hour).'); throw new Error('the Google token has expired'); }
    const retry = r.status === 429 || r.status >= 500 || (r.status === 403 && /rate|quota|limit/i.test(reason));
    if (!retry || attempt >= 5) throw new Error(`Gmail answered ${r.status}${reason ? ` (${reason})` : ''}`);
    await new Promise((res) => setTimeout(res, 500 * 2 ** attempt * (0.75 + Math.random() / 2)));
  }
}
async function pool(items, fn) {
  const out = new Array(items.length); let next = 0;
  await Promise.all(Array.from({ length: Math.min(PARALLEL, items.length) }, async () => { while (next < items.length) { const i = next++; out[i] = await fn(items[i]).catch(() => null); } }));
  return out;
}

function gate(why) { $('gate-why').textContent = why; $('gate').hidden = false; }
function toast(text, ms = 4000) { const t = $('toast'); t.textContent = text; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => { t.hidden = true; }, ms); }

// ------------------------------------------------------------ folders and labels
function folderButton(id, name, iconName, extra) {
  const b = el('button', { type: 'button' }, iconName ? icon(iconName) : el('span', { className: 'dot' }), el('span', { textContent: name }), extra);
  b.dataset.label = id;
  b.addEventListener('click', () => { document.body.classList.remove('side-open'); go({ label: id, q: '', title: name }); });
  return el('li', {}, b);
}
async function loadFolders() {
  $('folders').replaceChildren(...FOLDERS.map(([id, name, icon]) => folderButton(id, name, icon, id === 'INBOX' ? el('span', { className: 'count', id: 'inbox-count' }) : null)));
  const { labels = [] } = await api('labels');
  const user = labels.filter((l) => l.type === 'user').sort((a, b) => a.name.localeCompare(b.name));
  $('labels').replaceChildren(...user.map((l) => {
    const li = folderButton(l.id, l.name, '', null);
    if (l.color?.backgroundColor) li.querySelector('.dot').style.background = l.color.backgroundColor;
    return li;
  }));
  api('labels/INBOX').then((l) => { if (l.messagesUnread) $('inbox-count').textContent = l.messagesUnread.toLocaleString('en-GB'); }).catch(() => {});
}
function markFolder() { for (const b of document.querySelectorAll('.folders button')) b.setAttribute('aria-current', String(!view.q && b.dataset.label === view.label)); }

// ------------------------------------------------------------ the list
function go(v) { view = { ...view, ...v, pages: [''], page: 0 }; markFolder(); loadList(); }
async function loadList() {
  $('list-title').textContent = view.q ? `Search: ${view.q}` : view.title;
  rows = []; focus = -1; status('');
  $('threads').replaceChildren(...Array.from({ length: 8 }, () => el('li', { className: 'skel', ariaHidden: 'true' }, el('span'), el('span'), el('span'))));
  $('threads').setAttribute('aria-busy', 'true');
  $('prev').disabled = $('next').disabled = true;
  try {
    const q = new URLSearchParams({ maxResults: String(PAGE) });
    if (view.label && !view.q) q.set('labelIds', view.label);
    if (view.q) q.set('q', view.q);
    if (!view.q && (view.label === 'SPAM' || view.label === 'TRASH')) q.set('includeSpamTrash', 'true');
    if (view.pages[view.page]) q.set('pageToken', view.pages[view.page]);
    const r = await api(`threads?${q}`);
    view.pages[view.page + 1] = r.nextPageToken || '';
    const list = r.threads || [];
    const meta = 'format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date';
    const threads = await pool(list, (t) => api(`threads/${t.id}?${meta}`));
    rows = threads.filter(Boolean).map(rowOf);
    $('threads').replaceChildren(...rows.map(rowEl)); $('threads').removeAttribute('aria-busy');
    const start = view.page * PAGE;
    $('range').textContent = rows.length ? `${start + 1}–${start + rows.length}` : '';
    $('prev').disabled = view.page === 0; $('next').disabled = !view.pages[view.page + 1];
    $('prev').hidden = $('next').hidden = view.page === 0 && !view.pages[1];
    if (!rows.length) {
      if (view.q) status(`No conversations match “${view.q}”.`, 'search', 'Clear search', () => { $('search').value = ''; go({ q: '' }); });
      else status(`No conversations in ${view.title}.`, iconOf(view.label));
    }
  } catch (e) {
    $('threads').replaceChildren(); $('threads').removeAttribute('aria-busy');
    status(`Could not load the conversations: ${e.message}.`, 'refresh', 'Try again', () => loadList());
  }
}
// The list pane's empty and error block: the folder's icon, words that name it, and one action.
function status(text, iconName, action, fn) {
  const box = $('list-status');
  if (!text) { box.replaceChildren(); box.className = 'status'; return; }
  box.className = 'status big';
  const kids = [icon(iconName || 'inbox'), el('p', { textContent: text })];
  if (action) { const b = el('button', { type: 'button', className: 'textbtn', textContent: action }); b.addEventListener('click', fn); kids.push(b); }
  box.replaceChildren(...kids);
}
function rowOf(t) {
  const ms = t.messages || [], last = ms[ms.length - 1] || {};
  const senders = [];
  for (const m of ms) { const n = parseAddress(header(m, 'From')).address.toLowerCase() === me.toLowerCase() ? 'me' : displayName(header(m, 'From')); if (!senders.includes(n)) senders.push(n); }
  const showTo = view.label === 'SENT' && !view.q;
  return { id: t.id, from: showTo ? `To: ${splitAddresses(header(last, 'To')).map(displayName).join(', ')}` : senders.slice(-3).join(', '), count: ms.length,
    subject: header(ms[0], 'Subject') || '(no subject)', snippet: decodeEntities(last.snippet || ''), date: last.internalDate,
    unread: ms.some((m) => (m.labelIds || []).includes('UNREAD')), clip: ms.some((m) => /multipart\/mixed/i.test(m.payload?.mimeType || '')) };
}
function decodeEntities(s) { const t = document.createElement('textarea'); t.innerHTML = s; return t.value; }
// Each row is a real button (Tab and Enter work; design round 1, item 10); j and k move the focus.
function rowEl(r, i) {
  const b = el('button', { type: 'button', className: 'row' },
    el('span', { className: 'from' }, r.from, r.count > 1 ? el('span', { className: 'n', textContent: ` ${r.count}` }) : null),
    el('span', { className: 'date', textContent: shortDate(r.date) }),
    el('span', { className: 'subj' }, el('b', { textContent: r.subject }), r.clip ? icon('clip', 'i i-s') : null),
    el('span', { className: 'snip', textContent: r.snippet }));
  if (r.clip) b.title = 'Has attachments';
  b.setAttribute('aria-current', String(r.id === openId));
  b.addEventListener('click', () => { focus = i; openThread(r.id); });
  b.addEventListener('focus', () => { focus = i; });
  return el('li', { className: r.unread ? 'unread' : '' }, b);
}
function setFocus(i) {
  const bs = $('threads').querySelectorAll('.row'); if (!bs.length) return;
  focus = Math.max(0, Math.min(bs.length - 1, i));
  bs[focus].focus(); bs[focus].scrollIntoView({ block: 'nearest' });
}

// ------------------------------------------------------------ a conversation
const COLOURS = ['#8a4b12', '#2f6b2a', '#3b5b8c', '#7a3e6b', '#a3263a', '#4f5d2f', '#6b4f2a', '#2d6a6a']; // 4.5:1 or more with white
function avatar(name) { let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0; return el('span', { className: 'avatar', textContent: (name[0] || '?').toUpperCase(), style: `background:${COLOURS[h % COLOURS.length]}` }); }

let current = null;
async function openThread(id) {
  openId = id; for (const [k, b] of [...$('threads').querySelectorAll('.row')].entries()) b.setAttribute('aria-current', String(rows[k]?.id === id));
  if (!document.body.classList.contains('reading')) { document.body.classList.add('reading'); history.pushState({ t: id }, ''); }
  $('empty').hidden = true; $('thread').hidden = false; $('messages').replaceChildren(el('p', { className: 'status', textContent: 'Opening...' }));
  try {
    const t = await api(`threads/${id}?format=full`);
    if (openId !== id) return;
    current = t;
    const ms = t.messages || [];
    $('thread-subject').textContent = header(ms[0], 'Subject') || '(no subject)';
    $('messages').replaceChildren(...ms.map((m, i) => messageEl(m, i === ms.length - 1 || (m.labelIds || []).includes('UNREAD'))));
    $('messages').append(el('div', { className: 'actions' },
      pill('reply', 'Reply', () => answer('reply')), pill('replyall', 'Reply all', () => answer('replyAll')), pill('forward', 'Forward', () => answer('forward'))));
  } catch (e) { $('messages').replaceChildren(el('p', { className: 'status', textContent: `Could not open it: ${e.message}.` })); }
}
const pill = (iconName, text, fn) => { const b = el('button', { type: 'button', className: 'pill' }, icon(iconName, 'i i-s'), text); b.addEventListener('click', fn); return b; };
const TITLES = { reply: 'Reply', replyAll: 'Reply all', forward: 'Forward' };
function answer(kind) { const ms = current?.messages || []; if (ms.length) compose(respond(kind, ms[ms.length - 1], me), TITLES[kind]); }
$('t-reply').addEventListener('click', () => answer('reply'));
$('t-replyall').addEventListener('click', () => answer('replyAll'));
$('t-forward').addEventListener('click', () => answer('forward'));

function messageEl(m, open) {
  const from = header(m, 'From'), a = parseAddress(from), name = a.name || a.address;
  const to = [header(m, 'To'), header(m, 'Cc')].filter(Boolean).join(', ');
  const head = el('div', { className: 'msg-head' }, avatar(name),
    el('div', { className: 'who' }, el('b', { textContent: name, title: a.address }), a.name ? el('span', { className: 'addr', textContent: ` <${a.address}>` }) : null,
      el('div', { className: 'to', textContent: `to ${splitAddresses(to).map((x) => (parseAddress(x).address.toLowerCase() === me.toLowerCase() ? 'me' : displayName(x))).join(', ')}` }),
      el('div', { className: 'snippet', textContent: decodeEntities(m.snippet || '') })),
    el('span', { className: 'when', textContent: longDate(m.internalDate), title: header(m, 'Date') }));
  const body = el('div', { className: 'msg-body' });
  const box = el('div', { className: 'msg' + (open ? '' : ' collapsed') }, head, body);
  let drawn = false;
  const draw = () => {
    if (drawn) return; drawn = true;
    const parts = partsOf(m);
    const frame = el('iframe', { title: 'Message text', loading: 'lazy' });
    frame.setAttribute('sandbox', 'allow-same-origin allow-popups allow-popups-to-escape-sandbox'); // no scripts
    const dark = matchMedia('(prefers-color-scheme: dark)').matches;
    if (!parts.html) frame.classList.add('plain');
    frame.srcdoc = frameDoc(parts, { dark });
    const fit = () => { try { frame.style.height = (frame.contentDocument.documentElement.scrollHeight + 8) + 'px'; } catch { frame.style.height = '24rem'; } };
    frame.addEventListener('load', () => { fit(); setTimeout(fit, 300); });
    body.append(frame);
    const atts = parts.attachments.filter((x) => !x.inline || !parts.html);
    if (atts.length) body.append(el('div', { className: 'atts' }, ...atts.map((x) => attachmentEl(m.id, x))));
  };
  if (open) draw();
  head.addEventListener('click', () => { box.classList.toggle('collapsed'); if (!box.classList.contains('collapsed')) draw(); });
  return box;
}
function attachmentEl(msgId, x) {
  const b = el('button', { type: 'button', className: 'att', title: `Download ${x.name}` }, icon('clip'), el('span', {}, el('b', { textContent: x.name }), el('small', { textContent: `${size(x.size)} · ${x.mimeType}` })));
  b.addEventListener('click', async () => {
    b.disabled = true;
    try {
      const r = await api(`messages/${msgId}/attachments/${x.id}`);
      const url = URL.createObjectURL(new Blob([b64urlBytes(r.data)], { type: 'application/octet-stream' }));
      const a = el('a', { href: url, download: x.name }); document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (e) { toast(`Could not download ${x.name}: ${e.message}.`); }
    b.disabled = false;
  });
  return b;
}

// ------------------------------------------------------------ writing and sending
let draft = { threadId: '', inReplyTo: '', references: '' };
function compose(f = {}, title = 'New message') {
  if (!canSend) { toast('This token cannot send: press Allow reading on the gateway.'); return; }
  draft = { threadId: f.threadId || '', inReplyTo: f.inReplyTo || '', references: f.references || '' };
  $('composer-title').textContent = title;
  $('c-to').value = f.to || ''; $('c-cc').value = f.cc || ''; $('c-subject').value = f.subject || ''; $('c-text').value = f.text || '';
  $('c-status').textContent = ''; $('c-send').disabled = false;
  $('composer').hidden = false; $('composer').classList.remove('min');
  (f.to ? $('c-text') : $('c-to')).focus();
  if (f.to) $('c-text').setSelectionRange(0, 0);
}
function closeComposer() {
  const dirty = $('c-text').value.trim() && $('c-text').value !== $('c-text').defaultValue;
  if (dirty && !confirm('Discard this message?')) return;
  $('composer').hidden = true;
}
$('compose').addEventListener('click', () => compose());
$('composer-close').addEventListener('click', (e) => { e.stopPropagation(); closeComposer(); });
$('composer-back').addEventListener('click', (e) => { e.stopPropagation(); closeComposer(); });
$('c-discard').addEventListener('click', () => closeComposer());
$('composer-min').addEventListener('click', (e) => { e.stopPropagation(); $('composer').classList.toggle('min'); });
document.querySelector('.composer-head').addEventListener('click', () => $('composer').classList.remove('min'));
$('composer').addEventListener('submit', async (e) => {
  e.preventDefault();
  const m = { to: splitAddresses($('c-to').value).map((a) => parseAddress(a).address), cc: splitAddresses($('c-cc').value).map((a) => parseAddress(a).address), bcc: [],
    subject: $('c-subject').value.trim(), text: $('c-text').value, status: 'draft', inReplyTo: draft.inReplyTo, references: draft.references };
  const why = problems(m);
  if (why.length) { $('c-status').textContent = `Not sent: ${why.join('; ')}.`; return; }
  $('c-send').disabled = true; $('c-status').textContent = 'Sending...';
  try {
    const sent = await api('messages/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft.threadId ? { raw: rawMessage(m), threadId: draft.threadId } : { raw: rawMessage(m) }) });
    $('composer').hidden = true; toast('Message sent.');
    if (openId && sent.threadId === openId) openThread(openId);
  } catch (err) { $('c-status').textContent = `Not sent: ${err.message}.`; $('c-send').disabled = false; }
});

// ------------------------------------------------------------ controls and keys
$('search-form').addEventListener('submit', (e) => { e.preventDefault(); const q = $('search').value.trim(); go({ q, title: view.title }); });
$('refresh').addEventListener('click', () => loadList());
$('prev').addEventListener('click', () => { if (view.page > 0) { view.page--; loadList(); } });
$('next').addEventListener('click', () => { if (view.pages[view.page + 1]) { view.page++; loadList(); } });
// Back (the arrow, u, Esc, or the phone's own back gesture) closes the conversation.
function closeReading() { if (document.body.classList.contains('reading')) history.back(); }
window.addEventListener('popstate', () => { document.body.classList.remove('reading'); const b = $('threads').querySelectorAll('.row')[focus]; if (b) b.focus(); });
$('back').addEventListener('click', closeReading);
$('menu').addEventListener('click', () => document.body.classList.toggle('side-open'));
$('scrim').addEventListener('click', () => document.body.classList.remove('side-open'));
let lastKey = '';
document.addEventListener('keydown', (e) => {
  if (e.target.closest('input,textarea,[contenteditable]') || e.metaKey || e.ctrlKey || e.altKey) { if (e.key === 'Escape') e.target.blur(); return; }
  const last = current?.messages?.[current.messages.length - 1];
  const k = e.key;
  if (lastKey === 'g' && k === 'i') { go({ label: 'INBOX', q: '', title: 'Inbox' }); lastKey = ''; return; }
  if (lastKey === 'g' && k === 'r') { loadList(); lastKey = ''; return; }
  lastKey = k;
  if (k === 'j') setFocus(focus + 1);
  else if (k === 'k') setFocus(focus - 1);
  else if ((k === 'Enter' || k === 'o') && focus >= 0) openThread(rows[focus].id);
  else if (k === 'u' || k === 'Escape') { if ($('composer').hidden) closeReading(); }
  else if (k === 'c') { e.preventDefault(); compose(); }
  else if (k === '/') { e.preventDefault(); $('search').focus(); }
  else if (last && k === 'r') { e.preventDefault(); compose(respond('reply', last, me), 'Reply'); }
  else if (last && k === 'a') { e.preventDefault(); compose(respond('replyAll', last, me), 'Reply all'); }
  else if (last && k === 'f') { e.preventDefault(); compose(respond('forward', last, me), 'Forward'); }
});

// ------------------------------------------------------------ on load
async function start() {
  const id = await existingIdentity().catch(() => null);
  const g = id ? JSON.parse((await recall(id, 'google:token').catch(() => null)) || 'null') : null;
  if (!g || Date.now() >= g.expires_at - 60000) return gate(g ? 'The Google token has expired (they last an hour).' : 'This browser holds no Google token yet.');
  if (!g.can_read) return gate('The Google token here allows headers only, not reading mail.');
  token = g.token; canSend = !!g.can_send;
  try { const p = await api('profile'); me = p.emailAddress; $('me').textContent = `Signed in as ${me}`; $('me-initial').textContent = (me[0] || '?').toUpperCase(); } catch (e) { return; }
  await loadFolders().catch((e) => toast(`Could not read labels: ${e.message}.`));
  go({ label: 'INBOX', q: '', title: 'Inbox' });
}
start();
