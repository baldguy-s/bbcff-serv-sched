// Loads the deployed GitHub Pages site in a headless browser and reports whether each
// page renders without JS errors. A plain HTTP fetch can't verify this because the
// schedule content is rendered client-side after fetching the JSON data files.
//
// Setup (one-time): npx playwright install chromium-headless-shell
// Run:              npm run check-site

const { chromium } = require('playwright-core');

const BASE = 'https://baldguy-s.github.io/bbcff-serv-sched/';
const PAGES = ['schedule-display.html', 'schedule-admin.html', 'song-leader-admin.html'];

(async () => {
  const browser = await chromium.launch({ channel: 'chromium-headless-shell' });
  let failed = false;

  for (const path of PAGES) {
    const url = BASE + path;
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', msg => { if (msg.type() === 'error') errors.push('console.error: ' + msg.text()); });
    page.on('requestfailed', req => errors.push('request failed: ' + req.url() + ' - ' + req.failure()?.errorText));

    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1500);
    const title = await page.title();
    const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 200));

    console.log(`=== ${url} ===`);
    console.log('title:', title);
    console.log('body snippet:', bodyText.replace(/\n+/g, ' | '));
    if (errors.length) {
      failed = true;
      console.log('ERRORS:', JSON.stringify(errors, null, 2));
    } else {
      console.log('no errors');
    }
    console.log('');
    await page.close();
  }

  await browser.close();
  process.exit(failed ? 1 : 0);
})();
