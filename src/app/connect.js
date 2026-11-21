// The browser gateway, as simple as it can be (Dinis Cruz, 16 November 2026: "a button to connect,
// a QR code with a public key, a place to paste ... and should detect paste or drop the QR code with
// the secrets. And that's it. And then the next button should be open vault. In fact, as soon as I
// paste the thing, you should detect that and should open the vault/outbox straight away").
// - Connect: Google, gmail scopes, token kept sealed to the page's key with its expiry.
// - The page's public key as a QR code, shown at once.
// - Paste or drop a sealed QR code (image or text) anywhere: it is opened at once, what it carries
//   (vault keys, the SG/Send access token) is kept sealed to the page's key, and the vaults open.
//   Pasting or dropping is the person bringing the code; an unsigned code says so.
// - Open vault opens what is kept; Sync writes the mailbox's headers and labels into the twin.
// By cell.email@AgentiCCells.dinis, 2026-11-16. Apache-2.0.
import { authUrl, newState, parseFragment } from './oauth.js?v=__VERSION__';
import { BODY_FILES, messageOf, problems, rawMessage, sentOn } from './send.js?v=__VERSION__';
import { HEADERS, syncPlan } from './twin.js?v=__VERSION__';
import { createTwinVault, displayKey, openTwinVault, readState as readVaultState, readThreads, writeMany, publish, readJson, ensureLoaded } from './vault.js?v=__VERSION__';
import { identity, existingIdentity, publicQrText, openSealed, keep, recall, forget, kept, sealedStore } from './pki.js?v=__VERSION__';
import { sso } from './vendor/pki/v0.2.28/sso.js';
import * as K from './vendor/pki/v0.2.28/keys.js';
import { TRUSTED } from './trusted.js?v=__VERSION__';
import qrcode from './vendor/qrcode-generator/2.0.4/qrcode.mjs?v=__VERSION__';

const OUTBOX_VAULT = 'co57gzld'; // promptugal-outreach (conductor@PrompTugal.dinis)
const STATE_KEY = 'cell-email.oauth-state';
// The root this site trusts for "Sign in with pki.sgit.ai": Dinis Cruz's key, as pki.sgit.ai's guide
// for sites gives it. Pinned here, never read from the register; to be confirmed by Dinis.
const PKI_ROOT = 'sha256:db7f79fdd87e030a';
const $ = (id) => document.getElementById(id);

let token = null; // Google
let canSend = false, me = ''; // whether the token carries gmail.send; the Gmail address
let accessToken = ''; // SG/Send
let twin = null, outbox = null, labelList = [];
let trusted = [...TRUSTED]; // plus the person signed in with pki.sgit.ai, once checked

const say = (id, text) => { $(id).textContent = text; };
function readState() { try { return sessionStorage.getItem(STATE_KEY); } catch { return null; } }
function writeState(v) { try { if (v) sessionStorage.setItem(STATE_KEY, v); else sessionStorage.removeItem(STATE_KEY); } catch { /* private mode */ } }

$('trusted-list').textContent = TRUSTED.map((t) => `${t.label}, ${t.bundle.signing_fingerprint}`).join('; ');

