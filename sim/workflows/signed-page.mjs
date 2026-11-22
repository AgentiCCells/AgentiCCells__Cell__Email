// Rung 1 of the trust ladder in the browser: outbox entries that carry signed.json, opened in the
// gateway page against stand-ins for the vault service and Gmail. MADE-UP data, keys made fresh
// for each run, nothing committed. SIMULATION. By email.workflows.d@AgentiCCells.dinis,
// 22 November 2026. Apache-2.0.
//
// Two runs on the same three entries (a signed outreach; the same with a changed To; an unsigned one):
//   "as built"  the page exactly as built: no lane keys and no approvers pinned, so it must refuse
//               every signed entry (fail closed) and keep the press path for the unsigned one.
//   "pinned"    a TEST COPY of connect.js, served only to this browser, with the two empty lists
//               (LANE_KEYS, PINNED_APPROVERS) filled with this run's made-up keys. It shows what
//               pinning (backlog 5, W4, W5) would change; it is not the page as built.
// Use: node scripts/build.mjs && node sim/workflows/signed-page.mjs [out-folder]
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, existsSync, statSync, mkdirSync } from 'node:fs';
import { join, extname } from 'node:path';
import { createRequire } from 'node:module';
import { signPolicy } from '../../cell/policy/signed.mjs';
import { keys, agents, policy, pins } from '../../tests/helpers.mjs';
import { writeEntry } from './signed.mjs';
import { vaultStandIn } from './first-send-page.mjs';
import * as F from './fixtures.mjs';

const root = new URL('../../', import.meta.url).pathname;
const site = join(root, '_site');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };

function entries() {
  const D = 'drafter.email@AgentiCCells.dinis', O = 'person:owner';
  const { signers, registry } = keys([D, O]);
  const pol = policy(), ag = agents();
  const signatures = { policy: signPolicy(pol, { name: 'email-policy.json', author: O }, signers[O]), agents: signPolicy(ag, { name: 'agents.json', author: O }, signers[O]) };
  const a = writeEntry({ workflow: 'outreach', email: F.outreach(), author: D, signer: signers[D], chain: [], at: '2026-11-22T08:00:00Z', policy: pol, agents: ag, signatures });
  const b = structuredClone(a); b.meta.to = ['jo@example.net'];
  const files = [
    ['a-signed', a.meta, a.body, a.signed],
    ['b-signed-changed-to', b.meta, b.body, b.signed],
    ['c-unsigned', { to: ['owner@example.org'], cc: [], subject: 'An unsigned entry (test)', status: 'draft' }, 'Made up, unsigned.\n', null],
  ].flatMap(([f, meta, body, signed]) => [
    { folder: `/outbox/${f}`, name: 'meta.json', data: JSON.stringify(meta, null, 2) + '\n' },
    { folder: `/outbox/${f}`, name: 'body.txt', data: body },
    ...(signed ? [{ folder: `/outbox/${f}`, name: 'signed.json', data: JSON.stringify(signed) + '\n' }] : []),
  ]);
  return { files, registry, approvers: pins(registry) };
}

