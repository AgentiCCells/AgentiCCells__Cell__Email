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

test('adding companies and people: the exact files, and refusals', async () => {
  const { companyFiles, personFile, newVaultFiles, newId } = await import('../model/crm.mjs');
  const v = readVault(twin());
  const at = '2026-11-23T23:40:00Z';
  const [org, lead] = companyFiles(v, { id: 'o-0a0b0c0d', name: 'Example Newco (demo)', domain: 'Newco.Example.com', kind: 'prospect', owner: 'Owner A', at, next_step: 'Say hello' });
  assert.equal(org.path, 'orgs/o-0a0b0c0d.json');
  assert.deepEqual(org.record, { schema: 'crm.org/1', id: 'o-0a0b0c0d', name: 'Example Newco (demo)', domain: 'newco.example.com', kind: 'prospect', added_by: 'Owner A', added_at: at });
  assert.deepEqual(lead.record, { schema: 'crm.lead/1', org: 'o-0a0b0c0d', stage: 'new', owner: 'Owner A', next_step: 'Say hello', updated_at: at });
  assert.throws(() => companyFiles(v, { id: 'x', name: '', owner: 'a', at }), /needs a name/);
  assert.throws(() => companyFiles(v, { id: 'x', name: 'Other', domain: 'analytics.example.com', owner: 'a', at }), /already here/);
  assert.throws(() => companyFiles(v, { id: 'x', name: 'Example Analytics (demo)', owner: 'a', at }), /already here/);
  assert.throws(() => companyFiles(v, { id: 'x', name: 'Other', domain: 'not a domain', owner: 'a', at }), /not a domain/);
  const v2 = readVault({ ...twin(), [org.path]: org.text, [lead.path]: lead.text });
  assert.deepEqual(checkCrm(v2), []);
  const [p] = personFile(v2, { id: 'p-01020304', name: 'Ana Example', email: 'Ana@Newco.Example.com', role: 'CTO', org: 'o-0a0b0c0d', by: 'Owner A', at });
  assert.deepEqual(p.record, { schema: 'crm.person/1', id: 'p-01020304', name: 'Ana Example', first: 'Ana', emails: ['ana@newco.example.com'], org: 'o-0a0b0c0d', role: 'CTO', added_by: 'Owner A', added_at: at });
  assert.throws(() => personFile(v2, { id: 'x', name: 'A', email: 'nope', org: 'o-0a0b0c0d', at }), /not an email/);
  assert.throws(() => personFile(v2, { id: 'x', name: 'A', email: 'ana.costa@analytics.example.com', org: 'o01', at }), /already here/);
  assert.throws(() => personFile(v2, { id: 'x', name: 'A', email: 'a@b.example.com', org: 'o99', at }), /no such company/);
  const board = leadBoard(readVault({ ...twin(), [org.path]: org.text, [lead.path]: lead.text, [p.path]: p.text }), NOW);
  assert.equal(board.find((r) => r.org === 'o-0a0b0c0d').people, 1);
  const nv = newVaultFiles({ owner: 'Owner A', at });
  assert.deepEqual(nv.map((f) => f.path), ['manifest.json', 'crm/stages.json']);
  assert.equal(JSON.parse(nv[0].text).schema, 'crm.vault/1');
  assert.match(newId('o', () => new Uint8Array([1, 2, 3, 255])), /^o-010203ff$/);
});

