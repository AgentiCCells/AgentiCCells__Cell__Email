// Browser check of logging actions and editing a lead, in demo mode, at desktop and phone width (no network).
//   node crm/tests/browser-actions.cjs <out-folder>   (built site at http://localhost:8765)   By crm.dev.a@AgentiCCells.dinis, 2026-11-24. Apache-2.0.
const { chromium } = require('playwright'); const S = process.argv[2];
(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const [w, tag] of [[1200, 'wide'], [390, 'phone']]) {
    const p = await b.newPage({ viewport: { width: w, height: 900 }, deviceScaleFactor: 2 });
    p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
    p.on('dialog', (d) => d.accept('Ana Example'));
    await p.goto('http://localhost:8765/#/company/o06'); await p.waitForSelector('#log-action');
    await p.click('#me'); console.log(tag, 'name button:', await p.textContent('#me'));
    await p.selectOption('#a-kind', 'linkedin'); await p.selectOption('#a-dir', 'out'); await p.fill('#a-at', '2026-11-15'); await p.fill('#a-sum', 'Sent a note after the summit');
    await p.click('#log-action button[type=submit]'); await p.waitForSelector('#pending');
    if (tag === 'wide') await p.screenshot({ path: S + '/shots/10-log-action-preview.png' });
    await p.click('#w-go'); await p.waitForSelector('#pending', { state: 'detached' });
    console.log(tag, 'timeline first:', (await p.textContent('.timeline li')).replace(/\s+/g, ' '));
    await p.click('text=Edit stage, owner and next step'); await p.selectOption('#l-stage', 'contacted'); await p.fill('#l-next', 'Nudge on LinkedIn'); await p.fill('#l-due', '2026-11-26');
    await p.click('#edit-lead button[type=submit]'); await p.waitForSelector('#pending'); await p.click('#w-go'); await p.waitForSelector('#pending', { state: 'detached' });
    console.log(tag, 'stage now:', await p.textContent('.facts dd .stage'), '| next:', (await p.textContent('.facts')).match(/Nudge on LinkedIn/) ? 'set' : 'missing');
    await p.goto('http://localhost:8765/#/follow-ups'); await p.waitForSelector('h1');
    console.log(tag, 'follow-up row for action:', await p.$$eval('tbody tr', (r) => r.some((x) => /linkedin: Sent a note/.test(x.textContent))));
    await p.goto('http://localhost:8765/#/company/o06'); await p.waitForSelector('h1');
    if (tag === 'wide') await p.screenshot({ path: S + '/shots/11-company-activity.png', fullPage: true }); else await p.screenshot({ path: S + '/shots/12-phone-company.png', fullPage: true });
    console.log(tag, 'scrollWidth:', await p.evaluate(() => document.documentElement.scrollWidth));
  }
  console.log('errors:', errs); await b.close();
})().catch((e) => { console.log('FAILED', e.message); process.exit(1); });