// ------------------------------------------------------------ Google
// Gmail says "slow down" with 429, or with 403 and a rate-limit reason; e.retry marks both, and 5xx.
async function gmail(path) {
  const r = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/${path}`, { headers: { Authorization: `Bearer ${token}` }, referrerPolicy: 'no-referrer' });
  if (!r.ok) {
    const body = await r.json().catch(() => null);
    const reason = body?.error?.errors?.[0]?.reason || body?.error?.status || '';
    const e = new Error(`Gmail answered ${r.status}${reason ? ` (${reason})` : ''}`);
    e.status = r.status; e.retry = r.status === 429 || r.status >= 500 || (r.status === 403 && /rate|quota|limit/i.test(reason));
    throw e;
  }
  return r.json();
}

async function connected() {
  say('who', 'Reading Gmail...');
  try {
    const [p, labels] = await Promise.all([gmail('profile'), gmail('labels')]);
    labelList = labels.labels || []; me = p.emailAddress;
    say('who', `Connected as ${p.emailAddress}: ${Number(p.messagesTotal).toLocaleString('en-GB')} messages, ${Number(p.threadsTotal).toLocaleString('en-GB')} threads.`);
    $('connect').hidden = true; $('revoke').hidden = false; $('allow-send').hidden = canSend;
    if (canSend) $('who').textContent += ' Sending is allowed.';
    buttons();
  } catch (e) { token = null; say('who', `Could not read Gmail: ${e.message}. Connect again.`); $('connect').hidden = false; }
}

function signIn(send) {
  const bytes = new Uint8Array(16); crypto.getRandomValues(bytes);
  const state = newState(bytes); writeState(state);
  location.assign(authUrl(state, { send }));
}
$('connect').addEventListener('click', () => signIn(false));
$('allow-send').addEventListener('click', () => signIn(true));

$('revoke').addEventListener('click', async () => {
  if (token) { try { await fetch('https://oauth2.googleapis.com/revoke', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: `token=${encodeURIComponent(token)}`, referrerPolicy: 'no-referrer' }); } catch { /* it expires within the hour anyway */ } }
  token = null; canSend = false; await forget('google:token').catch(() => {});
  $('revoke').hidden = true; $('allow-send').hidden = true; $('connect').hidden = false;
  say('who', 'Disconnected: the Google token was revoked and forgotten here.');
  buttons();
});

// ------------------------------------------------------------ the page's key, and sealed codes
// Drawn on a canvas, so the browser offers "Copy image"; the Copy button puts the image and its text
// on the clipboard together (Dinis, 16 November 2026: "I still can't copy the QR").
let keyCanvas = null, keyText = '';
identity().then((id) => {
  keyText = publicQrText(id);
  const qr = qrcode(0, 'M'); qr.addData(keyText); qr.make();
  const n = qr.getModuleCount(), cell = 6, margin = 4 * cell, c = document.createElement('canvas');
  c.width = c.height = n * cell + 2 * margin;
  const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.fillStyle = '#000';
  for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) if (qr.isDark(r, k)) g.fillRect(margin + k * cell, margin + r * cell, cell, cell);
  c.setAttribute('role', 'img'); c.setAttribute('aria-label', "This page's public key as a QR code");
  $('key-qr').replaceChildren(c); keyCanvas = c;
  $('copy-qr').hidden = false;
}).catch((e) => say('sealed-status', `Could not make the page's key: ${e.message}.`));

async function copyQr() {
  if (!keyCanvas) return;
  const btn = $('copy-qr'), label = btn.textContent;
  const png = await new Promise((res) => keyCanvas.toBlob(res, 'image/png'));
  const text = new Blob([keyText], { type: 'text/plain' });
  let done = '';
  try { await navigator.clipboard.write([new ClipboardItem({ 'image/png': png, 'text/plain': text })]); done = 'Copied'; }
  catch { try { await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]); done = 'Copied'; } catch { try { await navigator.clipboard.writeText(keyText); done = 'Copied as text'; } catch { done = 'Could not copy'; } } }
  btn.textContent = done; setTimeout(() => { btn.textContent = label; }, 2000);
}
$('copy-qr').addEventListener('click', copyQr);
$('key-qr').addEventListener('click', copyQr);

async function openSealedText(text) {
  text = String(text || '').trim();
  if (!text) return;
  try {
    const id = await identity();
    const r = await openSealed(id, text, trusted, { carried: true });
    const got = [];
    for (const v of r.vaultKeys) {
      await keep(id, 'vault:' + v.id, v.key);
      if (v.id !== OUTBOX_VAULT) await keep(id, 'vault:twin', v.key);
      got.push(v.id === OUTBOX_VAULT ? 'the outbox key' : `the key of vault ${v.id}`);
    }
    if (r.grant) { await keep(id, 'sgsend:token', r.grant.token); accessToken = r.grant.token; got.push('the SG/Send access token'); }
    const from = r.from.startsWith('a code you brought') ? '' : ` From ${r.from}.`;
    say('sealed-status', got.length ? `Kept in this browser: ${got.join(', ')}.${from}` : `Opened, but it carries no vault key or access token.${from}`);
    $('drop').value = '';
    await buttons();
    if (got.length) await openVaults();
  } catch (e) { say('sealed-status', `Not opened: ${e.message}.`); }
}

