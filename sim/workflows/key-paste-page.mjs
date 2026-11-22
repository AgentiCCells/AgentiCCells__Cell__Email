// First-send step 2, the key paste, end to end in the gateway page with MADE-UP keys: a test
// sender (made in its own browser context with pki.sgit.ai's vendored keys.js, standing in for
// conductor@PrompTugal.dinis) makes a made-up outbox in the vault stand-in, seals its key and a
// made-up SG/Send token to the page's public key (an m1 code), and the code is pasted into the
// page. Then Open vault (the page does it by itself after a paste), Open, Approve and send.
//
// The test sender is trusted ONLY in a test copy of trusted.js served to this browser, and the test
// copy of connect.js names the made-up outbox's id where the page names the real one (co57gzld); both are
// never written to src/app/, team/keys or the deployed site. Keys are made fresh in each
// run and never leave it. SIMULATION. By email.workflows.d@AgentiCCells.dinis, 22 November 2026.
// Apache-2.0.
//
// Three pastes, each into a fresh page (its own key pair):
//   trusted   signed by the test sender, which the test copy of trusted.js lists
//   unknown   signed by another made-up sender the page does not know
//   misaddressed  signed by the test sender but sealed to another page's key
// Use: node scripts/build.mjs && node sim/workflows/key-paste-page.mjs [out-folder]
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, existsSync, statSync, mkdirSync } from 'node:fs';
import { join, extname } from 'node:path';
import { createRequire } from 'node:module';
import { vaultStandIn } from './first-send-page.mjs';

const root = new URL('../../', import.meta.url).pathname;
const site = join(root, '_site');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };
const PKI = '/app/vendor/pki/v0.2.28/';

