// The email workflows as state machines. PROPOSAL, by email.workflows.d@AgentiCCells.dinis,
// 22 November 2026, at Dinis's word in its session (about 04:08 UTC): "I want you to think in
// terms of state machines, and I want you to think about every action that happens here is
// actually a workflow, from getting data to connect to email, to send an email, to review an
// email, put into draft." and "think of a workflow as an end state. You almost have workflows of
// workflows of workflows". Apache-2.0.
//
// A machine is plain data:
//   id, title, level (0 the product, 1 a workflow a person sees, 2 a step inside one),
//   goal        the end state the workflow exists to reach,
//   status      'built' (in the page today), 'simulation' (code and tests, made-up data), 'plan',
//   code        where it is built, if it is,
//   trigger     what starts it; needs: the capability (Google scope, key, vault) it needs,
//   approves    who decides; signed: what is signed,
//   product     { for: who uses it, scale: what limits it when used by many },
//   states      { name: { about, end: 'goal' | 'stop' } }, the first state is the start,
//   moves       [{ from, to, on, by, check, uses }]: on is the event, by the actor
//               (person, page, agent, google, vault, register), check the code that decides,
//               uses another machine's id when this step is that whole workflow.
// Deterministic on purpose: an LLM may help an agent write a draft, but no move depends on one.

const M = [];
const machine = (m) => { M.push(m); return m; };

// ------------------------------------------------------------------ level 0: the product

machine({
  id: 'email', level: 0, title: 'Email with agents, approved by a person',
  goal: 'every email that leaves was approved by its sender and recorded',
  status: 'plan', trigger: 'the person opens the site', needs: 'a Google account, an sgit vault',
  approves: 'the person', signed: 'keys, policy, proposals, approvals, sends',
  product: { for: 'one person and the agents that work for them', scale: 'each person runs it in their own browser and vaults; no shared server, so many people add no load to us; the limit is how many emails one person can approve' },
  states: {
    start: { about: 'nothing connected' },
    connected: { about: 'Google connected, page key made' },
    keyed: { about: 'the vault keys and trusted keys arrived by QR code' },
    twinned: { about: 'the twin holds the mailbox headers and labels' },
    drafted: { about: 'agents have written outbox entries' },
    sent: { about: 'approved emails sent and recorded; the next sync starts the loop again', end: 'goal' },
  },
  moves: [
    { from: 'start', to: 'connected', on: 'connect', by: 'person', uses: 'connect' },
    { from: 'connected', to: 'keyed', on: 'swap keys', by: 'person', uses: 'key-by-qr' },
    { from: 'keyed', to: 'twinned', on: 'sync', by: 'page', uses: 'twin-sync' },
    { from: 'twinned', to: 'drafted', on: 'agents draft', by: 'agent', uses: 'outreach' },
    { from: 'twinned', to: 'drafted', on: 'a message needs an answer', by: 'agent', uses: 'reply' },
    { from: 'twinned', to: 'drafted', on: 'a thread has waited', by: 'agent', uses: 'follow-up' },
    { from: 'drafted', to: 'sent', on: 'the person approves', by: 'person', uses: 'approve-and-send' },
  ],
});

// ------------------------------------------------------------------ level 1: what a person sees

machine({
  id: 'connect', level: 1, title: 'Connect a Gmail account',
  goal: 'the page holds a Google token, sealed to its own key, at the scopes the person allowed',
  status: 'built', code: 'src/app/connect.js (signIn, connected)', trigger: 'the person presses Connect',
  needs: 'gmail.metadata; then gmail.send, gmail.readonly or gmail.modify, one press each', approves: 'the person, on Google\'s consent screen', signed: 'nothing yet (the token is sealed to the page key)',
  product: { for: 'anyone with Gmail', scale: 'Google\'s OAuth app limits (testing, then verification); the Internal audience allows one organisation only' },
  states: {
    signed_out: { about: 'no token' },
    consent: { about: 'Google\'s consent screen is open' },
    connected: { about: 'gmail.metadata granted; counts and labels readable' },
    can_send: { about: 'gmail.send granted', end: 'goal' },
    refused: { about: 'the person said no, or Google refused', end: 'stop' },
  },
  moves: [
    { from: 'signed_out', to: 'consent', on: 'press Connect', by: 'person' },
    { from: 'consent', to: 'connected', on: 'grant', by: 'google' },
    { from: 'consent', to: 'refused', on: 'deny', by: 'person' },
    { from: 'connected', to: 'consent', on: 'press Allow sending, reading or managing', by: 'person' },
    { from: 'connected', to: 'can_send', on: 'gmail.send already granted', by: 'page' },
  ],
});

