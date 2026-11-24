// The signed batch page (/app/batch.html), demo only. A test key made in this page (private half not
// extractable, gone when the tab closes) signs synthetic emails from the demo mailbox; the page verifies
// each, shows why any is refused, and sends the good ones to FakeGmail on one confirmation, stopping at
// the first error. Real sending waits on Dinis's yes to ABP line C9.
// By mail.dev.a@AgentiCCells.dinis, 2026-11-24. Apache-2.0.
import { planBatch, signEntry, fingerprint, rawWithAttachments, attachmentProblems } from './batch.js?v=__VERSION__';
import { messageOf, MAX_PER_DAY } from './send.js?v=__VERSION__';
import { demoMailbox, FakeGmail } from './demo/mailbox.js?v=__VERSION__';

const $ = (id) => document.getElementById(id);
const el = (tag, props = {}, ...kids) => { const e = Object.assign(document.createElement(tag), props); e.append(...kids); return e; };
const subtle = crypto.subtle;
const KEY = { name: 'ECDSA', namedCurve: 'P-256' };

// Made-up attachments: a few bytes that start like a PDF and a PNG; enough for the checks and the MIME.
const DEMO_PDF = { filename: 'one-pager-demo.pdf', mime: 'application/pdf', bytes: new TextEncoder().encode('%PDF-1.4\n% synthetic demo file, not a real document\n%%EOF\n') };
const DEMO_PNG = { filename: 'screenshot-demo.png', mime: 'image/png', bytes: new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]) };

let box, gmail, pinned, entries, sentToday = 0;

async function newKey() {
  const k = await subtle.generateKey(KEY, false, ['sign', 'verify']);
  const spki = new Uint8Array(await subtle.exportKey('spki', k.publicKey));
  return { k, spki, fp: await fingerprint(spki) };
}

async function build() {
  box = demoMailbox(); gmail = new FakeGmail({ me: box.me }); sentToday = 0;
  const mine = await newKey(), stranger = await newKey();
  pinned = [{ fingerprint: mine.fp, spki: mine.spki, name: 'Demo signer (test key)' }];
  const drafts = box.drafts.filter((d) => d.status === 'draft').slice(0, 6);
  entries = [];
  for (const [i, d] of drafts.entries()) {
    const meta = { to: d.to, subject: d.subject, status: 'draft', person: d.contact, org: d.org, in_reply_to: d.in_reply_to, thread_id: d.thread_id };
    const attachments = i === 0 ? [DEMO_PDF] : i === 1 ? [DEMO_PNG] : [];
    const e = { id: `entry-${i + 1}`, meta, text: d.text, attachments };
    const m = messageOf(meta, d.text);
    // Six cases: four signed by the pinned key, one unsigned, one signed by a key not pinned here;
    // and one of the good ones is changed after signing, to show it is refused.
    if (i === 3) { entries.push(e); continue; }
    e.signoff = await signEntry((i === 4 ? stranger : mine).k.privateKey, (i === 4 ? stranger : mine).spki, m, attachments);
    if (i === 5) e.text += '\nP.S. added after signing.';
    entries.push(e);
  }
  $('pinned').textContent = `${pinned[0].name}: ${pinned[0].fingerprint}`;
  $('max').textContent = String(MAX_PER_DAY);
  $('sent').replaceChildren(); $('status').textContent = '';
  await show();
}

let plan;
async function show() {
  plan = await planBatch(entries, { pinned, sentToday });
  $('rows').replaceChildren(...plan.rows.map((r, i) => {
    const e = entries[i];
    const files = (e.attachments || []).map((a) => `${a.filename} (${a.bytes.length} bytes)`).join(', ');
    return el('li', { className: r.send ? 'ok' : e.done ? 'done' : 'no' },
      el('strong', { textContent: r.send ? 'Will send' : (e.done ? 'Sent' : 'Not sent') }), ' ',
      el('span', { textContent: `to ${r.m.to.join(', ')}: ${r.m.subject}` }),
      ...(files ? [el('div', { className: 'muted small', textContent: `Attached: ${files}` })] : []),
      el('div', { className: 'muted small', textContent: r.send ? `Signed by ${r.signer}; the signature matches this exact email.` : (e.done ? 'Already sent in this demo.' : r.why.join('; ') + '.') }));
  }));
  $('today').textContent = String(sentToday);
  $('send').disabled = plan.toSend === 0;
  $('send').textContent = plan.toSend ? `Send batch (${plan.toSend})` : 'Send batch';
}

async function sendBatch() {
  const go = plan.rows.map((r, i) => [r, entries[i]]).filter(([r]) => r.send);
  if (!go.length) return;
  if (!confirm(`SIMULATION (demo mode, nothing leaves this page): send ${go.length} signed emails from ${box.me.address} now? Each was checked against the pinned key.`)) { $('status').textContent = 'Not sent.'; return; }
  $('send').disabled = true;
  let n = 0;
  for (const [r, e] of go) {
    if (attachmentProblems(e.attachments).length) break;
    try {
      const res = await gmail.send(rawWithAttachments(r.m, e.attachments));
      n++; sentToday++; e.done = true; e.meta.status = 'sent';
      $('sent').prepend(el('li', {}, el('span', { className: 'tag', textContent: 'simulation' }), ` to ${r.m.to.join(', ')}: ${r.m.subject} (${res.id})`));
    } catch (err) { $('status').textContent = `Stopped at "${r.m.subject}": ${err.message}. ${n} sent before it.`; await show(); return; }
  }
  $('status').textContent = `Simulation: ${n} "sent" to the demo mailbox. Nothing left this page.`;
  await show();
}

$('send').addEventListener('click', sendBatch);
$('reset').addEventListener('click', () => build().catch((e) => { $('status').textContent = `Could not start: ${e.message}.`; }));
build().catch((e) => { $('status').textContent = `Could not start: ${e.message}.`; });
