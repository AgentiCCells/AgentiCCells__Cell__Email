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
import { HEADERS, syncPlan } from './twin.js?v=__VERSION__';
import { openTwinVault, readState as readVaultState, readThreads, writeMany, publish, readJson, ensureLoaded } from './vault.js?v=__VERSION__';
import { identity, existingIdentity, publicQrText, openSealed, keep, recall, forget, kept } from './pki.js?v=__VERSION__';
import { TRUSTED } from './trusted.js?v=__VERSION__';
import qrcode from './vendor/qrcode-generator/2.0.4/qrcode.mjs?v=__VERSION__';

const OUTBOX_VAULT = 'co57gzld'; // promptugal-outreach (conductor@PrompTugal.dinis)
const STATE_KEY = 'cell-email.oauth-state';
const $ = (id) => document.getElementById(id);

let token = null; // Google
let accessToken = ''; // SG/Send
let twin = null, outbox = null, labelList = [];

const say = (id, text) => { $(id).textContent = text; };
function readState() { try { return sessionStorage.getItem(STATE_KEY); } catch { return null; } }
function writeState(v) { try { if (v) sessionStorage.setItem(STATE_KEY, v); else sessionStorage.removeItem(STATE_KEY); } catch { /* private mode */ } }

$('trusted-list').textContent = TRUSTED.map((t) => `${t.label}, ${t.bundle.signing_fingerprint}`).join('; ');

// ------------------------------------------------------------ Google
async function gmail(path) {
  const r = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/${path}`, { headers: { Authorization: `Bearer ${token}` }, referrerPolicy: 'no-referrer' });
  if (!r.ok) throw new Error(`Gmail answered ${r.status}`);
  return r.json();
}

async function connected() {
  say('who', 'Reading Gmail...');
  try {
    const [p, labels] = await Promise.all([gmail('profile'), gmail('labels')]);
    labelList = labels.labels || [];
    say('who', `Connected as ${p.emailAddress}: ${Number(p.messagesTotal).toLocaleString('en-GB')} messages, ${Number(p.threadsTotal).toLocaleString('en-GB')} threads.`);
    $('connect').hidden = true; $('revoke').hidden = false;
    buttons();
  } catch (e) { token = null; say('who', `Could not read Gmail: ${e.message}. Connect again.`); $('connect').hidden = false; }
}

$('connect').addEventListener('click', () => {
  const bytes = new Uint8Array(16); crypto.getRandomValues(bytes);
  const state = newState(bytes); writeState(state);
  location.assign(authUrl(state));
});

$('revoke').addEventListener('click', async () => {
  if (token) { try { await fetch('https://oauth2.googleapis.com/revoke', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: `token=${encodeURIComponent(token)}`, referrerPolicy: 'no-referrer' }); } catch { /* it expires within the hour anyway */ } }
  token = null; await forget('google:token').catch(() => {});
  $('revoke').hidden = true; $('connect').hidden = false;
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
    const r = await openSealed(id, text, TRUSTED, { carried: true });
    const got = [];
    for (const v of r.vaultKeys) {
      await keep(id, 'vault:' + v.id, v.key);
      if (v.id !== OUTBOX_VAULT) await keep(id, 'vault:twin', v.key);
      got.push(v.id === OUTBOX_VAULT ? 'the outbox key' : `the key of vault ${v.id}`);
    }
    if (r.grant) { await keep(id, 'sgsend:token', r.grant.token); accessToken = r.grant.token; got.push('the SG/Send access token'); }
    say('sealed-status', got.length ? `Kept, sealed to this page's key: ${got.join(', ')}. From ${r.from}.` : `Opened a code from ${r.from}, but it carries no vault key or access token.`);
    $('drop').value = '';
    await buttons();
    if (got.length && !$('open-vault').hidden) await openVaults();
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
  const hasKey = (await kept('vault:twin').catch(() => false)) || (await kept('vault:' + OUTBOX_VAULT).catch(() => false));
  $('open-vault').hidden = !hasKey;
  $('sync').hidden = !(twin && token);
}