test('actions: logged by hand, counted as contact, and followed up after 5 days', async () => {
  const { actionFile, leadEditFile, timeline } = await import('../model/crm.mjs');
  const v = readVault(withCrm(twin()));
  const at = '2026-11-24T10:00:00Z';
  const [a] = actionFile(v, { id: 'a-1', org: 'o03', kind: 'linkedin', direction: 'out', at: '2026-11-17', by: 'Owner B', summary: 'Sent a note after the summit', logged_at: at });
  assert.deepEqual(a.record, { schema: 'crm.action/1', id: 'a-1', org: 'o03', kind: 'linkedin', direction: 'out', at: '2026-11-17', by: 'Owner B', summary: 'Sent a note after the summit', logged_at: at });
  assert.throws(() => actionFile(v, { id: 'x', org: 'o03', kind: 'fax', direction: 'out', at: '2026-11-17', by: 'B', summary: 's', logged_at: at }), /unknown kind/);
  assert.throws(() => actionFile(v, { id: 'x', org: 'o03', kind: 'call', direction: 'out', at: '17/11', by: 'B', summary: 's', logged_at: at }), /yyyy-mm-dd/);
  assert.throws(() => actionFile(v, { id: 'x', org: 'o03', kind: 'call', direction: 'out', at: '2026-11-17', by: '', summary: 's', logged_at: at }), /your name/);
  assert.throws(() => actionFile(v, { id: 'x', org: 'o01', person: 'p02', kind: 'call', direction: 'out', at: '2026-11-17', by: 'B', summary: 's', logged_at: at }), /not at this company/);
  const v2 = readVault({ ...withCrm(twin()), [a.path]: a.text });
  assert.deepEqual(checkCrm(v2), []);
  // o03's only mail was inbound 1 day before NOW (Nov 22); a LinkedIn note on Nov 17 is older, so last contact stays the mail
  assert.equal(leadBoard(v2, NOW).find((r) => r.org === 'o03').last_contact.thread, 't-004');
  // a newer outbound action, 6 days before NOW: now last contact, and a follow-up
  const [b] = actionFile(v2, { id: 'a-2', org: 'o03', kind: 'email', direction: 'out', at: '2026-11-23T11:00:00Z', by: 'Owner B', summary: 'Nudge', logged_at: at });
  const v3 = readVault({ ...withCrm(twin()), [a.path]: a.text, [b.path]: b.text });
  const row = leadBoard(v3, NOW + 6 * DAY).find((r) => r.org === 'o03');
  assert.equal(row.last_contact.action, 'a-2');
  assert.ok(followUps(v3, NOW + 6 * DAY).some((f) => f.action === 'a-2' && f.days === 6));
  assert.deepEqual(timeline(v3, 'o03').map((e) => e.id), ['a-2', 't-004', 'a-1']);
  // they answer: no longer waiting
  const [c] = actionFile(v3, { id: 'a-3', org: 'o03', kind: 'email', direction: 'in', at: '2026-11-25', by: 'Owner B', summary: 'They replied', logged_at: at });
  const v4 = readVault({ ...withCrm(twin()), [a.path]: a.text, [b.path]: b.text, [c.path]: c.text });
  assert.ok(!followUps(v4, NOW + 9 * DAY).some((f) => f.org === 'o03' && f.action));
  // editing a lead keeps the other fields and clears the next step when left empty
  const [l] = leadEditFile(v4, 'o03', { stage: 'talking', owner: 'Owner C', next_step: '', next_step_due: '', at });
  assert.equal(l.path, 'crm/leads/o03.json');
  assert.equal(l.record.stage, 'talking'); assert.equal(l.record.owner, 'Owner C'); assert.ok(!('next_step' in l.record));
  assert.throws(() => leadEditFile(v4, 'o03', { stage: 'nope', owner: 'a', at }), /unknown stage/);
});

