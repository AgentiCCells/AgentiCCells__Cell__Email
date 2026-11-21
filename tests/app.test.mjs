// The browser gateway's sign-in functions (src/app/oauth.js), run in Node with made-up answers.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { authUrl, parseFragment, newState, SCOPE, SEND_SCOPE, READ_SCOPE, MODIFY_SCOPE, REDIRECT_URI, CLIENT_ID } from '../src/app/oauth.js';

test('the sign-in URL asks Google for gmail.metadata only, for riskmandate.ai, back to the app page', () => {
  const u = new URL(authUrl('abc123'));
  assert.equal(u.origin + u.pathname, 'https://accounts.google.com/o/oauth2/v2/auth');
  assert.equal(u.searchParams.get('client_id'), CLIENT_ID);
  assert.equal(u.searchParams.get('redirect_uri'), REDIRECT_URI);
  assert.equal(u.searchParams.get('response_type'), 'token');
  assert.equal(u.searchParams.get('scope'), SCOPE);
  assert.equal(u.searchParams.get('hd'), 'riskmandate.ai');
  assert.equal(u.searchParams.get('state'), 'abc123');
});

test('state is 32 hex characters from 16 random bytes', () => {
  assert.match(newState(new Uint8Array(16).fill(171)), /^(ab){16}$/);
});

const ok = (over = {}) => '#' + new URLSearchParams({ access_token: 'made-up-token', token_type: 'Bearer', expires_in: '3599', scope: SCOPE, state: 's1', ...over });

test('a matching answer gives the token', () => {
  const r = parseFragment(ok(), 's1');
  assert.equal(r.token, 'made-up-token');
  assert.equal(r.expiresIn, 3599);
});

test('an answer with the wrong state, or none expected, is ignored', () => {
  assert.match(parseFragment(ok(), 's2').error, /state/);
  assert.match(parseFragment(ok(), null).error, /state/);
});

test('"Allow sending" asks for gmail.metadata and gmail.send, nothing else', () => {
  const u = new URL(authUrl('abc123', { send: true }));
  assert.deepEqual(u.searchParams.get('scope').split(' ').sort(), [SCOPE, SEND_SCOPE].sort());
});

test('an answer with gmail.send says the page can send; without it, it cannot', () => {
  assert.equal(parseFragment(ok({ scope: `${SCOPE} ${SEND_SCOPE}` }), 's1').canSend, true);
  assert.equal(parseFragment(ok(), 's1').canSend, false);
});

test('an answer that grants any other scope is refused', () => {
  assert.match(parseFragment(ok({ scope: `${SCOPE} https://www.googleapis.com/auth/gmail.compose` }), 's1').error, /more than gmail.metadata, gmail.readonly and gmail.send/);
  assert.match(parseFragment(ok({ scope: 'https://mail.google.com/' }), 's1').error, /more than/);
});

test('an error from Google, an empty fragment, and a missing token', () => {
  assert.match(parseFragment('#error=access_denied&state=s1', 's1').error, /access_denied/);
  assert.equal(parseFragment('', 's1').none, true);
  assert.match(parseFragment('#token_type=Bearer&state=s1', 's1').error, /no access token/);
});

test('"Allow reading" asks for gmail.readonly and gmail.send, without gmail.metadata', () => {
  const u = new URL(authUrl('abc123', { read: true }));
  assert.deepEqual(u.searchParams.get('scope').split(' ').sort(), [READ_SCOPE, SEND_SCOPE].sort());
  const r = parseFragment(ok({ scope: `${READ_SCOPE} ${SEND_SCOPE}` }), 's1');
  assert.equal(r.canRead, true); assert.equal(r.canSend, true);
  assert.equal(parseFragment(ok({ scope: `${SCOPE} ${READ_SCOPE}` }), 's1').canRead, false);
});

test('"Allow managing" asks for gmail.modify and gmail.send; the token can read and manage', () => {
  const u = new URL(authUrl('abc123', { manage: true }));
  assert.deepEqual(u.searchParams.get('scope').split(' ').sort(), [MODIFY_SCOPE, SEND_SCOPE].sort());
  const r = parseFragment(ok({ scope: `${MODIFY_SCOPE} ${SEND_SCOPE}` }), 's1');
  assert.equal(r.canRead, true); assert.equal(r.canManage, true); assert.equal(r.canSend, true);
  assert.equal(parseFragment(ok({ scope: `${READ_SCOPE} ${SEND_SCOPE}` }), 's1').canManage, false);
});
