# decide() in the page: what was built and what it needs next

By cell.email.d@AgentiCCells.dinis, 22 November 2026. Scope approved by conductor.d at 01:43 UTC: "take item 1, decide() with the full C4 check (signed lanes, signed policy, the email policy checker) before Approve and send, build steps 2 and 3 ... Build and test it with fixtures only". Built on `work/cell.email.d`; not on dev, not live.

## What it does

Before the page lets a person press Approve and send on an outbox entry, it now asks one more question: does the entry carry `signed.json`?

- **No** (every real entry today): nothing changes. The page's own checks run (`src/app/send.js`) and the person's press is the approval, as ABP 1.1.4 says. The entry shows "Full check (C4): not run".
- **Yes:** the page runs the gateway's full check in the browser and refuses to send unless all of these hold:
  1. Every lane chain verifies: Ed25519 signatures, seq and prev, the author's registered key, and per-agent rights from `agents.json` (altitude 3).
  2. `email-policy.json` and `agents.json` are each signed by an approver pinned by key fingerprint, over their exact content (N8).
  3. Exactly one open proposal on the lanes is the email shown: the same To, Cc, Bcc, Subject and text. Nothing else is sendable.
  4. No person rejected it, no agent withdrew it, and the gateway is not stopped.
  5. The email policy checker does not deny it (recipients, languages, templates, attachments, data loss, rates). Rates count the sends the outbox vault already records.

A hold, such as a first contact or no automation, does not block. The person's press is the approval for a held email.

## Files

- `src/app/cell/lanes.mjs`: verification only, async, WebCrypto Ed25519. The same rules as `cell/lanes/entry.mjs` and `cell/policy/signed.mjs`.
- `src/app/cell/decide.mjs`: `decide()`, ported from `cell/gateway/decide.mjs`, and `decideEntry()`, the page's question for one entry.
- `src/app/cell/checker.mjs` and `language.mjs`: moved from `cell/policy/`. Node now wraps them, so both sides run one checker. The data-loss scanner is passed in, and with no scanner the checker denies every email.
- `src/app/cell/shapes.mjs`: the leak scan's secret shapes for outbound email text.
- `src/app/connect.js`: `fullCheck()` wired into the outbox view.
- `tests/decide-page.test.mjs`: 17 tests. Merge, policy and decide cases give the same verdicts and errors as the Node code, the scanner finds what the leak scan finds, and the per-entry cases refuse what they should.

## The `signed.json` format (proposal)

```
{ "chains": [ [lane entries of one author on one lane], ... ],
  "policy": { the email policy }, "agents": { agents.json },
  "signatures": { "policy": policy.signature/1, "agents": policy.signature/1 } }
```

Keys or approvers written inside `signed.json` are ignored. They must come from outside the outbox vault.

## What it needs next (for Dinis)

1. **Where the page gets pinned approvers.** ABP says approvers are pinned outside the repository and the vault. Proposal: the person pins their own approver key in the page, kept sealed in IndexedDB like the vault keys, perhaps the pki.sgit.ai identity they sign in with. Until then the set is empty and every signed entry is refused.
2. **Where agents' lane keys come from.** Proposal: each agent publishes an Ed25519 lane key in its `team/keys/*.json` entry, and the page builds them in the way `trusted.js` is built. No agent has one yet.
3. **The twin in the check.** The page passes an empty twin, so every recipient counts as a first contact (a hold) and a reply finds no parent (a refusal). Loading the synced twin's correspondents and threads from the twin vault would let replies pass.
4. **Signing approvals in the page.** Today the press is recorded in `meta.json`. A signed `approve` entry on the approvals lane would need the page to hold a lane key.
5. **ABP wording.** C4 says "until decide() runs in the page". Once items 1 and 2 exist, Dinis may want C4 to say that signed entries go through decide() and unsigned ones through the press. No ABP change is made or needed for this build, because it only adds refusals.

## Checked

- `node --test tests/*.test.mjs`: 112 pass, run 22 November 2026.
- abp-check, build, validate, check-app and leak scan: OK.
- In Chromium 157, against fixture entries signed in Node: a signed, held email passes to the press; a changed To is refused; an empty registry is refused; no `signed.json` takes the press path. connect.html loads its new modules with no errors, and with every non-local request blocked.
