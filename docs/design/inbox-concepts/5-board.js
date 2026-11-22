// Concept 5: Board. Each conversation is a card in the column of its workflow step, so the whole
// pipeline (and where it is stuck) shows at once. MADE-UP mail; nothing is sent.
// By email.design.d@AgentiCCells.dinis, 22 November 2026. Apache-2.0.
import { threads, person, when, ago, initials, el } from './data.js';
const cols = [
  { id: 'new', title: 'New', why: 'first contacts and unsorted mail', pick: (t) => t.kind === 'person' && person(t).trust === 'new' },
  { id: 'reply', title: 'Needs a reply', why: 'they wait on you; an agent can draft', pick: (t) => t.state === 'needs-reply' && person(t).trust !== 'new' },
  { id: 'draft', title: 'Draft ready', why: 'drafted and signed by an agent; you approve', pick: (t) => t.state === 'drafted', mine: true },
  { id: 'waiting', title: 'Waiting on them', why: 'sent; a follow-up is drafted after 5 days', pick: (t) => t.state === 'waiting' },
  { id: 'done', title: 'Done and updates', why: 'nothing to do; kept for the record', pick: (t) => t.state === 'fyi' },
];
let shown = 'draft';
const card = (t, c) => { const p = person(t); return el('li', { class: 'card' },
  el('div', { class: 'top' }, el('span', { class: 'avatar sm', 'aria-hidden': 'true', text: initials(p.name) }), el('b', { class: 'ellipsis', text: p.name }), el('span', { class: 'xs muted', text: c.id === 'waiting' ? ago(t.at) : when(t.at) })),
  el('div', { class: 's', text: t.subject }),
  t.draft ? (t.draft.blocked ? el('div', { class: 'warn', text: 'A check failed: key material' }) : el('div', { class: 'agent', text: `Signed draft by ${t.draft.agent}` })) : null,
  t.labels.length ? el('div', { class: 'tags' }, t.labels.map((l) => el('span', { class: 'chip', text: l }))) : null,
  c.id === 'draft' && !t.draft?.blocked ? el('button', { class: 'btn primary go', type: 'button', text: 'Review and send' }) : c.id === 'reply' ? el('button', { class: 'btn go', type: 'button', text: 'Ask for a draft' }) : c.id === 'new' ? el('button', { class: 'btn go', type: 'button', text: 'Let in' }) : null); };
const render = () => {
  document.getElementById('picker').replaceChildren(...cols.map((c) => { const b = el('button', { type: 'button', 'aria-pressed': String(c.id === shown), text: `${c.title} ${threads.filter(c.pick).length}` }); b.addEventListener('click', () => { shown = c.id; render(); }); return b; }));
  document.getElementById('board').replaceChildren(...cols.map((c) => { const list = threads.filter(c.pick); return el('section', { class: `col${c.mine ? ' mine' : ''}${c.id === shown ? ' shown' : ''}`, 'aria-labelledby': 'h-' + c.id },
    el('h2', { id: 'h-' + c.id }, c.title, el('span', { class: 'chip', text: String(list.length) })), el('p', { class: 'why', text: c.why }), el('ul', {}, list.map((t) => card(t, c)))); }));
};
render();