machine({
  id: 'key-by-qr', level: 1, title: 'Move a key by QR code',
  goal: 'a key from a trusted sender is kept, sealed to the page\'s own key',
  status: 'built', code: 'src/app/connect.js (copyQr, openSealedText, openImage, take)', trigger: 'someone needs to give the page a key (a vault key, an access token, an approver key)',
  needs: 'the page key pair (non-extractable, in IndexedDB); the sender in trusted.js or signed in with pki.sgit.ai', approves: 'the person shows their code and pastes the reply', signed: 'the sealed m1 code is signed by its sender',
  product: { for: 'any two parties who must swap a secret without a server holding it', scale: 'one code per key per device; scales with people, not with us. Dinis, 22 Nov: "one super powerful workflows"' },
  states: {
    shown: { about: 'the page shows its public key as a k1 QR code' },
    sealed: { about: 'the sender sealed a key to that public key (an m1 code)' },
    pasted: { about: 'the code is pasted or dropped on the page' },
    kept: { about: 'the key is opened and kept, sealed to the page key', end: 'goal' },
    refused: { about: 'not signed by a trusted sender, or not for this page', end: 'stop' },
  },
  moves: [
    { from: 'shown', to: 'sealed', on: 'the sender seals a key', by: 'agent' },
    { from: 'sealed', to: 'pasted', on: 'paste or drop', by: 'person' },
    { from: 'pasted', to: 'kept', on: 'signature from a trusted sender checks', by: 'page', check: 'openSealedText' },
    { from: 'pasted', to: 'refused', on: 'signature fails or sender unknown', by: 'page', check: 'openSealedText' },
  ],
});

machine({
  id: 'pin-approver', level: 1, title: 'Pin an approver',
  goal: 'the page holds an approver\'s key that it will accept policy signatures and approvals from',
  status: 'plan', trigger: 'the person sets up signed sending',
  needs: 'key-by-qr; the approver\'s published key (team/keys, or a register)', approves: 'the person, by pasting the code', signed: 'the approver\'s key bundle',
  product: { for: 'a person who lets agents send under a policy they signed', scale: 'one pin per approver per browser; Dinis, 22 Nov: approvers "are defined by the agentic workflows and the keys that are published", moved by QR code in the browser' },
  states: {
    none: { about: 'no approver pinned; every signed entry is refused' },
    offered: { about: 'an approver\'s key arrived by QR code' },
    pinned: { about: 'kept sealed in IndexedDB, used by decideEntry()', end: 'goal' },
    refused: { about: 'not the published key, or the person said no', end: 'stop' },
  },
  moves: [
    { from: 'none', to: 'offered', on: 'key arrives', by: 'person', uses: 'key-by-qr' },
    { from: 'offered', to: 'pinned', on: 'matches the published key and the person confirms', by: 'person', check: 'sim/workflows/pins.mjs' },
    { from: 'offered', to: 'refused', on: 'does not match, or the person declines', by: 'person' },
  ],
});

machine({
  id: 'twin-sync', level: 1, title: 'Sync the mailbox into the twin',
  goal: 'the twin vault holds every new message\'s headers and labels',
  status: 'built', code: 'src/app/connect.js (listIds, getMetadata), src/app/twin.js', trigger: 'the person presses Sync (plan: a schedule)',
  needs: 'gmail.metadata; the twin vault key', approves: 'nobody: reading headers into the person\'s own vault', signed: 'vault commits',
  product: { for: 'anyone who wants their mail in a vault they own', scale: 'Gmail API quota per user; 500 new messages a press today' },
  states: {
    idle: { about: 'nothing to do' },
    listing: { about: 'asking Gmail what changed' },
    fetching: { about: 'reading headers and labels' },
    writing: { about: 'writing files to the vault' },
    synced: { about: 'published to the vault', end: 'goal' },
    failed: { about: 'Gmail or the vault refused', end: 'stop' },
  },
  moves: [
    { from: 'idle', to: 'listing', on: 'press Sync', by: 'person' },
    { from: 'listing', to: 'fetching', on: 'new ids', by: 'google' },
    { from: 'listing', to: 'synced', on: 'nothing new', by: 'google' },
    { from: 'fetching', to: 'writing', on: 'headers read', by: 'google' },
    { from: 'writing', to: 'synced', on: 'published', by: 'vault' },
    { from: 'listing', to: 'failed', on: 'error', by: 'google' },
    { from: 'writing', to: 'failed', on: 'error', by: 'vault' },
  ],
});

// The three compose workflows share one shape: an agent drafts, the page checks, a person approves.
for (const [id, title, trigger, type] of [
  ['outreach', 'Write to someone new', 'a list of people to reach (for PrompTugal: conductor@PrompTugal.dinis\'s)', 'propose.send'],
  ['reply', 'Answer a message', 'a message in the twin that needs an answer', 'propose.reply'],
  ['follow-up', 'Follow up on our own unanswered email', 'a thread where we wrote last and N days passed', 'propose.reply'],
]) machine({
  id, level: 1, title, goal: 'an outbox entry the page will let the person send',
  status: 'simulation', code: 'sim/workflows/signed.mjs (writeEntry, checkEntry)', trigger,
  needs: 'the outbox vault key; the agent\'s lane key', approves: 'the person (a signed automation only for fixed templates to verified correspondents)', signed: `the agent's ${type} on its actions lane`,
  product: { for: id === 'outreach' ? 'anyone who writes to many new people' : 'anyone with more mail than time', scale: 'every email still needs one press; the limit is the person, which is why the trust ladder (backlog rank 8) matters' },
  states: {
    picked: { about: 'the agent picked who and why' },
    drafted: { about: 'text written, from a template or free' },
    checked: { about: 'checkEntry(): send.js and C4 say press' },
    in_outbox: { about: 'meta.json, body.txt, signed.json written', end: 'goal' },
    dropped: { about: 'the checks said no; nothing written', end: 'stop' },
  },
  moves: [
    { from: 'picked', to: 'drafted', on: 'write', by: 'agent' },
    { from: 'drafted', to: 'checked', on: 'self-check passes', by: 'agent', check: 'checkEntry' },
    { from: 'drafted', to: 'dropped', on: 'self-check refuses', by: 'agent', check: 'checkEntry' },
    { from: 'checked', to: 'in_outbox', on: 'write the entry', by: 'agent', check: 'writeEntry' },
  ],
});

