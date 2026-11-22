// The first real send through the gateway page's own buttons, against stand-ins: an in-memory
// stand-in for the vault service (the pointer API the vendored sgit vault library uses: read,
// write, delete and batch with write-if-match) and a stand-in for Gmail. Every other host is
// blocked and counted. MADE-UP data only: a made-up outbox, a made-up Google token, a made-up
// SG/Send token. SIMULATION. By email.workflows.d@AgentiCCells.dinis, 22 November 2026. Apache-2.0.
//
// What it runs: Open vault, open the entry, Approve and send (confirmed), the record in the outbox
// vault, and a fresh read of meta.json from the stand-in. What it does not run: pasting the sealed
// QR code. The page accepts a sealed key only from a trusted sender (trusted.js), whose private key
// this agent does not hold, so the run puts the outbox key where the paste would put it (kept,
// sealed to the page's key, with pki.js's keep()) and says so.
// Use: node scripts/build.mjs && node sim/workflows/first-send-page.mjs [out-folder]
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, existsSync, statSync, mkdirSync } from 'node:fs';
import { join, extname } from 'node:path';
import { createRequire } from 'node:module';

const root = new URL('../../', import.meta.url).pathname;
const site = join(root, '_site');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };
const VAULT = 'https://dev.send.sgraph.ai';

// The vault service's pointer API, in memory: vaultId/fileId -> bytes.
export function vaultStandIn() {
  const store = new Map(), log = [];
  const k = (v, f) => `${v}/${f}`;
  async function handle(route) {
    const req = route.request(), url = new URL(req.url()), method = req.method();
    const parts = url.pathname.split('/').filter(Boolean); // api vault <op> <vaultId> <fileId...>
    const json = (status, body) => route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) });
    if (method === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-methods': '*', 'access-control-allow-headers': '*' } });
    if (parts[0] !== 'api' || parts[1] !== 'vault') { log.push(`${method} ${url.pathname} (not served)`); return json(404, { error: 'not served by the stand-in' }); }
    const op = parts[2], vaultId = parts[3], fileId = parts.slice(4).join('/');
    log.push(`${method} ${op}`);
    if (op === 'read' && method === 'GET') {
      const b = store.get(k(vaultId, fileId));
      return b ? route.fulfill({ status: 200, contentType: 'application/octet-stream', headers: { 'access-control-allow-origin': '*' }, body: b }) : json(404, { error: 'not found' });
    }
    if (op === 'write' && method === 'PUT') { store.set(k(vaultId, fileId), req.postDataBuffer()); return json(200, { status: 'ok', file_id: fileId }); }
    if (op === 'delete' && method === 'DELETE') { store.delete(k(vaultId, fileId)); return json(200, { status: 'ok' }); }
    if (op === 'batch' && method === 'POST') {
      const results = [];
      for (const o of JSON.parse(req.postData()).operations || []) {
        const key = k(vaultId, o.file_id), cur = store.get(key);
        if (o.op === 'read') results.push(cur ? { status: 'ok', file_id: o.file_id, data: cur.toString('base64') } : { status: 'not_found', file_id: o.file_id });
        else if (o.op === 'write') { store.set(key, Buffer.from(o.data, 'base64')); results.push({ status: 'ok', file_id: o.file_id }); }
        else if (o.op === 'write-if-match') {
          const now = cur ? cur.toString('base64') : null;
          if ((o.match ?? null) === now) { store.set(key, Buffer.from(o.data, 'base64')); results.push({ status: 'ok', file_id: o.file_id }); }
          else results.push({ status: 'conflict', file_id: o.file_id, current: now });
        } else if (o.op === 'delete') { store.delete(key); results.push({ status: 'ok', file_id: o.file_id }); }
        else results.push({ status: 'error', file_id: o.file_id });
      }
      return json(200, { results });
    }
    return json(404, { error: `not served: ${method} ${op}` });
  }
  return { handle, log, size: () => store.size };
}

