// Browser check of the hot list, in demo mode, at desktop and phone width (no network): rows in order (overdue, then
// waiting on Dinis, then the longest wait), paused left out, a stage change prepared and written with no name in it,
// a new case with no company, the draft links, no horizontal scroll.
//   node crm/tests/browser-hot.cjs <out-folder>   (built site at http://localhost:8765)   By cl-2.crm.dev@SovereignWebsite.dinis, 2026-11-26. Apache-2.0.
const { chromium } = require('playwright'); const S = process.argv[2];
(async () => {
  const b = await chromium.launch(); const errs = []; let bad = 0;
  const check = (tag, what, ok) => { console.log(tag, what, ok ? 'ok' : 'FAIL'); if (!ok) bad++; };
  const rows = (p) => p.$$eval('tbody tr', (r) => r.filter((x) => !x.querySelector('form')).map((x) => x.textContent.replace(/\s+/g, ' ').trim()));
  for (const [w, tag] of [[1200, 'wide'], [390, 'phone']]) {
    const p = await b.newPage({ viewport: { width: w, height: 900 }, deviceScaleFactor: 1 });
    p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
    p.on('dialog', (d) => d.accept('Owner A'));
    await p.goto('http://localhost:8765/#/hot'); await p.waitForSelector('h1');
    let r = await rows(p);
    console.log(tag, 'rows:', r.map((x) => x.split(' (demo)')[0]).join(' | '));
    check(tag, 'five open cases, the paused one left out', r.length === 5 && !r.some((x) => /Kim/.test(x)) && /1 paused/.test(await p.textContent('.stages')));
    check(tag, 'overdue first, then waiting on you', /Rowan/.test(r[0]) && /overdue/.test(r[0]) && /Lee/.test(r[1]) && /you/.test(r[1]));
    if (S) await p.screenshot({ path: `${S}/hot-${tag}.png`, fullPage: true });
    await p.click('tbody tr:first-child a[href^="#/hot?edit"]'); await p.waitForSelector('#edit-hot');
    await p.selectOption('#h-stage', 'uploads-in'); await p.fill('#h-next', 'Tell the keeper'); await p.fill('#h-due', '');
    await p.click('#edit-hot button[type=submit]'); await p.waitForSelector('#pending');
    const pre = await p.textContent('#pending pre'); check(tag, 'prepared file holds no name', !/Rowan/.test(pre) && /"case": "demo-0001"/.test(pre) && /"waits": "keeper"/.test(pre));
    await p.click('#w-go'); await p.waitForSelector('#pending', { state: 'detached' });
    r = await rows(p);
    check(tag, 'stage changed, keeper waits', /Uploads in.*the site keeper/.test(r.find((x) => /Rowan/.test(x)) || ''));
    await p.click('#add-hot button[type=submit]'); await p.waitForSelector('#pending'); await p.click('#w-go'); await p.waitForSelector('#pending', { state: 'detached' });
    r = await rows(p);
    check(tag, 'new case with no company shows its case id', r.length === 6 && r.some((x) => /^case-[0-9a-f]{6} 1\. Invited/.test(x)));
    check(tag, 'draft link by stage', (await p.$$eval('a[href*="/designs/onboarding/#"]', (a) => a.map((x) => x.hash))).includes('#uploads-in'));
    check(tag, 'no horizontal scroll', await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await p.close();
  }
  console.log('errors:', errs); await b.close(); process.exit(bad || errs.length ? 1 : 0);
})().catch((e) => { console.log('FAILED', e.message); process.exit(1); });
