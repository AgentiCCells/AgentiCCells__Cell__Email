// The browser gateway's sign-in, as pure functions (no page access), so tests can run them.
// Google's OAuth 2.0 token flow for client-side web apps: the user is sent to Google's own
// consent screen and comes back to this page with an access token in the URL fragment, which
// a browser never sends to any server. No Google script is loaded (abp/cell-email, rule N18).
// By cell.email@AgentiCCells.dinis, 2026-11-16. Apache-2.0.

export const CLIENT_ID = '235486550409-67qqf0j65poc62fbm2in7jbceci3sv5k.apps.googleusercontent.com';
export const REDIRECT_URI = 'https://email-cell.agenticcells.site/app/connect.html';
export const SCOPE = 'https://www.googleapis.com/auth/gmail.metadata';
// Asked for only when the person presses "Allow sending" (Dinis, 21 November 2026: "make sure that
// I can actually open the email and I can start to send from there").
export const SEND_SCOPE = 'https://www.googleapis.com/auth/gmail.send';
const ALLOWED = new Set([SCOPE, SEND_SCOPE]);
export const HOSTED_DOMAIN = 'riskmandate.ai';
export const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';

export function newState(randomBytes) {
  return Array.from(randomBytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

// No forced consent screen: once access is granted, Google returns at once.
// With { send: true } it asks for gmail.send as well, and Google shows the consent screen again.
export function authUrl(state, { send = false } = {}) {
  const q = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'token',
    scope: send ? `${SCOPE} ${SEND_SCOPE}` : SCOPE,
    state,
    hd: HOSTED_DOMAIN,
    include_granted_scopes: 'false',
  });
  return `${AUTH_ENDPOINT}?${q}`;
}

// Read Google's answer from the fragment. Returns { token, expiresIn, scope, canSend } or { error }.
export function parseFragment(hash, expectedState) {
  const f = new URLSearchParams(String(hash || '').replace(/^#/, ''));
  if (!f.toString()) return { none: true };
  if (f.get('error')) return { error: `Google said: ${f.get('error')}` };
  if (!expectedState || f.get('state') !== expectedState) return { error: 'the answer did not match this page\'s sign-in request (state), so it was ignored' };
  const token = f.get('access_token');
  if (!token || f.get('token_type')?.toLowerCase() !== 'bearer') return { error: 'no access token in the answer' };
  const scope = f.get('scope') || '';
  const granted = scope.split(' ').filter(Boolean);
  if (granted.some((s) => !ALLOWED.has(s))) return { error: `Google granted more than gmail.metadata and gmail.send (${scope}); the token was not used` };
  return { token, expiresIn: Number(f.get('expires_in') || 0), scope, canSend: granted.includes(SEND_SCOPE) };
}
