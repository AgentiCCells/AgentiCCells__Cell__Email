// The browser gateway: sign in with Google (gmail.metadata only), show the mailbox's counts,
// open or create the user's twin vault, and sync headers and labels into it. The Google token,
// the vault key and the access token stay in this tab's memory; nothing is stored.
// By cell.email@AgentiCCells.dinis, 2026-11-16. Apache-2.0.
import { authUrl, newState, parseFragment } from './oauth.js?v=__VERSION__';
import { HEADERS, syncPlan } from './twin.js?v=__VERSION__';
import { createTwinVault, openTwinVault, displayKey, readState as readVaultState, readThreads, writeMany, publish, readJson, ensureLoaded } from './vault.js?v=__VERSION__';
import { identity, publicCode, publicQrText, openSealed, keep, recall, forget, kept } from './pki.js?v=__VERSION__';
import { TRUSTED } from './trusted.js?v=__VERSION__';
import qrcode from './vendor/qrcode-generator/2.0.4/qrcode.mjs?v=__VERSION__';

const OUTBOX_VAULT = 'co57gzld'; // promptugal-outreach (conductor@PrompTugal.dinis)
let accessToken = ''; // the SG/Send access token: in memory only

const $ = (id) => document.getElementById(id);
const STATE_KEY = 'cell-email.oauth-state';
let token = null; // in memory only: never stored, never sent anywhere but Google
let vault = null; // the open twin vault; its key and the access token stay in memory only
let profile = null, labelList = [];

function show(id, text) { const el = $(id); el.textContent = text; el.hidden = false; }

function readState() { try { return sessionStorage.getItem(STATE_KEY); } catch { return null; } }
function writeState(v) { try { if (v) sessionStorage.setItem(STATE_KEY, v); else sessionStorage.removeItem(STATE_KEY); } catch { /* private mode */ } }

