// Concept 3: People. The inbox is a list of people, grouped by organisation, each showing who owes the
// next reply. Opening a person shows every conversation with them, what is open, and the next step.
// MADE-UP mail; nothing is sent. By email.design.d@AgentiCCells.dinis, 22 November 2026. Apache-2.0.
import { threads, people, when, ago, initials, el, TRUST } from './data.js';
const humans = Object.entries(people).filter(([k, p]) => !p.kind && k !== 'me');
const of = (k) => threads.filter((t) => t.from === k);
const owe = (k) => { const ts = of(k); const mine = ts.find((t) => t.state === 'needs-reply' || t.state === 'drafted'); const theirs = ts.find((t) => t.state === 'waiting'); return mine ? ['me', `You owe · ${ago(mine.at)}`] : theirs ? ['them', `They owe · ${ago(theirs.at)}`] : null; };
let current = 'ana';
const $ = (id) => document.getElementById(id);
const render = () => {
  const groups = {};
  for (const [k, p] of humans) (groups[p.org] ||= []).push([k, p]);
  $('orgs').replaceChildren(...Object.entries(groups).sort((a, b) => b[1].length - a[1].length).map(([org, ps]) => el('section', { class: 'org' }, el('h2', { text: org }),
    ...ps.map(([k, p]) => { const o = owe(k); const b = el('button', { class: 'who', type: 'button', 'aria-current': String(k === current) }, el('span', { class: 'avatar', 'aria-hidden': 'true', text: initials(p.name) }), el('b', { class: 'ellipsis' }, p.name, p.trust === 'new' ? el('span', { class: 'trust new', text: ' First contact' }) : null), o ? el('span', { class: `owe ${o[0]}`, text: o[1] }) : el('span'), el('span', { class: 'xs muted ellipsis', text: of(k)[0]?.subject || '' }));
      b.addEventListener('click', () => { current = k; render(); document.body.classList.add('open'); }); return b; }))));
  const p = people[current], ts = of(current), open = ts.filter((t) => t.state !== 'fyi' && t.state !== 'done');
  const back = el('button', { class: 'btn back', type: 'button', text: 'Back' }); back.addEventListener('click', () => document.body.classList.remove('open'));
  const nextT = ts.find((t) => t.state === 'drafted') || ts.find((t) => t.state === 'needs-reply');
  $('profile').replaceChildren(
    el('div', { class: 'profile-head' }, back, el('span', { class: 'avatar', 'aria-hidden': 'true', text: initials(p.name) }), el('div', {}, el('h2', { text: p.name }), el('div', { class: 'small muted', text: `${p.role ? p.role + ', ' : ''}${p.org} · ${p.addr}` })), el('span', { class: `trust ${p.trust}`, text: TRUST[p.trust] })),
    el('div', { class: 'facts' }, [['Open conversations', open.length], ['Last from them', when(ts[0].at)], ['Usual reply time', '4 hours'], ['Known since', 'Sep 2026']].map(([k, v]) => el('div', { class: 'fact' }, el('b', { text: String(v) }), el('span', { class: 'xs muted', text: k })))),
    nextT ? el('div', { class: 'next' }, el('p', {}, el('b', { text: 'Next step: ' }), nextT.draft ? `${nextT.draft.agent} drafted a reply to “${nextT.subject}”.` : `reply to “${nextT.subject}”.`), el('button', { class: 'btn primary', type: 'button', text: nextT.draft ? 'Review the draft' : 'Reply' })) : null,
    el('ol', { class: 'timeline', 'aria-label': 'Conversations' }, ts.map((t) => el('li', { class: t.state === 'needs-reply' || t.state === 'drafted' ? 'open' : '' }, el('div', { class: 't', text: t.subject }), el('div', { class: 'small muted', text: `${when(t.at)} · ${t.mine ? 'you wrote' : p.name.split(' ')[0] + ' wrote'}: ${t.snippet.replace(/^You: /, '')}` })))));
};
render();
if (location.hash === '#open') document.body.classList.add('open');
