const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const delay = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const url = process.argv[2];
  if (!url) { console.error('Usage: node diagnose.js <url>'); process.exit(1); }

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  const navLog = [];
  page.on('framenavigated', frame => {
    if (frame === page.mainFrame()) {
      const u = frame.url();
      navLog.push(u);
      console.log('[NAV]', u);
    }
  });

  console.log('Starting:', url);
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  } catch(e) { console.log('goto:', e.message); }

  // Wait for JS redirects chain to finish
  await delay(8000);

  console.log('\nFinal URL:', page.url());

  try {
    // Dump all clickable elements
    const els = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('*'))
        .filter(el => {
          const style = window.getComputedStyle(el);
          return el.onclick || el.tagName === 'BUTTON' || el.tagName === 'A' ||
                 (el.tagName === 'INPUT' && ['button','submit'].includes(el.type)) ||
                 style.cursor === 'pointer';
        })
        .map(el => ({
          tag: el.tagName,
          id: el.id || '',
          cls: (el.className || '').toString().substring(0, 60),
          text: (el.innerText || el.value || '').trim().substring(0, 100),
          href: el.href || '',
        }))
        .filter(el => el.text || el.href);
    });

    console.log('\n=== CLICKABLE ELEMENTS ===');
    els.forEach(e => console.log(JSON.stringify(e)));

    // Dump all text content visible
    const bodyText = await page.evaluate(() => document.body ? document.body.innerText : '');
    console.log('\n=== BODY TEXT ===\n', bodyText.substring(0, 2000));

    // Dump <script> tags for patterns
    const scripts = await page.evaluate(() =>
      Array.from(document.querySelectorAll('script:not([src])'))
        .map(s => s.textContent.trim().substring(0, 500))
        .filter(s => s.length > 10)
    );
    console.log('\n=== INLINE SCRIPTS ===');
    scripts.forEach(s => console.log('---\n', s));

  } catch(e) {
    console.log('evaluate error:', e.message);
  }

  await browser.close();
})();
