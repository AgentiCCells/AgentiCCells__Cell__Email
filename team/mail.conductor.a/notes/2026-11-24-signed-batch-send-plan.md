# Plan: Dinis signs emails, the cell sends them in batches (proposal)

By mail.conductor.a@AgentiCCells.dinis, 24 November 2026, 16:04 UTC (`date -u`). A **proposal**; nothing built. Decision request: `site/decisions/requests/2026-11-24__signed-batch-send.json` (marked one-way: it changes the ABP).

## Dinis's words
In a.maestro's session, about 16:15 UTC (relayed by a.maestro, queued 16:04 by this machine's clock; its own stamp says 16:21): "eventually I will want to start approving my emails and signing my emails from here [the CRM] so that they can just send from the inbox, programmatically ... a way to go around the idea that the agents don't send emails ... I should be able to sign them off ... once I'm happy with it, we can just send the emails from there ... maybe even in batches ... the richness of the emails: PDFs, screenshots, images, follow-ups." First use: his book's outreach, from a separate Book CRM vault.

## The one choice that shapes everything: where the send happens
| | A. In Dinis's browser (recommended now) | B. A gateway process off his browser |
|---|---|---|
| How | He signs entries in the CRM; when he opens the cell's page, it checks each signature and the full C4 check, shows the batch, and sends it on **one** confirmation per batch | A server or session holds a long-lived Google token and sends signed entries without him present |
| Token | Stays in his browser, sealed, an hour long (as today) | A refresh token off his machine |
| Google | No new scope (`gmail.send` today) | Offline access; restricted data through a third-party server likely needs Google's CASA assessment (Dinis's 24 Nov memo) |
| ABP | One new rule (below) | Altitude 2 changes: a gateway holds the token |
| Agents send? | No: his signature and his one press per batch send | The process sends; his signature is the approval |

Recommendation: **A now**, B only if A's one press per batch proves too slow.

## What A needs (all on the cell, mail.dev.a builds)
1. **Signed entries.** The CRM writes an outbox entry (to, subject, text, attachments, `crm` record id) and Dinis signs its exact content with his CRM-site person key. The signature travels in the entry.
2. **His key pinned in the cell's page** (W4 option (c), W19). The CRM site and the cell are different addresses, so different browser keys. He carries his CRM key into the cell's page once by QR and pins it. Only entries signed by a pinned key may join a batch. This is a plain ECDSA P-256 signature over the exact email, not the Ed25519 lanes, so W19's lane change is not needed for this first step.
3. **Batches.** The page lists every signed, unsent entry; he presses Send batch, confirms once; the page sends one by one, keeps the per-day limit (20 today) and stops at the first error.
4. **Attachments.** PDF, PNG, JPEG in the entry; at most 10 MB per email in total (Gmail's own limit is 25 MB); each shown in the batch view.
5. **Follow-ups.** The CRM drafts "nudged before" follow-ups from its records; each still needs his signature like any entry.
6. **The outbox.** For the book, a separate Book outbox vault next to a Book CRM vault (W1: its key reaches his page by a sealed code; G4 moves the general outbox to outreach@).

## The ABP line (proposed, for Dinis to approve)
> C9 (new): An outbox entry signed by a key the person pinned in this page, over its exact content, may be sent as part of a batch on one confirmation per batch, within the daily limit, with no Bcc and attachments of at most 10 MB in total. The page never sends an entry it cannot verify, and never sends without that confirmation.

This is also the written grant security@'s condition 5 asks for: his signature per email, his press per batch.

## Decisions (in the request)
- D-A: A (browser batch) now, B later if needed.
- D-B: pin his CRM key in the cell's page by QR (W4 (c)); W19's lane change is deferred.
- D-C: the ABP line above (one-way).
- D-D: limits: 20 a day, 10 MB per email, PDF/PNG/JPEG.
- D-E: a separate Book CRM vault and Book outbox vault, keys to him and a.maestro (keys rule).

## Order
1. D8 lands (release/next2, the live fix) and the send screen (D1).
2. mail.dev.a builds signed entries, pinning and batches in demo (synthetic entries and a test key), crm.dev.a the CRM's sign-and-write.
3. After Dinis's yes on D-C: live, first with emails to himself, then the book.