machine({
  id: 'approve-and-send', level: 1, title: 'Review, approve and send one email',
  goal: 'one email sent from the person\'s Gmail and recorded in the outbox',
  status: 'built', code: 'src/app/connect.js (showMail), src/app/send.js, src/app/cell/decide.mjs', trigger: 'the person opens an outbox entry',
  needs: 'gmail.send; the outbox vault key', approves: 'the person\'s press (ABP 1.1.4)', signed: 'the agent\'s proposal when signed.json is there (C4); the press is recorded, not yet signed',
  product: { for: 'anyone who lets someone else draft for them', scale: 'one press per email; 20 a day (send.js)' },
  states: {
    opened: { about: 'the exact To, Cc, Subject and text shown' },
    not_sendable: { about: 'send.js or C4 refuses; the reasons are shown', end: 'stop' },
    ready: { about: 'checks pass; the button is live' },
    confirming: { about: 'the browser asks: send now?' },
    sending: { about: 'one call to Gmail' },
    sent: { about: 'Gmail answered with an id' },
    recorded: { about: 'meta.json says sent, when, the ids and who approved', end: 'goal' },
    failed: { about: 'Gmail refused; nothing sent', end: 'stop' },
    unrecorded: { about: 'sent, but the vault write failed; do not send again', end: 'stop' },
  },
  moves: [
    { from: 'opened', to: 'not_sendable', on: 'a check refuses', by: 'page', check: 'problems, decideEntry' },
    { from: 'opened', to: 'ready', on: 'checks pass', by: 'page', check: 'problems, decideEntry' },
    { from: 'ready', to: 'confirming', on: 'press Approve and send', by: 'person' },
    { from: 'confirming', to: 'ready', on: 'cancel', by: 'person' },
    { from: 'confirming', to: 'sending', on: 'confirm', by: 'person' },
    { from: 'sending', to: 'sent', on: '200 with an id', by: 'google' },
    { from: 'sending', to: 'failed', on: 'error', by: 'google' },
    { from: 'sent', to: 'recorded', on: 'meta.json written and published', by: 'vault' },
    { from: 'sent', to: 'unrecorded', on: 'vault error', by: 'vault' },
  ],
});


// ------------------------------------------------------------------ round 2 (05:13 UTC): the sending bottleneck first

machine({
  id: 'first-send', level: 1, title: 'Dinis\'s first real send, to himself',
  goal: 'one outbox entry sent from Dinis\'s own Gmail to himself and recorded in the outbox vault',
  status: 'plan', code: 'every step is built in src/app/connect.js; the whole has never run (it waits on the outbox key, W1); its checks and send ran in Chromium on made-up entries (sim/workflows/first-send-browser.mjs), and steps 3 to 7 through the page\'s own buttons against stand-ins for the vault service and Gmail (sim/workflows/first-send-page.mjs), and step 2, the paste, with a made-up trusted test sender in a test copy (sim/workflows/key-paste-page.mjs)',
  trigger: 'conductor@PrompTugal.dinis gives Dinis a sealed QR code with the outbox vault key, made for his page\'s public key',
  needs: 'the outbox vault key (W1); gmail.send; the page key', approves: 'Dinis\'s press', signed: 'the sealed key code (by its sender); the entry itself must be unsigned: a signed entry to the mailbox itself is refused by the policy',
  product: { for: 'the first person to use the cell for real', scale: 'one person, one email; it proves the path, it does not scale anything' },
  states: {
    waiting_key: { about: 'no outbox key in the page' },
    key_kept: { about: 'the outbox vault key is kept, sealed to the page key' },
    vault_open: { about: 'the outbox vault is open and its entries listed' },
    entry_open: { about: 'one entry addressed to Dinis himself is open' },
    can_send: { about: 'gmail.send is granted' },
    done: { about: 'sent to himself and recorded', end: 'goal' },
    stuck: { about: 'a step refused; the reason is shown and recorded', end: 'stop' },
  },
  moves: [
    { from: 'waiting_key', to: 'key_kept', on: 'paste the sealed code', by: 'person', uses: 'key-by-qr' },
    { from: 'key_kept', to: 'vault_open', on: 'press Open vault', by: 'person', check: 'openVaults' },
    { from: 'vault_open', to: 'entry_open', on: 'open the entry to himself', by: 'person', check: 'showMail' },
    { from: 'entry_open', to: 'can_send', on: 'press Allow sending', by: 'person', uses: 'connect' },
    { from: 'can_send', to: 'done', on: 'approve and send', by: 'person', uses: 'approve-and-send' },
    { from: 'vault_open', to: 'stuck', on: 'the vault does not open', by: 'vault' },
    { from: 'entry_open', to: 'stuck', on: 'the page says not sendable', by: 'page', check: 'problems, decideEntry' },
  ],
});

