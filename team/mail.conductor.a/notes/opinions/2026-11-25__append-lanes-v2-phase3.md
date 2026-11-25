# Opinion: Append Lanes v2, Phase 3 (blobs by hash) for email attachments

By mail.conductor.a@AgentiCCells.dinis, 25 November 2026, 01:53 UTC (`date -u`), for the Email Cell and the Gmail tool, at a.maestro's request (relayed at Dinis's ask). Read: the plan (`v0.33.69__dev-plan__append-lanes-v2-implementation.md` on `claude/vault-inbox-append-api-jj79bn`, fetched 01:53 UTC) and a.maestro's review (`2026-11-25__append-lanes-v2.md`). mail.dev.a has not reviewed this yet; its view may differ.

**Verdict: agree with Phase 3 as the route for email attachments, with five changes below.** It fits the signed-batch plan (`team/mail.conductor.a/notes/2026-11-24-signed-batch-send-plan.md`): attachments stay out of the small entry, bytes go straight to storage, and nothing new leaks.

## Where it fits
Today, drafts with attachments live in the CRM vault (`drafts/<id>.json`, attachments as vault paths), written by the CRM with the person's vault key. Phase 3 matters for the other path: **agents writing drafts to an outbox lane** (outreach agents, the book outreach) without holding the vault's write key. The draft arrives as an append entry; its PDFs and images as blobs.

## Five changes we ask for

1. **Two hashes per attachment, both in the sealed entry.** The approval signature must cover what Dinis saw (the plaintext), and retrieval needs the ciphertext's hash. An attachment reference inside the sealed envelope: `{name, type, bytes, sha256 (plaintext), blob: {id: sha256 of ciphertext, size, key, iv}}`, with a fresh AES-GCM key per blob. The signed draft hash (`canon()` of the draft) covers the plaintext sha256; the reader checks both after download.

2. **Lane-level size and type for email lanes.** The server ceiling of 256 MiB is right for archives, wrong for email. Email lanes set `max_blob_bytes` to about 10.5 MiB (10 MiB of attachments per email, our C9 proposal, plus GCM overhead); Gmail's 25 MB limit counts base64, so about 18 MB of raw attachments is the true ceiling anyway. Types (PDF, PNG, JPEG) stay a client check (magic bytes, as `signoff.mjs` already does): the server cannot see them, and should not try.

3. **The S3 host is a new connection for the pages.** The cell's and the tool's pages have a content security policy whose `connect-src` is checked in CI (`scripts/check-app.mjs`: Gmail, Google OAuth, dev.send.sgraph.ai, pki.sgit.ai). Presigned `PUT` and `GET` go to the bucket's own host. Either the plan serves blob bytes through a fixed, documented host we can pin (preferred), or adding the bucket host is a policy change that needs Dinis's word (it widens what holds the Gmail token). Please state the exact host(s) in the plan. S3 CORS must allow the cell's and the tool's origins, not only the vault origins.

4. **Orphans: let the reader purge the blobs it used.** a.maestro's point 8. After a batch is sent, the cell's page knows exactly which blobs the sent drafts referenced. With the enum key it should be able to purge those named blob ids; otherwise attachments outlive the email until the write-key holder purges or retention runs. For outbox lanes we suggest retention required when `blobs` is on, defaulting to 30 days.

5. **The envelope: one transport envelope, with the outbox draft as a type inside it.** The outbox draft should not *be* the documented envelope; it should be one payload type in it. Proposal for the envelope owner: `{v, type, sealed}` outside (`type` e.g. `mail.outbox-draft/1`, `crm.request/v1`, `lane.entry/1`), and inside `sealed` the hybrid-encrypted payload (the same RSA-OAEP plus AES-GCM as `maestro_mail.py` and the /send/ pages), carrying the blob references and, on signed lanes, the grant and signature. One base64 layer, as Phase 1 asks. The Email Cell will publish `mail.outbox-draft/1` (our agreed draft fields, plus the attachment reference above) once the envelope spec exists, so the three users (CLI, vault web, agents) share one outer shape.

## Smaller points
- Blob path: agree with a.maestro, `sha256(token)` in the object key, not the raw token.
- Upload order (blob first, entry second) is right; the cell would refuse an entry whose blob is `missing` and say so in the batch view.
- 412 as success is right; it is also how a resent attachment dedupes.
- The 5-minute presigned `GET` is enough for a batch of ten; the page should request URLs per draft, not all at once.

## What this needs from Dinis
Nothing until we use it. When the outbox moves to a lane with blobs: (a) the connection to the blob host in the pages' policy (point 3), and (b) the signed-batch decisions already with him (D-A to D-E, C9).

## mail.dev.a's refinements, accepted (01:54 UTC)
mail.dev.a's view: https://github.com/SovereignWebsite/Site__Tool__Google__Gmail/blob/dev/docs/opinions/2026-11-25__append-lanes-v2-phase3.md (d140fbf). It agrees with the five changes, with three refinements, which this opinion adopts:
1. Blob references make a **v2 draft format**: the blob's key and IV sit inside `canon(draft)`, so the draft is signed only after its blobs are uploaded.
3. A **firm** preference for one fixed, documented blob host over adding the bucket's host to the pages' policy.
4. **No automatic purge by the page.** Blobs go by the lane's retention, or by the person's own press after a send, because deletions stay a person's call. The enum-key purge we ask the plan for is the means; the page only offers it.
mail.dev.a reviewed from this account of the plan; the plan's repository is not attached to its session.
