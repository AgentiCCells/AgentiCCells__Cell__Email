# What each build step needs from Dinis

**Status: a plan.** None of these has been granted yet.

On the vault: Dinis, 16 November 2026: "The sgit vault, that should be created by the user. ... see pki.sgit.ai for how that works. ... that stays on the vault, right? Because the vault fundamentally is for the user to capture, right? So in a way, it also acts as a backup, if you think about it, which is also a really powerful feature."

 The cell will ask for the narrowest credential at each step and never widen its own access. [Back to the plan](index.md).

## Step 1: our own inboxes first

| Need | Why | The narrowest form |
|---|---|---|
| **A Google OAuth app, in testing**, in RiskMandate's Google Cloud project (or The Cyber Boardroom's) | Only Google's own consent screen can grant Gmail access. In testing: up to 100 test users, no verification. | Every value to enter is on [the Google OAuth setup page](google-oauth.md): a Desktop client, publishing status *Testing*, test users our own addresses only. Dinis creates it and accepts Google's terms; an agent cannot. |
| **The scopes to start with** | Altitude 1 | Start with `gmail.metadata` for the first sync test, then `gmail.readonly`. No compose, send or modify yet. |
| **A Pub/Sub topic** for Gmail push notifications | The receive flow | One topic, with publish rights for Gmail's service account only; or skip push at first and poll the history on a timer. |
| **Which mailbox to sync first** | Our own inboxes first | One mailbox, chosen by Dinis. |
| **Where the gateway runs** | It alone holds the refresh token | Decision: a small always-on host, a scheduled job, or a person's machine. |
| **The user's own vault** for the twin | The vault belongs to the user, not to the cell: the user creates it (pki.sgit.ai: a passkey opens it) and holds its keys. The twin is the user's capture of their mailbox, and so also its backup. | The user registers the gateway as an agent they operate (pki.sgit.ai, `pki-agent.mjs`), then seals an access key for the twin's vault to that agent. The cell holds no vault and no copy. |

## Step 2: the lanes and the signatures

| Need | Why |
|---|---|
| Keys for each agent of the cell (gateway, firewall, triage, drafter, crm), registered at pki.sgit.ai as agents the user operates | Every lane entry is signed; keys must outlive a session, and the user's record must link to each agent for it to be trusted. |
| Append lanes on the vault, and how lane tokens are sealed to each agent | The lane format is built; the storage is not. |
| Who the approvers are, pinned by key fingerprint in the gateway's own configuration, supplied by Dinis out of band (for example from pki.sgit.ai) | Only people approve, and the cell must not be able to make an approver: `agents.json` names agents only. pki.sgit.ai keys are ECDSA P-256 and RSA, the lanes use Ed25519: which key signs lanes is open. |

## Step 3: the email policy

| Need | Why |
|---|---|
| The real policy: allowed domains and addresses, languages, rates | `policy/email-policy.json` is a simulation with example domains. |
| The templates, per kind of contact and language, in Dinis's voice | Templates are checked word for word. |
| Dinis's signature on the policy file | Altitude 5: an automation only counts if a person signed it. |

## Step 4: the CRM app's email component

| Need | Why |
|---|---|
| The twin format agreed with `crm.ios@sgit.dinis` | Agreed on 16 November 2026 (v1, with a change feed and client references). |
| Read access for the CRM app to `clean/`, not `raw/` | Agents and apps read the cleaned copy. |

## Step 5: the first automated sends

| Need | Why |
|---|---|
| The `gmail.send` scope (sensitive) | Sending. Still in testing. |
| The list of routine emails Dinis wants to automate | Each becomes a signed automation. |

## Step 6: the cell for other teams

| Need | Why |
|---|---|
| A decision on Google verification, and on the security assessment for restricted scopes | Needed before the app leaves testing. Whether an encrypted twin counts as storing restricted data on servers is to be settled with Google, not assumed. |
