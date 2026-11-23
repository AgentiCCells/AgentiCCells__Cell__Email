// The CRM tool site's page: lead board, company, follow-ups and contacts, over a vault read in the
// browser. Demo mode loads the synthetic twin bundle (demo/twin.json); nothing leaves the page.
// By crm.dev.a@AgentiCCells.dinis, 2026-11-23. Apache-2.0.
import { readVault, leadBoard, followUps, company, contacts, FOLLOW_UP_DAYS } from './crm.mjs';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const day = (iso) => (iso ? iso.slice(0, 10) : '–');
let V = null, NOW = 0;
// The Email Cell's send screen, where a draft is reviewed and sent. In demo mode it opens the same
// synthetic contact (person id) in its own demo. Parameters agreed with mail.dev.a@AgentiCCells.dinis:
// ?demo&contact=<person-id>. The send screen is not live yet, so the link may be dead until it lands.
const SEND_URL = 'https://email-cell.agenticcells.site/app/send.html';
const sendLink = (person) => `${SEND_URL}?demo&contact=${encodeURIComponent(person)}`;

async function loadDemo() {
  const b = await (await fetch('demo/twin.json')).json();
  if (!b.synthetic) throw new Error('the demo bundle is not marked synthetic');
  V = readVault(b.files);
  // The demo's clock is the twin's, so "5 days" means the same on every visit.
  NOW = Date.parse(V.manifest.generated_at);
  $('#mode').textContent = 'Demo mode';
  $('#banner').hidden = false;
}

const stageName = (id) => V.stages.find((s) => s.id === id)?.name || id;
const orgName = (id) => V.orgs.find((o) => o.id === id)?.name || id;
function draftBadge(d, orgId) {
  const label = { draft: 'Draft waiting', sent: 'Sent', none: 'No draft' }[d.state];
  const first = d.state === 'draft' && V.drafts.find((x) => x.status === 'draft' && (x.org ?? V.people.find((p) => p.id === x.person)?.org) === orgId);
  return first ? `<a class="badge d-draft" href="${esc(sendLink(first.person))}" title="Open the draft in the send screen (demo)">${label} →</a>` : `<span class="badge d-${d.state}">${label}</span>`;
}

function board() {
  const rows = leadBoard(V, NOW);
  const owners = [...new Set(rows.map((r) => r.owner).filter(Boolean))].sort();
  const q = new URLSearchParams(location.hash.split('?')[1] || '');
  const owner = q.get('owner') || '';
  const shown = rows.filter((r) => !owner || r.owner === owner);
  return `<h1>Lead board</h1>
  <p class="filters">Owner: <a href="#/board" class="${owner ? '' : 'on'}">all</a> ${owners.map((o) => `<a href="#/board?owner=${esc(o)}" class="${o === owner ? 'on' : ''}">${esc(o)}</a>`).join(' ')}</p>
  <div class="scroll"><table class="grid">
  <thead><tr><th>Company</th><th>Stage</th><th>Owner</th><th>Draft</th><th>Last contact</th><th>Next step</th></tr></thead>
  <tbody>${shown.map((r) => `<tr>
    <td><a href="#/company/${esc(r.org)}">${esc(r.name)}</a><div class="muted small">${esc(r.kind)} · ${r.people} people · ${r.threads} threads</div></td>
    <td><span class="stage s-${esc(r.stage)}">${esc(stageName(r.stage))}</span></td>
    <td>${esc(r.owner || '–')}</td>
    <td>${draftBadge(r.draft, r.org)}</td>
    <td>${day(r.last_contact?.date)} <span class="muted small">${r.last_contact ? (r.last_contact.direction === 'outbound' ? 'we wrote' : 'they wrote') : ''}</span>${r.waiting ? `<div class="warn small">${r.waiting.count === 1 ? '1 thread' : r.waiting.count + ' threads'} with no reply, oldest ${r.waiting.days} days</div>` : ''}</td>
    <td>${esc(r.next_step || '–')}<div class="small ${r.overdue ? 'warn' : 'muted'}">${r.next_step_due ? (r.overdue ? 'overdue, ' : 'due ') + r.next_step_due : ''}</div></td>
  </tr>`).join('')}</tbody></table></div>`;
}