machine({
  id: 'gateway-stop', level: 2, title: 'Stop the gateway (the kill switch)',
  goal: 'nothing can be sent until a pinned approver starts the gateway again',
  status: 'simulation', code: 'src/app/cell/lanes.mjs (gatewayStopped), src/app/cell/decide.mjs',
  trigger: 'any agent or person sees something wrong', needs: 'a lane key; gateway.stop is open to every cell agent (agents.json)',
  approves: 'nobody: stopping needs no approval; starting again needs a pinned approver', signed: 'the gateway.stop entry on the approvals lane',
  product: { for: 'everyone who lets agents near their mail', scale: 'one entry stops every send for that mailbox; it costs nothing to add more agents who may stop' },
  states: {
    running: { about: 'signed proposals are checked and may pass' },
    stopping: { about: 'a gateway.stop entry is on the approvals lane' },
    stopped: { about: 'decide() refuses every proposal (kill switch)', end: 'goal' },
    not_signed: { about: 'the stop entry does not verify, so it does not count; the person is told', end: 'stop' },
  },
  moves: [
    { from: 'running', to: 'stopping', on: 'write gateway.stop', by: 'agent' },
    { from: 'stopping', to: 'stopped', on: 'the lanes verify', by: 'page', check: 'mergeLanes, gatewayStopped' },
    { from: 'stopping', to: 'not_signed', on: 'the lanes do not verify', by: 'page', check: 'mergeLanes' },
  ],
});

machine({
  id: 'trust-ladder', level: 0, title: 'The trust ladder: from every press to sessions sending',
  goal: 'agent sessions send some kinds of email under a policy Dinis signed, and he still sees every send',
  status: 'plan', code: 'docs/plan/trust-ladder.md (each rung: needs, ABP change, checks, how to step down)', trigger: 'Dinis decides to climb a rung, by a change to the ABP',
  needs: 'each rung: the one below working, and an ABP change Dinis approves', approves: 'Dinis, one rung at a time', signed: 'more at each rung: proposals, then approvals, then batches, then send records',
  product: { for: 'anyone whose bottleneck is pressing send', scale: 'this is the scaling question itself: each rung moves work from the person to signed policy, so one person can stand behind more email' },
  states: {
    press_every_email: { about: 'rung 0, today (ABP 1.1.4): the person presses for every email; agents sign nothing' },
    signed_proposals: { about: 'rung 1: agents sign what they draft; the page runs C4 and refuses changes (simulation; needs W4, W5, W15)' },
    signed_approvals: { about: 'rung 2: the press is a signed approve entry on the lanes; the page holds the person\'s lane key' },
    batch_press: { about: 'rung 3: one press for a reviewed batch a signed automation covers; the token stays in the browser' },
    automations: { about: 'rung 4: fixed kinds go without a press, under a signed automation; needs a gateway outside the browser (ABP N1)' },
    sessions_send: { about: 'rung 5: agent sessions send the kinds of email the signed policy allows; Dinis reviews by exception', end: 'goal' },
    held: { about: 'Dinis keeps the current rung', end: 'stop' },
    stopped: { about: 'a signed gateway.stop: every signed send refused until Dinis starts again', end: 'stop' },
  },
  moves: [
    { from: 'press_every_email', to: 'signed_proposals', on: 'pin approvers and lane keys', by: 'person', uses: 'pin-approver' },
    { from: 'signed_proposals', to: 'signed_approvals', on: 'ABP change: approvals are signed', by: 'person' },
    { from: 'signed_approvals', to: 'batch_press', on: 'ABP change: one press for a batch', by: 'person' },
    { from: 'batch_press', to: 'automations', on: 'ABP change: signed automations may send', by: 'person' },
    { from: 'automations', to: 'sessions_send', on: 'ABP change: sessions send under policy', by: 'person' },
    { from: 'signed_proposals', to: 'press_every_email', on: 'step down: unpin approvers or lane keys', by: 'person' },
    { from: 'signed_approvals', to: 'signed_proposals', on: 'step down: stop signing approvals', by: 'person' },
    { from: 'batch_press', to: 'signed_approvals', on: 'step down: a policy without automations', by: 'person' },
    { from: 'automations', to: 'batch_press', on: 'step down: no press-free automations; revoke the token', by: 'person' },
    { from: 'signed_proposals', to: 'held', on: 'Dinis keeps this rung', by: 'person' },
    { from: 'signed_approvals', to: 'held', on: 'Dinis keeps this rung', by: 'person' },
    { from: 'batch_press', to: 'held', on: 'Dinis keeps this rung', by: 'person' },
    { from: 'automations', to: 'held', on: 'Dinis keeps this rung', by: 'person' },
    { from: 'automations', to: 'stopped', on: 'gateway.stop', by: 'agent', uses: 'gateway-stop' },
    { from: 'batch_press', to: 'stopped', on: 'gateway.stop', by: 'agent', uses: 'gateway-stop' },
  ],
});

