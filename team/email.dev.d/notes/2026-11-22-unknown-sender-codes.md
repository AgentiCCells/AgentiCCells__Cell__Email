# Sealed codes from an unknown sender: what the live page does (backlog rank 40)

By email.dev.d@AgentiCCells.dinis, 22 November 2026, about 09:45 UTC. Found by email.workflows.d's key-paste run (de07862 on work/email.workflows.d-r2), reported by email.pm.d and conductor.d. Checked here against the code and in Chromium, with made-up keys only.

## What the page does

- `src/app/connect.js:122` always calls `openSealed(id, text, trusted, { carried: true })`. The path in `pki.js` that asks the person before opening a code from an unknown sender (`needsConfirm`) therefore never runs.
- This is on purpose. `cea820f` (16 November 2026) removed the "Accept: I brought this code myself" button on Dinis's word: "as soon as I paste the thing, you should detect that and should open the vault/outbox straight away."
- That commit also says "an unsigned code says so", but it does not. `connect.js:130` blanks the sender line for such a code, so the status says only what was kept.
- **Reproduced** on a local build of dev (the same connect.js as live v0.1.51), in Chromium with made-up keys and every outside request blocked:
  1. A made-up twin key was stored.
  2. An unsigned code from an unknown sender, carrying a different made-up vault key, was pasted.
  3. The page said "Kept in this browser: the key of vault strange99." It replaced the stored twin key with no question, and went at once to open that vault on dev.send.sgraph.ai (blocked).

## Why it matters

The page's public key is shown to anyone, and anyone can seal a code to it. If the person pastes or drops such a code (for example a QR image in an email), the page silently:

1. **Replaces the twin vault key.** Any vault key in the code that is not the outbox's id becomes `vault:twin`. The person's own twin key is then gone from the page, unless they copied it with "Copy twin key".
2. **Replaces the SG/Send access token**, if the code carries a grant.
3. **Opens the new vault straight away.** The next sync would write the person's mailbox headers into whatever vault that key opens. If an outsider made that vault, it leaks the mailbox's headers to them.
4. **Plants an outbox key**, if the code carries one for the outbox's id. Its drafts would show for Approve and send. Each still needs the person's press and passes the page's checks.

**Seriousness: medium to high.** It needs the person to paste or drop a code someone else made. The damage, losing the twin key and leaking headers, happens silently and at once.

REALITY.md says "Sealed m1 codes are opened only when signed by a trusted sender". That is not true of the page since 16 November.

## Proposed fix (not built, not pushed)

1. **Say who it is from, every time.** "Not signed by a trusted sender: only keep it if you made or asked for it." Show it before anything is kept.
2. **Never overwrite silently.** If a code would replace an existing twin key, outbox key or access token, ask the person once, showing the old and new vault ids, and keep nothing if they say no.
3. **Correct REALITY.md now.** Codes from unknown senders are opened when pasted, on Dinis's word of 16 November.
4. **Optional, needs Dinis.** Bring back one confirmation for codes from unknown senders. That reverses part of his 16 November word ("open straight away"), so it is his call.

Points 1 to 3 keep "open straight away" for codes from a trusted sender, and for a first key when nothing would be replaced.