test('import: a CSV the team fills in becomes the CRM files, shown before writing; nothing is guessed', async () => {
  const { importFiles, parseCsv } = await import('../model/crm.mjs');
  const { readFileSync } = await import('node:fs');
  assert.deepEqual(parseCsv('a,"b, c","say ""hi"""\r\n1,"two\nlines",3\n\n'), [['a', 'b, c', 'say "hi"'], ['1', 'two\nlines', '3']]);
  const v = readVault(withCrm(twin()));
  let i = 0; const mk = (p) => `${p}-${String(++i).padStart(4, '0')}`;
  const csv = readFileSync(new URL('../site/template.csv', import.meta.url), 'utf8');
  const { files, report } = importFiles(v, csv, { by: 'Owner A', at: '2026-11-24T12:00:00Z', newId: mk });
  assert.deepEqual({ ...report, skipped: report.skipped.length }, { orgs: 2, people: 2, leads: 2, actions: 1, skipped: 0, unknown_columns: [] });
  const after = readVault({ ...withCrm(twin()), ...Object.fromEntries(files.map((f) => [f.path, f.text])) });
  assert.deepEqual(checkCrm(after), []);
  const harbour = after.orgs.find((o) => o.domain === 'harbour.example.com');
  assert.equal(after.people.filter((p) => p.org === harbour.id).length, 2, 'two people at one company: one company record');
  const lead = after.leads.find((l) => l.org === harbour.id);
  assert.deepEqual([lead.stage, lead.owner, lead.next_step, lead.next_step_due], ['contacted', 'Owner A', 'Send the deck', '2026-11-28']);
  assert.equal(after.actions[0].kind, 'linkedin');
  // existing company matched by domain, existing email not duplicated, bad rows reported, not guessed
  const again = importFiles(after, 'company,domain,person,email,last_contact_date\nAnything,harbour.example.com,Ana,ana@harbour.example.com,\n,x.example.com,,,\nNew Co,new.example.com,Someone,,\nBad Date Co,bad.example.com,,,24/11\n', { by: 'Owner A', at: '2026-11-24T12:00:00Z', newId: mk });
  assert.equal(again.report.orgs, 2); assert.equal(again.report.people, 0);
  assert.deepEqual(again.report.skipped.map((s) => s.split(':')[0]), ['line 3', 'line 4', 'line 5']);
  assert.throws(() => importFiles(v, 'name,email\nA,a@b.example.com', { by: 'x', at: '2026-11-24T12:00:00Z' }), /"company" column/);
  assert.throws(() => importFiles(v, csv, { by: '', at: '2026-11-24T12:00:00Z' }), /your name/);
});

test('The Day: overdue first, then follow-ups, then drafts; one card per company; counts by stage', async () => {
  const { theDay, draftState } = await import('../model/crm.mjs');
  const f = withCrm(twin());
  f['crm/leads/o02.json'] = JSON.stringify({ schema: 'crm.lead/1', org: 'o02', stage: 'talking', owner: 'Owner A', next_step: 'Call', next_step_due: '2026-11-20' });
  const v = readVault(f);
  const d = theDay(v, NOW);
  assert.equal(d.cards[0].org, 'o02'); assert.equal(d.cards[0].why, 'overdue');
  assert.ok(d.cards.some((c) => c.org === 'o01' && c.why === 'follow-up'));
  assert.equal(new Set(d.cards.map((c) => c.org)).size, d.cards.length);
  assert.equal(d.stages.reduce((n, s) => n + s.count, 0), d.total);
  // a waiting draft wins over a sent one
  const v2 = readVault({ ...f, 'drafts/p99.json': JSON.stringify({ person: 'p99', org: 'o02', status: 'draft' }) });
  assert.equal(draftState(v2, 'o02').state, 'draft');
});

test('follow-ups: a reply logged later clears a waiting thread; our own new contact restarts the clock', async () => {
  const { actionFile } = await import('../model/crm.mjs');
  const base = withCrm(twin()), v = readVault(base), at = '2026-11-23T12:00:00Z';
  assert.ok(followUps(v, NOW).some((f) => f.thread === 't-001'));            // waiting 8 days
  const [reply] = actionFile(v, { id: 'a-r', org: 'o01', kind: 'call', direction: 'in', at: '2026-11-23', by: 'Owner A', summary: 'They called back', logged_at: at });
  const v2 = readVault({ ...base, [reply.path]: reply.text });
  assert.ok(!followUps(v2, NOW).some((f) => f.org === 'o01'), 'a logged reply clears it');
  assert.equal(leadBoard(v2, NOW).find((r) => r.org === 'o01').waiting, null);
  const [nudge] = actionFile(v, { id: 'a-n', org: 'o01', kind: 'email', direction: 'out', at: '2026-11-23', by: 'Owner A', summary: 'Nudge', logged_at: at });
  const v3 = readVault({ ...base, [nudge.path]: nudge.text });
  assert.ok(!followUps(v3, NOW).some((f) => f.org === 'o01'), 'our new contact restarts the clock');
  assert.ok(followUps(v3, NOW + 6 * DAY).some((f) => f.org === 'o01' && f.action === 'a-n'), 'and it comes back after 5 days');
});

