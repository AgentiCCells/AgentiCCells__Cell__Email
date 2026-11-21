// Approve and send (src/app/send.js), run in Node with made-up messages. Nothing is sent.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { messageOf, problems, rawMessage, sentOn, MAX_PER_DAY } from '../src/app/send.js';

const meta = { to: ['someone@example.com'], subject: 'Hello', status: 'draft' };
const decode = (raw) => Buffer.from(raw.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');

test('a plain draft has no problems', () => {
  assert.deepEqual(problems(messageOf(meta, 'Hi,\n\nThanks.')), []);
});

test('the body comes from the body file, else from meta.text', () => {
  assert.equal(messageOf(meta, 'from file').text, 'from file');
  assert.equal(messageOf({ ...meta, text: 'from meta' }, undefined).text, 'from meta');
  assert.deepEqual(messageOf({ ...meta, to: 'a@example.com, b@example.com' }, 'x').to, ['a@example.com', 'b@example.com']);
});

test('sent, rejected or stopped entries are not sent again', () => {
  for (const status of ['sent', 'rejected', 'stopped']) assert.match(problems(messageOf({ ...meta, status }, 'x')).join(), /status/);
});

test('no recipient, a bad address, Bcc, no subject or no text each stop the send', () => {
  assert.match(problems(messageOf({ ...meta, to: [] }, 'x')).join(), /no recipient/);
  assert.match(problems(messageOf({ ...meta, to: ['not an address'] }, 'x')).join(), /not an email address/);
  assert.match(problems(messageOf({ ...meta, bcc: ['x@example.com'] }, 'x')).join(), /Bcc/);
  assert.match(problems(messageOf({ ...meta, subject: '' }, 'x')).join(), /no subject/);
  assert.match(problems(messageOf(meta, '  ')).join(), /no text/);
  assert.match(problems(messageOf({ ...meta, subject: 'a\r\nBcc: x@example.com' }, 'x')).join(), /line break/);
});

test('key material in the text stops the send', () => {
  const header = ['-----BEGIN', 'PRIVATE', 'KEY-----'].join(' '); // made at run time, so the leak scan does not flag the test
  assert.match(problems(messageOf(meta, header + '\nabc')).join(), /private key/);
  assert.match(problems(messageOf(meta, 'key: sgit_private_vault_abc')).join(), /vault key/);
});

test('the daily cap stops the send', () => {
  assert.match(problems(messageOf(meta, 'x'), { sentToday: MAX_PER_DAY }).join(), /a day/);
  const now = new Date('2026-11-21T15:00:00Z');
  assert.equal(sentOn([{ status: 'sent', sent_at: '2026-11-21T09:00:00Z' }, { status: 'sent', sent_at: '2026-11-20T09:00:00Z' }, { status: 'draft' }], now), 1);
});

test('the raw message has the headers and the UTF-8 text, base64url', () => {
  const raw = rawMessage(messageOf({ ...meta, cc: ['c@example.com'], subject: 'Olá', in_reply_to: '<m1@example.com>' }, 'Olá,\nobrigado.'));
  assert.doesNotMatch(raw, /[+/=]/);
  const text = decode(raw);
  assert.match(text, /^To: someone@example.com\r\nCc: c@example.com\r\nSubject: =\?UTF-8\?B\?/);
  assert.match(text, /In-Reply-To: <m1@example.com>/);
  const body = text.split('\r\n\r\n')[1].replace(/\r\n/g, '');
  assert.equal(Buffer.from(body, 'base64').toString('utf8'), 'Olá,\r\nobrigado.');
});