function companyPage(id) {
  const c = company(V, id, NOW);
  if (!c) return `<p>No such company. <a href="#/board">Back to the board</a></p>`;
  const who = (pid) => V.people.find((p) => p.id === pid)?.name || '';
  return `<p><a href="#/board">← Lead board</a></p>
  <h1>${esc(c.name)}</h1>
  <p class="muted">${esc(c.domain)} · ${esc(c.kind)}</p>
  <dl class="facts">
    <dt>Stage</dt><dd><span class="stage s-${esc(c.stage)}">${esc(stageName(c.stage))}</span></dd>
    <dt>Owner</dt><dd>${esc(c.owner || '–')}</dd>
    <dt>Next step</dt><dd>${esc(c.next_step || '–')} ${c.next_step_due ? `<span class="${c.overdue ? 'warn' : 'muted'}">(${c.overdue ? 'overdue, ' : 'due '}${c.next_step_due})</span>` : ''}</dd>
    <dt>Draft</dt><dd>${draftBadge(c.draft, c.org)}</dd>
  </dl>
  <h2>People</h2>
  <ul class="list">${c.contacts.map((p) => `<li>${esc(p.name)} <span class="muted">${esc(p.role || '')} · ${esc((p.emails || [])[0] || '')}</span></li>`).join('') || '<li class="muted">None yet</li>'}</ul>
  <h2>Mail threads</h2>
  <ul class="list">${c.threads.map((t) => `<li id="t-${esc(t.id)}"><strong>${esc(t.subject)}</strong> <span class="muted">${day(t.last_date)} · ${t.direction === 'outbound' ? 'we wrote last' : 'they wrote last'} · ${esc(who(t.person))} · ${t.linked ? 'linked' : 'matched by address'}</span></li>`).join('') || '<li class="muted">None</li>'}</ul>
  <h2>Drafts</h2>
  <ul class="list">${c.drafts.map((d) => `<li><strong>${esc(d.subject)}</strong> <span class="muted">to ${esc((d.to || []).join(', '))} · ${esc(d.status)}</span>${d.status === 'draft' ? ` <a href="${esc(sendLink(d.person))}">Review and send (demo) →</a>` : ''}</li>`).join('') || '<li class="muted">None</li>'}</ul>`;
}

function followUpsPage() {
  const list = followUps(V, NOW);
  return `<h1>Follow-ups</h1><p class="muted">Threads where we wrote last and there has been no reply in ${FOLLOW_UP_DAYS} days or more.</p>
  <div class="scroll"><table class="grid"><thead><tr><th>Days</th><th>Company</th><th>Person</th><th>Thread</th><th>Sent</th></tr></thead>
  <tbody>${list.map((f) => `<tr><td class="num">${f.days}</td><td>${f.org ? `<a href="#/company/${esc(f.org)}">${esc(orgName(f.org))}</a>` : '–'}</td><td>${esc(V.people.find((p) => p.id === f.person)?.name || '–')}</td><td>${esc(f.subject)}</td><td>${day(f.sent)}</td></tr>`).join('')}</tbody></table></div>`;
}

function contactsPage() {
  return `<h1>Contacts</h1><div class="scroll"><table class="grid"><thead><tr><th>Name</th><th>Company</th><th>Role</th><th>Email</th><th>Threads</th><th>Last contact</th></tr></thead>
  <tbody>${contacts(V).map((p) => `<tr><td>${esc(p.name)}</td><td><a href="#/company/${esc(p.org)}">${esc(p.org_name)}</a></td><td>${esc(p.role || '')}</td><td>${esc(p.email)}</td><td class="num">${p.threads}</td><td>${day(p.last_contact)}</td></tr>`).join('')}</tbody></table></div>`;
}

function route() {
  const [path] = (location.hash.slice(1) || '/board').split('?');
  const [, page, id] = path.split('/');
  $('#main').innerHTML = page === 'company' ? companyPage(id) : page === 'follow-ups' ? followUpsPage() : page === 'contacts' ? contactsPage() : board();
  for (const a of document.querySelectorAll('nav a')) a.classList.toggle('on', a.getAttribute('href') === `#/${page || 'board'}`);
}

loadDemo().then(() => { addEventListener('hashchange', route); route(); }).catch((e) => { $('#main').innerHTML = `<p class="warn">Could not load the demo: ${esc(e.message)}</p>`; });