function decodeImage(source, w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(source, 0, 0, w, h);
  const found = window.jsQR(g.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: 'attemptBoth' });
  return found ? found.data : null;
}

async function openImage(file) {
  try {
    const bmp = await createImageBitmap(file);
    const s = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    let text = decodeImage(bmp, Math.round(bmp.width * s), Math.round(bmp.height * s));
    // jsQR misses some large low-correction codes; the browser's own detector, where there is one, may not.
    if (!text && 'BarcodeDetector' in window) { try { text = (await new window.BarcodeDetector({ formats: ['qr_code'] }).detect(bmp))[0]?.rawValue || null; } catch { /* none here */ } }
    if (!text) { say('sealed-status', 'No QR code found in that image. Try a sharper or larger one.'); return; }
    await openSealedText(text);
  } catch (e) { say('sealed-status', `Could not read the image: ${e.message}.`); }
}

// Paste anywhere on the page, or drop onto it: an image is read as a QR code, text as the code.
async function take(data) {
  const img = [...(data?.files || [])].find((f) => f.type.startsWith('image/'));
  if (img) return openImage(img);
  return openSealedText(data?.getData('text/plain'));
}
document.addEventListener('paste', (ev) => { ev.preventDefault(); take(ev.clipboardData); });
document.addEventListener('dragover', (ev) => { ev.preventDefault(); $('drop').classList.add('over'); });
document.addEventListener('dragleave', () => $('drop').classList.remove('over'));
document.addEventListener('drop', (ev) => { ev.preventDefault(); $('drop').classList.remove('over'); take(ev.dataTransfer); });

// ------------------------------------------------------------ the vaults
async function buttons() {
  const hasToken = !!accessToken || (await kept('sgsend:token').catch(() => false));
  const hasKey = (await kept('vault:twin').catch(() => false)) || (await kept('vault:' + OUTBOX_VAULT).catch(() => false));
  $('open-vault').hidden = !(hasKey || hasToken);
  $('sync').hidden = !(twin && token);
  $('copy-twin-key').hidden = !twin;
}

async function openVaults() {
  const id = await identity();
  const lines = [];
  $('open-vault').disabled = true;
  say('vault-status', 'Opening (deriving keys takes a second or two)...');
  let twinKey = await recall(id, 'vault:twin').catch(() => null);
  if (!twinKey && accessToken) {
    // No twin vault yet: make one here. Its key is made in this browser and kept sealed to the
    // page's key; it is never shown to anyone (Dinis, 17 November 2026: "I should only have to
    // paste the QR code that you gave me").
    try { twin = await createTwinVault(accessToken); twinKey = displayKey(twin); await keep(id, 'vault:twin', twinKey); lines.push(`Twin vault ${twin.vaultId} created and open; its key is kept in this browser.`); }
    catch (e) { lines.push(`Could not create the twin vault: ${e.message}.`); }
  } else if (twinKey) {
    try { twin = await openTwinVault(accessToken, twinKey); lines.push(`Twin vault ${twin.vaultId} open${accessToken ? '' : ' to read only (no SG/Send access token yet)'}.`); }
    catch (e) { lines.push(`Twin vault: ${e.message}.`); }
  }
  const outboxKey = await recall(id, 'vault:' + OUTBOX_VAULT).catch(() => null);
  if (outboxKey) {
    try {
      outbox = await openTwinVault(accessToken, outboxKey);
      await ensureLoaded(outbox, '/outbox');
      const folders = (outbox.listFolder('/outbox') || []).filter((e) => e.type === 'folder').map((e) => e.name).sort();
      await showOutbox(folders);
      lines.push(`Outbox open: ${folders.length} message${folders.length === 1 ? '' : 's'}.`);
    } catch (e) { lines.push(`Outbox: ${e.message}.`); }
  }
  say('vault-status', lines.join(' ') || 'Nothing to open yet: paste the sealed QR code with your access token.');
  $('open-vault').disabled = false;
  $('open-vault').textContent = 'Open vault again';
  buttons();
}
$('open-vault').addEventListener('click', openVaults);

