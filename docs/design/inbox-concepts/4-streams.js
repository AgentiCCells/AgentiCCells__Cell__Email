// Concept 4: Streams. Mail is split by who sent it and what it is: people you trust, first contacts
// waiting to be let in, updates read like a feed, and records kept for later. MADE-UP mail.
// By email.design.d@AgentiCCells.dinis, 22 November 2026. Apache-2.0.
import { threads, person, when, initials, el, TRUST } from './data.js';
const humans = threads.filter((t) => t.kind === 'person' && !t.mine);
const streams = [
  { id: 'people', title: 'People', hint: 'signed or known senders', list: humans.filter((t) => person(t).trust !== 'new') },
  { id: 'screen', title: 'First contact', hint: 'nothing reaches People until you let it in', list: humans.filter((t) => person(t).trust === 'new') },
  { id: 'updates', title: 'Updates', hint: 'notices and newsletters, newest first', list: threads.filter((t) => t.kind === 'notice' || t.kind === 'news') },
  { id: 'records', title: 'Records', hint: 'receipts, statements, bookings', list: threads.filter((t) => t.kind === 'receipt') },
];
let shown = 'people';
const row = (t) => { const p = person(t); return el('div', { class: 'row' }, el('span', { class: 'avatar', 'aria-hidden': 'true', text: initials(p.name) }),
  el('span', { class: 'ellipsis' }, t.unread ? el('span', { class: 'sr-only', text: 'Unread. ' }) : null, el('b', { text: p.name }), ' ', el('span', { class: `trust ${p.trust}`, text: p.trust === 'signed' ? 'Signed' : 'Known' }), t.draft ? el('span', { class: 'chip', text: ' Draft ready' }) : null),
  el('span', { class: 'xs muted', text: when(t.at) }), el('span', { class: 'sub small ellipsis' }, el('span', { text: t.subject }), el('span', { class: 'muted', text: ` · ${t.snippet}` }))); };
const ask = (t) => { const p = person(t); return el('div', { class: 'ask' }, el('div', {}, el('b', { text: p.name }), ' ', el('span', { class: 'small muted', text: `${p.addr} · ${p.org}` }), ' ', el('span', { class: 'trust new', text: TRUST.new })),
  el('p', { class: 'small' }, el('b', { text: t.subject }), el('span', { class: 'muted', text: ` · ${t.snippet}` })),
  el('div', { class: 'btns' }, el('button', { class: 'btn primary', type: 'button', text: 'Let in' }), el('button', { class: 'btn', type: 'button', text: 'Ask who introduced them' }), el('button', { class: 'btn', type: 'button', text: 'Screen out' }))); };
const feed = (t) => { const p = person(t); return el('article', {}, el('div', { class: 'meta xs muted' }, el('span', { text: p.name }), el('span', { text: when(t.at) })), el('h3', { text: t.subject }), el('div', { class: 'small muted', text: t.snippet })); };
const render = () => {
  const tabs = streams.map((s) => { const b = el('button', { type: 'button', role: 'tab', 'aria-selected': String(s.id === shown), 'aria-controls': 's-' + s.id, text: `${s.title} ${s.list.length}` }); b.addEventListener('click', () => { shown = s.id; render(); }); return b; });
  document.getElementById('tabs').replaceChildren(el('div', { role: 'tablist', 'aria-label': 'Streams', class: 'tabs-in' }, tabs));
  document.getElementById('grid').replaceChildren(...streams.map((s) => el('section', { id: 's-' + s.id, class: `stream panel ${s.id}${s.id === shown ? ' shown' : ''}`, 'aria-labelledby': 'h-' + s.id },
    el('div', { class: 'shead' }, el('h2', { id: 'h-' + s.id, text: s.title }), el('p', { class: 'xs muted', text: s.hint }), el('span', { class: 'chip', text: String(s.list.length) })),
    s.id === 'screen' ? el('div', { class: 'screen' }, s.list.map(ask)) : s.id === 'people' ? el('div', {}, s.list.map(row)) : el('div', { class: 'feed' }, s.list.map(feed)))));
};
render();
