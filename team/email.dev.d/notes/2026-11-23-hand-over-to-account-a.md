# Hand-over: email.dev.d (account D) to account A's mail team, 23 November 2026

By email.dev.d@AgentiCCells.dinis, about 17:00 UTC on 23 November 2026, at conductor.d's request (16:53 UTC). It follows Dinis's decision G1 as recorded by mail.conductor.a: "The Email Cell's code work moves here from account D's email.* team" (board/2026-11-23-for-account-d-from-mail-conductor-a.md on work/mail.conductor.a, 90d7518). After this note, email.dev.d does no more code work on the cell unless Dinis says otherwise.

Read with REALITY.md, `team/email.dev.d/notes/2026-11-22-hand-over.md` (how to work here), `team/email-agents/backlog.md` and `board/2026-11-22-waits-on-dinis.md`.

## 1. Most urgent: a live weakness, fixed on release/next2, not live

- **Live today:** v0.1.51 at 189ac49 (/version.json, 22 November 02:12 UTC).
- **The weakness.** On the live gateway page, a sealed code pasted or dropped from an unknown sender:
  - opens with no word about the sender;
  - silently replaces the stored twin vault key with any vault key it carries;
  - opens that vault at once.

  The next sync would then write the person's mailbox headers into a vault an outsider may hold. It can also replace the SG/Send token, or plant an outbox key. Reproduced with made-up keys on a local build of dev.
- **Write-up:** `team/email.dev.d/notes/2026-11-22-unknown-sender-codes.md`.
- **The fix**, 458c4ad, on conductor.d's call:
  - the page always names the sender, or says it is not a trusted one;
  - it asks once, naming the old and new vault ids, before a code replaces a stored twin key, outbox key or token;
  - a code that replaces nothing still opens at once, as Dinis asked on 16 November.
  - Checked: `src/app/sealed.js`, tests/sealed.test.mjs, and a Chromium repro.
- **Lands with release/next2** on Dinis's word (W13). Until then, Dinis should paste only codes he made or asked for, and keep a copy of his twin key ("Copy twin key").

## 2. release/next2 at 92bb7de: what it carries

28 commits on dev 189ac49. Linear, no merges. Each commit is signed by the agent its Agent trailer names, checked against team/keys with an allowed-signers file. Gates on 92bb7de: 138 tests, abp-check, validate, check-app, leak scan, check-commits, all OK. Do not rewrite it. Land it with `bash scripts/release.sh` from that branch, on Dinis's word.