// ------------------------------------------------------------ the outbox: open, approve and send
// Dinis, 21 November 2026: "make sure that I can actually open the email and I can start to send
// from there". Each entry opens to the exact email; Approve and send sends that one email through
// Gmail with the person's own token, then records it in the outbox. Nothing sends without a press.
let outboxMetas = {};
async function readBody(folder, meta) {
  const names = (outbox.listFolder(folder) || []).filter((e) => e.type === 'file').map((e) => e.name);
  const name = BODY_FILES.find((n) => names.includes(n));
  return name ? new TextDecoder().decode(await outbox.getFile(folder, name)) : undefined;
}
const el = (tag, props = {}, ...kids) => { const e = Object.assign(document.createElement(tag), props); e.append(...kids); return e; };
function summary(meta, f) { return `${meta?.status || 'draft'} · to ${messageOf(meta).to.join(', ') || 'nobody'} · ${meta?.subject || f}`; }

async function showOutbox(folders) {
  const list = $('outbox-list'); list.replaceChildren(); outboxMetas = {};
  for (const f of folders) outboxMetas[f] = await readJson(outbox, `/outbox/${f}`, 'meta.json') || {};
  for (const f of folders) {
    const line = el('span', { textContent: summary(outboxMetas[f], f) });
    const open = el('button', { type: 'button', className: 'link', textContent: 'Open' });
    const box = el('div', { className: 'mail', hidden: true });
    const li = el('li', {}, line, ' ', open, box);
    open.addEventListener('click', async () => {
      if (!box.hidden) { box.hidden = true; open.textContent = 'Open'; return; }
      open.textContent = 'Close'; box.hidden = false; box.replaceChildren(el('p', { className: 'muted', textContent: 'Opening...' }));
      try { await showMail(box, f, line); } catch (e) { box.replaceChildren(el('p', { textContent: `Could not open it: ${e.message}.` })); }
    });
    list.append(li);
  }
}