async function gmail(path) {
  const r = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/${path}`, { headers: { Authorization: `Bearer ${token}` }, referrerPolicy: 'no-referrer' });
  if (!r.ok) throw new Error(`Gmail answered ${r.status}`);
  return r.json();
}

async function load() {
  $('status').textContent = 'Reading counts from Gmail...';
  try {
    const [p, labels] = await Promise.all([gmail('profile'), gmail('labels')]);
    profile = p; labelList = labels.labels || [];
    $('who').textContent = profile.emailAddress;
    $('messages').textContent = Number(profile.messagesTotal).toLocaleString('en-GB');
    $('threads').textContent = Number(profile.threadsTotal).toLocaleString('en-GB');
    const list = labels.labels || [];
    $('labels').textContent = `${list.length} (${list.filter((l) => l.type === 'system').length} system, ${list.filter((l) => l.type === 'user').length} yours)`;
    $('history').textContent = profile.historyId;
    $('result').hidden = false;
    $('status').textContent = 'Connected. The token is in this tab\'s memory only and goes when you close it.';
    $('connect').hidden = true;
    $('revoke').hidden = false;
    $('vault-box').hidden = false;
  } catch (e) {
    show('error', `Could not read Gmail: ${e.message}.`);
    $('status').textContent = '';
  }
}

$('connect').addEventListener('click', () => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const state = newState(bytes);
  writeState(state);
  location.assign(authUrl(state));
});

$('revoke').addEventListener('click', async () => {
  if (!token) return;
  try { await fetch('https://oauth2.googleapis.com/revoke', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: `token=${encodeURIComponent(token)}`, referrerPolicy: 'no-referrer' }); } catch { /* the token expires within the hour anyway */ }
  token = null; vault = null;
  $('result').hidden = true; $('vault-box').hidden = true; $('sync-box').hidden = true;
  $('revoke').hidden = true;
  $('connect').hidden = false;
  $('status').textContent = 'Disconnected: the token was revoked at Google and forgotten here.';
});

// ------------------------------------------------------------ step 2: the twin vault
for (const radio of document.querySelectorAll('input[name=mode]')) radio.addEventListener('change', () => {
  const create = document.querySelector('input[name=mode]:checked').value === 'create';
  $('key-row').hidden = create;
  $('open-vault').textContent = create ? 'Create vault' : 'Open vault';
});

$('open-vault').addEventListener('click', async () => {
  const create = document.querySelector('input[name=mode]:checked').value === 'create';
  accessToken = $('token').value.trim() || accessToken;
  const status = $('vault-status');
  if (!accessToken) { status.textContent = 'The SG/Send access token is needed to write to a vault.'; return; }
  $('open-vault').disabled = true;
  status.textContent = create ? 'Creating your twin vault (deriving keys takes a second or two)...' : 'Opening your twin vault (deriving keys takes a second or two)...';
  try {
    if (create) {
      vault = await createTwinVault(accessToken);
      $('new-key-text').textContent = displayKey(vault);
      $('new-key').hidden = false;
    } else {
      const key = $('vault-key').value.trim();
      if (!key) throw new Error('paste your vault key');
      vault = await openTwinVault(accessToken, key);
      $('vault-key').value = '';
    }
    $('token').value = '';
    if ($('keep-twin').checked) { await keep(await identity(), 'vault:twin', displayKey(vault)); showKept(); }
    status.textContent = `Vault ${vault.vaultId} is open${vault.writable ? '' : ' (read-only)'}${$('keep-twin').checked ? '; its key is kept in this browser, sealed to the page\'s key' : ''}.`;
    $('sync-box').hidden = false;
  } catch (e) {
    status.textContent = `Could not ${create ? 'create' : 'open'} the vault: ${e.message}.`;
  } finally { $('open-vault').disabled = false; }
});

async function showKept() {
  const has = await kept('vault:twin').catch(() => false);
  $('open-kept-twin').hidden = !has; $('forget-twin').hidden = !has;
}
showKept();

$('open-kept-twin').addEventListener('click', async () => {
  const status = $('vault-status');
  accessToken = $('token').value.trim() || accessToken;
  if (!accessToken) { status.textContent = 'Paste the SG/Send access token first: writing needs it.'; return; }
  status.textContent = 'Opening your kept twin vault...';
  try {
    const key = await recall(await identity(), 'vault:twin');
    vault = await openTwinVault(accessToken, key);
    $('token').value = '';
    status.textContent = `Vault ${vault.vaultId} is open.`;
    $('sync-box').hidden = false;
  } catch (e) { status.textContent = `Could not open the kept vault: ${e.message}.`; }
});

$('forget-twin').addEventListener('click', async () => {
  await forget('vault:twin'); showKept();
  $('vault-status').textContent = 'The kept twin vault key was deleted from this browser. Keep a copy in your password manager.';
});

// ------------------------------------------------------------ keys: this page's key, sealed vault keys
$('trusted-list').textContent = TRUSTED.map((t) => `${t.label} (${t.bundle.signing_fingerprint})`).join(', ');

$('show-key').addEventListener('click', async () => {
  $('show-key').disabled = true; $('show-key').textContent = 'Making or loading the key (the first time takes a few seconds)...';
  try {
    const id = await identity();
    $('key-fp').textContent = id.bundle.signing_fingerprint;
    const qr = qrcode(0, 'L'); qr.addData(publicQrText(id)); qr.make();
    $('key-qr').innerHTML = qr.createSvgTag({ cellSize: 3, margin: 2, scalable: true });
    $('key-out').hidden = false;
    $('show-key').textContent = 'This page\'s public key';
  } catch (e) { $('show-key').textContent = `Could not make the key: ${e.message}`; }
});

$('copy-key-code').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(publicCode(await identity())); $('copy-key-code').textContent = 'Copied'; } catch { $('copy-key-code').textContent = 'Could not copy'; }
});

$('open-sealed').addEventListener('click', async () => {
  const status = $('sealed-status');
  try {
    const r = await openSealed(await identity(), $('sealed-in').value, TRUSTED);
    $('sealed-in').value = '';
    if (!r.vaultKeys.length) { status.textContent = `Opened a message from ${r.from}, but it holds no vault key.`; return; }
    for (const v of r.vaultKeys) await keep(await identity(), 'vault:' + v.id, v.key);
    status.textContent = `From ${r.from}, signature checked: the key of vault${r.vaultKeys.length > 1 ? 's' : ''} ${r.vaultKeys.map((v) => v.id).join(', ')}, now kept in this browser, sealed to the page's key.`;
  } catch (e) { status.textContent = `Not opened: ${e.message}.`; }
});