export async function runFirstSendPage(outDir) {
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
  const out = { ran: new Date().toISOString(), browser: browser.version(), steps: [], gmail: [], aborted: [], errors: [], dialogs: [] };
  const step = (name, detail) => out.steps.push({ name, detail });
  try {
    const ctx = await browser.newContext({ viewport: { width: 1100, height: 1000 } });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => out.errors.push(e.message));
    page.on('dialog', (d) => { out.dialogs.push(d.message()); d.accept(); });
    await ctx.route('**/*', async (route) => {
      const u = route.request().url();
      if (u.startsWith(base)) return route.continue();
      if (u.startsWith(VAULT + '/')) return vault.handle(route);
      if (u.startsWith('https://gmail.googleapis.com/gmail/v1/users/me/')) {
        const path = u.slice('https://gmail.googleapis.com/gmail/v1/users/me/'.length);
        const auth = route.request().headers().authorization;
        out.gmail.push({ method: route.request().method(), path, auth: auth === 'Bearer made-up-google-token' ? 'the made-up token' : 'UNEXPECTED' });
        const body = path === 'profile' ? { emailAddress: 'owner@example.org', messagesTotal: 12, threadsTotal: 8 }
          : path === 'labels' ? { labels: [{ id: 'INBOX', name: 'INBOX', type: 'system' }] }
          : path === 'messages/send' ? (out.sent = route.request().postDataJSON(), { id: 'standin-1', threadId: 'standin-t1' }) : {};
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
      }
      out.aborted.push(u); return route.abort();
    });

    // Set-up, standing in for conductor@PrompTugal.dinis and the key paste: make an outbox vault in
    // the stand-in with one made-up entry to the owner, and keep its key as the paste would.
    await page.goto(base + '/app/connect.html');
    await page.waitForFunction(() => typeof SGVault !== 'undefined');
    const made = await page.evaluate(async () => {
      const V = await import('/app/vault.js');
      const P = await import('/app/pki.js');
      const vault = await V.createTwinVault('made-up-sgsend-token');
      await V.writeMany(vault, [
        { folder: '/outbox/2026-11-22-first-send', name: 'meta.json', data: JSON.stringify({ to: ['owner@example.org'], cc: [], subject: 'First send from the page (test)', status: 'draft', workflow: 'first-send' }, null, 2) + '\n' },
        { folder: '/outbox/2026-11-22-first-send', name: 'body.txt', data: 'This is a made-up first send, to myself.\n' },
      ]);
      await V.publish(vault);
      const id = await P.identity();
      await P.keep(id, 'vault:co57gzld', V.displayKey(vault));
      await P.keep(id, 'sgsend:token', 'made-up-sgsend-token');
      await P.keep(id, 'google:token', JSON.stringify({ token: 'made-up-google-token', can_send: true, can_read: false, can_manage: false, expires_at: Date.now() + 3600e3 }));
      return { vaultId: vault.vaultId };
    });
    step('set-up (not a page step)', `made-up outbox vault ${made.vaultId} in the stand-in, one entry to owner@example.org; its key kept sealed to the page key where the paste would keep it`);

    // From here, only the page's own buttons.
    await page.reload();
    await page.waitForFunction(() => /Connected as/.test(document.getElementById('who')?.textContent || ''));
    step('Connect (token already kept)', await page.textContent('#who'));
    await page.click('#open-vault');
    await page.waitForFunction(() => /Outbox open|Outbox:/.test(document.getElementById('vault-status')?.textContent || ''), null, { timeout: 30000 });
    step('Open vault', await page.textContent('#vault-status'));
    await page.getByRole('button', { name: 'Open', exact: true }).first().click();
    await page.waitForSelector('.mail [role=status]');
    step('Open the entry', (await page.textContent('.mail [role=status]')).trim());
    if (outDir) await page.screenshot({ path: join(outDir, 'first-send-1-open.png'), fullPage: true });
    await page.getByRole('button', { name: 'Approve and send' }).click();
    await page.waitForFunction(() => /recorded in the outbox|could not record|Not sent/.test(document.querySelector('.mail [role=status]')?.textContent || ''), null, { timeout: 30000 });
    step('Approve and send, confirmed', (await page.textContent('.mail [role=status]')).trim());
    if (outDir) await page.screenshot({ path: join(outDir, 'first-send-2-sent.png'), fullPage: true });

    // Read meta.json back from the stand-in with a fresh vault object, as another device would.
    const meta = await page.evaluate(async () => {
      const V = await import('/app/vault.js');
      const P = await import('/app/pki.js');
      const key = await P.recall(await P.identity(), 'vault:co57gzld');
      const v = await V.openTwinVault('made-up-sgsend-token', key);
      return V.readJson(v, '/outbox/2026-11-22-first-send', 'meta.json');
    });
    step('meta.json read back', JSON.stringify({ status: meta?.status, gmail_id: meta?.gmail_id, approved_by: meta?.approved_by, sent_at: meta?.sent_at ? 'set' : 'missing' }));
    out.meta = meta;
    if (out.sent?.raw) {
      const raw = Buffer.from(out.sent.raw.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
      const [head, b64] = raw.split('\r\n\r\n');
      out.sent = { headers: head.split('\r\n'), text: Buffer.from(b64.replace(/\r\n/g, ''), 'base64').toString('utf8') };
    }
    out.vault_requests = vault.log.length;
  } finally { await browser.close(); server.close(); }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = await runFirstSendPage(process.argv[2]);
  if (process.argv[2]) writeFileSync(join(process.argv[2], 'first-send-page.json'), JSON.stringify(out, null, 2) + '\n');
  console.log(JSON.stringify(out, null, 2));
}
