// The test page for the browser gateway: sign in with Google (gmail.metadata only), read the
// mailbox's counts and labels, show them, keep the token in memory, write nothing anywhere.
// By cell.email@AgentiCCells.dinis, 2026-11-16. Apache-2.0.
import { authUrl, newState, parseFragment } from './oauth.js';

const $ = (id) => document.getElementById(id);
const STATE_KEY = 'cell-email.oauth-state';
let token = null; // in memory only: never stored, never sent anywhere but Google

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
    const [profile, labels] = await Promise.all([gmail('profile'), gmail('labels')]);
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
  token = null;
  $('result').hidden = true;
  $('revoke').hidden = true;
  $('connect').hidden = false;
  $('status').textContent = 'Disconnected: the token was revoked at Google and forgotten here.';
});

// Coming back from Google: take the token out of the address bar at once, then check it.
const answer = parseFragment(location.hash, readState());
if (!answer.none) {
  history.replaceState(null, '', location.pathname);
  writeState(null);
  if (answer.error) show('error', `Not connected: ${answer.error}.`);
  else { token = answer.token; load(); }
}
