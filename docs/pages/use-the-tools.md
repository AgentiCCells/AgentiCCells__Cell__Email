# How to use the tools

**Draft** by mail.conductor.a@AgentiCCells.dinis, 23 November 2026. What is live is in [REALITY.md](https://github.com/AgentiCCells/AgentiCCells__Cell__Email/blob/dev/REALITY.md); a tool not written there does not exist yet, whatever this page says.

The rule behind every tool here: **agents prepare, people send.** Nothing leaves your mailbox unless you press Send and confirm.

## Try it first, with no sign-in: demo mode

Demo mode runs on a made-up mailbox: synthetic people and organisations at reserved example domains (`example.com`, `example.org`, `example.net`). Nothing is real and nothing leaves the page. Every demo screen shows a "Demo mode" banner, and every demo send is recorded as a simulation.

- The send screen in demo mode: `/app/send.html?demo` (**not live yet**: built on work/mail.dev.a on 23 November 2026, waiting on review and release).

## The tools

| Page | What it does | Google access it asks for |
|---|---|---|
| `/app/connect.html`, the gateway | Connect your Gmail; swap keys by QR code; open your twin vault and sync headers and labels into it | `gmail.metadata` on Connect |
| `/app/mail.html`, the mail client | Read, search, reply, reply all, forward, compose; with Allow managing, archive, Bin, star, labels, with Undo | `gmail.readonly` (Allow reading) or `gmail.modify` (Allow managing), each with `gmail.send` |
| `/app/send.html`, the send screen (**not live yet**) | Pick a contact, see the draft, edit, press Send | `gmail.send` (Allow sending) |
| Approve and send, inside the gateway | Open an outbox entry an agent prepared, see the exact email, approve and send it | `gmail.send` |

## Connect your Gmail

1. Open `/app/connect.html` and press **Connect**. Google's own consent screen opens; you come back to the page with a token that lasts an hour.
2. The token is kept only in your browser, sealed to a key the browser cannot export. Agents never see it.
3. Press **Allow sending**, **Allow reading** or **Allow managing** when you need more. Each asks Google again.

The current site accepts riskmandate.ai Workspace accounts only. To use your own domain, [run your own copy](run-your-own.html).

## Send one email (the send screen)

1. Open the send screen. Without a usable Google token it opens in demo mode and says why.
2. Pick a contact. Their draft opens.
3. Edit the To, the subject or the text.
4. Press **Send**. The page checks the email (a real address, a subject and text, no Bcc, no key material, at most 20 a day), shows you exactly what goes, and asks you to confirm.

## Approve an agent's draft (the outbox)

1. An agent prepares an email in an outbox vault. You need that vault's key, sent to you as a sealed QR code by someone the page trusts.
2. In the gateway, open the entry: you see its exact To, Cc, Subject and text.
3. Press **Approve and send**. The same checks run; you confirm; one email goes; the entry records that it was sent, when, and that you approved it.

## Keep in mind

- **"Dangerous site" warning.** Google Safe Browsing flagged `email-cell.agenticcells.site` on 21 November 2026. Until Google clears it, Chrome may show a red warning. A review request is with the domain's owner.
- **Tokens expire after an hour.** Press Connect again on the gateway.
- **Remote images are blocked** in the mail client, and HTML mail is shown with no scripts.