test('verified keys: a signed crm.key/1 record checks; a changed one, a reused key or your own key do not', async () => {
  const { keyRecord, keyFile, personKey } = await import('../model/crm.mjs');
  const K = await import('../../src/app/vendor/pki/v0.2.28/keys.js');
  const { keyCode } = await import('../../src/app/vendor/pki/v0.2.28/message.js');
  const mk = async (label) => { const enc = await crypto.subtle.generateKey(K.RSA_GEN, true, ['encrypt', 'decrypt']), sig = await crypto.subtle.generateKey(K.EC, false, ['sign', 'verify']);
    const b = await K.bundleOf(new Uint8Array(await crypto.subtle.exportKey('spki', enc.publicKey)), new Uint8Array(await crypto.subtle.exportKey('spki', sig.publicKey)), label); return { b, sign: sig.privateKey }; };
  const them = await mk('Test Contact'), me = await mk('Test Verifier');
  const base = withCrm(twin()), v = readVault(base), pid = v.people[0].id, at = '2026-11-24T15:00:00Z';
  const rec = keyRecord(v, { person: pid, code: keyCode(them.b).code, fp: them.b.signing_fingerprint, enc_fp: them.b.fingerprint, label: 'Test Contact', how: 'qr', verified_by: 'Owner A', verified_at: at, verifier: keyCode(me.b).code, verifier_fp: me.b.signing_fingerprint });
  const signed = { ...rec, sig: K.b64(new Uint8Array(await crypto.subtle.sign(K.ECDSA, me.sign, K.canonicalBytes(rec)))) };
  assert.ok(await K.verifyStatement(signed, me.b.sign), 'the signature checks');
  assert.ok(!(await K.verifyStatement({ ...signed, fp: me.b.signing_fingerprint }, me.b.sign)), 'a changed record does not');
  const f = keyFile(signed), v2 = readVault({ ...base, [f.path]: f.text });
  assert.equal(f.path, `crm/keys/${pid}.json`); assert.deepEqual(checkCrm(v2), []); assert.equal(personKey(v2, pid).fp, them.b.signing_fingerprint);
  assert.equal(contacts(v2).find((p) => p.id === pid).key_fp, them.b.signing_fingerprint);
  assert.throws(() => keyRecord(v2, { ...rec, person: v.people[1].id }), /already/);
  assert.throws(() => keyRecord(v, { ...rec, fp: me.b.signing_fingerprint }), /your own key/);
  assert.throws(() => keyRecord(v, { ...rec, code: 'k1.nope' }), /key code/);
});

test('reached before: a second outreach to the same person is flagged, a note or a reply is not', async () => {
  const { actionFile, nudgeWarning, reachedBefore } = await import('../model/crm.mjs');
  const base = withCrm(twin()), v = readVault(base), at = '2026-11-23T12:00:00Z';
  const p = v.people.find((x) => x.org === 'o01').id;
  const fresh = readVault({ ...base, 'mail/threads/': undefined });
  const [out] = actionFile(v, { id: 'a-1', org: 'o01', person: p, kind: 'linkedin', direction: 'out', at: '2026-11-20', by: 'Owner A', summary: 'Nudge about the book', logged_at: at });
  const v2 = readVault({ ...base, [out.path]: out.text });
  assert.match(nudgeWarning(v2, { org: 'o01', person: p, direction: 'out' }), /Already reached out to .* last on 2026-11-2\d/);
  assert.equal(nudgeWarning(v2, { org: 'o01', person: p, direction: 'in' }), null, 'a reply is not a nudge');
  const [note] = actionFile(v, { id: 'a-2', org: 'o02', kind: 'note', direction: 'none', at: '2026-11-20', by: 'Owner A', summary: 'Thinking', logged_at: at });
  const v3 = readVault({ ...base, [note.path]: note.text });
  assert.ok(reachedBefore(v3, { org: 'o02' }).every((e) => e.kind !== 'note'), 'notes never count');
});