async function runOnce(browser, base, label, inject, data) {
  const vault = vaultStandIn();
  const out = { run: label, entries: [], gmail: [], aborted: [], errors: [] };
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 1400 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => out.errors.push(e.message));
  page.on('dialog', (d) => d.accept());
  await ctx.route('**/*', async (route) => {
    const u = route.request().url();
    if (inject && u.startsWith(base + '/app/connect.js')) {
      const src = readFileSync(join(site, 'app/connect.js'), 'utf8')
        .replace('const LANE_KEYS = Object.freeze({});', `const LANE_KEYS = Object.freeze(${JSON.stringify(data.registry)}); // TEST COPY`)
        .replace('const PINNED_APPROVERS = Object.freeze({});', `const PINNED_APPROVERS = Object.freeze(${JSON.stringify(data.approvers)}); // TEST COPY`);
      if (!src.includes('// TEST COPY')) throw new Error('the pin lists were not found in connect.js');
      return route.fulfill({ status: 200, contentType: 'text/javascript', body: src });
    }
    if (u.startsWith(base)) return route.continue();
    if (u.startsWith('https://dev.send.sgraph.ai/')) return vault.handle(route);
    if (u.startsWith('https://gmail.googleapis.com/gmail/v1/users/me/')) {
      const path = u.slice('https://gmail.googleapis.com/gmail/v1/users/me/'.length);
      out.gmail.push(`${route.request().method()} ${path}`);
      const body = path === 'profile' ? { emailAddress: 'owner@example.org', messagesTotal: 12, threadsTotal: 8 } : path === 'labels' ? { labels: [] } : { id: 'standin-1', threadId: 'standin-t1' };
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    }
    out.aborted.push(u); return route.abort();
  });
  await page.goto(base + '/app/connect.html');
  await page.waitForFunction(() => typeof SGVault !== 'undefined');
  await page.evaluate(async (files) => {
    const V = await import('/app/vault.js'); const P = await import('/app/pki.js');
    const v = await V.createTwinVault('made-up-sgsend-token');
    await V.writeMany(v, files); await V.publish(v);
    const id = await P.identity();
    await P.keep(id, 'vault:co57gzld', V.displayKey(v));
    await P.keep(id, 'sgsend:token', 'made-up-sgsend-token');
    await P.keep(id, 'google:token', JSON.stringify({ token: 'made-up-google-token', can_send: true, expires_at: Date.now() + 3600e3 }));
  }, data.files);
  await page.reload();
  await page.waitForFunction(() => /Connected as/.test(document.getElementById('who')?.textContent || ''));
  await page.click('#open-vault');
  await page.waitForFunction(() => /Outbox open/.test(document.getElementById('vault-status')?.textContent || ''), null, { timeout: 30000 });
  const items = page.locator('#outbox-list > li');
  for (let i = 0; i < await items.count(); i++) {
    const li = items.nth(i);
    await li.getByRole('button', { name: 'Open', exact: true }).click();
    await li.locator('[role=status]').waitFor();
    const c4 = (await li.locator('p.muted', { hasText: 'Full check' }).textContent()).trim();
    const status = (await li.locator('[role=status]').textContent()).trim();
    const enabled = await li.getByRole('button', { name: 'Approve and send' }).isEnabled();
    out.entries.push({ entry: ['a-signed', 'b-signed-changed-to', 'c-unsigned'][i], c4, status, approve_enabled: enabled });
  }
  // In the pinned run, press Approve and send on the signed entry that passed.
  if (inject && out.entries[0]?.approve_enabled) {
    const li = items.nth(0);
    await li.getByRole('button', { name: 'Approve and send' }).click();
    await page.waitForFunction(() => /recorded in the outbox|Not sent|could not record/.test(document.querySelector('#outbox-list > li [role=status]')?.textContent || ''), null, { timeout: 30000 });
    out.sent_signed = (await li.locator('[role=status]').textContent()).trim();
  }
  if (data.outDir) await page.screenshot({ path: join(data.outDir, `signed-page-${label}.png`), fullPage: true });
  await ctx.close();
  out.vault_requests = vault.log.length;
  return out;
}

export async function runSignedPage(outDir) {
  if (!existsSync(join(site, 'app/connect.html'))) throw new Error('run node scripts/build.mjs first');
  if (outDir) mkdirSync(outDir, { recursive: true });
  const server = createServer((req, res) => {
    const p = join(site, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (!p.startsWith(site) || !existsSync(p) || statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': TYPES[extname(p)] || 'application/octet-stream' }); res.end(readFileSync(p));
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const { chromium } = createRequire(import.meta.url)('playwright');
  const browser = await chromium.launch();
  const data = { ...entries(), outDir };
  try {
    return { ran: new Date().toISOString(), browser: browser.version(), runs: [await runOnce(browser, base, 'as-built', false, data), await runOnce(browser, base, 'pinned', true, data)] };
  } finally { await browser.close(); server.close(); }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = await runSignedPage(process.argv[2]);
  if (process.argv[2]) writeFileSync(join(process.argv[2], 'signed-page.json'), JSON.stringify(out, null, 2) + '\n');
  console.log(JSON.stringify(out, null, 2));
}
