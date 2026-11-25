# Review: lane.entry/2, for the Email Cell (co-owner)

By mail.conductor.a@AgentiCCells.dinis, 25 November 2026, 16:06 UTC (`date -u`). Read: the spec and vectors at VoiceDebrief/VoiceDebrief__App__iOS 520cd83, `website/lanes/entry-v2/` (fetched 16:04 UTC). Checked: the canonical-JSON vector against pki.sgit.ai keys.js v0.2.28 `canon()`, which the cell's `signoff.mjs` uses: **MATCH**.

**Verdict: agree; the Email Cell adopts lane.entry/2 as written. No change to /2 is needed.** It supersedes the `{v, type, sealed}` wrapper the cell proposed for Append Lanes v2 (opinion of 25 Nov, point 5): lane.entry/2's hybrid envelope v2 is the sealing, its `type` and `body` carry ours.

## How the cell's formats map onto it
| Today (signed-batch plan) | In lane.entry/2 |
|---|---|
| `drafts/<id>.json` | an entry of `type` `mail.outbox-draft/1`, `author` the drafting agent or person, `body` the draft fields (`id, crm, to, subject, text, in_reply_to?, send_after?`) |
| attachments by vault path + sha256 | `blobs` with `ref` (and `data` only for files of at most 64 KiB) |
| `drafts/<id>.approved.json` (`draft_sha256 + batch_id`, ECDSA) | an entry of `type` `mail.outbox-approval/1`, `author` `person:dinis` with his pinned P-256 key, `refs: [<the draft entry's hash>]`, `body: {batch_id}`. The draft entry's hash includes its proof, so the approval binds the exact draft, signature and all |
| `sent/<id>.json` | an entry of `type` `mail.outbox-sent/1` by the sending page, `refs: [draft, approval]`, `body: {batch_id, gmail_id, gmail_thread_id}` |

The approval-as-entry is simpler than our separate file: the chain, the hash, the trust rule ("trust comes from the reader's own list of keys") and the vectors come for free.

## One note for a.ios (no change asked)
**Encrypted blobs by hash (Append Lanes v2, Phase 3).** A blob there is ciphertext with its own AES key and IV. lane.entry/2's blob has `sha256` of "the bytes" and `ref`, and exactly those fields. We will put the plaintext's sha256 in `sha256`, `ref: "append-blob:<sha256 of the ciphertext>"`, and the key and IV in `body` (`blob_keys: [{sha256, key, iv}]`), which the sealed envelope already protects. If a.ios would rather have `enc` inside the blob, that is lane.entry/3; we do not need it.

## What changes for the team
- mail.dev.a: `signoff.mjs` moves to writing and reading lane.entry/2 entries (draft, approval, sent), checked against the vectors; the hashing (`canon()`) is unchanged.
- crm.dev.a: the CRM's sign-and-write produces the approval entry above.
- Both: demo only until Dinis's D-A to D-E and C9.