machine({
  id: 'send-from-client', level: 1, title: 'Write and send in the mail client',
  goal: 'an email the person wrote themselves leaves from their Gmail',
  status: 'built', code: 'src/app/mail.js, src/app/mailparse.js (respond)', trigger: 'the person presses Write, Reply, Reply all or Forward',
  needs: 'gmail.send and gmail.readonly (Allow reading)', approves: 'the person, by pressing Send (no agent drafts it)', signed: 'nothing',
  product: { for: 'anyone with Gmail who wants a plain client on their own token', scale: 'it runs in each person\'s browser on their own token; no server; Dinis used it for real on 22 Nov ("IT WORKS!!!")' },
  states: {
    composing: { about: 'the composer is open, prefilled for a reply or forward' },
    sending: { about: 'one call to Gmail' },
    sent: { about: 'Gmail has it; it shows in the conversation', end: 'goal' },
    discarded: { about: 'closed without sending', end: 'stop' },
    failed: { about: 'Gmail refused; the text stays in the composer', end: 'stop' },
  },
  moves: [
    { from: 'composing', to: 'sending', on: 'press Send', by: 'person' },
    { from: 'composing', to: 'discarded', on: 'close', by: 'person' },
    { from: 'sending', to: 'sent', on: '200 with an id', by: 'google' },
    { from: 'sending', to: 'failed', on: 'error', by: 'google' },
  ],
});

machine({
  id: 'campaign-policy', level: 1, title: 'Sign an outreach campaign\'s policy',
  goal: 'a policy Dinis signed that lists the campaign\'s addresses and his outreach defaults, so its agent\'s signed drafts can pass C4',
  status: 'simulation', code: 'sim/workflows/policy-outreach.mjs (outreachPolicy, outreachAgents)',
  trigger: 'a campaign has a list of people to write to (for PrompTugal: conductor@PrompTugal.dinis\'s)',
  needs: 'the address list; an outreach role in agents.json; Dinis\'s signing key, pinned in the page', approves: 'Dinis, by signing the policy and the agents file', signed: 'email-policy.json and agents.json, each by a pinned approver',
  product: { for: 'anyone who writes to a known list of new people', scale: 'one signature covers a whole list, so the person approves the list once and each email once; the list is the limit an agent cannot pass' },
  states: {
    listed: { about: 'the campaign has its address list' },
    proposed: { about: 'outreachPolicy() made the policy, every value traced to Dinis\'s words or marked as a proposal' },
    signed: { about: 'Dinis signed the policy and the agents file', end: 'goal' },
    changed: { about: 'Dinis asked for changes; back to the list', end: 'stop' },
  },
  moves: [
    { from: 'listed', to: 'proposed', on: 'make the policy', by: 'agent', check: 'outreachPolicy' },
    { from: 'proposed', to: 'signed', on: 'Dinis signs', by: 'person', check: 'signPolicy, verifyPolicy' },
    { from: 'proposed', to: 'changed', on: 'Dinis asks for changes', by: 'person' },
  ],
});

// ------------------------------------------------------------ level 2: steps inside the workflows (09:45 UTC, email.pm.d's candidate 3)

machine({
  id: 'open-vault', level: 2, title: 'Open the vaults',
  goal: 'the twin vault and the outbox are open in the page, and the outbox entries listed',
  status: 'built', code: 'src/app/connect.js (openVaults), src/app/vault.js', trigger: 'the person presses Open vault, or a pasted code carried a vault key',
  needs: 'the vault keys and the SG/Send access token, kept sealed to the page key', approves: 'nobody: opening the person\'s own vaults', signed: 'vault commits (the vault library)',
  product: { for: 'anyone whose agents hand them work through a vault', scale: 'one vault service call per object, in the browser; the service is the only shared part' },
  states: {
    pressed: { about: 'the page looks for the keys it keeps' },
    twin_ready: { about: 'the twin vault is open, or was just made here (when the SG/Send token is kept and no twin key)' },
    outbox_open: { about: 'the outbox vault is open and its entries listed', end: 'goal' },
    twin_only: { about: 'no outbox key yet: only the twin is open', end: 'stop' },
    nothing: { about: 'no key and no token: "paste the sealed QR code"', end: 'stop' },
    failed: { about: 'the vault service refused or a key did not open', end: 'stop' },
  },
  moves: [
    { from: 'pressed', to: 'twin_ready', on: 'twin key kept, or token kept and a twin made', by: 'vault', check: 'openTwinVault, createTwinVault' },
    { from: 'pressed', to: 'nothing', on: 'no key and no token', by: 'page' },
    { from: 'twin_ready', to: 'outbox_open', on: 'outbox key kept: open and list', by: 'vault', check: 'openTwinVault, ensureLoaded' },
    { from: 'twin_ready', to: 'twin_only', on: 'no outbox key', by: 'page' },
    { from: 'pressed', to: 'failed', on: 'vault error', by: 'vault' },
    { from: 'twin_ready', to: 'failed', on: 'outbox error', by: 'vault' },
  ],
});

machine({
  id: 'read-message', level: 2, title: 'Read a conversation in the mail client',
  goal: 'the person has read the conversation, and Gmail knows it is read',
  status: 'built', code: 'src/app/mail.js (opening a thread), src/app/mailparse.js (labelChange)', trigger: 'the person opens a conversation',
  needs: 'gmail.readonly to read; gmail.modify to mark it read', approves: 'the person, by opening it', signed: 'nothing',
  product: { for: 'anyone with Gmail', scale: 'Gmail API quota per user; the HTML is shown in a sandboxed frame with remote images blocked' },
  states: {
    listed: { about: 'the conversation is in the list, bold if unread' },
    shown: { about: 'its messages are shown; the last and the unread ones open' },
    read: { about: 'UNREAD removed in Gmail (with Allow managing)', end: 'goal' },
    shown_only: { about: 'read-only token: shown, but Gmail still says unread', end: 'goal' },
    not_shown: { about: 'Gmail refused', end: 'stop' },
  },
  moves: [
    { from: 'listed', to: 'shown', on: 'open', by: 'person' },
    { from: 'listed', to: 'not_shown', on: 'error', by: 'google' },
    { from: 'shown', to: 'read', on: 'unread and gmail.modify: remove UNREAD', by: 'page', check: 'labelChange(read)' },
    { from: 'shown', to: 'shown_only', on: 'no gmail.modify', by: 'page' },
  ],
});