async function openVaults() {
  const id = await identity();
  const lines = [];
  $('open-vault').disabled = true;
  say('vault-status', 'Opening (deriving keys takes a second or two)...');
  const twinKey = await recall(id, 'vault:twin').catch(() => null);
  if (twinKey) {
    try { twin = await openTwinVault(accessToken, twinKey); lines.push(`Twin vault ${twin.vaultId} open${accessToken ? '' : ' to read only (no SG/Send access token yet)'}.`); }
    catch (e) { lines.push(`Twin vault: ${e.message}.`); }
  }
  const outboxKey = await recall(id, 'vault:' + OUTBOX_VAULT).catch(() => null);
  if (outboxKey) {
    try {
      outbox = await openTwinVault(accessToken, outboxKey);
      await ensureLoaded(outbox, '/outbox');
      const folders = (outbox.listFolder('/outbox') || []).filter((e) => e.type === 'folder').map((e) => e.name).sort();
      const list = $('outbox-list'); list.replaceChildren();
      for (const f of folders) {
        const meta = await readJson(outbox, `/outbox/${f}`, 'meta.json');
        const li = document.createElement('li');
        li.textContent = `${meta?.status || '?'} · to ${(meta?.to || []).join(', ')} · ${meta?.subject || f}`;
        list.append(li);
      }
      lines.push(`Outbox open: ${folders.length} message${folders.length === 1 ? '' : 's'}.`);
    } catch (e) { lines.push(`Outbox: ${e.message}.`); }
  }
  say('vault-status', lines.join(' ') || 'No vault key kept yet: paste a sealed QR code.');
  $('open-vault').disabled = false;
  $('open-vault').textContent = 'Open vault again';
  buttons();
}
$('open-vault').addEventListener('click', openVaults);

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

async function getMetadata(ids, onEach) {
  const q = 'format=metadata&' + HEADERS.map((h) => `metadataHeaders=${encodeURIComponent(h)}`).join('&');
  const out = new Array(ids.length); let next = 0, done = 0;
  async function worker() {
    while (next < ids.length) {
      const i = next++;
      for (let attempt = 0; ; attempt++) {
        try { out[i] = await gmail(`messages/${ids[i]}?${q}`); break; }
        catch (e) { if (attempt >= 3 || !/ 429| 5\d\d/.test(e.message)) throw e; await new Promise((r) => setTimeout(r, 500 * 2 ** attempt)); }
      }
      onEach(++done);
    }
  }
  await Promise.all(Array.from({ length: 5 }, worker));
  return out;
}

const BATCH = 500; // newest first; each press adds up to this many the twin does not hold yet
$('sync').addEventListener('click', async () => {
  if (!twin || !token) return;
  $('sync').disabled = true;
  try {
    say('vault-status', 'Reading what the twin holds...');
    const state = await readVaultState(twin);
    say('vault-status', 'Listing messages in Gmail...');
    const all = await listIds();
    const missing = all.filter((id) => !state.ids[id]);
    const todo = missing.slice(0, BATCH);
    const messages = await getMetadata(todo, (n) => say('vault-status', `Reading headers: ${n} of ${todo.length}...`));
    state.threads = await readThreads(twin, [...new Set(messages.map((m) => 't-' + String(m.threadId).toLowerCase()))]);
    const plan = syncPlan({ profile: await gmail('profile'), gmailLabels: labelList, messages, state });
    await writeMany(twin, plan.files, (n, total) => say('vault-status', `Writing into the twin: ${n} of ${total} files...`));
    say('vault-status', 'Publishing...');
    await publish(twin);
    const left = missing.length - todo.length;
    say('vault-status', `Synced: ${plan.added} messages added, ${plan.threads} threads changed, ${plan.hostile} marked hostile${plan.problems.length ? `, ${plan.problems.length} skipped` : ''}. ${left ? `${left.toLocaleString('en-GB')} older messages to go: press Sync again.` : 'The twin holds every message.'}`);
  } catch (e) { say('vault-status', `Sync stopped: ${e.message}. Nothing half-written is published; press again to retry.`); }
  finally { $('sync').disabled = false; }
});

// ------------------------------------------------------------ on load
async function start() {
  const id = await existingIdentity();
  if (id) accessToken = (await recall(id, 'sgsend:token').catch(() => null)) || '';
  const answer = parseFragment(location.hash, readState());
  if (!answer.none) {
    history.replaceState(null, '', location.pathname); writeState(null);
    if (answer.error) say('who', `Not connected: ${answer.error}.`);
    else {
      token = answer.token;
      await keep(await identity(), 'google:token', JSON.stringify({ token, expires_at: Date.now() + (answer.expiresIn || 3600) * 1000 })).catch(() => {});
    }
  } else if (id) {
    const g = JSON.parse((await recall(id, 'google:token').catch(() => null)) || 'null');
    if (g && Date.now() < g.expires_at - 60000) token = g.token;
  }
  if (token) await connected();
  await buttons();
}
start();