async function showMail(box, f, line) {
  const folder = `/outbox/${f}`, meta = outboxMetas[f];
  const m = messageOf(meta, await readBody(folder, meta));
  const head = el('dl', {},
    el('dt', { textContent: 'To' }), el('dd', { textContent: m.to.join(', ') || '(nobody)' }),
    ...(m.cc.length ? [el('dt', { textContent: 'Cc' }), el('dd', { textContent: m.cc.join(', ') })] : []),
    el('dt', { textContent: 'Subject' }), el('dd', { textContent: m.subject || '(none)' }),
    el('dt', { textContent: 'Status' }), el('dd', { textContent: m.status + (meta.sent_at ? `, ${meta.sent_at}` : '') + (meta.approved_by ? `, approved by ${meta.approved_by}` : '') }));
  const body = el('pre', { className: 'mail-text', textContent: m.text || '(no text)' });
  const why = problems(m, { sentToday: sentOn(Object.values(outboxMetas)) });
  const status = el('p', { role: 'status' });
  const send = el('button', { type: 'button', textContent: 'Approve and send' });
  if (why.length) { send.disabled = true; status.textContent = `Not sendable: ${why.join('; ')}.`; }
  else if (!token) { send.disabled = true; status.textContent = 'Connect with Google to send.'; }
  else if (!canSend) { send.disabled = true; status.textContent = 'Press Allow sending (step 1) to let the page send from your Gmail.'; }
  else status.textContent = `Sends from ${me} to ${[...m.to, ...m.cc].join(', ')}, exactly as shown.`;
  send.addEventListener('click', async () => {
    if (!confirm(`Send "${m.subject}" from ${me} to ${[...m.to, ...m.cc].join(', ')} now?`)) return;
    send.disabled = true; status.textContent = 'Sending...';
    let sent;
    try {
      const r = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, referrerPolicy: 'no-referrer',
        body: JSON.stringify(m.threadId ? { raw: rawMessage(m), threadId: m.threadId } : { raw: rawMessage(m) }) });
      if (!r.ok) throw new Error(`Gmail answered ${r.status}`);
      sent = await r.json();
    } catch (e) { status.textContent = `Not sent: ${e.message}.`; send.disabled = false; return; }
    const who = pki?.session()?.identity?.name;
    const done = { ...meta, status: 'sent', sent_at: new Date().toISOString().slice(0, 19) + 'Z', gmail_id: sent.id, gmail_thread_id: sent.threadId,
      approved_by: `${me} in the page${who ? `, signed in with pki.sgit.ai as ${who}` : ''}` };
    outboxMetas[f] = done; line.textContent = summary(done, f);
    status.textContent = `Sent (Gmail id ${sent.id}). Recording it in the outbox...`;
    try { await writeMany(outbox, [{ folder, name: 'meta.json', data: JSON.stringify(done, null, 2) + '\n' }]); await publish(outbox); status.textContent = `Sent (Gmail id ${sent.id}) and recorded in the outbox.`; }
    catch (e) { status.textContent = `Sent (Gmail id ${sent.id}), but the outbox could not record it: ${e.message}. Do not send it again; it is in your Gmail Sent folder.`; }
  });
  box.replaceChildren(head, body, el('p', { className: 'actions' }, send), status);
}
$('copy-twin-key').addEventListener('click', async () => {
  const btn = $('copy-twin-key'), label = btn.textContent;
  try { await navigator.clipboard.writeText(await recall(await identity(), 'vault:twin')); btn.textContent = 'Copied: keep it in your password manager'; } catch { btn.textContent = 'Could not copy'; }
  setTimeout(() => { btn.textContent = label; }, 4000);
});

// ------------------------------------------------------------ sync: headers and labels into the twin
async function listIds() {
  const ids = []; let page = '';
  do {
    const q = new URLSearchParams({ maxResults: '500' }); if (page) q.set('pageToken', page);
    const r = await gmail(`messages?${q}`);
    for (const m of r.messages || []) ids.push(m.id);
    page = r.nextPageToken || '';
  } while (page);
  return ids;
}

const PARALLEL = 10;
let stopAsked = false; // the Stop button (Dinis, 21 November 2026: "can you also add resume and stop buttons")
// Returns { messages, error }: the headers read, in order, and the error that stopped the rest, if any.
// When Gmail says slow down, the worker waits (0.5 s doubling, with jitter, up to six tries); every
// worker stops at the first error that is not a slow-down, so the status line shows that error.
async function getMetadata(ids, onEach) {
  const q = 'format=metadata&' + HEADERS.map((h) => `metadataHeaders=${encodeURIComponent(h)}`).join('&');
  const out = new Array(ids.length); let next = 0, done = 0, error = null;
  async function worker() {
    while (next < ids.length && !error && !stopAsked) {
      const i = next++;
      for (let attempt = 0; !error && !stopAsked; attempt++) {
        try { out[i] = await gmail(`messages/${ids[i]}?${q}`); onEach(++done); break; }
        catch (e) {
          if (attempt >= 5 || !e.retry) { error = error || e; break; }
          await new Promise((r) => setTimeout(r, 500 * 2 ** attempt * (0.75 + Math.random() / 2)));
        }
      }
    }
  }
  // 10 at a time (Dinis, 21 November 2026: "can this sync happen a number of parallel threads?").
  // Gmail allows a user 250 quota units a second and a metadata read costs 5, so about 50 reads a
  // second; 10 in flight stays inside that, and a slow-down waits and retries above.
  await Promise.all(Array.from({ length: PARALLEL }, worker));
  return { messages: out.filter(Boolean), error, stopped: stopAsked && !error };
}

