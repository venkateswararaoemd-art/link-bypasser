// Run all 4 levels, then watch what happens after level 4 Now-Continue click
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const delay = ms => new Promise(r => setTimeout(r, ms));

async function clickSel(page, sel) {
  await page.evaluate(s => { const e = document.querySelector(s); if(e){e.scrollIntoView();e.click();} }, s);
}

async function clickNowContinue(page) {
  await page.evaluate(() => {
    const candidates = [
      document.querySelector('#rtg-snp-btn'),
      document.querySelector('#rtg-snp21'),
      document.querySelector('#rtg'),
      ...Array.from(document.querySelectorAll('.step_box, [class*="get_btn"]')),
      ...Array.from(document.querySelectorAll('button, a, div, span')).filter(el => {
        const t = (el.innerText || el.textContent || '').trim().toLowerCase();
        return t === 'now-continue' || t === 'now continue';
      }),
    ];
    const el = candidates.find(el => el && !el.classList.contains('no_display') && el.offsetParent !== null);
    if (el) { console.log('clicking:', el.id, el.className); el.scrollIntoView(); el.click(); }
  });
}

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  const navLog = [];
  page.on('framenavigated', f => { if (f===page.mainFrame()) { navLog.push(f.url()); console.log('[NAV]', f.url()); } });

  await page.setRequestInterception(true);
  page.on('request', req => {
    const u = req.url();
    if (u.startsWith('https://t.me/') || u.startsWith('tg://')) { console.log('[TG]', u); req.abort(); return; }
    req.continue().catch(() => {});
  });

  try { await page.goto('https://linkshortx.in/dWSIi', { waitUntil: 'domcontentloaded', timeout: 30000 }); } catch(e) {}
  await page.waitForSelector('.start_btn', { timeout: 40000 });

  // Fast through levels 1-3
  for (let i = 1; i <= 3; i++) {
    await page.waitForSelector('.start_btn', { timeout: 30000 });
    await delay(200);
    await page.evaluate(() => document.querySelector('.start_btn').click());
    await page.waitForFunction(() => { const e=document.querySelector('.continue_btn'); return e&&!e.classList.contains('no_display'); }, { timeout: 60000 });
    await delay(200);
    await page.evaluate(() => document.querySelector('.continue_btn').click());
    await page.waitForFunction(() => {
      const candidates = [document.querySelector('#rtg-snp-btn'), document.querySelector('#rtg-snp21'), document.querySelector('#rtg'),
        ...Array.from(document.querySelectorAll('.step_box')),
        ...Array.from(document.querySelectorAll('div,span')).filter(e => (e.innerText||'').trim().toLowerCase() === 'now-continue')
      ];
      return candidates.some(e => e && !e.classList.contains('no_display') && e.offsetParent !== null);
    }, { timeout: 20000 });
    await delay(200);
    await clickNowContinue(page);
    console.log(`Level ${i} done`);
    await page.waitForFunction(() => document.querySelector('.start_btn') || window.location.hostname.includes('linkshortx'), { timeout: 30000 });
  }

  // Level 4: click verify, wait for continue
  console.log('\n=== LEVEL 4 ===');
  await page.waitForSelector('.start_btn', { timeout: 30000 });
  await delay(200);
  await page.evaluate(() => document.querySelector('.start_btn').click());
  console.log('Clicked verify, waiting for Continue...');
  await page.waitForFunction(() => { const e=document.querySelector('.continue_btn'); return e&&!e.classList.contains('no_display'); }, { timeout: 60000 });
  await delay(200);
  await page.evaluate(() => { document.querySelector('.continue_btn').scrollIntoView(); document.querySelector('.continue_btn').click(); });
  console.log('Clicked Continue.');

  // Now wait and dump page state every 3s for 60s
  console.log('\n=== WATCHING PAGE AFTER CONTINUE ON LEVEL 4 ===');
  for (let i = 0; i < 20; i++) {
    await delay(3000);
    try {
      const state = await page.evaluate(() => {
        const allInteractive = Array.from(document.querySelectorAll('[id],[onclick],button,a,[class*=btn],[class*=get]'))
          .map(e => ({ id:e.id, cls:(e.className||'').toString().substring(0,80), text:(e.innerText||e.value||'').trim().substring(0,80), visible: e.offsetParent!==null, noDisplay: e.classList.contains('no_display') }))
          .filter(e => e.text || e.id);
        return { url: window.location.href, step: document.body.innerText.match(/step\s+(\d+)/i)?.[0] || '', elements: allInteractive };
      });
      console.log(`\n[${(i+1)*3}s] URL: ${state.url} | ${state.step}`);
      state.elements.forEach(e => console.log('  ', JSON.stringify(e)));
    } catch(e) { console.log(`[${(i+1)*3}s] eval error:`, e.message); }

    const curUrl = page.url();
    if (curUrl.includes('linkshortx.in')) { console.log('NAVIGATED TO LINKSHORTX!'); break; }
  }

  await browser.close();
})();
