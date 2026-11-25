# crm.dev.a: what is open (25 Nov 2026, 18:50 UTC)

Full history: [crm/notes/log.md](../notes/log.md). Requests log: [crm/notes/requests.md](../notes/requests.md).

## Live
- CRM tool site: https://crm.tool.sovereignweb.site (Site__Tool__CRM, dev, last c106016 then later deploys). Source of the app:
  AgentiCCells__Cell__Email, branch work/crm.dev.a, crm/ (model crm/model/crm.mjs, site crm/site/, build crm/scripts/build-site.mjs).
- Pages: Today, Lead board, Follow-ups, Contacts, People (team, agents, synthetic users), Outbox, Import, Unlinked threads,
  You (log in, hand-over by QR, paste, zip), Open your vault, Requests, For you, /learn/ (14 steps, deck, 11 explainers).
- Our work vault (yiy6okw9): a.maestro's seed (10 agents, projects), the team (2, names only), 6 synthetic users.
- Team contacts vault (kg37tfil): non-confidential test vault (Dinis, 25 Nov). Confidential vaults (Web Summit export) are
  made in a person's browser; no agent holds them.

## Open, in order
1. Share button on the You page: a browser seals a vault key to another person's key (browser to browser). Waiting on Dinis's go.
2. lane.entry/2 (VoiceDebrief__App__iOS 520cd83, website/lanes/entry-v2/): move the Requests page and For you answers to it,
   one base64 layer; the drain reads both forms; test with its vectors. Then the Outbox sign-off as mail.outbox-approval/1
   (a.mail.conductor's mapping, team/mail.conductor.a/notes/opinions/2026-11-25__lane-entry-v2-review.md). Not started.
3. CRM spec page and the library as /api/v1/crm.mjs for other sites (book site first; a moving company later). Waiting on go.
4. Reply as them should also write a twin.message/1 into the synthetic inbox once mail.dev.a's inboxes/<address>/ exist.
5. Outbox end to end on the demo once the Gmail tool reads CRM vaults.
6. iOS sync: v2 agreed with crm.ios; v1 reader adapter after the v2 page. Waiting on Dinis's go.

## Decisions waiting on Dinis
- Condition 4 for real contacts: lawful basis (proposed legitimate interest), removal route, retention (12 months), key holders.
- Requests lane retention 90 days and a removal route.
- a.feedback: zxehwe8t read key and Our work write (its key: Site__Agent__Feedback site/keys/a.feedback.json, dev 3c1c14b;
  enc sha256:090e0e338234fdcc, sign sha256:db40c4acf3181712; check before sealing).
- Home page design and mark (For you, sealed to both of his keys); the Book vault; key directory site.