const BATCH = 1000; // newest first; each press adds up to this many the twin does not hold yet
$('sync-stop').addEventListener('click', () => {
  stopAsked = true; $('sync-stop').disabled = true;
  say('vault-status', 'Stopping: finishing the reads in flight, then writing what was read...');
});
$('sync').addEventListener('click', async () => {
  if (!twin || !token) return;
  $('sync').disabled = true; stopAsked = false;
  $('sync-stop').hidden = false; $('sync-stop').disabled = false;
  try {
    say('vault-status', 'Reading what the twin holds...');
    const state = await readVaultState(twin);
    say('vault-status', 'Listing messages in Gmail...');
    const all = await listIds();
    const missing = all.filter((id) => !state.ids[id]);
    const todo = missing.slice(0, BATCH);
    const { messages, error, stopped } = await getMetadata(todo, (n) => say('vault-status', `Reading headers: ${n} of ${todo.length}...`));
    if (error && !messages.length) throw error;
    if (!messages.length) { say('vault-status', 'Stopped before any message was read. Press Resume sync to go on.'); return; }
    $('sync-stop').disabled = true; // writing and publishing finish once started, so the twin stays whole
    // A stop part way keeps what was read: those messages are written and published now.
    state.threads = await readThreads(twin, [...new Set(messages.map((m) => 't-' + String(m.threadId).toLowerCase()))]);
    const plan = syncPlan({ profile: await gmail('profile'), gmailLabels: labelList, messages, state });
    await writeMany(twin, plan.files, (n, total) => say('vault-status', `Writing into the twin: ${n} of ${total} files...`));
    say('vault-status', 'Publishing...');
    await publish(twin);
    const left = missing.length - messages.length;
    const stop = error ? `Stopped after ${messages.length} of ${todo.length}: ${error.message}. ` : stopped ? `Stopped after ${messages.length} of ${todo.length}, as asked. ` : '';
    $('sync').textContent = left ? 'Resume sync' : 'Sync my mailbox';
    say('vault-status', `${stop}Synced: ${plan.added} messages added, ${plan.threads} threads changed, ${plan.hostile} marked hostile${plan.problems.length ? `, ${plan.problems.length} skipped` : ''}. ${left ? `${left.toLocaleString('en-GB')} older messages to go: press Resume sync.` : 'The twin holds every message.'}`);
  } catch (e) { say('vault-status', `Sync stopped: ${e.message}. Nothing half-written is published; press again to retry.`); }
  finally { $('sync').disabled = false; $('sync-stop').hidden = true; stopAsked = false; }
});

