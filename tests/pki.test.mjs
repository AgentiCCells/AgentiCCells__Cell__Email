// The page's vault-key finder (src/app/pki.js), on made-up keys (SIMULATION).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findVaultKeys } from '../src/app/pki.js';

const P = 'sgit_private_' + 'vault_';
const pass = 'abcdefghij' + '0123456789' + 'wxyz';

test('finds a vault key with or without the prefix, and returns it prefixed', () => {
  assert.deepEqual(findVaultKeys(`key: ${P}${pass}:outbox01.`), [{ id: 'outbox01', key: `${P}${pass}:outbox01` }]);
  assert.deepEqual(findVaultKeys(`${pass}:outbox01`), [{ id: 'outbox01', key: `${P}${pass}:outbox01` }]);
});

test('ignores look-alikes and repeats', () => {
  assert.deepEqual(findVaultKeys('sha256:0d045a0b55734ac7 and a time 12:30'), []);
  assert.equal(findVaultKeys(`${pass}:outbox01 ${P}${pass}:outbox01`).length, 1);
});
