// Lane entries: the format, signing and verification of the four append lanes
// (actions, approvals, reads, outbox). Node built-ins only.
// Status: built and tested against generated keys; not yet run on a real sgit append lane.
//
// An entry is a JSON object. Its signature covers the canonical JSON of the entry
// without the "sig" field. Each author writes one chain per lane: entries carry
// seq (1, 2, 3...) and prev (the hash of the author's previous entry on that lane),
// so a chain cannot be reordered, cut or forked without the check failing.
// Lanes from several authors are merged by mergeLanes(), which also checks that
// every reference points at an entry that exists and came first.
import { createHash, generateKeyPairSync, sign, verify, createPublicKey } from 'node:crypto';

export const SCHEMA = 'lane.entry/1';
export const LANES = ['actions', 'approvals', 'reads', 'outbox'];

// Entry types per lane. Altitude 3 (cell/policy/agents.json) decides who may write which.
export const TYPES = {
  actions: ['propose.reply', 'propose.send', 'propose.label', 'propose.archive', 'propose.forward', 'withdraw'],
  approvals: ['approve', 'reject', 'gateway.stop', 'gateway.start'],
  reads: ['read'],
  outbox: ['sent', 'refused', 'failed'],
};

// Canonical JSON: keys sorted, no whitespace, integers only, undefined dropped.
export function canonical(v) {
  if (v === null || typeof v !== 'object') {
    if (typeof v === 'number' && !Number.isSafeInteger(v)) throw new Error('canonical: only safe integers are allowed');
    if (v === undefined) throw new Error('canonical: undefined value');
    return JSON.stringify(v);
  }
  if (Array.isArray(v)) return '[' + v.map(canonical).join(',') + ']';
  return '{' + Object.keys(v).filter((k) => v[k] !== undefined).sort()
    .map((k) => JSON.stringify(k) + ':' + canonical(v[k])).join(',') + '}';
}

const sha256 = (s) => createHash('sha256').update(s).digest('hex');

export function keyId(publicKeyPem) {
  const der = createPublicKey(publicKeyPem).export({ type: 'spki', format: 'der' });
  return 'ed25519:' + createHash('sha256').update(der).digest('hex');
}

export function newKeyPair() {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' });
  return { publicKeyPem, privateKey, keyId: keyId(publicKeyPem) };
}

// The hash of a signed entry: what prev and refs point at.
export const entryHash = (entry) => 'sha256:' + sha256(canonical(entry));
export const unsignedBytes = (entry) => { const { sig, ...rest } = entry; return Buffer.from(canonical(rest), 'utf8'); };

// A reference to another entry, used by approvals (to an action) and outbox (to an approval).
export const refOf = (entry) => ({ lane: entry.lane, author: entry.author, seq: entry.seq, hash: entryHash(entry) });

// Append a new signed entry to an author's chain. chain is that author's entries on that lane.
export function append(chain, { lane, author, type, body, at, refs }, signer) {
  if (!LANES.includes(lane)) throw new Error(`unknown lane ${lane}`);
  if (!TYPES[lane].includes(type)) throw new Error(`type ${type} is not allowed on lane ${lane}`);
  const last = chain[chain.length - 1];
  const entry = {
    schema: SCHEMA, lane, author, seq: last ? last.seq + 1 : 1, prev: last ? entryHash(last) : null,
    at: at || new Date().toISOString(), key: signer.keyId, type, body: body || {}, refs: refs || [],
  };
  entry.sig = sign(null, unsignedBytes(entry), signer.privateKey).toString('base64url');
  chain.push(entry);
  return entry;
}

// Verify one author's chain on one lane: shape, signature, key binding, seq, prev.
// registry: { [author]: publicKeyPem } (from team/keys or the vault, never from the entry itself).
export function verifyChain(chain, registry) {
  const errors = [];
  let prev = null;
  chain.forEach((e, i) => {
    const where = `${e?.lane}/${e?.author}#${e?.seq ?? i + 1}`;
    for (const k of ['schema', 'lane', 'author', 'seq', 'at', 'key', 'type', 'body', 'refs', 'sig']) if (e?.[k] === undefined) errors.push(`${where}: missing ${k}`);
    if (errors.length) return;
    if (e.schema !== SCHEMA) errors.push(`${where}: schema is not ${SCHEMA}`);
    if (!LANES.includes(e.lane)) errors.push(`${where}: unknown lane`);
    else if (!TYPES[e.lane].includes(e.type)) errors.push(`${where}: type ${e.type} not allowed on this lane`);
    if (i > 0 && (e.author !== chain[0].author || e.lane !== chain[0].lane)) errors.push(`${where}: chain mixes authors or lanes`);
    if (e.seq !== i + 1) errors.push(`${where}: seq ${e.seq}, expected ${i + 1}`);
    if (e.prev !== prev) errors.push(`${where}: prev does not match the hash of the entry before`);
    if (Number.isNaN(Date.parse(e.at))) errors.push(`${where}: at is not a date`);
    if (i > 0 && Date.parse(e.at) < Date.parse(chain[i - 1].at)) errors.push(`${where}: at goes backwards`);
    const pem = registry[e.author];
    if (!pem) errors.push(`${where}: author has no registered key`);
    else {
      if (keyId(pem) !== e.key) errors.push(`${where}: key is not the author's registered key`);
      else {
        let ok = false;
        try { ok = verify(null, unsignedBytes(e), pem, Buffer.from(e.sig, 'base64url')); } catch { ok = false; }
        if (!ok) errors.push(`${where}: bad signature`);
      }
    }
    prev = entryHash(e);
  });
  return errors;
}

