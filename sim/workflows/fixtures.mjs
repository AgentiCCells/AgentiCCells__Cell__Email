// SIMULATION. Made-up emails for the three workflows in docs/plan/workflows.md, written against
// the simulated mailbox in sim/messages.mjs (owner@example.org, "Alex"). Every person and address
// is made up and uses the reserved example domains (RFC 2606). No real person, company, draft or
// mailbox may ever be added here: the real outreach drafts are conductor@PrompTugal.dinis's.
// By email.workflows.d@AgentiCCells.dinis, 22 November 2026. Apache-2.0.

// Outreach: a first email to someone who has never written to the mailbox. Free text, so a
// person approves it (holds: first contact, no automation).
export const outreach = () => ({
  to: ['morgan@example.net'], cc: [], bcc: [], language: 'en', attachments: [],
  subject: 'A short question about your workshop',
  text: 'Hello Morgan,\n\nI read the notes from your workshop last month and would like to ask two short questions about how you ran the exercises. Would you have twenty minutes in the next two weeks?\n\nKind regards,\nAlex',
});

// Reply: an answer to Rui's message m-0012, from the fixed Portuguese template that the
// simulated policy's signed automation auto-reply-pt-thanks covers.
export const reply = () => ({
  in_reply_to: 'm-0012', to: ['rui@example.com'], cc: [], bcc: [], language: 'pt', attachments: [],
  subject: 'Re: Reunião sobre o projeto',
  text: 'Olá Rui,\n\nObrigado pela mensagem. Respondo com mais detalhe em breve.\n\nCumprimentos,\nAlex',
  template: { id: 'reply-pt-thanks', slots: { subject: 'Reunião sobre o projeto', name: 'Rui', signer: 'Alex' } },
});

// Follow-up: Alex wrote to Kim (m-0009, 10 November) and Kim has not answered. A reply to our
// own message, in the same thread, from the followup-en template with one free slot.
export const followUp = () => ({
  in_reply_to: 'm-0009', to: ['kim@example.com'], cc: [], bcc: [], language: 'en', attachments: [],
  subject: 'Re: A question about your talk',
  text: 'Hello Kim,\n\nI am following up on my email of 10 November. Would a short call next week suit you?\n\nKind regards,\nAlex',
  template: { id: 'followup-en', slots: { subject: 'A question about your talk', name: 'Kim', date: '10 November', signer: 'Alex', message: 'Would a short call next week suit you?' } },
});

export const THREADS = { reply: 't-0002', 'follow-up': 't-0006' };
