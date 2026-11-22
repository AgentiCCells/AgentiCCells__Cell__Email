// Lane entries and signed policy files, verified in the browser with WebCrypto (Ed25519).
// The format is the one cell/lanes/entry.mjs and cell/policy/signed.mjs make and check in Node;
// this module only verifies (the page signs nothing yet). The rules are the same, line for line,
// so a lane or policy file that Node accepts the page accepts, and one Node refuses the page
// refuses: tests/decide-page.test.mjs checks both against entries made by the Node code.
// Everything here is async, because WebCrypto is.
// By cell.email.d@AgentiCCells.dinis, 2026-11-22. Apache-2.0.

export const SCHEMA = 'lane.entry/1';
export const LANES = ['actions', 'approvals', 'reads', 'outbox'];
export const TYPES = {
  actions: ['propose.reply', 'propose.send', 'propose.label', 'propose.archive', 'propose.forward', 'withdraw'],
  approvals: ['approve', 'reject', 'gateway.stop', 'gateway.start'],
  reads: ['read'],
  outbox: ['sent', 'refused', 'failed'],
};
export const APPROVER_LANES = {
  actions: TYPES.actions,
  approvals: TYPES.approvals,
  reads: ['read'],
};

const subtle = () => {
  const s = globalThis.crypto?.subtle;
  if (!s) throw new Error('this browser has no WebCrypto; nothing may be sent');
  return s;
};
const utf8 = (s) => new TextEncoder().encode(s);
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const sha256hex = async (bytes) => hex(await subtle().digest('SHA-256', bytes));

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

