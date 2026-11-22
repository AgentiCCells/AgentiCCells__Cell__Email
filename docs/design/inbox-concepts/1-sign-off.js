// Concept 1: Sign-off. The agents' drafts come first: each one beside the message it answers, with the
// checks the page would run, and one press to approve and send. MADE-UP mail; nothing is sent.
// By email.design.d@AgentiCCells.dinis, 22 November 2026. Apache-2.0.
import { threads, person, when, initials, el, TRUST } from './data.js';
const drafts = threads.filter((t) => t.state === 'drafted');
const replies = threads.filter((t) => t.state === 'needs-reply');
let current = drafts[0];
const $ = (id) => document.getElementById(id);
$('meter').innerHTML = '';
$('meter').append('Sent today ', el('b', { text: '3 of 20' }), ' · ', el('b', { text: String(drafts.length) }), ' drafts to sign off');
$('n-drafts').textContent = drafts.length; $('n-reply').textContent = replies.length;
const item = (t) => {
  const p = person(t);
  const b = el('button', { class: 'qitem', type: 'button' }, el('span', { class: 'avatar', 'aria-hidden': 'true', text: initials(p.name) }),
    el('span', { class: 'who ellipsis', text: p.name }), el('span', { class: 'xs muted', text: when(t.at) }),
    el('span', { class: 'sub ellipsis', text: t.draft?.blocked ? '' : t.subject }, t.draft?.blocked ? el('span', { class: 'flag', text: 'Check failed · ' }) : null, t.draft?.blocked ? t.subject : null));
  b.addEventListener('click', () => { current = t; render(); document.body.classList.add('open'); });
  return el('li', {}, b);
};
const render = () => {
  for (const [id, list] of [['drafts', drafts], ['replies', replies]]) { $(id).replaceChildren(...list.map(item)); }
  document.querySelectorAll('.qitem').forEach((b, i) => b.setAttribute('aria-current', String([...drafts, ...replies][i] === current)));
  const t = current, p = person(t), d = t.draft;
  const back = el('button', { class: 'btn back', type: 'button', text: 'Back' }); back.addEventListener('click', () => document.body.classList.remove('open'));
  const head = el('div', { class: 'desk-head' }, back, el('h2', { text: t.subject }),
    el('span', { class: 'small' }, el('b', { text: p.name }), ' ', el('span', { class: 'muted', text: `<${p.addr}> · ${p.org}` })),
    el('span', { class: `trust ${p.trust}`, text: TRUST[p.trust] }));
  const theirs = el('div', { class: 'pane' }, el('h2', { text: `${p.name.split(' ')[0]} wrote · ${when(t.at)}` }), el('div', { class: 'theirs' }, el('pre', { class: 'mail', text: t.body })));
  const ta = el('textarea', { 'aria-label': 'Draft reply' }); ta.value = d ? d.text : '';
  const draft = el('div', { class: 'pane draft' },
    el('h2', {}, d ? `Draft by ${d.agent}` : 'Your reply', d?.signed ? el('span', { class: 'trust signed', text: 'Signed by the agent' }) : null), ta,
    d ? el('div', { class: 'checks', role: 'list', 'aria-label': 'Checks before sending' }, d.checks.map(([k, ok]) => el('div', { class: 'check', role: 'listitem' }, el('span', { class: ok ? 'ok' : 'no', text: ok ? '✓' : '✗', 'aria-hidden': 'true' }), el('span', { class: 'sr-only', text: ok ? 'Passed: ' : 'Failed: ' }), k))) : null,
    d?.blocked ? el('p', { class: 'blocked', text: d.blocked }) : null);
  const ok = d && !d.blocked;
  const actions = el('div', { class: 'actions' },
    el('button', { class: 'btn primary', type: 'button', disabled: !ok && !!d, text: d ? 'Approve and send' : 'Send' }),
    el('button', { class: 'btn', type: 'button', text: d ? 'Send back to the agent' : 'Ask an agent to draft' }),
    el('button', { class: 'btn', type: 'button', text: 'Later' }),
    el('span', { class: 'hint xs muted' }, el('kbd', { text: 'Ctrl' }), ' ', el('kbd', { text: 'Enter' }), ' approve · ', el('kbd', { text: 'j' }), ' next'));
  $('desk').replaceChildren(head, el('div', { class: 'pair' }, theirs, draft), actions);
};
render();
if (location.hash === '#open') document.body.classList.add('open');
