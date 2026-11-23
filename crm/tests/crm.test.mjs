// Tests for the CRM's model and generator, on a small made-up twin (reserved example domains only).
// By crm.dev.a@AgentiCCells.dinis, 2026-11-23. Apache-2.0.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readVault, checkCrm, followUps, leadBoard, draftState, company, contacts, DAY } from '../model/crm.mjs';
import { crmFiles } from '../model/generate.mjs';

const NOW = Date.UTC(2026, 10, 23, 12);
const iso = (ms) => new Date(ms).toISOString().replace(/\.\d+Z$/, 'Z');
const ME = 'demo.user@mailbox.example.org';

function twin() {
  const f = {
    'manifest.json': { schema: 'demo.twin/1', synthetic: true, seed: 7, generated_at: iso(NOW) },
    'mail/mailbox.json': { schema: 'twin.mailbox/1', address: ME },
    'orgs/o01.json': { id: 'o01', name: 'Example Analytics (demo)', domain: 'analytics.example.com', kind: 'investor', synthetic: true },
    'orgs/o02.json': { id: 'o02', name: 'Example Insurance (demo)', domain: 'insurance.example.com', kind: 'customer', synthetic: true },
    'orgs/o03.json': { id: 'o03', name: 'Example Quiet (demo)', domain: 'quiet.example.net', kind: 'prospect', synthetic: true },
    'people/p01.json': { id: 'p01', name: 'Ana Costa', emails: ['ana.costa@analytics.example.com'], org: 'o01' },
    'people/p02.json': { id: 'p02', name: 'Bruno Ito', emails: ['bruno.ito@insurance.example.com'], org: 'o02' },
    'drafts/p01.json': { person: 'p01', org: 'o01', status: 'draft', to: ['ana.costa@analytics.example.com'] },
    'drafts/p02.json': { person: 'p02', status: 'sent', to: ['bruno.ito@insurance.example.com'] },
  };
  const msg = (id, thread, direction, at, other) => {
    f[`mail/raw/messages/2026/11/${id}.json`] = { schema: 'twin.message/1', id, thread, direction, date: iso(at), from: { address: direction === 'outbound' ? ME : other }, to: [{ address: direction === 'outbound' ? other : ME }] };
  };
  // t-001: we wrote 8 days ago, no answer -> follow-up. t-002: we wrote 3 days ago -> not yet.
  // t-003: we wrote, they answered -> not a follow-up. t-004: no person, matched by domain.
  msg('m1', 't-001', 'outbound', NOW - 8 * DAY, 'ana.costa@analytics.example.com');
  msg('m2', 't-002', 'outbound', NOW - 3 * DAY, 'bruno.ito@insurance.example.com');
  msg('m3', 't-003', 'outbound', NOW - 20 * DAY, 'bruno.ito@insurance.example.com');
  msg('m4', 't-003', 'inbound', NOW - 18 * DAY, 'bruno.ito@insurance.example.com');
  msg('m5', 't-004', 'inbound', NOW - 1 * DAY, 'someone@quiet.example.net');
  f['mail/threads/t-001.json'] = { id: 't-001', subject: 'A', messages: ['m1'], participants: [ME, 'ana.costa@analytics.example.com'], person: 'p01' };
  f['mail/threads/t-002.json'] = { id: 't-002', subject: 'B', messages: ['m2'], participants: [ME, 'bruno.ito@insurance.example.com'], person: 'p02' };
  f['mail/threads/t-003.json'] = { id: 't-003', subject: 'C', messages: ['m3', 'm4'], participants: [ME, 'bruno.ito@insurance.example.com'], person: 'p02' };
  f['mail/threads/t-004.json'] = { id: 't-004', subject: 'D', messages: ['m5'], participants: [ME, 'someone@quiet.example.net'] };
  return f;
}
const withCrm = (f) => {
  const v = readVault(f);
  return { ...f, ...crmFiles({ seed: v.manifest.seed, generatedAt: v.manifest.generated_at, orgs: v.orgs, people: v.people, threads: v.threads }) };
};

