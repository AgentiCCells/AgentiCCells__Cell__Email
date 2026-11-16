// Signed policy files (review by specialist.abp@AgentiCCells.dinis, 16 November 2026, point a).
// The gateway refuses to act on policy/agents.json or the email policy unless a person with
// the approver role signed that exact content. Until this runs on the real files, the lane
// checks are a setting, not a boundary. The signature is a detached object kept beside the
// file in the vault (never committed here: signatures trip the leak scan).
import { createHash, sign, verify } from 'node:crypto';
import { canonical, keyId } from '../lanes/entry.mjs';

const digest = (obj) => 'sha256:' + createHash('sha256').update(canonical(obj)).digest('hex');
const bytes = (s) => { const { sig, ...rest } = s; return Buffer.from(canonical(rest), 'utf8'); };

export function signPolicy(obj, { name, author, at }, signer) {
  const s = { schema: 'policy.signature/1', file: name, digest: digest(obj), author, key: signer.keyId, at: at || new Date().toISOString() };
  s.sig = sign(null, bytes(s), signer.privateKey).toString('base64url');
  return s;
}

// Returns a list of problems; empty means the policy file may be used.
export function verifyPolicy(obj, s, { name, registry, agents }) {
  if (!s) return [`${name}: not signed`];
  const e = [];
  if (s.schema !== 'policy.signature/1') e.push(`${name}: signature schema is not policy.signature/1`);
  if (s.file !== name) e.push(`${name}: the signature is for ${s.file}`);
  if (s.digest !== digest(obj)) e.push(`${name}: the file changed after it was signed`);
  const role = agents?.agents?.[s.author]?.role;
  if (role !== 'approver' || !String(s.author).startsWith('person:')) e.push(`${name}: signed by ${s.author}, who is not a person with the approver role`);
  const pem = registry[s.author];
  if (!pem) e.push(`${name}: signer has no registered key`);
  else if (keyId(pem) !== s.key) e.push(`${name}: signed with a key that is not the signer's`);
  else {
    let ok = false;
    try { ok = verify(null, bytes(s), pem, Buffer.from(s.sig, 'base64url')); } catch { ok = false; }
    if (!ok) e.push(`${name}: bad signature`);
  }
  return e;
}
