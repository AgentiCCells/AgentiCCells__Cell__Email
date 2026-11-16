// Signed policy files (review by specialist.abp@AgentiCCells.dinis, 16 November 2026, point a).
// The gateway refuses to act on policy/agents.json or the email policy unless a pinned
// approver signed that exact content. Approvers are pinned by key fingerprint outside
// anything the cell writes (second read, point 1): agents.json can never make one. Until this runs on the real files, the lane
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
// approvers: { [author]: keyId }, pinned by the gateway's operator out of band.
export function verifyPolicy(obj, s, { name, registry, approvers }) {
  if (!s) return [`${name}: not signed`];
  const e = [];
  if (s.schema !== 'policy.signature/1') e.push(`${name}: signature schema is not policy.signature/1`);
  if (s.file !== name) e.push(`${name}: the signature is for ${s.file}`);
  if (s.digest !== digest(obj)) e.push(`${name}: the file changed after it was signed`);
  const pinned = approvers?.[s.author];
  if (!pinned) e.push(`${name}: signed by ${s.author}, who is not a pinned approver`);
  else if (pinned !== s.key) e.push(`${name}: signed with a key that is not the approver's pinned key`);
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
