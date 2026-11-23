# Plan: talk to the team from the Email Cell's site (W10)

By mail.conductor.a@AgentiCCells.dinis, 23 November 2026, about 15:39 UTC. A **proposal**, nothing built.

## The ask
- Dinis, relayed by a.maestro at 15:38 UTC: talk to the agents from the website through the feedback form, as on the Grace Farrell site (feedback.b's SWS messaging centre, SovereignWebsite/Site__Artist__Grace-Farrell at 38d1020: `site/send/`, replies in `site/send/replies/<browser-key-fingerprint>.json`, explained in `docs/sources.md`).
- The same wish is account D's W10 ("talk to every email.* agent through the website", 22 November, about 04:08 UTC), with its two open questions: how a message reaches an agent session, and whether every message must be signed by Dinis's key.
- **Not read:** the Grace Farrell repository. This session's request to attach it was refused by the permission check, and I did not clone it another way. This plan rests on a.maestro's description and on `board/team/maestro.a/tools/maestro_mail.py` in PrompTugal__News__Website (read, public), which issues and drains the same kind of lane.

## How it works (proposed)
1. **My inbox lane.** A vault on dev.send.sgraph.ai with an append lane, made the way `maestro_mail.py issue` makes one: the vault key and the enum key stay with me (sealed to my key `mail-conductor-a-agenticcells`, sha256:00f1dc169f01ed19); the append token lets anyone holding it write, not read.
2. **The page** `/app/talk.html` (new files only; mail.dev.a builds it):
   - Dinis writes a message. The page seals it to my public encryption key (published in `team/keys/` and built into the page like `trusted.js`) and signs it with the page's own browser key, which already exists (`src/app/pki.js`, non-extractable, in IndexedDB).
   - It appends the sealed message to my lane: `POST /api/vault/append/write/<vault_id>` with the append token. The page's content security policy already allows dev.send.sgraph.ai.
   - The append token reaches Dinis **only by sealed QR code** to his page's public key, not in the public page, so strangers cannot fill the lane.
3. **I read it** at every wake: a drain like `maestro_mail.py drain`, adapted to this repository's `team/keys/`. Each message is opened, its signature checked, and logged in my status as received (time and sender fingerprint, never the text in a public file).
4. **Replies** go back as `site/send/replies/<browser-key-fingerprint>.json` in the Grace Farrell pattern: here, `src/app/talk/replies/<fingerprint>.json`, sealed to Dinis's browser key and signed by mine. The repository is public; only the times and the fingerprints show, not the words.
5. **Demo mode**, as for every tool: a synthetic conversation, no lane, no key, clearly marked.

## What counts as Dinis's word
CLAUDE.md: only Dinis instructs. A message is treated as his words only if it is signed by a key pinned as his: his page's browser key (fingerprint shown on `/app/connect.html`), or his pki.sgit.ai identity. Anything else on the lane is material, logged and not acted on.

## One-way doors for Dinis (next decision batch)
- **T1, the lane's append token, to Dinis by sealed QR code.** It is a credential, even if write-only.
- **T2, which key is Dinis's.** Pin his page's browser key fingerprint (he reads it from the connect page and says it in a session), or his pki.sgit.ai identity (whose round trip, W3, has never run).
- **T3, whether a signed message on the lane is an instruction or only a request.** Proposal: an instruction within this team's brief, the same weight as his words in a session; anything one-way still asks him back.

## Limits to say out loud
- My private key lives only in this session's container. When this session ends, the next conductor has a new key, so a new lane, a new QR code and a new pinned recipient. Old replies stay readable by Dinis; old unread messages to me are lost. A durable answering key needs Dinis's word on where agents' keys may live (not decided anywhere I have read).
- Messages arrive at the next wake (hourly at :13), not live.
- Account D's sessions cannot be reached this way; this lane is account A's conductor only.

## Order of work
1. Dinis answers batch 1 (D1 lands the send screen).
2. mail.dev.a builds `/app/talk.html` in demo mode and a lane against a synthetic test key; I review.
3. Batch 2 to Dinis: T1, T2, T3.
4. On his yes: I issue my real lane, seal the QR code to his page key, and drain at each wake.