test('outbox: mail.dev.a\'s shared vector, and a draft written here is approved and verified by the cell\'s own functions', async () => {
  // signoff.mjs is mail.dev.a's, vendored unedited (crm/vendor/cell-signoff/3a1bb14), as built into the site: build first.
  const B = await import('../_build/site/signoff.mjs');
  const { canon } = await import('../../src/app/vendor/pki/v0.2.28/keys.js');
  const { outboxDraftFile, approvalFile, outbox, reachedBefore } = await import('../model/crm.mjs');
  const { createHash } = await import('node:crypto');
  const fx = JSON.parse((await import('node:fs')).readFileSync(new URL('./fixtures/signoff-vector.json', import.meta.url), 'utf8'));
  // The hashes were sent by message (the leak scan refuses long hex): d-1 begins 1fd4bffa, d-2 begins db5cc57a.
  const starts = { 'd-1': '1fd4bffa', 'd-2': 'db5cc57a' };
  for (const c of fx.cases) {
    assert.equal(canon(c.draft), c.canon, `canon of ${c.draft.id}`);
    const h = createHash('sha256').update(c.canon, 'utf8').digest('hex');
    assert.ok(h.startsWith(starts[c.draft.id]), `hash of ${c.draft.id}`);
    assert.equal(await B.draftHash(c.draft), h);
    assert.deepEqual(B.draftProblems(c.draft), []);
  }
  const base = withCrm(twin()), v = readVault(base), p = v.people.find((x) => x.org === 'o01');
  const [f] = outboxDraftFile(v, { id: 'd-t1', org: 'o01', person: p.id, subject: 'A test', text: 'Hello', created_at: '2026-11-24T16:00:00Z', created_by: 'Owner A' });
  const stored = JSON.parse(f.text);                                   // what the cell will read back from the vault
  const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign', 'verify']);   // a fresh test key, never stored
  const spki = new Uint8Array(await crypto.subtle.exportKey('spki', kp.publicKey));
  const batch = B.newBatchId(new Date('2026-11-24T16:01:00Z'));
  const a = await B.approve(kp.privateKey, spki, f.record, batch);
  const pinned = [{ fingerprint: await B.fingerprint(spki), spki, name: 'test' }];
  assert.deepEqual(B.draftProblems(stored), [], 'a draft written here passes the cell\'s draft checks');
  assert.ok((await B.verifyApproval(stored, a, pinned, batch)).ok, 'the cell accepts the CRM\'s sign-off');
  assert.ok(!(await B.verifyApproval({ ...stored, subject: 'Changed' }, a, pinned, batch)).ok, 'a changed draft is refused');
  const ap = approvalFile(a), sentRec = B.sentRecord(stored, a, { id: 'g1', threadId: 't1', simulation: true }, new Date('2026-11-24T16:05:00Z'));
  const v2 = readVault({ ...base, [f.path]: f.text, [ap.path]: ap.text, 'sent/d-t1.json': JSON.stringify(sentRec) });
  assert.deepEqual(outbox(v2).map((x) => x.state), ['sent']);
  assert.ok(reachedBefore(v2, { org: 'o01', person: p.id }).some((e) => e.type === 'sent'), 'a sent email counts as reaching out');
  assert.equal(v2.drafts.some((d) => d.v === 1), false, 'outbox drafts stay out of the twin\'s drafts');
});

test('Today: every company with a waiting draft offers it, whatever else it has; counts; owner filter', async () => {
  const { theDay } = await import('../model/crm.mjs');
  const v = readVault(withCrm(twin())), d = theDay(v, NOW), board = leadBoard(v, NOW);
  assert.equal(d.counts.draft, board.filter((r) => r.draft.state === 'draft').length, 'Today shows as many drafts as the board');
  assert.equal(new Set(d.cards.map((c) => c.org)).size, d.cards.length, 'one card per company');
  assert.ok(d.cards.every((c) => c.reasons.some((r) => r.why === c.why)), 'the card leads with one of its reasons');
  const owner = board[0].owner, mine = theDay(v, NOW, { owner });
  assert.ok(mine.cards.every((c) => c.owner === owner));
});

