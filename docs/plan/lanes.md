# The lanes

**Status: the entry format and the checks are built (simulation)** in `cell/lanes/entry.mjs`, tested with keys made fresh for each test run. **Running them on sgit append lanes is a plan:** it needs the vault. [Back to the plan](index.md).

## Four lanes

| Lane | Entry types | Who writes |
|---|---|---|
| actions | `propose.reply`, `propose.send`, `propose.label`, `propose.archive`, `propose.forward`, `withdraw` | drafter, triage, crm agents and people, by role |
| approvals | `approve`, `reject`, `gateway.stop`, `gateway.start` | approvers, pinned by key fingerprint outside the cell; any cell agent may also write `gateway.stop` |
| reads | `read` | anyone who reads the twin: a receipt per message read |
| outbox | `sent`, `refused`, `failed` | the gateway only |

Who may write which type is altitude 3 of the policy, in `policy/agents.json`.

## An entry (lane.entry/1)

```json
{
  "schema": "lane.entry/1",
  "lane": "approvals",
  "author": "person:owner",
  "seq": 4,
  "prev": "sha256:<hash of this author's entry 3 on this lane>",
  "at": "2026-11-16T10:05:00Z",
  "key": "ed25519:<SHA-256 of the author's public key>",
  "type": "approve",
  "body": {},
  "refs": [{ "lane": "actions", "author": "drafter.email@AgentiCCells.dinis", "seq": 12, "hash": "sha256:<hash of that entry>" }],
  "sig": "<Ed25519 signature, base64url>"
}
```

- **Signed.** `sig` is an Ed25519 signature, base64url without padding, over the canonical JSON of the entry without `sig`, as UTF-8. Canonical JSON: object keys sorted by code unit (all keys are ASCII), no whitespace, strings escaped as JavaScript's `JSON.stringify` does (quote, backslash and control characters only; slash not escaped; non-ASCII emitted as is), integers only, `null` kept, absent fields left out.
- **Key id.** `key` is `ed25519:` and the hex SHA-256 of the public key's SPKI DER (for a raw 32-byte key, the prefix `302a300506032b6570032100` and the 32 bytes).
- **Entry hash.** `sha256:` and the hex SHA-256 of the canonical JSON of the whole entry, `sig` included. `prev` and `refs` use it.
- **Chained.** Each author keeps one chain per lane: `seq` counts 1, 2, 3, and `prev` is the hash of the author's previous entry. An entry cannot be removed, reordered or changed without the check failing. No commit per click: a chain is appended to, and committed in batches.
- **Keys come from the registry, never from the entry.** `key` must match the author's registered public key (in `team/keys/` or the vault).
- **References** point at other entries by lane, author, seq and hash.

## Client references

A client may put an opaque `client_ref` string on a `propose.send` or `propose.reply` body (the CRM puts its draft id there). The gateway copies it into the outbox entry, so the client can match the result to its draft without the twin knowing the client's ids. Asked for by the CRM, 16 November 2026; carried by `decide` today, the outbox writer is not built.

## What the checks catch

`verifyChain` checks one author's chain: shape, type allowed on the lane, seq, prev, time order, key binding, signature.

`mergeLanes` merges every chain into one ordered history and checks what only the merged view shows:

- the author's role allows the entry type (altitude 3);
- every reference resolves to an entry that exists and comes first;
- an approval refers to exactly one action, and is not signed by the action's proposer;
- a `sent` entry follows a person's approval or a policy allow.

`gatewayStopped` reads the kill switch from the merged approvals lane: the last `gateway.stop` or `gateway.start` wins.

`decide` (in `cell/gateway/decide.mjs`) accepts only a result that `mergeLanes` verified, with the agents file, in that same call, and refuses to send unless both policy files carry a person's signature. It turns the merged lanes, the twin and the email policy into what the gateway would do now with each open proposal: send, wait for a person, refuse or drop. It sends nothing.

## Not built yet

- Storing chains on sgit append lanes, and the lane tokens sealed to each agent's key ([an inbox only your agents can write to](https://newsroom.sgit.ai/articles/an-inbox-only-your-agents-can-write-to.html)).
- Key rotation and revocation.
- Trusted time: `at` is the author's claim; ordering across authors relies on references, not clocks.
