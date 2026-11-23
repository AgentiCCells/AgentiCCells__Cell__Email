// What the gateway keeps from an opened sealed code (src/app/sealed.js, backlog rank 40).
// SIMULATION: made-up vault keys, built at run time so no key shape is committed.
// By email.dev.d@AgentiCCells.dinis, 2026-11-23.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planKeep } from '../src/app/sealed.js';

const OUTBOX = 'co57gzld';
const key = (pass, id) => ['sgit', 'private', 'vault', ''].join('_') + pass + ':' + id;
const mine = key('aaaa1111bbbb2222cccc', 'mytwin01');
const theirs = key('dddd3333eeee4444ffff', 'strange99');
const outbox = key('gggg5555hhhh6666iiii', OUTBOX);
const unknown = (vaultKeys, grant = null) => ({ from: 'a code you brought yourself (not signed by a trusted sender)', vaultKeys, grant });
const signed = (vaultKeys, grant = null) => ({ from: 'conductor@PrompTugal.dinis, signature checked', vaultKeys, grant });

test('an unknown sender is always named as such', () => {
  const p = planKeep(unknown([{ id: 'strange99', key: theirs }]), {}, OUTBOX);
  assert.equal(p.trusted, false);
  assert.match(p.sender, /Not signed by a trusted sender/);
  assert.match(planKeep(unknown([]), {}, OUTBOX).sender, /Not signed by a trusted sender/);
});

test('a trusted sender is named, with its signature checked', () => {
  const p = planKeep(signed([{ id: OUTBOX, key: outbox }]), {}, OUTBOX);
  assert.equal(p.trusted, true);
  assert.match(p.sender, /From conductor@PrompTugal\.dinis, signature checked/);
});

test('a first key opens straight away, with no question (Dinis, 16 November)', () => {
  const p = planKeep(unknown([{ id: 'strange99', key: theirs }]), { twin: null }, OUTBOX);
  assert.equal(p.question, null);
  assert.deepEqual(p.writes.map((w) => w.name), ['vault:strange99', 'vault:twin']);
});

test('replacing a stored twin key asks first, naming the old and new vault ids', () => {
  const p = planKeep(unknown([{ id: 'strange99', key: theirs }]), { twin: mine }, OUTBOX);
  assert.equal(p.replaces.length, 1);
  assert.match(p.question, /not signed by a trusted sender/);
  assert.match(p.question, /twin vault key \(vault mytwin01 becomes vault strange99\)/);
});

test('the same twin key again replaces nothing and asks nothing', () => {
  assert.equal(planKeep(unknown([{ id: 'mytwin01', key: mine }]), { twin: mine }, OUTBOX).question, null);
});

test('replacing the outbox key or the access token also asks, even from a trusted sender', () => {
  const other = key('jjjj7777kkkk8888llll', OUTBOX);
  const p = planKeep(signed([{ id: OUTBOX, key: other }], { token: 'new-made-up' }), { outbox, token: 'old-made-up' }, OUTBOX);
  assert.deepEqual(p.replaces.map((r) => r.what), ['the outbox key', 'your SG/Send access token']);
  assert.ok(p.question && !/not signed/.test(p.question));
  assert.equal(p.grantToken, 'new-made-up');
});

test('only the first vault key in a code may become the twin', () => {
  const second = key('mmmm9999nnnn0000oooo', 'another1');
  const p = planKeep(unknown([{ id: 'strange99', key: theirs }, { id: 'another1', key: second }]), {}, OUTBOX);
  assert.deepEqual(p.writes.filter((w) => w.name === 'vault:twin').map((w) => w.value), [theirs]);
  assert.match(p.got.join(' '), /another1 \(not as the twin\)/);
});
