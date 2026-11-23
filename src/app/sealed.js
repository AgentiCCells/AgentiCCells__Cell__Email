// What the gateway page keeps from an opened sealed code, decided as a pure function so tests can
// run it. Fixes for backlog rank 40 (team/email.dev.d/notes/2026-11-22-unknown-sender-codes.md):
//   1. The page always says who a code is from, and says plainly when no trusted sender signed it.
//   2. A code never replaces a stored twin key, outbox key or access token without one
//      confirmation that names what would be replaced (old and new vault ids).
// What stays as Dinis asked on 16 November 2026 ("as soon as I paste the thing ... open the
// vault/outbox straight away"): a code opens at once when it replaces nothing.
// Built by email.dev.d@AgentiCCells.dinis, 22 to 23 November 2026, on conductor.d's call (scope
// within the brief; not on dev without Dinis's word). Apache-2.0.

const vaultIdOf = (key) => (typeof key === 'string' && key.includes(':') ? key.split(':').pop() : null);

// opened: what pki.js's openSealed returned: { from, vaultKeys: [{ id, key }], grant }.
// stored: what the page already keeps: { twin, outbox, token } (the secrets, or null).
// outboxId: the outbox vault's id.
// Returns {
//   trusted:  whether a trusted sender's signature was checked,
//   sender:   the sentence to show about who the code is from,
//   writes:   [{ name, value }] to keep, in order,
//   got:      what to tell the person was kept,
//   replaces: [{ what, from, to }] stored values the code would change (empty: no question needed),
//   question: the confirmation to ask when replaces is not empty, else null,
//   grantToken: the access token to use once kept, or null }.
export function planKeep(opened, stored = {}, outboxId) {
  const trusted = !String(opened?.from || '').startsWith('a code you brought');
  const sender = trusted
    ? `From ${opened.from}.`
    : 'Not signed by a trusted sender. Keep what it carries only if you made this code or asked for it.';
  const writes = [], got = [], replaces = [];
  let twinTaken = false;
  for (const v of opened?.vaultKeys || []) {
    writes.push({ name: 'vault:' + v.id, value: v.key });
    if (v.id === outboxId) {
      if (stored.outbox && stored.outbox !== v.key) replaces.push({ what: 'the outbox key', from: vaultIdOf(stored.outbox), to: v.id });
      got.push('the outbox key');
    } else if (!twinTaken) {
      // Only the first vault key in a code may become the twin key; any others are kept by id only.
      twinTaken = true;
      writes.push({ name: 'vault:twin', value: v.key });
      if (stored.twin && stored.twin !== v.key) replaces.push({ what: 'your twin vault key', from: vaultIdOf(stored.twin), to: v.id });
      got.push(`the key of vault ${v.id}`);
    } else {
      got.push(`the key of vault ${v.id} (not as the twin)`);
    }
  }
  let grantToken = null;
  if (opened?.grant?.token) {
    grantToken = opened.grant.token;
    writes.push({ name: 'sgsend:token', value: grantToken });
    if (stored.token && stored.token !== grantToken) replaces.push({ what: 'your SG/Send access token', from: null, to: null });
    got.push('the SG/Send access token');
  }
  const question = replaces.length
    ? `${trusted ? '' : 'This code is not signed by a trusted sender. '}It would replace ${replaces.map((r) => r.what + (r.from || r.to ? ` (vault ${r.from || '?'} becomes vault ${r.to || '?'})` : '')).join('; ')}. Replace?`
    : null;
  return { trusted, sender, writes, got, replaces, question, grantToken };
}
