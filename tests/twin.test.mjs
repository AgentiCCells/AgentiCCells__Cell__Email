import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { simTwin } from './helpers.mjs';
import { buildMailbox } from '../sim/build-mailbox.mjs';
import { loadTwin, checkMessage, messagePath } from '../cell/twin/schema.mjs';
import { MESSAGES } from '../sim/messages.mjs';

test('the simulated twin loads with no errors', () => {
  const t = simTwin();
  assert.deepEqual(t.errors, []);
  assert.equal(t.mailbox.simulated, true);
  assert.equal(t.messages.size, MESSAGES.length);
  assert.equal(t.threads.size, 8);
  assert.equal(t.clean.size, MESSAGES.length);
});

test('only made-up addresses: reserved example domains or .invalid', () => {
  for (const m of simTwin().messages.values())
    for (const p of [m.from, ...m.to, ...m.cc]) assert.match(p.address, /@(example\.(com|net|org)|[a-z.-]+\.invalid)$/, p.address);
});

test('one file per message, filed by year and month', () => {
  const m = simTwin().messages.get('m-0001');
  assert.equal(messagePath(m), '2026/11/m-0001.json');
});

test('threads are linked by In-Reply-To and References', () => {
  const t = simTwin();
  const m3 = t.messages.get('m-0003');
  assert.equal(m3.headers.in_reply_to, t.messages.get('m-0002').headers.message_id);
  assert.equal(m3.headers.references.length, 2);
  assert.deepEqual(t.threads.get('t-0001').messages, ['m-0001', 'm-0002', 'm-0003']);
});

test('the correspondents index tells who has written to us', () => {
  const c = simTwin().correspondents.correspondents;
  assert.equal(c['rui@example.com'].inbound, 2);
  assert.equal(c['kim@example.com'].inbound, 0);
  assert.equal(c['kim@example.com'].outbound, 1);
});

test('the change feed lists every message once, in two syncs', () => {
  const t = simTwin();
  assert.equal(t.syncs.length, 2);
  const ids = t.syncs.flatMap((s) => s.added_messages);
  assert.equal(ids.length, MESSAGES.length);
  assert.equal(new Set(ids).size, MESSAGES.length);
  assert.ok(t.syncs[1].changed_threads.includes('t-0002'));
});

test('schema checks catch a broken message', () => {
  const m = structuredClone(simTwin().messages.get('m-0001'));
  m.from.address = 'not-an-address';
  m.date = '2 Nov 2026';
  delete m.headers.message_id;
  const e = checkMessage(m);
  assert.ok(e.some((x) => x.includes('bad address')));
  assert.ok(e.some((x) => x.includes('ISO 8601')));
  assert.ok(e.some((x) => x.includes('message_id')));
});

test('the loader catches a tampered attachment and a stale index', () => {
  const dir = buildMailbox(join(mkdtempSync(join(tmpdir(), 'cell-email-')), 'twin'));
  writeFileSync(join(dir, 'attachments/a-0001.bin'), 'changed');
  const idx = JSON.parse(readFileSync(join(dir, 'index/correspondents.json'), 'utf8'));
  idx.correspondents['kim@example.com'].inbound = 5;
  writeFileSync(join(dir, 'index/correspondents.json'), JSON.stringify(idx));
  const e = loadTwin(dir).errors;
  assert.ok(e.some((x) => x.includes('a-0001') && x.includes('sha256')));
  assert.ok(e.some((x) => x.includes('stale')));
});
