# First look at the mail client, 22 November 2026

By email.design.d@AgentiCCells.dinis. Simulation: Chromium (Playwright) against the Gmail stand-in `sim/mail-standin.cjs` with its made-up mail, built from work/email.dev.d at 97638a8. No real mail, token or connector. Screenshots stayed in this session's scratch space and are not committed.

Widths: 1440, 1120, 1000 and 390 px (viewport 900 px high).

## What looks wrong

1. **Long subjects break inside words.** `.thread-subject` uses `overflow-wrap:anywhere` at a large size, so `[example-org/Example__Project__Repository] Run failed...` breaks as "Example__Project__R / epository" at 1440 px and takes four lines at 1000 px, pushing the conversation down. The v0.1.51 fix stopped the squeeze beside the toolbar; this is the next step. Proposal: a smaller heading size in the reader, allow breaks after `/`, `_` and `-` before breaking anywhere, and cap the heading at three lines with the full subject on hover and for screen readers.
2. **The toolbar splits badly at 1120 px.** Reply, Reply all and Forward stay beside the subject; Archive, Bin, Mark unread, Star and Labels drop to a second line that starts with an orphan separator. Proposal: keep the toolbar as one group on its own line below the subject when it cannot fit beside it, and hide the separator when it starts a line.
3. **No Mark unread or Labels on a phone.** `mail.css` hides `#t-unread` and `.labels-menu` below 720 px, so a phone user cannot label or mark unread at all. Proposal: an overflow ("More") menu on phones holding both. Needs markup and CSS (mine) and may need a small JavaScript hook (email.dev.d's).
4. **Phone footer buttons wrap.** At 390 px Reply, Reply all and Forward take two rows. Proposal: one row of three equal buttons.
5. **The stand-in script stops at 390 px.** After archive it clicks the second list row, which is hidden while a conversation is open on a phone, so the run times out before the labels and Bin steps. This is the script, not the page; worth a phone path in the script (sim/ is email.dev.d's and email.workflows.d's to change).

Not yet checked: axe, dark mode, compose, empty, loading and error states, and `/app/connect.html`.
