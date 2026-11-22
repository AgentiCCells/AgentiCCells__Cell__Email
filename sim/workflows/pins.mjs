// Where the page's lane keys and pinned approvers could come from: two sources with one shape.
// PROPOSAL and SIMULATION, by email.workflows.d@AgentiCCells.dinis, 22 November 2026.
// Dinis, 03:59 UTC on 22 November 2026, relayed by conductor.d: agents' lane keys come from
// team/keys ("Yeah, teams.keys, that's a good one"). Where pinned approvers come from is still
// open: (a) the cell's own site, from team/keys, or (b) pki.sgit.ai's register with only the
// approver's identity pinned. This file does not pick. Both return what decideEntry() takes:
//   { registry: { author: Ed25519 public key PEM }, approvers: { author: key id } }
// so the page can plug either in. Apache-2.0.
import { keyId } from '../../src/app/cell/lanes.mjs';

// Proposal for a team/keys entry's lane key: "lane_key", an Ed25519 public key (SPKI PEM),
// beside the sgit "sign" key (ECDSA P-256), which the lanes do not use.
// entries: [{ agent, lane_key }] as built into the page (like trusted.js).
// (a) approvers: [author] whose lane_key the page pins from the same entries.
export async function fromTeamKeys(entries, { approvers = [] } = {}) {
  const registry = {}, pinned = {};
  for (const e of entries) {
    if (!e?.agent || !e?.lane_key) continue;
    if (registry[e.agent]) throw new Error(`fromTeamKeys: ${e.agent} has two lane keys`);
    registry[e.agent] = e.lane_key;
  }
  for (const id of approvers) {
    if (!registry[id]) throw new Error(`fromTeamKeys: approver ${id} has no lane key`);
    pinned[id] = await keyId(registry[id]);
  }
  return { registry, approvers: pinned };
}

// (b) The page pins only the approver's identity; their lane key is looked up in a register.
// lookup(identity) returns the identity's Ed25519 public key PEM, or null. In a real page this
// would read pki.sgit.ai's public register; here a test passes a made-up one.
export async function fromRegister(agentEntries, identities, lookup) {
  const { registry } = await fromTeamKeys(agentEntries);
  const pinned = {};
  for (const id of identities) {
    const pem = await lookup(id);
    if (!pem) throw new Error(`fromRegister: the register has no lane key for ${id}`);
    if (registry[id] && registry[id] !== pem) throw new Error(`fromRegister: ${id} has a different key in team/keys`);
    registry[id] = pem;
    pinned[id] = await keyId(pem);
  }
  return { registry, approvers: pinned };
}
