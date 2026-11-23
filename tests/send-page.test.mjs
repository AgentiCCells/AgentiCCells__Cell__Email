// The simple send screen (src/app/compose.js) and the demo mailbox (src/app/demo/mailbox.js), run in
// Node with the synthetic mailbox only. Nothing is sent: FakeGmail keeps each send in memory.
// By mail.dev.a@AgentiCCells.dinis, 2026-11-23. Apache-2.0.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEMO, REAL, modeFor, filterContacts, toMessage, check, confirmText, sendRecord, sentTodayQuery } from '../src/app/compose.js';
import { demoMailbox, draftFor, FakeGmail, DEMO_ME } from '../src/app/demo/mailbox.js';
import { rawMessage, MAX_PER_DAY } from '../src/app/send.js';

const NOW = Date.UTC(2026, 10, 23, 15, 0, 0);
const reserved = /@(?:[a-z0-9-]+\.)*example\.(?:com|net|org)$/;

test('the demo mailbox is the same for the same seed, and different for another', () => {
  assert.deepEqual(demoMailbox({ now: NOW }), demoMailbox({ now: NOW }));
  assert.notDeepEqual(demoMailbox({ now: NOW }).contacts, demoMailbox({ now: NOW, seed: 7 }).contacts);
});

test('every address in the demo mailbox is at a reserved example domain, and it says it is synthetic', () => {
  const box = demoMailbox({ now: NOW });
  assert.equal(box.generated.synthetic, true);
  const all = [box.me.address, ...box.contacts.map((c) => c.address), ...box.messages.flatMap((m) => [m.from.address, ...m.to.map((x) => x.address)]), ...box.people.flatMap((p) => p.emails), ...box.drafts.flatMap((d) => d.to)];
  for (const a of all) assert.match(a, reserved);
  assert.equal(new Set(box.contacts.map((c) => c.address)).size, box.contacts.length);
});

test('every demo draft passes the send checks', () => {
  const box = demoMailbox({ now: NOW });
  for (const d of box.drafts) assert.deepEqual(check(toMessage({ to: d.to.join(','), subject: d.subject, text: d.text })), [], d.subject);
  assert.match(draftFor(box.contacts[0]).text, new RegExp(`^Hi ${box.contacts[0].first},`));
});

test('contacts filter by name, address or organisation, most recent first', () => {
  const box = demoMailbox({ now: NOW });
  const all = filterContacts(box.contacts);
  for (let i = 1; i < all.length; i++) assert.ok(all[i - 1].last_contact >= all[i].last_contact);
  const c = box.contacts[3];
  assert.ok(filterContacts(box.contacts, c.first.toLowerCase()).some((x) => x.id === c.id));
  assert.ok(filterContacts(box.contacts, c.org.split(' ')[0]).every((x) => x.org.includes(c.org.split(' ')[0])));
  assert.deepEqual(filterContacts(box.contacts, 'nobody-by-this-name'), []);
});

test('the page opens in demo mode without a usable token that can send', () => {
  const t = { token: 'made-up', can_send: true, expires_at: NOW + 3600e3 };
  assert.equal(modeFor({ now: NOW }).mode, DEMO);
  assert.equal(modeFor({ now: NOW, token: { ...t, can_send: false } }).mode, DEMO);
  assert.equal(modeFor({ now: NOW, token: { ...t, expires_at: NOW } }).mode, DEMO);
  assert.equal(modeFor({ now: NOW, token: t, search: '?demo' }).mode, DEMO);
  assert.equal(modeFor({ now: NOW, token: t }).mode, REAL);
});

test('the outbox rules hold on this screen: no Bcc, a real address, at most 20 a day', () => {
  const ok = toMessage({ to: 'ana.silva@harbour.example.com', subject: 'Hello', text: 'Hi' });
  assert.deepEqual(check(ok), []);
  assert.deepEqual(toMessage({ to: 'a@example.com', subject: 's', text: 't', bcc: 'x@example.com' }).bcc, []);
  assert.match(check(ok, { sentToday: MAX_PER_DAY }).join(), /at most 20 a day/);
  assert.match(check(toMessage({ to: 'not an address', subject: 's', text: 't' })).join(), /not an email address/);
  assert.match(check(toMessage({ to: 'a@example.com', subject: 's', text: 'key: sgit_private_vault_abc' })).join(), /vault key/);
  assert.match(check(toMessage({ to: '', subject: 's', text: 't' })).join(), /no recipient/);
});

