# Pinned approvers and lane keys for decide() in the page: how I read Dinis's answers

By email.dev.d@AgentiCCells.dinis, 22 November 2026, about 04:10 UTC. Nothing is built yet. conductor.d asked for this write-up before any building.

## Dinis's words

Relayed by conductor.d from its session, 03:59 UTC on 22 November 2026:

- Pinned approvers: "So the page gets is pinned, I think, approval, if I understand correctly, from the respective website, because that's where the latest version of those keys are."
- Lane keys: "Yeah, teams.keys, that's a good one."

## Lane keys: clear

Agents' Ed25519 lane keys go in their `team/keys/*.json` entries, in a new `lane` field. The build writes them into the page as `_site/app/lane-keys.js`, the way `trusted.js` is built today. The page passes them to `decideEntry()` as the registry.

This fits the ABP. The registry only binds an agent's name to its key. It grants no right: rights come from the signed `agents.json`, and approval comes from the pinned approvers.

## Pinned approvers: how I read it, and the problem with it

**My reading.** The page loads the approvers' public keys from a website where the current keys are published, rather than having the person pin a key by hand. There are two candidate websites:

- **(a) This cell's own site** (email-cell.agenticcells.site), built from `team/keys/` like the lane keys.
- **(b) pki.sgit.ai's public register.** The page already connects to it for "Sign in with pki.sgit.ai", with its root (`sha256:db7f79fdd87e030a`) pinned in the page. There, a person's current keys are published under their identity and signed back to that root.

**The problem with (a).** ABP N8 and C6b say approvers are pinned "outside the repository and the vault". That was specialist.abp's second-read finding (16 November): if the repository names the approvers, then any agent that can change the repository can make itself an approver, and the signed-policy check stops being a boundary. The site is built from this repository, and agents push to it. So (a) would put the trust root back inside the cell, and would need an ABP change that Dinis approves knowingly.

**(b) keeps the rule.** The approver key lives in pki.sgit.ai's register, which no email agent can write. The page checks it against the root it already pins, and Dinis's newest key is always the one used. What the page pins is only the identity name (for example, Dinis's pki.sgit.ai identity), not a key. That name could be a build constant or a setting in the page. It is a fact about who approves, not a key, so a change to it is visible in review.

## What I propose, for Dinis to confirm

1. **Approvers:** (b). The page reads the approver's current signing key from pki.sgit.ai's public register, checked against the pinned root, for one named identity. The approver named is Dinis's own identity on pki.sgit.ai.
2. **Lane keys:** a `lane` field in `team/keys/*.json`, built into the page.
3. **No ABP change** for 1 and 2. If Dinis meant (a), I stop and write the ABP change for him to approve.

## Questions for Dinis

- By "the respective website", do you mean pki.sgit.ai (b), or this cell's own site (a)?
- Which identity on pki.sgit.ai is the approver: your own, and only yours for now?

## After that

- Build both, with fixtures only.
- The register is fetched from pki.sgit.ai, which the page's content security policy already allows. Tests serve copies of the register, as the existing sign-in test does.
- Report to conductor.d before any push to dev.

## Update, 22 November 2026, about 05:15 UTC: Dinis's words to email.workflows.d

Given in email.workflows.d's session at about 04:08 UTC, and kept word for word in `team/email.workflows.d/notes/2026-11-22-dinis-workflows-as-state-machines.md` (976348f on work/email.workflows.d):

> "So the pinned approvals are defined by the agentic workflows and the keys that are published, and from a browser point of view, we should be using ... the QR codes to transmit keys ... And the lane keys is that to communicate are created by vaults, right? So I guess it just depends on the workflow and who's listening."

How this changes my proposal. It is still a proposal, for Dinis to confirm.

- **A third option, (c): approvers per workflow, carried by QR code.**
  - Each workflow names who approves it.
  - The approver's published key reaches the page as a QR code (pki.sgit.ai's k1 format, which the page already reads), and the person accepts it there.
  - The page keeps the pinned key sealed in IndexedDB, as it keeps vault keys today.
  - This keeps ABP N8: the pin lives in the person's browser, outside the repository and the vault, and no agent can add one.
  - It fits with (b): a QR code could carry a pki.sgit.ai identity rather than a bare key, and the page would then check that identity against the register.
- **Lane keys: two of Dinis's answers to reconcile.**
  - At 03:59 UTC: "Yeah, teams.keys, that's a good one".
  - At 04:08 UTC: "created by vaults ... it just depends on the workflow and who's listening".
  - One reading fits both: a vault (or the agent working in it) makes the lane key, and the key is published in team/keys for the page to read. To confirm with Dinis.
- **Nothing built for approvers** until Dinis picks (a), (b) or (c).
