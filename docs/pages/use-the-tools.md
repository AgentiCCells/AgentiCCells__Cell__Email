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
| [crm.tool.sovereignweb.site/app/](https://crm.tool.sovereignweb.site/app/), the CRM (live since 24 November 2026, v0.1.1) | A lead board per company, follow-ups, contacts, logging actions; demo by default, or your own CRM vault opened in your browser | none from Google; your own SG/Send token to write to your own vault |
| Approve and send, inside the gateway | Open an outbox entry an agent prepared, see the exact email, approve and send it | `gmail.send` |

## Connect your Gmail

1. Open `/app/connect.html` and press **Connect**. Google's own consent screen opens; you come back to the page with a token that lasts an hour.
2. The token is kept only in your browser, sealed to a key the browser cannot export. Agents never see it.
3. Press **Allow sending**, **Allow reading** or **Allow managing** when you need more. Each asks Google again.

The current site accepts riskmandate.ai Workspace accounts only. To use your own domain, [run your own copy](run-your-own.html).

## The send screen (/app/send.html, **not live yet**)

One page in three steps: pick a contact, see the draft and edit it, press Send.

- **Demo mode** opens when this browser holds no Google token that can send, or with `/app/send.html?demo`. It needs no sign-in. The mailbox is synthetic: the people, addresses, threads and drafts are made up and generated in the page, at reserved example domains. A striped banner, a "Demo mode" chip and a dashed frame mark it. Send goes to a stand-in for Gmail inside the page; the confirm box, the status line and the "Sent from this page" list all say simulation, and nothing leaves the page.
- **Your Gmail** opens when the gateway (`/app/connect.html`) holds a Google token that can send (press Allow sending or Allow reading there first). A banner says that Send sends a real email from your own address. There is no contact lookup yet: type the address in To.
- **In both modes** the outbox's rules hold: one To field, no Cc and no Bcc, a real address, a subject and some text, no key material in the text, at most 20 sends a day (UTC), and you confirm before anything is sent. The day's count is kept sealed in your browser, so a reload does not reset it; when your token can read mail, the page uses the larger of that count and your Gmail Sent folder.
- Nothing is stored apart from the day's count; the sent list is for that tab only.

Text by mail.dev.a@AgentiCCells.dinis, 23 November 2026.

## Approve an agent's draft (the outbox)

1. An agent prepares an email in an outbox vault. You need that vault's key, sent to you as a sealed QR code by someone the page trusts.
2. In the gateway, open the entry: you see its exact To, Cc, Subject and text.
3. Press **Approve and send**. The same checks run; you confirm; one email goes; the entry records that it was sent, when, and that you approved it.

## Keep in mind

- **"Dangerous site" warning.** Google Safe Browsing flagged `email-cell.agenticcells.site` on 21 November 2026. Until Google clears it, Chrome may show a red warning. A review request is with the domain's owner.
- **Tokens expire after an hour.** Press Connect again on the gateway.
- **Remote images are blocked** in the mail client, and HTML mail is shown with no scripts.
