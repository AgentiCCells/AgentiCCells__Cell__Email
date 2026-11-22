// The first real send (backlog: "Make the first real send possible end to end"), as far as made-up
// data can take it in a real browser: the page's own modules (src/app/send.js and
// src/app/cell/decide.mjs, with WebCrypto in Chromium) decide on made-up outbox entries, build the
// message, and "send" it to a stand-in for Gmail that records each request. Every request to any
// other host is aborted and counted, so the run proves no real call is made.
// What it does not run: pasting the sealed outbox key and opening the outbox vault (they need the
// vault service; a stand-in for it is the next step). SIMULATION. By email.workflows.d@AgentiCCells.dinis,
// 22 November 2026. Apache-2.0.
// Use: node scripts/build.mjs && node sim/workflows/first-send-browser.mjs [out.json]
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { createRequire } from 'node:module';
import { signPolicy } from '../../cell/policy/signed.mjs';
import { keys, agents, policy, pins } from '../../tests/helpers.mjs';
import { writeEntry } from './signed.mjs';
import * as F from './fixtures.mjs';

const root = new URL('../../', import.meta.url).pathname;
const site = join(root, '_site');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };

export async function runFirstSend() {
  if (!existsSync(join(site, 'app/send.js'))) throw new Error('run node scripts/build.mjs first');
  // Made-up entries: one to the owner, unsigned (the press path, ABP 1.1.4); one outreach, signed.
  const D = 'drafter.email@AgentiCCells.dinis', O = 'person:owner';
  const { signers, registry } = keys([D, O]);
  const pol = policy(), ag = agents();
  const signatures = { policy: signPolicy(pol, { name: 'email-policy.json', author: O }, signers[O]), agents: signPolicy(ag, { name: 'agents.json', author: O }, signers[O]) };
  const toSelf = { meta: { to: ['owner@example.org'], cc: [], subject: 'First send from the page (test)', status: 'draft' }, body: 'This is a made-up first send, to myself.\n', signed: null };
  const signedOut = writeEntry({ workflow: 'outreach', email: F.outreach(), author: D, signer: signers[D], chain: [], at: '2026-11-16T10:00:00Z', policy: pol, agents: ag, signatures });
  const toSelfSigned = writeEntry({ workflow: 'outreach', email: { ...F.outreach(), to: ['owner@example.org'] }, author: D, signer: signers[D], chain: [], at: '2026-11-16T10:00:00Z', policy: pol, agents: ag, signatures });
  const ctx = { registry, approvers: pins(registry), now: '2026-11-16T12:00:00Z' };

  const server = createServer((req, res) => {
    const p = join(site, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (!p.startsWith(site) || !existsSync(p) || statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': TYPES[extname(p)] || 'application/octet-stream' }); res.end(readFileSync(p));
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const { chromium } = createRequire(import.meta.url)('playwright');
  const browser = await chromium.launch();
  const out = { ran: new Date().toISOString(), browser: browser.version(), gmail: [], aborted: [], errors: [], steps: [] };
  try {
    const page = await browser.newPage();
    page.on('pageerror', (e) => out.errors.push(e.message));
    await page.route('**/*', (route) => {
      const u = route.request().url();
      if (u.startsWith(base)) return route.continue();
      if (u === 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send') {
        out.gmail.push({ auth: route.request().headers().authorization, body: route.request().postDataJSON() });
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'standin-1', threadId: 'standin-t1' }) });
      }
      out.aborted.push(u); return route.abort();
    });
    await page.goto(base + '/version.html');
    const result = await page.evaluate(async ({ entries, ctx }) => {
      const S = await import('/app/send.js');
      const C = await import('/app/cell/decide.mjs');
      const steps = [];
      for (const [name, e] of Object.entries(entries)) {
        const m = S.messageOf(e.meta, e.body);
        const page = S.problems(m, { sentToday: 0 });
        const c4 = await C.decideEntry(m, e.signed, { ...ctx, twin: C.emptyTwin('owner@example.org') });
        const sendable = !page.length && c4.verdict === 'press';
        let sent = null;
        if (sendable) {
          const r = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', { method: 'POST', headers: { Authorization: 'Bearer made-up-token', 'Content-Type': 'application/json' }, body: JSON.stringify({ raw: S.rawMessage(m) }) });
          sent = r.ok ? (await r.json()).id : `error ${r.status}`;
        }
        steps.push({ name, to: m.to, page, c4: { ran: c4.ran, verdict: c4.verdict, reasons: c4.reasons }, sendable, sent });
      }
      return steps;
    }, { entries: { 'to self, unsigned': toSelf, 'outreach, signed': { meta: signedOut.meta, body: signedOut.body, signed: signedOut.signed }, 'to self, signed': { meta: toSelfSigned.meta, body: toSelfSigned.body, signed: toSelfSigned.signed } }, ctx });
    out.steps = result;
    // Decode what the stand-in received, to show it is exactly the entry.
    out.gmail = out.gmail.map((g) => {
      const raw = Buffer.from(g.body.raw.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
      const [head, b64] = raw.split('\r\n\r\n');
      return { auth: g.auth === 'Bearer made-up-token' ? 'the made-up token' : 'UNEXPECTED', headers: head.split('\r\n'), text: Buffer.from(b64.replace(/\r\n/g, ''), 'base64').toString('utf8') };
    });
  } finally { await browser.close(); server.close(); }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = await runFirstSend();
  if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(out, null, 2) + '\n');
  console.log(JSON.stringify(out, null, 2));
}