| Commits | Agent | What |
|---|---|---|
| 9da7936, 97638a8 | email.dev.d | the rename to email.dev.d; the six briefs and the team page, approved by Dinis |
| a2b1092, 2bc8429, 212b94a | email.pm.d | backlog, REALITY.md live check, release notes v0.1.50 and v0.1.51, the waits list, Dinis's direction on workflows, hourly coordination |
| 2be7fc0 | email.dev.d | team/keys: email.dev.d's entry renamed; email.pm.d's, email.design.d's and email.workflows.d's public keys |
| 8ec09e9, 80d3f39, 92bb7de | email.dev.d | notes on pinned approvers and lane keys (no code) |
| 2454b8e, b2523c6 | email.dev.d | REALITY.md and the waits list kept true |
| 77a0ee6 | email.dev.d | checker: `recipients.allow_cc` and `recipients.one_domain` (Dinis's outreach defaults); defaults keep current policies unchanged |
| ec5e5eb, 501e254, ec0b30a, 539a19f | email.workflows.d | workflows plan, the workflows as state machines, the signed.json writer (proposals; made-up mail only) |
| 4ea6af4 | email.dev.d | workflow tests moved into tests/ so CI runs them; the plan index links the workflows pages |
| 2692eee to c6197ac (7) | email.design.d | reader fix (buttons on the top row, subject in full below), every action on phones, one shared top bar (`src/app/bar.css`), five inbox concepts (docs only) |
| bb19127, 01231ac | email.dev.d | hand-over of 22 November and items queued after it |
| f1cd6bc, 458c4ad | email.dev.d | the unknown-sender finding and fix (section 1) |

**What changes on the live site when it lands:**
- the gateway's handling of pasted codes (section 1);
- the mail client's reader and phone layout;
- one shared top bar.

Nothing changes in what is sent or stored.

## 3. Open questions for Dinis (decide nothing here; point to them)

1. **W13: release release/next2.**
2. **Approvers for the page's C4 check (W4, W19).** The options are (a) this cell's site, (b) pki.sgit.ai's register, or (c) per workflow, with keys carried by QR code. Option (c) has a key-type gap:
   - keys that travel by QR code (pki.sgit.ai k1, sgit keys in team/keys) are RSA plus ECDSA P-256;
   - the lanes, policy signatures and the page's check use Ed25519.

   Two ways out:
   1. The lanes also accept ECDSA P-256, so each published sgit sign key is the lane key. This is email.dev.d's recommendation; it changes the lane entry format.
   2. A second Ed25519 key per approver, carried in a sealed message signed by their sgit key.

   Details: `team/email.dev.d/notes/2026-11-22-pinned-approvers-and-lane-keys.md`. Until he decides, every signed outbox entry is refused (fail closed). Entries without signed.json send on the person's press (ABP 1.1.4).
3. **W9: one narrow leak-scan allowlist line** for a built lane-key file, like trusted.js. It changes a check, so it is his.
4. **Unknown-sender codes, option (3):** one confirmation for every code from an unknown sender. This reverses part of his 16 November word, so it is his.
5. **Which of email.design.d's five inbox concepts to build** (`docs/design/inbox-concepts.md`).

## 4. The queue email.dev.d held (backlog numbers at b462654 and 666fcc7)

- **Rank 31 lane keys and rank 5 approvers:** wait on items 2 and 3 above.
- **Rank 33, the synced twin in fullCheck**, so replies can pass the C4 check. It touches twin.js and vault.js, email.twins.d's area (never started).
- **Rank 6, the chat panel** (Dinis talks to every agent from the site). Before any design, settle how an agent tells Dinis's signed words from anyone else's text on the page.
- **Rank 35, move sim/workflows/round2.test.mjs into tests/**, and bring in email.workflows.d's round 2 (work/email.workflows.d-r2 da46c69 and later, de07862). Fast-forward only, after checking signers.
- **Rank 36:** show a forged `gateway.stop` as a warning. It must still not count.
- **Rank 41:** the outbox is known only by the fixed id co57gzld (`connect.js` OUTBOX_VAULT).
- **The stand-in times out at 390 px** after archive (`sim/mail-standin.cjs` clicks a list row hidden while reading on phones).

## 5. What only email.dev.d knows

- **Superseded branches; do not release:** release/next, release/key-rename (re-signed copies of email.pm.d's commits), release/title-fix (already live), work/cell.email.d (pre-rebase; Dinis: "we can delete that later"), work/email.dev.d (older than release/next2). Deleting any is a person's call.
- **847466e on dev** (maestro.d's first key commit, merged by Dinis in PR #1) has a malformed `Agent:` trailer ("maestro.d (account-d)"). check-commits reports it for any range that includes it; ranges from 189ac49 onwards do not.
- **Keys:**
  - email.dev.d's key (`team/keys/cell-email-d-agenticcells.json`, signing fingerprint sha256:40ff743093f2ecd5) lives only in this session's container. It ends when the container is reclaimed.
  - cell.email.b's key stays active beside it, by Dinis's word.
  - sgit fingerprints are the first 16 hex characters of sha256 over the key's SPKI DER.
- **Signing pitfall:** the container's global git config points `gpg.ssh.program` and `user.signingkey` at the harness's own key. Set both repo-locally, or commits are signed by the wrong key; email.design.d's first commit was.
- **Integrating another agent's work:**
  - Ask it to rebase onto the current release branch with its own key. If a force-push is refused, it pushes to a `-r2` branch.
  - Then fast-forward.
  - Cherry-picking re-signs commits with your key; do not do it to others' commits.
- **REALITY.md's two crowded lines** ("The email.* team" and "No agent keys") conflict on every integration. Rewrite them once at the end.
- **The "no agent blocked" rule** (Dinis, 23 November, in PrompTugal's CLAUDE.md) is not in this repository's CLAUDE.md. maestro.d has asked Dinis whether to copy it. email.dev.d applied it only through conductor.d's call, logged under `exceptions` in its status.json.
