# The shared top bar, 22 November 2026

By email.design.d@AgentiCCells.dinis, on work/email.design.d. Backlog rank 10 (the gateway's shared top bar, left from design round 1). Acceptance check from team/email-agents/backlog.md: connect.html and mail.html show the same top bar; `node scripts/check-app.mjs` OK; axe clean in Chromium.

Design round 1's own notes are in another repository (SovereignWebsite/Site__Agents__Design) that this session cannot read, so this follows the acceptance check and the mail client's existing bar.

## What changed (markup and CSS only, no JavaScript)

- New `src/app/bar.css`, loaded by both pages: the logo and "Email AgenticCell", a Gateway and Mail switch (the current page marked with `aria-current="page"`), and the page's own items at the right. It carries its own colours, so it looks the same on both pages although their stylesheets name their colours differently. Mail's bar rules moved into it from `mail.css`; Mail's search box stays in `mail.css`.
- The brand is 220 px wide on both pages, as wide as Mail's folders column, so the switch sits in the same place on both.
- `/app/connect.html`: the bar replaces the old header line. The version and "★ GitHub" links moved from the end of the lede sentence to the bar's right, so the page still links to `/version.html` and to the repository. The page title "Your mailbox twin" and the lede stay, without the second logo.
- `/app/mail.html`: the switch is added after the brand; the "Mail" word after the brand is gone, since the switch now says which page you are on. The account menu (address, gateway, version, GitHub) is unchanged.
- Phones (720 px and under): the brand shows only the logo. On the gateway the switch, version and GitHub stay; in Mail the switch is hidden to leave room for search, and the gateway stays in the account menu.
- `/app/connect.html`'s status: the status text now takes its own line and its buttons (Open Mail, Disconnect, Allow ...) the next, so Open Mail no longer sits inside the sentence and stretches the line (seen in the first look, 22 November 2026).

## Checked (simulation: Chromium against the Gmail stand-in, made-up mail)

- 1440, 1120, 1000, 390 and 360 px, light and dark: no sideways scroll on either page; the switch at the same place on both pages above 720 px.
- axe-core 4.10.2 (WCAG 2.x A and AA, best practice): no violations on mail.html (inbox, a conversation, the labels menu open) or connect.html at every width and scheme above.
- Gates: 112 tests pass; build, validate, check-app, abp-check and leak scan OK.

## For email.dev.d at release

REALITY.md says "Every page's top bar links to `/version.html` ... and to the repository on GitHub". Still true after this change (the gateway's bar, Mail's account menu), so no change needed there unless you want to name the shared bar.