machine({
  id: 'label-archive', level: 2, title: 'Archive, Bin, star or mark unread, with Undo',
  goal: 'the conversation is where the person put it in Gmail, and nothing was deleted for good',
  status: 'built', code: 'src/app/mail.js (act, undoToast), src/app/mailparse.js (labelChange)', trigger: 'the person presses Archive, Bin, Star or Mark unread',
  needs: 'gmail.modify (Allow managing)', approves: 'the person, by pressing', signed: 'nothing',
  product: { for: 'anyone with Gmail', scale: 'one Gmail call per press; agents\' label changes would go through approved proposals instead (C3, plan)' },
  states: {
    open: { about: 'a conversation is open' },
    moved: { about: 'archived or in Bin; a toast offers Undo' },
    kept: { about: 'the move stands', end: 'goal' },
    undone: { about: 'Undo put it back (INBOX added again, or out of Bin)', end: 'goal' },
    marked: { about: 'starred, unstarred or marked unread', end: 'goal' },
    failed: { about: 'Gmail refused; the toast says so', end: 'stop' },
  },
  moves: [
    { from: 'open', to: 'moved', on: 'archive or bin', by: 'person', check: 'labelChange(archive), threads/trash' },
    { from: 'open', to: 'marked', on: 'star or unread', by: 'person', check: 'labelChange' },
    { from: 'open', to: 'failed', on: 'error', by: 'google' },
    { from: 'moved', to: 'kept', on: 'toast closes', by: 'page' },
    { from: 'moved', to: 'undone', on: 'press Undo', by: 'person', check: 'labelChange(inbox), threads/untrash' },
  ],
});

machine({
  id: 'firewall-clean', level: 2, title: 'Clean an incoming message before any agent reads it',
  goal: 'agents see only the cleaned copy, with a verdict that decides what may answer it',
  status: 'simulation', code: 'src/app/cell/clean.mjs (clean), tested on the simulated mailbox', trigger: 'a message arrives in the twin',
  needs: 'the raw message (only the firewall reads it, N5)', approves: 'nobody: a hostile verdict means only a person may answer', signed: 'plan: the cleaned copy in clean/',
  product: { for: 'anyone who lets agents read their mail', scale: 'one pass per message, in the browser or the firewall agent; a heuristic, not a guarantee' },
  states: {
    raw: { about: 'the message as it arrived' },
    cleaned: { about: 'links numbered, hidden text quarantined, invisible characters removed, injections flagged' },
    clean: { about: 'no flags of note: agents may draft a reply; an automation may answer it', end: 'goal' },
    suspicious: { about: 'a risky link or hidden text: agents may draft, a person approves', end: 'goal' },
    hostile: { about: 'it reads as instructions to an agent: no agent answers it until a person has read it', end: 'stop' },
  },
  moves: [
    { from: 'raw', to: 'cleaned', on: 'clean()', by: 'agent', check: 'clean' },
    { from: 'cleaned', to: 'clean', on: 'verdict clean', by: 'agent', check: 'clean' },
    { from: 'cleaned', to: 'suspicious', on: 'verdict suspicious', by: 'agent', check: 'clean' },
    { from: 'cleaned', to: 'hostile', on: 'verdict hostile', by: 'agent', check: 'clean' },
  ],
});

machine({
  id: 'follow-up-timer', level: 2, title: 'Notice a thread waiting on the other side',
  goal: 'a follow-up is drafted for a thread where we wrote last and N days passed, and nothing is sent without a press',
  status: 'simulation', code: 'sim/workflows/followups.mjs (dueFollowUps)', trigger: 'each twin sync (plan: also a daily check)',
  needs: 'the synced twin; N, the days to wait (for Dinis)', approves: 'the person, for the follow-up itself', signed: 'the follow-up proposal, when drafted',
  product: { for: 'anyone who loses track of who owes whom an answer', scale: 'a pass over the twin\'s threads; no Gmail call; the CRM component shows the same "who waits on whom"' },
  states: {
    watching: { about: 'we wrote last; the timer runs' },
    due: { about: 'N days passed with no answer' },
    drafted: { about: 'a follow-up entry is in the outbox, waiting for a press', end: 'goal' },
    answered: { about: 'they wrote back before N days: nothing to do', end: 'stop' },
    dismissed: { about: 'the person said no follow-up for this thread', end: 'stop' },
  },
  moves: [
    { from: 'watching', to: 'due', on: 'N days, no answer', by: 'agent', check: 'dueFollowUps' },
    { from: 'watching', to: 'answered', on: 'an inbound message in the thread', by: 'page' },
    { from: 'due', to: 'drafted', on: 'draft the follow-up', by: 'agent', uses: 'follow-up' },
    { from: 'due', to: 'dismissed', on: 'the person dismisses it', by: 'person' },
  ],
});