export async function runKeyPaste(outDir) {
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
  const vault = vaultStandIn();
  const out = { ran: new Date().toISOString(), browser: browser.version(), cases: [], aborted: [], errors: [] };
  let trustedBundle = null, outboxId = null;
  const wire = async (ctx, gmail) => {
    await ctx.route('**/*', async (route) => {
      const u = route.request().url();
      if (trustedBundle && u.startsWith(base + '/app/trusted.js')) {
        const body = `// TEST COPY served only to this browser by sim/workflows/key-paste-page.mjs: a made-up test sender.\nexport const TRUSTED = ${JSON.stringify([{ label: 'test sender (made up)', bundle: trustedBundle }])};\n`;
        return route.fulfill({ status: 200, contentType: 'text/javascript', body });
      }
      if (outboxId && u.startsWith(base + '/app/connect.js')) {
        const src = readFileSync(join(site, 'app/connect.js'), 'utf8').replace("const OUTBOX_VAULT = 'co57gzld';", `const OUTBOX_VAULT = '${outboxId}'; // TEST COPY: the made-up outbox`);
        if (!src.includes('TEST COPY')) throw new Error('OUTBOX_VAULT not found in connect.js');
        return route.fulfill({ status: 200, contentType: 'text/javascript', body: src });
      }
      if (u.startsWith(base)) return route.continue();
      if (u.startsWith('https://dev.send.sgraph.ai/')) return vault.handle(route);
      if (u.startsWith('https://gmail.googleapis.com/gmail/v1/users/me/')) {
        const path = u.slice('https://gmail.googleapis.com/gmail/v1/users/me/'.length);
        gmail?.push(`${route.request().method()} ${path}`);
        const body = path === 'profile' ? { emailAddress: 'owner@example.org', messagesTotal: 12, threadsTotal: 8 } : path === 'labels' ? { labels: [] } : { id: 'standin-1', threadId: 'standin-t1' };
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
      }
      out.aborted.push(u); return route.abort();
    });
  };
  try {
    // The senders, each in its own context: make keys; the trusted one also makes the outbox.
    const senderCtx = await browser.newContext(); await wire(senderCtx);
    const sender = await senderCtx.newPage(); sender.on('pageerror', (e) => out.errors.push('sender: ' + e.message));
    await sender.goto(base + '/app/connect.html');
    await sender.waitForFunction(() => typeof SGVault !== 'undefined');
    const made = await sender.evaluate(async (PKI) => {
      const K = await import(PKI + 'keys.js'); const V = await import('/app/vault.js');
      window.__trusted = await K.generate('test sender (made up)');
      window.__unknown = await K.generate('unknown sender (made up)');
      window.__other = await K.generate('another page (made up)');
      const v = await V.createTwinVault('made-up-sgsend-token');
      await V.writeMany(v, [
        { folder: '/outbox/2026-11-22-first-send', name: 'meta.json', data: JSON.stringify({ to: ['owner@example.org'], cc: [], subject: 'First send from the page (test)', status: 'draft', workflow: 'first-send' }, null, 2) + '\n' },
        { folder: '/outbox/2026-11-22-first-send', name: 'body.txt', data: 'This is a made-up first send, to myself.\n' },
      ]);
      await V.publish(v);
      window.__vaultKey = V.displayKey(v);
      return { trusted: window.__trusted.bundle, vaultId: v.vaultId };
    }, PKI);
    trustedBundle = made.trusted; outboxId = made.vaultId;
    const seal = (toBundle, who) => sender.evaluate(async ({ PKI, toBundle, who }) => {
      const M = await import(PKI + 'message.js');
      const from = window['__' + who];
      const msg = await M.compose({ to: toBundle, from, subject: 'The outbox key (test)', text: 'The outbox vault key: ' + window.__vaultKey, grant: { token: 'made-up-sgsend-token' } });
      return (await M.sealMessage(msg, toBundle, from)).code;
    }, { PKI, toBundle, who });
    const otherBundle = await sender.evaluate(() => window.__other.bundle);

    for (const kind of ['trusted', 'unknown', 'misaddressed']) {
      const gmail = [];
      const ctx = await browser.newContext({ viewport: { width: 1100, height: 1200 } }); await wire(ctx, gmail);
      const page = await ctx.newPage();
      page.on('pageerror', (e) => out.errors.push(`${kind}: ${e.message}`));
      page.on('dialog', (d) => d.accept());
      await page.goto(base + '/app/connect.html');
      // The page's Google token only (Connect, done before); no vault key, no SG/Send token.
      const pageBundle = await page.evaluate(async () => {
        const P = await import('/app/pki.js'); const id = await P.identity();
        await P.keep(id, 'google:token', JSON.stringify({ token: 'made-up-google-token', can_send: true, expires_at: Date.now() + 3600e3 }));
        return id.bundle;
      });
      await page.reload();
      await page.waitForFunction(() => /Connected as/.test(document.getElementById('who')?.textContent || ''));
      const code = await seal(kind === 'misaddressed' ? otherBundle : pageBundle, kind === 'unknown' ? 'unknown' : 'trusted');
      // Paste, as a person would (a paste event anywhere on the page, carrying the text).
      await page.evaluate((text) => { const dt = new DataTransfer(); dt.setData('text/plain', text); document.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })); }, code);
      try { await page.waitForFunction(() => /Kept in this browser|Not opened|Opened, but/.test(document.getElementById('sealed-status')?.textContent || ''), null, { timeout: 30000 }); }
      catch (e) { throw new Error(`${kind}: no answer to the paste; sealed-status says "${await page.textContent('#sealed-status')}"; errors: ${out.errors.join(' | ')}`); }
      const c = { kind, sealed_status: (await page.textContent('#sealed-status')).trim() };
      if (/Kept in this browser/.test(c.sealed_status)) {
        await page.waitForFunction(() => /Outbox open|Outbox:/.test(document.getElementById('vault-status')?.textContent || ''), null, { timeout: 30000 });
        c.vault_status = (await page.textContent('#vault-status')).trim();
        if (kind === 'trusted') {
          const li = page.locator('#outbox-list > li').first();
          await li.getByRole('button', { name: 'Open', exact: true }).click();
          await li.getByRole('button', { name: 'Approve and send' }).click();
          await page.waitForFunction(() => /recorded in the outbox|Not sent|could not record/.test(document.querySelector('#outbox-list > li [role=status]')?.textContent || ''), null, { timeout: 30000 });
          c.send_status = (await li.locator('[role=status]').textContent()).trim();
          if (outDir) await page.screenshot({ path: join(outDir, 'key-paste-trusted.png'), fullPage: true });
        }
      }
      c.gmail = gmail;
      out.cases.push(c);
      await ctx.close();
    }
    await senderCtx.close();
    out.vault_requests = vault.log.length;
  } finally { await browser.close(); server.close(); }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = await runKeyPaste(process.argv[2]);
  if (process.argv[2]) writeFileSync(join(process.argv[2], 'key-paste-page.json'), JSON.stringify(out, null, 2) + '\n');
  console.log(JSON.stringify(out, null, 2));
}
