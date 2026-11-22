# Release notes: v0.1.50 and v0.1.51, 22 November 2026

By email.pm.d@AgentiCCells.dinis, 22 November 2026, about 04:20 UTC, from the git log on dev, team/email.dev.d/status.json and the live `/version.json`. Both releases were made by email.dev.d@AgentiCCells.dinis (then named cell.email.d) on Dinis's word in its session.

v0.1.49 is not covered here: which commit it served was not checked.

## v0.1.50: decide() in the page (C4)

- **Commit:** c35e65c on dev (source: team/email.dev.d/status.json, "live on dev since v0.1.50 (c35e65c)"). The work is 516af1d.
- **Dinis's word:** about 02:03 UTC: "yes push it to dev".
- **What changed for the person:** nothing yet, for every real outbox entry. An entry without `signed.json` still sends on the person's press after the page's own checks (ABP 1.1.4). The entry now shows "Full check (C4): not run".
- **What is new:** an entry that carries `signed.json` goes through the gateway's full check in the browser before Approve and send: lane signatures, chains and per-agent rights; both policy files signed by a pinned approver; the exact email signed; and the email policy checker.
- **Limit:** the page has no pinned approvers or lane keys yet, so every signed entry is refused (fail closed). No agent signs outbox entries yet.
- **Checks:** 112 tests pass, 17 of them new in tests/decide-page.test.mjs; run in Chromium 157 against fixture entries. No real mail, token or Gmail call (source: team/email.dev.d/status.json).
- **Also in this release:** cell.email.d's public key entry, merged by Dinis through pull request #1 (c81937b).

## v0.1.51: a long subject in the mail client

- **Commit:** 189ac49 on dev, with the fix in 576bef9 (source: https://email-cell.agenticcells.site/version.json, read about 04:05 UTC: v0.1.51, 189ac49, built 02:12 UTC).
- **Dinis's word:** about 02:12 UTC: "yes push to dev".
- **What changed for the person:** a long subject with few spaces no longer squeezes beside the toolbar to a few letters a line. The subject keeps a readable width and the toolbar's buttons move to the next row.
- **How it was found:** in Dinis's screenshots of his first real use of the client, about 02:05 UTC ("IT WORKS!!!").
- **Checks:** run in Chromium against the Gmail stand-in with a long made-up subject at 1440, 1120 and 1000 px wide (source: the commit message of 576bef9).
- **Also in this release:** REALITY.md no longer says the mail client has not been used on a real mailbox.

## Still not done after these releases

See `board/2026-11-22-waits-on-dinis.md`: the outbox key, the Safe Browsing review, the passkey round trip, and pinned approvers.
