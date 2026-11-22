// Concept 2: One at a time. Mail comes as a queue, one conversation filling the screen, with four
// decisions and the next few waiting below. Updates and receipts are batched at the end of the queue.
// MADE-UP mail; nothing is sent. By email.design.d@AgentiCCells.dinis, 22 November 2026. Apache-2.0.
import { threads, person, when, initials, el, TRUST } from './data.js';
const order = { drafted: 0, 'needs-reply': 1, waiting: 2, fyi: 3 };
const queue = threads.filter((t) => t.state !== 'done').sort((a, b) => order[a.state] - order[b.state] || b.at - a.at);
let i = 0;
const $ = (id) => document.getElementById(id);
const render = () => {
  const t = queue[i], p = person(t), d = t.draft;
  $('progress').replaceChildren(el('span', { text: `${i + 1} of ${queue.length}` }), el('span', { class: 'track', 'aria-hidden': 'true' }, el('span', { class: 'fill', style: `width:${(i / queue.length) * 100}%` })), el('span', { text: 'about 6 minutes left' }));
  const label = { drafted: 'A draft is ready', 'needs-reply': 'They wait on you', waiting: 'You wait on them', fyi: 'For your information' }[t.state];
  $('card').replaceChildren(
    el('div', { class: 'kind' }, el('span', { class: 'chip', text: label }), el('span', { class: `trust ${p.trust}`, text: TRUST[p.trust] })),
    el('h2', { text: t.subject }),
    el('div', { class: 'from' }, el('span', { class: 'avatar', 'aria-hidden': 'true', text: initials(p.name) }), el('div', {}, el('b', { text: p.name }), el('div', { class: 'small muted', text: `${p.org} · ${when(t.at)}` }))),
    el('pre', { class: 'mail body', text: t.body }),
    d ? el('div', { class: 'suggest' }, el('h3', { text: `Suggested reply, drafted and signed by ${d.agent}` }), el('pre', { class: 'mail', text: d.text })) : null);
  const btn = (k, text) => { const b = el('button', { class: 'btn', type: 'button' }, el('span', { text }), el('kbd', { text: k })); b.addEventListener('click', () => { i = (i + 1) % queue.length; render(); }); return b; };
  const first = d ? btn('a', d.blocked ? 'Fix the draft' : 'Approve reply') : btn('r', 'Reply');
  first.classList.add('primary');
  $('decide').replaceChildren(first, btn('l', 'Later'), btn('d', 'Delegate'), btn('e', 'Done'));
  $('upnext').replaceChildren(...queue.slice(i + 1, i + 4).map((u) => el('li', {}, el('span', { class: 'who ellipsis', text: person(u).name }), el('span', { class: 'ellipsis muted', text: u.subject }))));
};
document.addEventListener('keydown', (e) => { if ('aldre'.includes(e.key) && !e.ctrlKey && !e.metaKey) { i = (i + 1) % queue.length; render(); } });
render();