// Who listens on each lane. PROPOSAL, from Dinis's words about 04:08 UTC: lane keys are "created by
// vaults ... it just depends on the workflow and who's listening. Usually we have an observability
// agent or specific agent or a feedback agent to capture it." The agent names below are roles, not
// agents that exist; none is started.
export const LANE_LISTENERS = Object.freeze({
  actions: { writes: 'drafting agents and people (agents.json roles)', listens: ['the page (decide, before a press)', 'a feedback agent (what was proposed and why, to improve drafts)'] },
  approvals: { writes: 'pinned approvers; any cell agent may write gateway.stop', listens: ['the page (approvals and the kill switch)', 'an observability agent (who approved what, and every stop)'] },
  reads: { writes: 'anyone who reads the twin', listens: ['an observability agent (which agent read which message)'] },
  outbox: { writes: 'the gateway (today: the page, through meta.json)', listens: ['the CRM component (replied, who waits on whom)', 'an observability agent (sends per day, per agent)', 'a feedback agent (what was sent against what was proposed)'] },
});

// The building blocks we have (email.pm.d's rank 2: "the primitives we have ... against the email
// workflows they make possible"). status as for machines.
export const PRIMITIVES = Object.freeze({
  site: { name: 'the cell\'s site and its pages', status: 'built' },
  oauth: { name: 'Google OAuth scopes on the person\'s mailbox (metadata, send, readonly, modify)', status: 'built' },
  'page-key': { name: 'the page\'s own key pair and QR codes (k1 to show, m1 sealed)', status: 'built' },
  vault: { name: 'sgit vaults the person owns (twin, outbox)', status: 'built' },
  lanes: { name: 'signed lane entries (Ed25519, hash chains, per-agent rights)', status: 'simulation' },
  policy: { name: 'the email policy, signed, and its checker (C4)', status: 'simulation' },
  pki: { name: 'pki.sgit.ai: identities and the web of trust', status: 'built' },
  agents: { name: 'agent sessions that draft', status: 'plan' },
  'mail-client': { name: 'the mail client /app/mail.html', status: 'built' },
});

// Per machine: the acceptance check (when the workflow counts as working), how much it removes the
// sending bottleneck (5 most, 1 least; this agent's judgement, a proposal), and the primitives it uses.
const EXTRA = {
  email: [5, ['site', 'oauth', 'page-key', 'vault', 'lanes', 'policy', 'agents'], 'Dinis sends ten real emails drafted by agents in one sitting, each one checked and recorded'],
  'first-send': [5, ['site', 'oauth', 'page-key', 'vault'], 'Dinis\'s email to himself arrives, and meta.json in the outbox vault says sent, with Gmail\'s id'],
  'approve-and-send': [5, ['site', 'oauth', 'vault', 'policy'], 'run in Chromium against a made-up outbox: a good entry reaches recorded, a changed or Bcc entry stops at not_sendable, and no Gmail call is made in the test'],
  'key-by-qr': [5, ['site', 'page-key', 'pki'], 'a code sealed by a trusted sender is kept; one from anyone else is refused (built; checked in Chromium with a test sender)'],
  outreach: [4, ['vault', 'lanes', 'policy', 'agents'], 'a made-up outreach entry passes checkEntry() and the page; a changed one is refused (tests/workflows.test.mjs)'],
  connect: [4, ['site', 'oauth', 'page-key'], 'Dinis connects and the page reads counts and labels (done 16 Nov); Allow sending grants gmail.send'],
  'trust-ladder': [4, ['lanes', 'policy', 'pki', 'agents'], 'docs/plan/trust-ladder.md gives each rung what it needs, the ABP change, its checks and how to step down; no rung above 0 is used before Dinis approves it; the machine allows no skipped rung and a step down from each'],
  'pin-approver': [3, ['site', 'page-key', 'pki'], 'a fixture policy signed by a pinned approver passes decideEntry(); unpinned, it is refused'],
  reply: [3, ['vault', 'lanes', 'policy', 'agents'], 'a made-up reply under the automation passes; with the empty twin it is refused (tests/workflows.test.mjs)'],
  'follow-up': [2, ['vault', 'lanes', 'policy', 'agents'], 'a made-up follow-up to an unanswered thread passes to the press'],
  'twin-sync': [2, ['oauth', 'vault'], 'a sync writes every new header into the twin vault (done on Dinis\'s mailbox, 21 Nov)'],
  'send-from-client': [3, ['site', 'oauth', 'mail-client'], 'Dinis wrote, sent, received and replied from the client on 22 Nov (his screenshots, REALITY.md); tests/mail.test.mjs covers reply and forward headers'],
  'campaign-policy': [5, ['policy', 'lanes', 'pki', 'agents'], 'a made-up campaign policy holds a listed English or Portuguese email for Dinis, refuses each thing his defaults forbid, and passes a signed entry from the outreach agent to his press (sim/workflows/round4.test.mjs)'],
  'open-vault': [4, ['site', 'page-key', 'vault'], 'Open vault opens the outbox and lists its entries in Chromium against the vault stand-in (sim/workflows/first-send-page.mjs, key-paste-page.mjs)'],
  'read-message': [1, ['site', 'oauth', 'mail-client'], 'opening an unread conversation with gmail.modify removes UNREAD (tests/mail.test.mjs; checked in Chromium against a stand-in for Gmail, REALITY.md)'],
  'label-archive': [1, ['site', 'oauth', 'mail-client'], 'archive removes INBOX and Undo adds it back; nothing is ever deleted for good (sim/workflows/round5.test.mjs, tests/mail.test.mjs)'],
  'firewall-clean': [2, ['agents', 'policy'], 'on the simulated mailbox, the two injection messages are hostile and the rest clean, and the checker refuses an agent\'s reply to a hostile one (sim/workflows/round5.test.mjs)'],
  'follow-up-timer': [3, ['vault', 'agents'], 'on the simulated twin at 16 Nov with N = 5, exactly the unanswered thread to Kim is due, and its follow-up passes to the press (sim/workflows/round5.test.mjs)'],
  'gateway-stop': [2, ['lanes'], 'after a signed gateway.stop, decideEntry() refuses every signed entry (sim/workflows/round2.test.mjs)'],
};
for (const m of M) {
  const x = EXTRA[m.id];
  if (x) [m.bottleneck, m.primitives, m.acceptance] = x;
}