function pemToDer(pem) {
  const b64 = String(pem).replace(/-----(BEGIN|END) PUBLIC KEY-----/g, '').replace(/\s+/g, '');
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function fromBase64url(s) {
  const b64 = String(s).replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (String(s).length % 4)) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// The key id: sha256 over the SPKI DER, as cell/lanes/entry.mjs's keyId. Only Ed25519 keys count.
export async function keyId(publicKeyPem) {
  const der = pemToDer(publicKeyPem);
  await subtle().importKey('spki', der, { name: 'Ed25519' }, false, ['verify']); // throws on anything but Ed25519
  return 'ed25519:' + (await sha256hex(der));
}
async function verifySig(pem, bytes, sig) {
  try {
    const key = await subtle().importKey('spki', pemToDer(pem), { name: 'Ed25519' }, false, ['verify']);
    return await subtle().verify({ name: 'Ed25519' }, key, fromBase64url(sig), bytes);
  } catch { return false; }
}
const tryKeyId = async (pem) => { try { return await keyId(pem); } catch { return null; } };

export const entryHash = async (entry) => 'sha256:' + (await sha256hex(utf8(canonical(entry))));
const unsignedBytes = (entry) => { const { sig, ...rest } = entry; return utf8(canonical(rest)); };

// One author's chain on one lane: shape, signature, key binding, seq, prev.
// registry: { [author]: publicKeyPem }, never taken from the entries themselves.
export async function verifyChain(chain, registry) {
  const errors = [];
  let prev = null;
  for (let i = 0; i < chain.length; i++) {
    const e = chain[i];
    const where = `${e?.lane}/${e?.author}#${e?.seq ?? i + 1}`;
    for (const k of ['schema', 'lane', 'author', 'seq', 'at', 'key', 'type', 'body', 'refs', 'sig']) if (e?.[k] === undefined) errors.push(`${where}: missing ${k}`);
    if (errors.length) return errors;
    if (e.schema !== SCHEMA) errors.push(`${where}: schema is not ${SCHEMA}`);
    if (!LANES.includes(e.lane)) errors.push(`${where}: unknown lane`);
    else if (!TYPES[e.lane].includes(e.type)) errors.push(`${where}: type ${e.type} not allowed on this lane`);
    if (i > 0 && (e.author !== chain[0].author || e.lane !== chain[0].lane)) errors.push(`${where}: chain mixes authors or lanes`);
    if (e.seq !== i + 1) errors.push(`${where}: seq ${e.seq}, expected ${i + 1}`);
    if (e.prev !== prev) errors.push(`${where}: prev does not match the hash of the entry before`);
    if (Number.isNaN(Date.parse(e.at))) errors.push(`${where}: at is not a date`);
    if (i > 0 && Date.parse(e.at) < Date.parse(chain[i - 1].at)) errors.push(`${where}: at goes backwards`);
    const pem = Object.hasOwn(registry, e.author) ? registry[e.author] : null;
    if (!pem) errors.push(`${where}: author has no registered key`);
    else if ((await tryKeyId(pem)) !== e.key) errors.push(`${where}: key is not the author's registered key`);
    else if (!(await verifySig(pem, unsignedBytes(e), e.sig))) errors.push(`${where}: bad signature`);
    prev = await entryHash(e);
  }
  return errors;
}

const VERIFIED = new WeakSet();
export const isVerifiedMerge = (r) => VERIFIED.has(r) && r.ok === true;

export function allowedTypes(agents, author, lane, approvers) {
  if (approvers && Object.hasOwn(approvers, author)) return APPROVER_LANES[lane] || [];
  const a = agents.agents?.[author];
  if (!a || !Object.hasOwn(agents.agents, author)) return [];
  return agents.roles?.[a.role]?.lanes?.[lane] || [];
}

// Merge every chain into one ordered history and check what only the merged view shows (see
// cell/lanes/entry.mjs's mergeLanes). A merge counts as verified only with agents and approvers.
export async function mergeLanes(chains, registry, agents, approvers) {
  const errors = [];
  for (const c of chains) errors.push(...(await verifyChain(c, registry)));
  if (agents) for (const [id, a] of Object.entries(agents.agents || {})) if (a.role === 'approver' || agents.roles?.[a.role]?.lanes?.approvals?.some((t) => t !== 'gateway.stop')) errors.push(`agents.json: ${id} may approve or start the gateway; approvers are pinned outside the cell, never named in agents.json`);
  for (const [id, fp] of Object.entries(approvers || {})) if (registry[id] && (await tryKeyId(registry[id])) !== fp) errors.push(`approver ${id}: the registered key is not the pinned one`);
  const all = chains.flat();
  const hashes = new Map();
  for (const e of all) hashes.set(e, await entryHash(e));
  const byHash = new Map(all.map((e) => [hashes.get(e), e]));
  const order = [...all].sort((a, b) => Date.parse(a.at) - Date.parse(b.at)
    || a.lane.localeCompare(b.lane) || a.author.localeCompare(b.author) || a.seq - b.seq);
  const position = new Map(order.map((e, i) => [hashes.get(e), i]));
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
      if (position.get(r.hash) >= position.get(hashes.get(e))) errors.push(`${where}: refers to an entry that does not come before it`);
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
  const result = Object.freeze({ ok: errors.length === 0 && !!agents && !!approvers, errors: Object.freeze(errors), order: Object.freeze(order.map((e) => Object.freeze(e))), hashes });
  if (result.ok) VERIFIED.add(result);
  return result;
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

// A signed policy file (cell/policy/signed.mjs). Returns a list of problems; empty means usable.
export async function verifyPolicy(obj, s, { name, registry, approvers }) {
  if (!s) return [`${name}: not signed`];
  const e = [];
  if (s.schema !== 'policy.signature/1') e.push(`${name}: signature schema is not policy.signature/1`);
  if (s.file !== name) e.push(`${name}: the signature is for ${s.file}`);
  let digest = null;
  try { digest = 'sha256:' + (await sha256hex(utf8(canonical(obj)))); } catch { digest = null; }
  if (s.digest !== digest) e.push(`${name}: the file changed after it was signed`);
  const pinned = approvers && Object.hasOwn(approvers, s.author) ? approvers[s.author] : null;
  if (!pinned) e.push(`${name}: signed by ${s.author}, who is not a pinned approver`);
  else if (pinned !== s.key) e.push(`${name}: signed with a key that is not the approver's pinned key`);
  const pem = registry && Object.hasOwn(registry, s.author) ? registry[s.author] : null;
  if (!pem) e.push(`${name}: signer has no registered key`);
  else if ((await tryKeyId(pem)) !== s.key) e.push(`${name}: signed with a key that is not the signer's`);
  else {
    const { sig, ...rest } = s;
    if (!(await verifySig(pem, utf8(canonical(rest)), sig))) e.push(`${name}: bad signature`);
  }
  return e;
}