test('where we met: kept on the person from the form and from import, shown on Today', async () => {
  const { personFile, importFiles, theDay } = await import('../model/crm.mjs');
  const v = readVault(withCrm(twin())), at = '2026-11-24T18:00:00Z';
  const [f] = personFile(v, { id: 'p-m1', name: 'Ana Test', email: 'ana@example.org', org: 'o01', met: '  Web Summit 2026 ', by: 'Owner A', at });
  assert.equal(f.record.met, 'Web Summit 2026');
  const [g] = personFile(v, { id: 'p-m2', name: 'Bo Test', email: 'bo@example.org', org: 'o01', by: 'Owner A', at });
  assert.equal('met' in g.record, false, 'empty stays empty');
  const r = importFiles(v, 'company,person,email,met\nExample New Co,Cy Test,cy@example.org,a meetup in Lisbon\n', { by: 'Owner A', at, newId: (p) => p + '-x' + Math.random().toString(16).slice(2, 6) });
  assert.ok(r.files.some((x) => x.path.startsWith('people/') && JSON.parse(x.text).met === 'a meetup in Lisbon'));
  const p = v.people.find((x) => x.org === theDay(v, NOW).cards[0].org);
  const v2 = readVault({ ...withCrm(twin()), [`people/${p.id}.json`]: JSON.stringify({ ...p, met: 'a conference' }) });
  assert.ok(theDay(v2, NOW).cards.some((c) => c.person?.met === 'a conference'));
});

// The You page's zip reader: a zip made here (one stored, one deflated, a folder and a macOS copy that are skipped).
test('unzip reads stored and deflated entries and skips folders and __MACOSX', async () => {
  const { unzip, isZip } = await import('../site/unzip.mjs'); const { deflateRawSync, crc32 } = await import('node:zlib');
  const files = [['codes/', ''], ['codes/our-work.txt', 'm1.made-up-code-one'], ['codes/riskmandate.txt', 'm1.made-up-code-two '.repeat(40)], ['__MACOSX/codes/._our-work.txt', 'x']];
  const loc = [], cen = []; let off = 0;
  files.forEach(([name, text], i) => { const raw = Buffer.from(text), data = i === 2 ? deflateRawSync(raw) : raw, n = Buffer.from(name), method = i === 2 ? 8 : 0;
    const h = Buffer.alloc(30); h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(method, 8); h.writeUInt32LE(crc32(raw), 14); h.writeUInt32LE(data.length, 18); h.writeUInt32LE(raw.length, 22); h.writeUInt16LE(n.length, 26);
    const c = Buffer.alloc(46); c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(method, 10); c.writeUInt32LE(crc32(raw), 16); c.writeUInt32LE(data.length, 20); c.writeUInt32LE(raw.length, 24); c.writeUInt16LE(n.length, 28); c.writeUInt32LE(off, 42);
    loc.push(h, n, data); cen.push(c, n); off += 30 + n.length + data.length; });
  const cd = Buffer.concat(cen), e = Buffer.alloc(22); e.writeUInt32LE(0x06054b50, 0); e.writeUInt16LE(files.length, 8); e.writeUInt16LE(files.length, 10); e.writeUInt32LE(cd.length, 12); e.writeUInt32LE(off, 16);
  const zip = new Uint8Array(Buffer.concat([...loc, cd, e]));
  assert.ok(isZip(zip)); assert.ok(!isZip(new TextEncoder().encode('m1.abc')));
  const out = await unzip(zip);
  assert.deepEqual(out.map((x) => x.name), ['our-work.txt', 'riskmandate.txt']);
  assert.equal(new TextDecoder().decode(out[0].bytes), 'm1.made-up-code-one');
  assert.equal(new TextDecoder().decode(out[1].bytes), 'm1.made-up-code-two '.repeat(40));
  await assert.rejects(unzip(new Uint8Array(100)), /not a zip/);
});

