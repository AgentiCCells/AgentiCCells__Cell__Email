# Run your own Email AgenticCell, with your own Google sign-in

**Draft** by mail.conductor.a@AgentiCCells.dinis, 23 November 2026. Not yet followed end to end by someone outside the team; if a step does not match what you see, the console wins, and please tell us (see the end).

Dinis Cruz, 23 November 2026: "Go here, clone this, fork this, and we should even contain detailed instructions for how to create a Google application ... so it goes within their domain, so they can do OAuth on Google directly, so they don't have to come through us."

This page is that: fork the code, register your own Google app in your own Google Workspace, and run the cell on your own domain. When you finish, your Gmail token is issued by **your** Google project to **your** page, in **your** browser. We are not in the path, and we see nothing.

## What you get

- The gateway page (`/app/connect.html`): connect Gmail, keep the token sealed in your browser, sync headers into a vault you own.
- The mail client (`/app/mail.html`): read, reply, archive and label, straight from Gmail.
- Approve and send for outbox entries prepared by agents, with the page's checks and your press.
- A demo mode that needs no Google at all (see [How to use the tools](use-the-tools.html)).

There is no server. The site is static files on GitHub Pages; the page talks only to Google, the vault service and pki.sgit.ai's public key register (its content security policy says so and CI checks it).

## Before you start

- A GitHub account.
- A domain or subdomain you control, for example `mail.example.com`. (The page has been run only at the root of its own domain; a GitHub project path such as `you.github.io/repo/` has not been tested.)
- A Google Workspace domain, and the right to create a project in its Google Cloud. With Workspace you can choose the **Internal** audience, which needs no Google verification. A personal Gmail account works only with an External app, which has more steps (see step 4).
- About 30 to 45 minutes.

## 1. Fork the repository

1. Open https://github.com/AgentiCCells/AgentiCCells__Cell__Email and press **Fork**. Keep the `dev` branch: the site deploys from `dev`.
2. In your fork, open **Actions** and enable workflows (GitHub turns them off in new forks).

The code is Apache-2.0 and the text CC BY 4.0, so you may use, change and run it, keeping the licence and notices.

## 2. Turn on GitHub Pages with your domain

1. In your fork: **Settings**, **Pages**, **Build and deployment**, Source: **GitHub Actions**.
2. Same page, **Custom domain**: type your domain, for example `mail.example.com`, and save.
3. At your DNS provider, add a `CNAME` record from that name to `<your-github-user>.github.io`.
4. When GitHub says the DNS check passed, tick **Enforce HTTPS**.

Write the address down; below it is called `https://YOUR-DOMAIN`.

## 3. Create a Google Cloud project and enable the Gmail API

1. Open https://console.cloud.google.com/ signed in as a Workspace account that may create projects.
2. Create a project, for example `email-cell`.
3. **APIs and services**, **Library**: search for **Gmail API** and press **Enable**.

## 4. Set up the Google Auth Platform

Google names these pages Branding, Audience, Data access and Clients (as of November 2026; Google renames them often).

**Branding**

| Field | Value |
|---|---|
| App name | your choice, for example `Email AgenticCell` |
| User support email | an address you watch |
| Application home page | `https://YOUR-DOMAIN/` |
| Application privacy policy link | `https://YOUR-DOMAIN/privacy.html` (rewrite `docs/pages/privacy.md` for yourself first; ours names our operator) |
| Authorised domains | your domain's registrable part, for example `example.com` |
| App logo | leave empty: a logo can start Google's brand review |

**Audience**

- **Internal** (recommended with Workspace): only accounts in your Workspace can sign in. As we understand Google's rules, Internal apps need no verification, even for Gmail's restricted scopes. Check Google's current documentation before relying on it.
- **External**: needed for personal Gmail or several organisations. While the app is "Testing", add each user as a test user. Publishing an External app with Gmail's restricted scopes needs Google's verification and a security assessment; that is a large step, so start with Internal if you can.

**Data access**: add only the scopes you will use.

| Scope | Used for |
|---|---|
| `https://www.googleapis.com/auth/gmail.metadata` | Connect: counts, labels and headers for the twin |
| `https://www.googleapis.com/auth/gmail.send` | Allow sending: Approve and send, and the send screen |
| `https://www.googleapis.com/auth/gmail.readonly` | Allow reading: the mail client |
| `https://www.googleapis.com/auth/gmail.modify` | Allow managing: archive, Bin, star, labels in the mail client (never deletes for good) |

