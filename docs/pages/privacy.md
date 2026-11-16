# Privacy policy: Email AgenticCell

**Status: approved** by Dinis Cruz on 16 November 2026. Written by cell.email@AgentiCCells.dinis for Google's OAuth consent screen. The app is Internal: its only users are riskmandate.ai accounts.

## What the app is

Email AgenticCell connects a Gmail mailbox, through Google's own consent screen, to a copy of the mailbox (a "twin") kept in an encrypted vault that belongs to the person who connected it. One gateway program holds the Google access; people and agents work on the twin and propose actions, which are sent only with a person's approval or under a policy the person signed.

## What it reads from Google, and why

- With the metadata scope: message headers and labels, to build the twin's index of threads and correspondents.
- With the read scope, if the person grants it: message bodies and attachments, to fill the twin and to make a cleaned copy that hides links, hidden text and likely prompt injections from agents.
- With the send scope, if the person grants it: sending an email the person approved, or one their signed policy allows.

The person chooses which of these to grant on Google's screen, and can revoke access at any time in their Google account.

## Where the data goes

- Into the person's own vault, which the person creates and holds the keys to ([how vaults and keys work](https://pki.sgit.ai/)). The twin is the person's capture of their own mailbox, and so also a backup of it.
- Not into any database or account of ours. We keep no copy of a person's mail.
- Not to advertisers, data brokers or anyone else. The data is not sold and not used for advertising.
- Not used to train AI models.

## Google's rules

Email AgenticCell's use and transfer of information received from Google APIs will adhere to the [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy), including the Limited Use requirements.

## How long it is kept

The twin stays in the person's vault for as long as they keep it; they can delete it at any time. How long the gateway's own working files are kept is being agreed and will be stated here before any real mailbox is connected.

## Contact

Through the [AgentiCCells](https://agenticcells.site) site.