test('generator writes only crm/, passes its checks and is deterministic', () => {
  const f = twin(), v = readVault(f);
  const a = crmFiles({ seed: 7, generatedAt: iso(NOW), orgs: v.orgs, people: v.people, threads: v.threads });
  const b = crmFiles({ seed: 7, generatedAt: iso(NOW), orgs: v.orgs, people: v.people, threads: v.threads });
  assert.deepEqual(a, b);
  assert.ok(Object.keys(a).every((p) => p.startsWith('crm/')));
  assert.ok(Object.values(a).every((o) => o.synthetic === true));
  assert.equal(Object.keys(a).filter((p) => p.startsWith('crm/leads/')).length, 3);
  assert.deepEqual(checkCrm(readVault({ ...f, ...a })), []);
});

test('checks catch bad references', () => {
  const f = withCrm(twin());
  f['crm/leads/o09.json'] = { schema: 'crm.lead/1', org: 'o09', stage: 'nope', owner: '' };
  f['crm/links/t-999.json'] = { schema: 'crm.link/1', thread: 't-999', org: 'o01', person: 'p02' };
  const e = checkCrm(readVault(f)).join('\n');
  for (const want of ['lead o09: no such org', 'unknown stage nope', 'lead o09: no owner', 'link t-999: no such thread', 'person p02 is not at o01']) assert.match(e, new RegExp(want));
});

test('follow-ups: our last message, no reply in 5 days or more', () => {
  const f = followUps(readVault(twin()), NOW);
  assert.deepEqual(f.map((x) => [x.thread, x.days, x.org]), [['t-001', 8, 'o01']]);
  assert.deepEqual(followUps(readVault(twin()), NOW, 2).map((x) => x.thread), ['t-001', 't-002']);
});

test('lead board: one row per company with derived draft state, last contact and waiting', () => {
  const rows = leadBoard(readVault(withCrm(twin())), NOW);
  assert.equal(rows.length, 3);
  const by = Object.fromEntries(rows.map((r) => [r.org, r]));
  assert.equal(by.o01.draft.state, 'draft');
  assert.equal(by.o02.draft.state, 'sent');
  assert.equal(by.o03.draft.state, 'none');
  assert.deepEqual(by.o01.waiting, { count: 1, days: 8, thread: 't-001' });
  assert.equal(by.o02.waiting, null);
  assert.equal(by.o02.last_contact.thread, 't-002');
  assert.equal(by.o03.last_contact.thread, 't-004', 'matched by domain');
  assert.ok(rows.every((r) => r.owner && r.stage && r.next_step));
});

test('a board without crm/ still works: every company is New with no owner', () => {
  const rows = leadBoard(readVault(twin()), NOW);
  assert.ok(rows.every((r) => r.stage === 'new' && r.owner === null));
});

test('company page and contacts', () => {
  const v = readVault(withCrm(twin()));
  const c = company(v, 'o02', NOW);
  assert.deepEqual(c.threads.map((t) => t.id), ['t-002', 't-003']);
  assert.equal(c.contacts.length, 1);
  assert.equal(c.drafts.length, 1);
  assert.equal(company(v, 'nope', NOW), null);
  const list = contacts(v);
  assert.deepEqual(list.map((p) => [p.id, p.threads]), [['p01', 1], ['p02', 2]]);
  assert.equal(draftState(v, 'o03').count, 0);
});

