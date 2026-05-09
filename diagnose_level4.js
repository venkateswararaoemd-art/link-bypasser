// Navigate through levels 1-3 automatically, then dump everything on level 4
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const delay = ms => new Promise(r => setTimeout(r, ms));

async function clickSel(page, sel) {
  await page.evaluate(s => { const e = document.querySelector(s); if(e){e.scrollIntoView();e.click();} }, sel);
}

async function doLevel(page, n) {
  console.log(`Level ${n} start`);
  await page.waitForSelector('.start_btn', { timeout: 30000 });
  await delay(500);
  await clickSel(page, '.start_btn');
  await page.waitForFunction(() => { const e = document.querySelector('.continue_btn'); return e && !e.classList.contains('no_display'); }, { timeout: 60000 });
  await delay(400);
  await page.evaluate(() => window.scrollTo(0,document.body.scrollHeight));
  await delay(500);
  await clickSel(page, '.continue_btn');
  console.log(`Level ${n}: clicked continue, now waiting for rtg-snp-btn...`);

  // Dump page state every 2 seconds for 30 seconds
  for (let i = 0; i < 15; i++) {
    await delay(2000);
    const state = await page.evaluate(() => {
      const allBtns = Array.from(document.querySelectorAll('button,[id*=rtg],[class*=btn],[role=button],a')).map(e => ({
        id: e.id, cls: e.className.toString().substring(0,80), text: (e.innerText||e.value||'').trim().substring(0,80),
        visible: e.offsetParent !== null, hasNoDisplay: e.classList.contains('no_display')
      })).filter(e => e.text || e.id);
      return { url: window.location.href, btns: allBtns };
    }).catch(() => ({ url: 'error' }));

    console.log(`[${(i+1)*2}s] URL: ${state.url}`);
    if (state.btns) state.btns.forEach(b => console.log('  btn:', JSON.stringify(b)));

    const snpExists = await page.evaluate(() => !!document.querySelector('#rtg-snp-btn')).catch(() => false);
    if (snpExists) {
      console.log(`#rtg-snp-btn found at ${(i+1)*2}s!`);
      return true;
    }
  }
  return false;
}

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  page.on('framenavigated', f => { if (f===page.mainFrame()) console.log('[NAV]', f.url()); });

  await page.setRequestInterception(true);
  page.on('request', req => { req.continue().catch(()=>{}); });

  try {
    await page.goto('https://linkshortx.in/dWSIi', { waitUntil: 'domcontentloaded', timeout: 30000 });
  } catch(e) {}

  await page.waitForSelector('.start_btn', { timeout: 40000 });

  // Fast-click through levels 1-3
  for (let i = 1; i <= 3; i++) {
    await page.waitForSelector('.start_btn', { timeout: 30000 });
    await delay(300);
    await clickSel(page, '.start_btn');
    await page.waitForFunction(() => { const e=document.querySelector('.continue_btn'); return e&&!e.classList.contains('no_display'); }, { timeout: 60000 });
    await delay(300);
    await clickSel(page, '.continue_btn');
    await page.waitForSelector('#rtg-snp-btn', { timeout: 15000 });
    await delay(300);
    await clickSel(page, '#rtg-snp-btn');
    console.log(`Level ${i} done`);
    await page.waitForFunction(() => document.querySelector('.start_btn') || window.location.hostname.includes('linkshortx'), { timeout: 30000 });
  }

  console.log('\n=== LEVEL 4 DETAILED DIAGNOSIS ===');
  await doLevel(page, 4);

  await browser.close();
})();