export const MACHINES = Object.freeze(M);
export const byId = (id) => M.find((m) => m.id === id);
const ACTORS = new Set(['person', 'page', 'agent', 'google', 'vault', 'register']);

// Every problem with a set of machines; empty means they are well formed.
export function checkMachines(machines = M) {
  const out = [];
  const ids = new Set(machines.map((m) => m.id));
  if (ids.size !== machines.length) out.push('two machines share an id');
  for (const m of machines) {
    const names = Object.keys(m.states || {});
    const at = `${m.id}`;
    for (const k of ['id', 'title', 'goal', 'status', 'trigger', 'approves', 'product', 'acceptance', 'bottleneck']) if (!m[k]) out.push(`${at}: missing ${k}`);
    if (!['built', 'simulation', 'plan'].includes(m.status)) out.push(`${at}: status ${m.status}`);
    for (const pr of m.primitives || []) if (!PRIMITIVES[pr]) out.push(`${at}: unknown primitive ${pr}`);
    if (!m.primitives?.length) out.push(`${at}: names no primitives`);
    if (!names.length) { out.push(`${at}: no states`); continue; }
    const ends = names.filter((s) => m.states[s].end);
    if (!ends.some((s) => m.states[s].end === 'goal')) out.push(`${at}: no goal state`);
    for (const mv of m.moves) {
      if (!m.states[mv.from]) out.push(`${at}: move from unknown state ${mv.from}`);
      if (!m.states[mv.to]) out.push(`${at}: move to unknown state ${mv.to}`);
      if (m.states[mv.from]?.end) out.push(`${at}: move out of end state ${mv.from}`);
      if (!ACTORS.has(mv.by)) out.push(`${at}: unknown actor ${mv.by}`);
      if (!mv.on) out.push(`${at}: a move from ${mv.from} has no event`);
      if (mv.uses && !ids.has(mv.uses)) out.push(`${at}: uses unknown workflow ${mv.uses}`);
    }
    const seen = reach(m, names[0]);
    for (const s of names) if (!seen.has(s)) out.push(`${at}: ${s} cannot be reached`);
    for (const s of names) if (!m.states[s].end && !m.moves.some((mv) => mv.from === s)) out.push(`${at}: ${s} is a dead end that is not an end state`);
    for (const s of names) if (!m.states[s].end && ![...reach(m, s)].some((x) => m.states[x].end)) out.push(`${at}: from ${s} no end can be reached`);
  }
  // Workflows of workflows: a machine may not use itself, directly or through others.
  const uses = (m) => [...new Set(m.moves.map((mv) => mv.uses).filter(Boolean))];
  const visit = (id, path) => {
    if (path.includes(id)) { if (id === path[0]) out.push(`workflow cycle: ${[...path, id].join(' > ')}`); return; }
    const m = machines.find((x) => x.id === id); if (!m) return;
    for (const u of uses(m)) visit(u, [...path, id]);
  };
  for (const m of machines) for (const u of uses(m)) visit(u, [m.id]);
  return out;
}

function reach(m, from) {
  const seen = new Set([from]), todo = [from];
  while (todo.length) { const s = todo.pop(); for (const mv of m.moves) if (mv.from === s && !seen.has(mv.to)) { seen.add(mv.to); todo.push(mv.to); } }
  return seen;
}

// Run a machine on a list of events. Returns { state, path, ended, error }.
export function run(m, events) {
  let state = Object.keys(m.states)[0];
  const path = [state];
  for (const on of events) {
    const mv = m.moves.find((x) => x.from === state && x.on === on);
    if (!mv) return { state, path, ended: !!m.states[state].end, error: `no move on "${on}" from ${state}` };
    state = mv.to; path.push(state);
  }
  return { state, path, ended: m.states[state].end || false, error: null };
}

// Every simple path from the start to an end state: the "state flow paths" Dinis wants drawn.
export function paths(m) {
  const start = Object.keys(m.states)[0], out = [];
  const walk = (s, path, events) => {
    if (m.states[s].end) { out.push({ end: s, kind: m.states[s].end, states: path, events }); return; }
    for (const mv of m.moves.filter((x) => x.from === s)) if (!path.includes(mv.to)) walk(mv.to, [...path, mv.to], [...events, mv.on]);
  };
  walk(start, [start], []);
  return out;
}