**Clients**: press **Create client**.

| Field | Value |
|---|---|
| Application type | **Web application** |
| Name | for example `email-cell-browser` |
| Authorised JavaScript origins | `https://YOUR-DOMAIN` |
| Authorised redirect URIs | `https://YOUR-DOMAIN/app/connect.html` (exactly, including `/app/connect.html`) |

Copy the **client ID**. It is public by nature: a browser client's id sits in its page. The page uses Google's token flow for browser apps and never uses a client secret, so you do not need to download or keep one. If the console shows a secret, leave it there.

**If your Workspace restricts third-party apps:** a Workspace admin may need to allow the app under the Admin console's API controls. We have not needed this; we note it because Workspace settings vary.

## 5. Point the code at your app

Edit these in your fork, on `dev`:

| File | What to change |
|---|---|
| `src/app/oauth.js` | `CLIENT_ID` to your client ID; `REDIRECT_URI` to `https://YOUR-DOMAIN/app/connect.html`; `HOSTED_DOMAIN` to your Workspace domain (Google shows only that domain's accounts at sign-in) |
| `scripts/build.mjs` | in the `version.json` line, `repository` and `site` to your fork and domain; `TRUSTED_SENDERS` to the key files of the people or agents you trust to send you sealed vault keys, or `[]` for none yet |
| `docs/pages/privacy.md` | your own privacy policy |
| `hub.json`, `README.md` | your names and addresses |
| `team/keys/` | remove our keys or leave them; add your own if you list them in `TRUSTED_SENDERS` |

Leave the content security policies in `src/app/*.html` as they are unless you know why you change them; `scripts/check-app.mjs` checks them.

## 6. Run the checks, then push

On your machine, with Node 22 (no packages to install):

```
node --test tests/*.test.mjs
node scripts/build.mjs && node scripts/validate.mjs && node scripts/check-app.mjs && node scripts/leak-scan.mjs
```

Some tests pin our values (for example the redirect address). Where a test fails only because it expects our domain, change the expected value to yours; do not delete the test.

Push to `dev`. The **Pages** workflow runs the same checks and deploys. When it finishes, `https://YOUR-DOMAIN/version.json` shows the new version and commit.

Note: the workflow checks that every commit carries an `Agent:` trailer (`scripts/check-commits.mjs`). Add a line such as `Agent: you@example.com` at the end of your commit messages, or adapt the check for your team.

## 7. Connect

1. Open `https://YOUR-DOMAIN/app/connect.html` and press **Connect**. Google shows your app's consent screen with your app name.
2. Afterwards the page shows your mailbox's counts and labels. The token lasts an hour and is kept sealed to the page's own key in your browser; nothing is sent anywhere else.
3. To send or read mail, press **Allow sending**, **Allow reading** or **Allow managing**. Each asks Google again for the extra scope.

## If something goes wrong

| What you see | Likely cause |
|---|---|
| `redirect_uri_mismatch` | The redirect URI in the console is not exactly `https://YOUR-DOMAIN/app/connect.html`, or `REDIRECT_URI` in `oauth.js` differs |
| `org_internal` or "access blocked" | The account is not in your Workspace while the app is Internal, or `HOSTED_DOMAIN` is another domain |
| `access_denied` after consent | An External app in Testing without this account as a test user |
| Chrome shows "Dangerous site" | Google Safe Browsing can flag a new site that asks for Google sign-in. As the domain's owner, add it in Google Search Console and request a review under Security issues. Our own site was flagged on 21 November 2026 |
| The page says Google granted more than it asked for | The page refuses tokens with scopes outside the four above; remove extra scopes from the request |

## What stays true in your copy

- Your Google token lives only in your browser, sealed to a key the browser cannot export, and expires after an hour.
- Agents prepare; a person presses Send. Every send shows the exact email and asks you to confirm, at most 20 a day.
- The Agent Behaviour Policy (`abp/cell-email.md`) still applies to your copy; if you change it, change the version and keep the check (`scripts/abp-check.mjs`) passing.

## Tell us

If a step was wrong or unclear, open an issue on https://github.com/AgentiCCells/AgentiCCells__Cell__Email/issues. Leave out your client ID's project, your addresses and anything from your mailbox: the repository is public.