// ------------------------------------------------------------ on load
// ------------------------------------------------------------ Sign in with pki.sgit.ai
// The person's passkey stays at pki.sgit.ai (a passkey works only on its own site). pki.sgit.ai signs
// a delegation for a key this page makes, at this site only, for 7 days; this page checks it against
// the public register from the pinned root. The browser key and the delegation are kept sealed to
// the page's key (sealedStore), not in plain web storage. Once signed in, codes the person signs
// with their own key (for example from pki.sgit.ai's "Send a message") open as theirs.
const LEVEL = { strong: 'strong: your record vouches for it today', soft: 'soft: signed by your key, valid until its date', 'not-vouched': 'not vouched for yet: waiting for your record to be published', invalid: 'not valid' };
let pki = null, pkiStore = null;
async function pkiStart() {
  try {
    pkiStore = await sealedStore(await identity(), 'sso:store');
    pki = await sso({ root: PKI_ROOT, pki: 'https://pki.sgit.ai/', store: pkiStore });
    const back = await pki.finish().catch((e) => ({ ok: false, why: e.message }));
    await pkiStore.flush();
    if (back && !back.ok) say('pki-who', `Not signed in with pki.sgit.ai: ${back.why}.`);
    await pkiShow();
  } catch (e) { say('pki-who', `pki.sgit.ai sign-in is not available: ${e.message}.`); }
}
async function pkiShow() {
  const s = pki?.session();
  $('pki-signin').hidden = !!s; $('pki-signout').hidden = !s;
  if (!s) { trusted = [...TRUSTED]; return; }
  say('pki-who', `Signed in with pki.sgit.ai as ${s.identity.name}. Checking against the register...`);
  const st = await pki.status().catch((e) => ({ level: 'invalid', why: e.message }));
  say('pki-who', `Signed in with pki.sgit.ai as ${s.identity.name} (${LEVEL[st.level] || st.level}).`);
  if (st.level === 'invalid') { trusted = [...TRUSTED]; return; }
  // Their public key, so codes they sign open as theirs. The register's summary file is checked:
  // the bundle must be well formed and its signing fingerprint must be the identity just checked.
  try {
    const fp = s.identity.fp;
    if (!K.FP.test(fp)) throw new Error('not a fingerprint');
    const d = await (await fetch(`https://pki.sgit.ai/id/${fp.replace(':', '-')}.json`, { cache: 'no-cache', referrerPolicy: 'no-referrer' })).json();
    if (d.bundle?.signing_fingerprint !== fp || (await K.checkBundle(d.bundle)).length) throw new Error('the key file does not match');
    trusted = [...TRUSTED, { label: `${s.identity.name} (signed in with pki.sgit.ai)`, bundle: d.bundle }];
  } catch (e) { say('pki-who', `${$('pki-who').textContent} Could not read your public key: ${e.message}.`); }
}
$('pki-signin').addEventListener('click', async () => {
  const btn = $('pki-signin'); btn.disabled = true; btn.textContent = 'Making this browser\'s key...';
  try {
    // Make the browser key here and keep it sealed before leaving, so sso.js finds it on the way back.
    const KEY = `pki.sso.v1.${location.origin}`;
    if (!JSON.parse(pkiStore.getItem(KEY) || 'null')?.key) {
      const k = await K.generate(`browser key for ${location.origin}`);
      pkiStore.setItem(KEY, JSON.stringify({ key: { bundle: k.bundle, encrypt: K.b64(k.private.encrypt), sign: K.b64(k.private.sign) } }));
    }
    await pkiStore.flush();
    await pki.login({ can: ['identity', 'sign:approve'], days: 7, label: 'the email cell' });
  } catch (e) { say('pki-who', `Could not start the sign-in: ${e.message}.`); btn.disabled = false; btn.textContent = 'Sign in with pki.sgit.ai'; }
});
$('pki-signout').addEventListener('click', async () => { pki.logout(); await pkiStore.flush(); say('pki-who', 'Signed out of pki.sgit.ai on this page.'); pkiShow(); });

async function start() {
  const id = await existingIdentity();
  if (id) accessToken = (await recall(id, 'sgsend:token').catch(() => null)) || '';
  const answer = /[#&]pki=/.test(location.hash) ? { none: true } : parseFragment(location.hash, readState()); // a pki.sgit.ai answer is pkiStart's
  if (!answer.none) {
    history.replaceState(null, '', location.pathname); writeState(null);
    if (answer.error) say('who', `Not connected: ${answer.error}.`);
    else {
      token = answer.token; canSend = !!answer.canSend;
      await keep(await identity(), 'google:token', JSON.stringify({ token, can_send: canSend, expires_at: Date.now() + (answer.expiresIn || 3600) * 1000 })).catch(() => {});
    }
  } else if (id) {
    const g = JSON.parse((await recall(id, 'google:token').catch(() => null)) || 'null');
    if (g && Date.now() < g.expires_at - 60000) { token = g.token; canSend = !!g.can_send; }
  }
  if (token) await connected();
  await buttons();
}
start();
pkiStart();