// Merge every chain of every lane into one ordered history, and check what only the
// merged view can show: references resolve to earlier entries, an approval is not
// signed by the proposer, an outbox entry follows an approval, and (with agents)
// that each author's role allows the entry type (altitude 3).
// chains: array of chains (each one author on one lane).
// Results of mergeLanes that passed every check, so the send path can insist on one.
const VERIFIED = new WeakSet();
export const isVerifiedMerge = (r) => VERIFIED.has(r) && r.ok === true;

// What a person who approves may write. Approvers are not named in agents.json (which the
// cell itself can edit): they are pinned by fingerprint, out of band, by the gateway's
// operator (review by specialist.abp, second read, point 1).
export const APPROVER_LANES = {
  actions: ['propose.reply', 'propose.send', 'propose.label', 'propose.archive', 'propose.forward', 'withdraw'],
  approvals: ['approve', 'reject', 'gateway.stop', 'gateway.start'],
  reads: ['read'],
};

// approvers: { [author]: keyId } pinned outside the repository and the vault.
// A merge counts as verified only with both agents and approvers given.
export function mergeLanes(chains, registry, agents, approvers) {
  const errors = chains.flatMap((c) => verifyChain(c, registry));
  if (agents) for (const [id, a] of Object.entries(agents.agents || {})) if (a.role === 'approver' || agents.roles?.[a.role]?.lanes?.approvals?.some((t) => t !== 'gateway.stop')) errors.push(`agents.json: ${id} may approve or start the gateway; approvers are pinned outside the cell, never named in agents.json`);
  for (const [id, fp] of Object.entries(approvers || {})) if (registry[id] && keyId(registry[id]) !== fp) errors.push(`approver ${id}: the registered key is not the pinned one`);
  const all = chains.flat();
  const byHash = new Map(all.map((e) => [entryHash(e), e]));
  const order = [...all].sort((a, b) => Date.parse(a.at) - Date.parse(b.at)
    || a.lane.localeCompare(b.lane) || a.author.localeCompare(b.author) || a.seq - b.seq);
  const position = new Map(order.map((e, i) => [entryHash(e), i]));
  for (const e of order) {
    const where = `${e.lane}/${e.author}#${e.seq}`;
    if (agents) {
      const allowed = allowedTypes(agents, e.author, e.lane, approvers);
      if (!allowed.includes(e.type)) errors.push(`${where}: ${e.author} may not write ${e.type} on ${e.lane} (altitude 3)`);
    }
    for (const r of e.refs) {
      const target = byHash.get(r.hash);
      if (!target) { errors.push(`${where}: refers to an entry that is not on any lane`); continue; }
      if (target.lane !== r.lane || target.author !== r.author || target.seq !== r.seq) errors.push(`${where}: reference fields do not match the entry they hash to`);
      if (position.get(r.hash) >= position.get(entryHash(e))) errors.push(`${where}: refers to an entry that does not come before it`);
    }
    const refTo = (lane) => e.refs.map((r) => byHash.get(r.hash)).filter((t) => t && t.lane === lane);
    if (e.lane === 'approvals' && (e.type === 'approve' || e.type === 'reject')) {
      const actions = refTo('actions');
      if (actions.length !== 1) errors.push(`${where}: an approval must refer to exactly one action`);
      for (const a of actions) if (a.author === e.author) errors.push(`${where}: the proposer may not approve its own action`);
    }
    if (e.lane === 'outbox' && e.type === 'sent') {
      const approvals = refTo('approvals').filter((a) => a.type === 'approve');
      const policy = e.body?.policy_decision === 'allow';
      if (!approvals.length && !policy) errors.push(`${where}: sent without an approval or a policy allow`);
    }
  }
  const result = Object.freeze({ ok: errors.length === 0 && !!agents && !!approvers, errors: Object.freeze(errors), order: Object.freeze(order.map((e) => Object.freeze(e))) });
  if (result.ok) VERIFIED.add(result);
  return result;
}

export function allowedTypes(agents, author, lane, approvers) {
  if (approvers?.[author]) return APPROVER_LANES[lane] || [];
  const a = agents.agents[author];
  if (!a) return [];
  return agents.roles[a.role]?.lanes?.[lane] || [];
}

// The kill switch, read from the merged approvals lane: the last stop or start wins.
export function gatewayStopped(order) {
  let stopped = false;
  for (const e of order) if (e.lane === 'approvals') {
    if (e.type === 'gateway.stop') stopped = true;
    if (e.type === 'gateway.start') stopped = false;
  }
  return stopped;
}
