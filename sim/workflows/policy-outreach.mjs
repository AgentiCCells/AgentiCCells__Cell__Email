// The real outreach policy, as a PROPOSAL for Dinis to sign (backlog: "The real email policy").
// Every value is traced to his words; values he did not give are marked as this agent's proposal.
// By email.workflows.d@AgentiCCells.dinis, 22 November 2026. Apache-2.0.
//
// Dinis, 16 November 2026, about 22:15 UTC, on the outreach defaults: "yes use those defaults and
// we will see how they work in practice". The defaults (board/handovers/2026-11-16-first-run.md):
// every email approved by Dinis in the page; one recipient (up to three from one organisation, no
// cc or bcc); 20 a day, one per recipient a day; English and Portuguese; only small inline images.
//
// The checker allows only recipients whose domain or address the policy lists. So an outreach
// policy carries its campaign's address list, and Dinis signs the list with the policy: an agent
// cannot write to anyone he has not signed for. That is a workflow decision, not only a setting.

const DEFAULTS = 'Dinis, 16 Nov 2026 about 22:15 UTC: "yes use those defaults and we will see how they work in practice"';
const PROPOSAL = 'proposal by email.workflows.d; not in Dinis\'s words';

// campaign: { id, addresses: [made-up or agreed addresses], proposers: [agent ids] }
export function outreachPolicy(campaign) {
  if (!campaign?.id || !Array.isArray(campaign.addresses) || !campaign.addresses.length) throw new Error('outreachPolicy: a campaign needs an id and its address list');
  const policy = {
    schema: 'email.policy/1',
    status: `PROPOSAL for Dinis to sign: the outreach policy for campaign ${campaign.id}`,
    default: 'deny',
    proposers: [...(campaign.proposers || []), 'person:owner'],
    allow_forward: false,
    recipients: {
      max: 3, allow_bcc: false, allow_cc: false, one_domain: true,
      allow_domains: [], allow_addresses: campaign.addresses.map((a) => a.toLowerCase()),
      deny_domains: [], deny_addresses: [],
    },
    languages: ['en', 'pt'],
    require_template: false,
    max_slot_length: 400,
    attachments: { allow_mime: ['image/png', 'image/jpeg'] },
    dlp_markers: ['\\[private\\]', '\\[internal\\]', 'private note'],
    rates: { per_day: 20, per_agent_per_day: 20, per_recipient_per_day: 1 },
    templates: {},
    automations: [],
    max_sync_lag_minutes: 30,
  };
  return policy;
}

// Where each value comes from.
export const TRACE = [
  ['proposers', 'the campaign\'s drafting agent(s) and person:owner', PROPOSAL + ': the drafting agent for PrompTugal is conductor@PrompTugal.dinis, which agents.json does not name yet'],
  ['recipients.allow_addresses', 'the campaign\'s list, signed with the policy', PROPOSAL + ': the checker allows only listed domains or addresses'],
  ['recipients.max', '3', DEFAULTS + ' ("one recipient (up to three from one organisation")'],
  ['recipients.one_domain', 'true', DEFAULTS + ' ("from one organisation")'],
  ['recipients.allow_cc', 'false', DEFAULTS + ' ("no cc or bcc")'],
  ['recipients.allow_bcc', 'false', DEFAULTS + ' ("no cc or bcc")'],
  ['languages', 'en, pt', DEFAULTS + ' ("English and Portuguese")'],
  ['rates.per_day', '20', DEFAULTS + ' ("20 a day"); also send.js MAX_PER_DAY'],
  ['rates.per_recipient_per_day', '1', DEFAULTS + ' ("one per recipient a day")'],
  ['rates.per_agent_per_day', '20', PROPOSAL + ': the same as per_day, since one agent drafts the campaign'],
  ['attachments.allow_mime', 'image/png, image/jpeg', DEFAULTS + ' ("only small inline images"); the checker cannot check "small" yet: a size limit is proposed to email.dev.d'],
  ['automations', 'none', DEFAULTS + ' ("every email approved by Dinis in the page")'],
  ['allow_forward', 'false', PROPOSAL + ': outreach never forwards'],
  ['dlp_markers', 'as in the simulated policy', PROPOSAL],
  ['max_sync_lag_minutes', '30', PROPOSAL + ': as in the simulated policy'],
];

// The agents file the campaign needs: an outreach role that may propose sends and withdraw them.
// PROPOSAL: a change to policy/agents.json, which only Dinis approves.
export function outreachAgents(base, agentIds) {
  const a = structuredClone(base);
  a.roles.outreach = { about: 'Drafts first emails to the addresses a signed campaign policy lists. Proposes only; never approves or sends.', lanes: { actions: ['propose.send', 'withdraw'], approvals: ['gateway.stop'] }, twin: ['clean'] };
  for (const id of agentIds) a.agents[id] = { role: 'outreach' };
  return a;
}