// security.b review 036: a zip that declares a small size but inflates big is stopped while inflating; names are cleaned.
test('unzip stops a zip bomb while inflating, refuses big entries, and cleans names', async () => {
  const { unzip, safeName } = await import('../site/unzip.mjs'); const { deflateRawSync } = await import('node:zlib');
  const make = (name, raw, declared) => { const data = deflateRawSync(raw), n = Buffer.from(name);
    const h = Buffer.alloc(30); h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(8, 8); h.writeUInt32LE(data.length, 18); h.writeUInt32LE(declared, 22); h.writeUInt16LE(n.length, 26);
    const c = Buffer.alloc(46); c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(8, 10); c.writeUInt32LE(data.length, 20); c.writeUInt32LE(declared, 24); c.writeUInt16LE(n.length, 28);
    const cd = Buffer.concat([c, n]), e = Buffer.alloc(22); e.writeUInt32LE(0x06054b50, 0); e.writeUInt16LE(1, 8); e.writeUInt16LE(1, 10); e.writeUInt32LE(cd.length, 12); e.writeUInt32LE(30 + n.length + data.length, 16);
    return new Uint8Array(Buffer.concat([h, n, data, cd, e])); };
  const big = Buffer.alloc(8 * 1024 * 1024); // 8 MB of zeros, a few KB deflated
  await assert.rejects(unzip(make('bomb.png', big, 1000)), /inflates to more/);
  await assert.rejects(unzip(make('big.png', big, big.length)), /over 5 MB/);
  await assert.rejects(unzip(make('short.txt', Buffer.from('abc'), 10)), /not the size it declares/);
  assert.equal(safeName('gpj.‮evil.png'), 'gpj.evil.png');
  assert.equal(safeName('a\u0000b\nc'), 'abc');
  assert.equal(safeName('x'.repeat(200)).length, 80);
});

