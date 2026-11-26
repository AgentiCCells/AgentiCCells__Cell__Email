// Browser check of the hot list, in demo mode, at desktop and phone width (no network): rows in order, a stage change
// prepared and written, adding a company, no horizontal scroll.
//   node crm/tests/browser-hot.cjs <out-folder>   (built site at http://localhost:8765)   By cl-2.crm.dev@SovereignWebsite.dinis, 2026-11-26. Apache-2.0.
const { chromium } = require('playwright'); const S = process.argv[2];
(async () => {
  const b = await chromium.launch(); const errs = []; let bad = 0;
  const check = (tag, what, ok) => { console.log(tag, what, ok ? 'ok' : 'FAIL'); if (!ok) bad++; };
  for (const [w, tag] of [[1200, 'wide'], [390, 'phone']]) {
    const p = await b.newPage({ viewport: { width: w, height: 900 }, deviceScaleFactor: 1 });
    p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
    p.on('dialog', (d) => d.accept('Owner A'));
    await p.goto('http://localhost:8765/#/hot'); await p.waitForSelector('h1');
    const names = await p.$$eval('tbody tr td:first-child a', (a) => a.map((x) => x.textContent));
    console.log(tag, 'rows:', names.join(' | '));
    check(tag, 'four hot owners, cold one left out', names.length === 4 && !names.some((n) => /Kim/.test(n)));
    check(tag, 'overdue first', /Rowan/.test(names[0]) && /overdue/.test(await p.textContent('tbody tr:first-child')));
    if (S) await p.screenshot({ path: `${S}/hot-${tag}.png`, fullPage: true });
    await p.click('tbody tr:first-child a[href^="#/hot?edit"]'); await p.waitForSelector('#edit-hot');
    await p.selectOption('#h-stage', 'uploads-in'); await p.fill('#h-next', 'Tell the keeper'); await p.fill('#h-due', '');
    await p.click('#edit-hot button[type=submit]'); await p.waitForSelector('#pending');
    const pre = await p.textContent('#pending pre'); check(tag, 'prepared file holds no name', !/Rowan/.test(pre) && /uploads-in/.test(pre));
    await p.click('#w-go'); await p.waitForSelector('#pending', { state: 'detached' });
    const row = await p.$$eval('tbody tr', (r) => r.map((x) => x.textContent).find((t) => /Rowan/.test(t)) || '');
    check(tag, 'stage changed, keeper waits', /Uploads in/.test(row) && /the site keeper/.test(row));
    await p.click('#add-hot button[type=submit]'); await p.waitForSelector('#pending'); await p.click('#w-go'); await p.waitForSelector('#pending', { state: 'detached' });
    check(tag, 'added one as QR sent', (await p.$$('tbody tr td:first-child a')).length === 5);
    check(tag, 'draft link by stage', (await p.$$eval('a[href*="/designs/onboarding/#"]', (a) => a.map((x) => x.hash))).includes('#uploads-in'));
    check(tag, 'no horizontal scroll', await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await p.close();
  }
  console.log('errors:', errs); await b.close(); process.exit(bad || errs.length ? 1 : 0);
})().catch((e) => { console.log('FAILED', e.message); process.exit(1); });