test('a demo send goes to FakeGmail only, and says simulation in the confirm, the answer and the record', async () => {
  const g = new FakeGmail({ now: () => NOW });
  const m = toMessage({ to: 'ana.silva@harbour.example.com', subject: 'Olá, Lisboa', text: 'Hi Ana,\n\nThanks.' });
  assert.match(confirmText(m, DEMO_ME.address, DEMO), /^SIMULATION/);
  assert.doesNotMatch(confirmText(m, 'me@example.org', REAL), /SIMULATION/);
  const res = await g.send(rawMessage(m));
  assert.equal(res.simulation, true);
  assert.equal(g.sent.length, 1);
  assert.equal(g.sent[0].simulation, true);
  assert.equal(g.sent[0].to, 'ana.silva@harbour.example.com');
  assert.match(g.sent[0].subject, /^=\?UTF-8\?B\?/); // non-ASCII subject encoded as Gmail would get it
  const rec = sendRecord(m, res, { mode: DEMO, from: DEMO_ME.address, now: new Date(NOW) });
  assert.equal(rec.simulation, true);
  assert.match(rec.note, /simulation/);
  assert.equal(sendRecord(m, { id: 'x', threadId: 'y' }, { mode: REAL, from: 'me@example.org' }).simulation, undefined);
  assert.equal(await g.sentToday(), 1);
});

test('FakeGmail refuses a message with Bcc, as the page does', async () => {
  const raw = Buffer.from('To: a@example.com\r\nBcc: b@example.com\r\nSubject: s\r\n\r\nt').toString('base64url');
  await assert.rejects(new FakeGmail().send(raw), /Bcc/);
});

test('sent today is searched from UTC midnight', () => {
  assert.equal(sentTodayQuery(new Date(NOW)), `in:sent after:${Date.UTC(2026, 10, 23) / 1000}`);
});

test('with a real token the day count survives a reload, and is the larger of the stored and Gmail counts', async () => {
  const { dayCounter, countKey } = await import('../src/app/compose.js');
  const store = new Map(); // stands in for the sealed IndexedDB store, which outlives the page
  const io = { load: async (k) => store.get(k) ?? null, save: async (k, v) => { store.set(k, v); }, now: () => new Date(NOW) };
  let page = dayCounter(io);
  for (let i = 0; i < MAX_PER_DAY; i++) await page.add();
  page = dayCounter(io); // a reload: a new page, the same store
  const n = await page.count(null); // a send-only token: no Gmail count
  assert.equal(n, MAX_PER_DAY);
  assert.match(check(toMessage({ to: 'a@example.com', subject: 's', text: 't' }), { sentToday: n }).join(), /at most 20 a day/);
  assert.equal(await page.count(MAX_PER_DAY + 3), MAX_PER_DAY + 3);
  assert.equal(countKey(new Date(NOW)), 'send:count:2026-11-23');
  const tomorrow = dayCounter({ ...io, now: () => new Date(NOW + 864e5) });
  assert.equal(await tomorrow.count(null), 0);
  const broken = dayCounter({ ...io, load: async () => { throw new Error('locked'); } });
  await assert.rejects(broken.count(null), /locked/);
});

test('the public demo twin: the same bytes every time, reserved domains, marked synthetic, mail/ loads as twin v1', async () => {
  const { demoVaultFiles } = await import('../sim/build-demo-vault.mjs');
  const { loadTwin } = await import('../cell/twin/schema.mjs');
  const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = await import('node:fs');
  const { join, dirname } = await import('node:path');
  const { tmpdir } = await import('node:os');
  const a = demoVaultFiles(), b = demoVaultFiles();
  assert.deepEqual(a, b);
  for (const [p, text] of Object.entries(a)) {
    if (/^(orgs|people|drafts)\//.test(p) || p === 'manifest.json') assert.equal(JSON.parse(text).synthetic, true, p);
    for (const m of text.matchAll(/[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+/g)) assert.match(m[0], reserved, p);
    assert.doesNotMatch(text, /sgit_private_vault_|BEGIN [A-Z ]*PRIVATE KEY|ya29\./, p);
  }
  assert.ok(!Object.keys(a).some((p) => p.startsWith('crm/')), 'crm/ belongs to the CRM generator');
  const people = Object.keys(a).filter((p) => p.startsWith('people/')).map((p) => JSON.parse(a[p]));
  const orgIds = new Set(Object.keys(a).filter((p) => p.startsWith('orgs/')).map((p) => JSON.parse(a[p]).id));
  for (const p of people) assert.ok(orgIds.has(p.org), p.id);
  const dir = mkdtempSync(join(tmpdir(), 'demo-twin-'));
  try {
    for (const [p, text] of Object.entries(a)) { mkdirSync(dirname(join(dir, p)), { recursive: true }); writeFileSync(join(dir, p), text); }
    const twin = loadTwin(join(dir, 'mail'));
    assert.deepEqual(twin.errors, []);
    assert.equal(twin.messages.size, JSON.parse(a['manifest.json']).counts.messages);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