// People types (Dinis Cruz, 25 Nov 2026): team members may have no email; synthetic people only on reserved domains;
// a simulated reply only from a synthetic person; the People page groups them.
test('person types: team, agent, synthetic, twin inboxes and simulated replies', async () => {
  const { personFile, actionFile, peopleByType, importFiles } = await import('../model/crm.mjs');
  const v = readVault(withCrm(twin())), org = v.orgs[0].id, at = '2026-11-25T12:00:00Z';
  assert.throws(() => personFile(v, { id: 'p-x', name: 'Fake', email: 'fake@realcompany.com', org, type: 'synthetic', by: 'me', at }), /synthetic person's email/);
  assert.throws(() => personFile(v, { id: 'p-x', name: 'X', email: 'x@example.com', org, type: 'robot', by: 'me', at }), /unknown type/);
  assert.throws(() => personFile(v, { id: 'p-x', name: 'X', email: 'x@example.com', org, twin: 'x@gmail.com', by: 'me', at }), /twin inbox/);
  const [t] = personFile(v, { id: 'p-team', name: 'A Team Member', email: '', org, type: 'team', by: 'me', at });
  assert.deepEqual(t.record.emails, []);
  const [s] = personFile(v, { id: 'p-syn', name: 'Avery Test', email: 'avery@northwind.example.com', org, type: 'synthetic', twin: 'avery@northwind.example.com', by: 'me', at });
  const v2 = readVault({ ...withCrm(twin()), [t.path]: t.text, [s.path]: s.text });
  const [a] = actionFile(v2, { id: 'a-sim', org, person: 'p-syn', kind: 'email', direction: 'in', at: '2026-11-25', by: 'me', summary: 'Simulated reply: yes', logged_at: at, simulated: true });
  assert.equal(a.record.simulated, true);
  assert.throws(() => actionFile(v2, { id: 'a-x', org, person: 'p-team', kind: 'email', direction: 'in', at: '2026-11-25', by: 'me', summary: 'x', logged_at: at, simulated: true }), /only a synthetic/);
  const g = peopleByType(readVault({ ...withCrm(twin()), [t.path]: t.text, [s.path]: s.text, [a.path]: a.text }));
  assert.equal(g.team.length, 1); assert.equal(g.synthetic[0].last.simulated, true); assert.ok(g.contacts > 0);
  const csv = 'company,person,email,type,twin\nThe team,Someone,,team,\nNorthwind Example,Jo Sample,jo@northwind.example.com,synthetic,jo@northwind.example.com\n';
  const r = importFiles(v, csv, { by: 'me', at });
  assert.equal(r.report.people, 2); assert.deepEqual(r.report.skipped, []);
});

test('hot list: case ids, nine stages, who waits, overdue then Dinis then longest wait, paused counted, no names, checks', async () => {
  const { onboardingFile, hotList, ONBOARDING_STAGES, newCaseId } = await import('../model/crm.mjs');
  const base = withCrm(twin()), v = readVault(base), [o1, o2] = v.orgs.map((o) => o.id);
  assert.deepEqual(ONBOARDING_STAGES.map((s) => s.id), ['invited', 'qr-sent', 'uploads-in', 'consent-recorded', 'designs-ready', 'design-picked', 'live', 'editing', 'paused']);
  assert.match(newCaseId(), /^case-[0-9a-f]{6}$/);
  const at = iso(NOW);
  assert.throws(() => onboardingFile(v, 'Ana Costa', { stage: 'qr-sent', by: 'me', at }), /case id/);
  assert.throws(() => onboardingFile(v, 'case-aaaaaa', { stage: 'site-built', by: 'me', at }), /unknown stage/);
  assert.throws(() => onboardingFile(v, 'case-aaaaaa', { stage: 'qr-sent', waits: 'nobody', by: 'me', at }), /waits must be/);
  assert.throws(() => onboardingFile(v, 'case-aaaaaa', { stage: 'qr-sent', org: 'nope', by: 'me', at }), /no such company/);
  assert.throws(() => onboardingFile(v, 'case-aaaaaa', { stage: 'qr-sent', by: '', at }), /your name/);
  const put = (files, recs) => { for (const r of recs) files[r.path] = r.text; return files; };
  const f = { ...base };
  put(f, onboardingFile(v, 'case-aaaaaa', { stage: 'qr-sent', org: o1, next_step: 'Ask if the QR opened', by: 'me', at: iso(NOW - 6 * DAY) }));
  put(f, onboardingFile(v, 'case-bbbbbb', { stage: 'designs-ready', next_step: 'Show the designs', next_step_due: '2026-11-20', by: 'me', at: iso(NOW - 1 * DAY) }));
  put(f, onboardingFile(v, 'case-cccccc', { stage: 'live', by: 'me', at: iso(NOW - 2 * DAY) }));
  put(f, onboardingFile(v, 'case-dddddd', { stage: 'paused', by: 'me', at: iso(NOW - 9 * DAY) }));
  let w = readVault(f);
  assert.deepEqual(checkCrm(w), []);
  let h = hotList(w, NOW);
  assert.deepEqual(h.rows.map((r) => r.case), ['case-bbbbbb', 'case-cccccc', 'case-aaaaaa']); // overdue, then waiting on Dinis, then longest wait
  assert.equal(h.rows[0].name, 'case-bbbbbb'); // no company here: the case id, never a name
  assert.equal(h.rows[2].name, v.orgs[0].name); assert.equal(h.rows[1].waits, 'dinis'); assert.equal(h.paused, 1);
  // Same stage keeps 'since'; a new wait alone adds to the history; a new stage starts 'since' again.
  const [same] = onboardingFile(w, 'case-aaaaaa', { stage: 'qr-sent', next_step: 'Call', by: 'me', at });
  assert.equal(same.record.since, iso(NOW - 6 * DAY)); assert.equal(same.record.history.length, 1); assert.equal(same.record.org, o1);
  const [nudge] = onboardingFile(w, 'case-aaaaaa', { stage: 'qr-sent', waits: 'dinis', by: 'me', at });
  assert.equal(nudge.record.since, iso(NOW - 6 * DAY)); assert.deepEqual(nudge.record.history.map((x) => x.waits), ['owner', 'dinis']);
  const [moved] = onboardingFile(w, 'case-aaaaaa', { stage: 'uploads-in', by: 'me', at });
  assert.equal(moved.record.since, at); assert.equal(moved.record.waits, 'keeper'); assert.ok(!('name' in moved.record) && !('email' in moved.record));
  const bad = readVault({ ...f, 'crm/onboarding/x.json': JSON.stringify({ schema: 'crm.onboarding/1', case: 'Jane Doe', stage: 'late', waits: 'x', since: 'x' }) });
  assert.equal(checkCrm(bad).filter((e) => e.startsWith('onboarding Jane Doe')).length, 4);
  void o2;
});
