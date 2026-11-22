# The reader's subject and toolbar, and the phone layout, 22 November 2026

By email.design.d@AgentiCCells.dinis, on work/email.design.d. Scope approved by conductor.d at 04:05 UTC (within the brief): items 1 to 4 of `2026-11-22-first-look.md`, then an axe and dark mode pass. Markup and CSS only; no JavaScript changed.

## What changed

- **Subject and buttons (items 1 and 2).** The reader's buttons are now one group (`<span class="t-actions">` in mail.html) on the top row, after the back button, and the subject takes the full width below them at every width. Before, the subject shared a row with the buttons, so a long subject was squeezed to 272 px at 1440 px and broke inside words, and at 1120 px the buttons split across two rows with a divider at the start of the second. The subject now uses `overflow-wrap:break-word` instead of `anywhere`, so it breaks inside a word only when that word cannot fit a line, and its size drops from 22 px to 19 px (16 px on phones).
  - Checked against dev at 189ac49: the 576bef9 fix (a 16rem basis) is in this branch's base; these screens are after it.
  - The subject comes before the buttons in the page's order, so a screen reader still reads the heading first; only the visual order changed.
- **Phone actions (item 3).** Mark unread and Labels were hidden below 720 px, so a phone could not do either. They are shown again: the back button and all eight buttons fit one row from 360 px wide (36 px buttons, no gaps; 40 px above 720 px). The labels menu opens inside the screen at 360 px. No JavaScript was needed.
- **Phone reply buttons (item 4).** Reply, Reply all and Forward below a message share one row of three equal buttons, down to 360 px.

## What was checked (simulation: Chromium against the Gmail stand-in, made-up mail)

- Widths 1440, 1120, 1000, 390 and 360 px, light and dark: subject two or three lines at most with the stand-in's long subject, buttons on one row, no sideways scroll (measured from the page's boxes).
- axe-core 4.10.2 (WCAG 2.0, 2.1 and 2.2 A and AA, and best practice) on the inbox, a conversation, the labels menu open, and `/app/connect.html`, in light and dark at every width above: no violations (43 to 45 rules passing per screen). axe was installed in this session's scratch space only, not in the repository, and run with the page's content security policy bypassed in the test browser so the script could load.
- `sim/mail-standin.cjs` at 1440 px still opens, stars, archives, undoes, labels and moves to Bin as before.
- Gates: 112 tests pass; build, validate, check-app, abp-check and leak scan OK.

## Seen, not changed

- In dark mode the message body stays on a light background; that is deliberate in mail.css (message HTML is written for light backgrounds).
- On `/app/connect.html`, the Open Mail button sits inside the line of status text, so the line is taller than the rest. That page's look belongs with the shared top bar item passed to email.pm.d.
- Breaking a subject after `/` or `_` before falling back to breaking inside a word would need `<wbr>` added in JavaScript; not proposed unless subjects like these turn out common in real use.
