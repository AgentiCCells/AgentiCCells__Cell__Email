// Shared test fixtures. Everything here is generated at test time: the simulated twin
// is written to a temporary folder and the keys are made fresh for each run, so no
// signature, key or hash is ever committed.
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildMailbox } from '../sim/build-mailbox.mjs';
import { loadTwin } from '../cell/twin/schema.mjs';
import { newKeyPair, keyId } from '../cell/lanes/entry.mjs';

export const root = new URL('..', import.meta.url).pathname;
export const policy = () => JSON.parse(readFileSync(join(root, 'policy/email-policy.json'), 'utf8'));
export const agents = () => JSON.parse(readFileSync(join(root, 'policy/agents.json'), 'utf8'));

let cached = null;
export function simTwin() {
  if (!cached) cached = loadTwin(buildMailbox(join(mkdtempSync(join(tmpdir(), 'cell-email-')), 'twin')));
  return cached;
}

export function keys(names) {
  const signers = {}, registry = {};
  for (const n of names) { signers[n] = newKeyPair(); registry[n] = signers[n].publicKeyPem; }
  return { signers, registry };
}

// Approvers pinned by fingerprint, as the gateway's operator will supply them out of band.
export function pins(registry, ids = ['person:owner']) {
  return Object.fromEntries(ids.filter((id) => registry[id]).map((id) => [id, keyId(registry[id])]));
}