test('the site build holds the model, the pinned vault library and pki.js, unedited', async () => {
  const { readFileSync, existsSync, mkdtempSync } = await import('node:fs');
  const { join } = await import('node:path');
  const { tmpdir } = await import('node:os');
  const { buildSite } = await import('../scripts/build-site.mjs');
  const out = buildSite(mkdtempSync(join(tmpdir(), 'crm-site-')));
  const u = (p) => new URL(p, import.meta.url);
  assert.equal(readFileSync(join(out, 'crm.mjs'), 'utf8'), readFileSync(u('../model/crm.mjs'), 'utf8'));
  for (const f of JSON.parse(readFileSync(u('../../src/app/vendor/sg-vault/VENDOR.json'), 'utf8')).files) assert.ok(existsSync(join(out, 'vendor/sg-vault', f.path)), f.path);
  const html = readFileSync(join(out, 'index.html'), 'utf8');
  const csp = html.match(/Content-Security-Policy" content="([^"]+)"/)[1];
  assert.match(csp, /connect-src 'self' https:\/\/dev\.send\.sgraph\.ai;/);
  assert.doesNotMatch(csp, /unsafe|\*/);
  for (const m of html.matchAll(/src="([^"]+)"/g)) assert.ok(existsSync(join(out, m[1])), 'missing ' + m[1]);
});

test('the demo bundle is synthetic, on reserved domains only, and passes the checks', async () => {
  const { readFileSync } = await import('node:fs');
  const b = JSON.parse(readFileSync(new URL('../site/demo/twin.json', import.meta.url), 'utf8'));
  assert.equal(b.synthetic, true);
  const v = readVault(b.files);
  assert.equal(v.manifest.synthetic, true);
  assert.deepEqual(checkCrm(v), []);
  const domains = new Set(JSON.stringify(b.files).match(/@[a-z0-9.-]+\.[a-z]+/gi).map((d) => d.slice(1).toLowerCase()));
  for (const d of domains) assert.match(d, /(^|\.)example\.(com|org|net)$/, `non-reserved domain ${d}`);
});

test('vault merge: the twin first, the CRM vault adds crm/ on top and keeps its manifest apart', async () => {
  const { merge } = await import('../site/vault.js');
  const twin = { 'manifest.json': '{"schema":"demo.twin/1"}', 'orgs/o01.json': '{}', 'README.md': 'twin' };
  const crm = { 'manifest.json': '{"schema":"crm.demo/1","twin":{"vault":"abcd1234"}}', 'README.md': 'crm', 'crm/leads/o01.json': '{}' };
  const m = merge(crm, twin);
  assert.equal(m.files['manifest.json'], twin['manifest.json']);
  assert.equal(m.files['README.md'], 'twin');
  assert.ok(m.files['crm/leads/o01.json'] && m.files['orgs/o01.json']);
  assert.equal(m.crmManifest.twin.vault, 'abcd1234');
  assert.equal(merge(crm).files, crm);
});

test('hand-made links: unlinked threads, the exact file, and refusals', async () => {
  const { unlinkedThreads, linkFile } = await import('../model/crm.mjs');
  const v = readVault(twin());
  assert.deepEqual(unlinkedThreads(v).map((t) => [t.id, t.org]), [['t-004', 'o03'], ['t-002', 'o02'], ['t-001', 'o01'], ['t-003', 'o02']]);
  const f = linkFile(v, { thread: 't-004', org: 'o03', by: 'Owner A', at: '2026-11-23T15:30:00Z' });
  assert.equal(f.path, 'crm/links/t-004.json');
  assert.deepEqual(JSON.parse(f.text), { schema: 'crm.link/1', thread: 't-004', org: 'o03', linked_by: 'Owner A', linked_at: '2026-11-23T15:30:00Z' });
  assert.throws(() => linkFile(v, { thread: 't-999', org: 'o01', by: 'x', at: '2026-11-23T15:30:00Z' }), /no such thread/);
  assert.throws(() => linkFile(v, { thread: 't-001', org: 'o01', person: 'p02', by: 'x', at: '2026-11-23T15:30:00Z' }), /not at o01/);
  assert.throws(() => linkFile(v, { thread: 't-001', org: 'o01', by: '', at: '2026-11-23T15:30:00Z' }), /who made it/);
  const linked = readVault({ ...twin(), [f.path]: f.text });
  assert.ok(!unlinkedThreads(linked).some((t) => t.id === 't-004'));
});

test('writes go only to a writable vault marked as a CRM vault, never the twin', async () => {
  const { whyNotWritable } = await import('../site/vault.js');
  const w = { writable: true }, r = { writable: false };
  assert.equal(whyNotWritable(w, { schema: 'crm.demo/1' }), null);
  assert.equal(whyNotWritable(w, { schema: 'crm.vault/1' }), null);
  assert.match(whyNotWritable(r, { schema: 'crm.vault/1' }), /read key/);
  assert.match(whyNotWritable(w, { schema: 'demo.twin/1' }), /not mark it as a CRM vault/);
  assert.match(whyNotWritable(w, null), /not mark it/);
  assert.match(whyNotWritable(w, { schema: 'crm.vault/1' }, { isTwin: true }), /mail twin/);
  assert.match(whyNotWritable(null, null), /no CRM vault/);
});
