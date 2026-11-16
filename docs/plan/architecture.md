# Architecture

**Status: a plan.** The pieces marked *built (simulation)* run against made-up mail only. [Back to the plan](index.md).

## One gateway, a twin, many hands

```
              Google (Gmail API, OAuth grant chosen by the user)
                               |
                 the only Google token in the cell
                               |
                        +-------------+
                        |   gateway   |  syncs in; sends only approved,
                        +-------------+  policy-checked actions
                          |         ^
                 writes raw/        | reads approved actions,
                          v         | writes the outbox
        +-----------------------------------------------+
        | the twin (sgit vault, encrypted)               |
        |   raw/      as received (gateway, firewall,    |
        |             people)                            |
        |   clean/    the firewall's copy (agents)       |
        |   threads/  labels.json  attachments/  index/  |
        +-----------------------------------------------+
        | lanes (append only, each entry signed)         |
        |   actions    approvals    reads    outbox      |
        +-----------------------------------------------+
              ^                  ^                 ^
         triage, drafter,    people: browser,   CRM app
         crm agents          iPhone, Claude     (crm.ios)
```

- **The gateway** is the only holder of the Google token. It is the only way in and out of Gmail. Plan: needs the Google OAuth app.
- **The firewall** turns each raw message into a cleaned copy. Built (simulation): `cell/firewall/clean.mjs`.
- **The twin** is the mailbox as files. Schema built (simulation): `cell/twin/schema.mjs`. In a vault: plan, needs the vault.
- **The lanes** carry every change, each entry signed and chained. Built (simulation): `cell/lanes/entry.mjs`.
- **The email policy** is checked by the gateway before every send. Built (simulation): `cell/policy/checker.mjs`.

## The four flows

1. **Connect.** The user consents on Google's own screen and picks a tier: metadata, read, compose, send. The app gets only those scopes; features and agents switch on per tier. Revoking is one click. *Plan.*
2. **Receive.** Gmail tells the gateway that something changed (a `users.watch` and a Pub/Sub topic); the gateway reads the change from `users.history.list` and writes it into `raw/`. Google warns that notifications can be delayed or dropped, so the gateway also re-checks on a timer. The firewall then writes `clean/`. *Plan for the Gmail part; the firewall and the twin writer are built (simulation).*
3. **Work together.** People and agents read the twin (agents: `clean/` only), and propose on the actions lane. Nothing changes in Gmail. Every read by an agent is a signed receipt on the reads lane. *Built (simulation) for the lane format and the checks.*
4. **Send.** A proposal reaches the approvals lane; a person signs it, or a signed automation allows it; the gateway runs the email policy and sends; the result goes to the outbox lane, the twin and the CRM. *The decision is built (simulation) in `cell/gateway/decide.mjs`; the Gmail send is a plan.*

## Where it runs

In three places, all on the same twin: the browser (this site, later an app), the iPhone CRM app (`crm.ios@sgit.dinis`, which needs an email component), and alongside Claude. It starts inside the CRM, under RiskMandate's Google project, in testing, with our own inboxes.

## What is not decided

- Whether a twin encrypted on the user's side counts as "storing restricted data on servers" for Google's security assessment. To settle with Google's process, not to assume.
- Where the gateway runs (a small always-on host, a scheduled job, or on a person's machine). It needs a Pub/Sub push endpoint or a pull subscription either way.
- Whether `raw/` and `clean/` sit in one vault with separate read keys, or in two vaults.
