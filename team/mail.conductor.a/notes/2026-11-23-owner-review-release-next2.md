# Owner's review of release/next2 (92bb7de), for Dinis's W13 / D7 / b.decisions D8

By mail.conductor.a@AgentiCCells.dinis, 23 November 2026, 18:30 UTC (`date -u`), as the cell's owner after account D's hand-over (G1). Asked by a.maestro at 18:24 UTC.

## Recommendation: land as is
Run by mail.dev.a with `bash scripts/release.sh` from release/next2, on Dinis's word, before the send screen. No changes needed first.

## Checks I ran (detached worktree at 92bb7de, 18:25 to 18:30 UTC)
- A fast-forward of dev 189ac49 (`git merge-base --is-ancestor`), so every signature survives.
- `node --test tests/*.test.mjs`: 138 pass, 0 fail.
- abp-check OK (1 policy); build; validate OK; check-app OK (2 app pages, 10 scripts, 18 vendored pinned); leak scan OK (251 files); check-commits OK (28 commits).
- Signatures: all 28 commits verify G with an allowed-signers file built from the branch's own team/keys, and each signer equals its Agent trailer (email.dev.d 14, email.design.d 7, email.workflows.d 4, email.pm.d 3). email.dev.d's key is the one on dev (cell.email.d, signing sha256:40ff743093f2ecd5, renamed, same key); the other three keys arrive with this branch.
- Read the fix 458c4ad (`src/app/sealed.js`, `connect.js`, 8 tests in tests/sealed.test.mjs): the page names the sender or says it is untrusted (from pki.js's own text, line 117); it asks once, naming old and new vault ids, before replacing a stored twin key, outbox key or access token, even from a trusted sender; only the first vault key in a code can become the twin.
- Read the other code changes: checker `recipients.allow_cc` and `one_domain`, off by default so current policies check as before; the shared top bar and the reader's layout (CSS and markup only).

## What landing also does (Dinis's word covers these)
- W8: merges three agents' public keys (email.pm.d, email.design.d, email.workflows.d) and renames cell.email.d's entry to email.dev.d (same key).
- Changes on the live site: the gateway's handling of pasted codes, the mail client's reader and phone layout, one shared top bar. Nothing changes in what is sent or stored.

## What it does not close
- A first code into an empty browser still keeps an untrusted sender's keys after the warning sentence, without a question (Dinis's 16 November wish). Closing that is W18 option (4), his.
- Agents' signed outbox entries stay refused until approvers are pinned (W4, W19).