// ------------------------------------------------------------ the outreach outbox
let outbox = null;
$('open-outbox').addEventListener('click', async () => {
  const status = $('outbox-status');
  status.textContent = 'Opening the outbox...';
  try {
    const key = await recall(await identity(), 'vault:' + OUTBOX_VAULT);
    if (!key) throw new Error('no key for it yet: open the sealed vault key above first');
    outbox = await openTwinVault(accessToken, key);
    await ensureLoaded(outbox, '/outbox');
    const folders = (outbox.listFolder('/outbox') || []).filter((e) => e.type === 'folder').map((e) => e.name).sort();
    const list = $('outbox-list'); list.replaceChildren();
    for (const f of folders) {
      const meta = await readJson(outbox, `/outbox/${f}`, 'meta.json');
      const li = document.createElement('li');
      li.textContent = `${f}: ${meta?.status || '?'} · to ${(meta?.to || []).join(', ')} · ${meta?.subject || ''}`;
      list.append(li);
    }
    status.textContent = `${folders.length} message${folders.length === 1 ? '' : 's'} in the outbox (vault ${outbox.vaultId}${accessToken ? '' : ', read-only: paste the access token in step 2 to approve'}). Approve and send come next.`;
  } catch (e) { status.textContent = `Could not open the outbox: ${e.message}.`; }
});

$('copy-key').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText($('new-key-text').textContent); $('copy-key').textContent = 'Copied'; } catch { $('copy-key').textContent = 'Select and copy it'; }
});

// ------------------------------------------------------------ step 3: sync
async function listIds(limit) {
  const ids = [];
  let page = '';
  do {
    const q = new URLSearchParams({ maxResults: String(limit ? Math.min(500, limit - ids.length) : 500) });
    if (page) q.set('pageToken', page);
    const r = await gmail(`messages?${q}`);
    for (const m of r.messages || []) ids.push(m.id);
    page = r.nextPageToken || '';
  } while (page && (!limit || ids.length < limit));
  return ids;
}

async function getMetadata(ids, onEach) {
  const q = 'format=metadata&' + HEADERS.map((h) => `metadataHeaders=${encodeURIComponent(h)}`).join('&');
  const out = new Array(ids.length);
  let next = 0, done = 0;
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

$('sync').addEventListener('click', async () => {
  const status = $('sync-status');
  if (!vault || !token) return;
  $('sync').disabled = true; $('sync-result').hidden = true;
  try {
    const limit = Number($('how-many').value);
    status.textContent = 'Reading what the vault already holds...';
    const state = await readVaultState(vault);
    status.textContent = 'Listing messages in Gmail...';
    const all = await listIds(limit);
    const todo = all.filter((id) => !state.ids[id]);
    status.textContent = `${todo.length} new of ${all.length}. Reading headers...`;
    const messages = await getMetadata(todo, (n) => { status.textContent = `Reading headers: ${n} of ${todo.length}...`; });
    const threadIds = [...new Set(messages.map((m) => 't-' + String(m.threadId).toLowerCase()))];
    state.threads = await readThreads(vault, threadIds);
    const fresh = await gmail('profile');
    const plan = syncPlan({ profile: fresh, gmailLabels: labelList, messages, state });
    status.textContent = `Encrypting and writing ${plan.files.length} files into your vault...`;
    await writeMany(vault, plan.files, (n, total) => { status.textContent = `Writing into your vault: ${n} of ${total} files...`; });
    status.textContent = 'Publishing...';
    await publish(vault);
    $('r-vault').textContent = vault.vaultId;
    $('r-added').textContent = `${plan.added} messages`;
    $('r-threads').textContent = String(plan.threads);
    $('r-hostile').textContent = String(plan.hostile);
    $('r-problems').textContent = plan.problems.length ? `${plan.problems.length} (did not pass the twin's schema)` : 'none';
    $('sync-result').hidden = false;
    status.textContent = plan.added ? 'Synced and published.' : 'Nothing new: the twin is up to date (the sync file and indexes were refreshed).';
  } catch (e) {
    status.textContent = `Sync stopped: ${e.message}. Nothing half-written is published; press again to retry.`;
  } finally { $('sync').disabled = false; }
});

// Coming back from Google: take the token out of the address bar at once, then check it.
const answer = parseFragment(location.hash, readState());
if (!answer.none) {
  history.replaceState(null, '', location.pathname);
  writeState(null);
  if (answer.error) show('error', `Not connected: ${answer.error}.`);
  else { token = answer.token; load(); }
}
