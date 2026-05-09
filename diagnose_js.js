// Extract the full dynamically-rendered JS from hindisink level page
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const delay = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.setRequestInterception(true);
  page.on('request', req => req.continue().catch(()=>{}));

  try { await page.goto('https://hindisink.com/ayushman-card-kaise-banaye/', { waitUntil: 'domcontentloaded', timeout: 30000 }); } catch(e){}
  // Wait for the level widget to appear (JS challenge must pass first)
  try { await page.waitForSelector('.start_btn', { timeout: 20000 }); } catch(e) { console.log('start_btn not found'); }
  await delay(500);

  // Get all inline scripts rendered in page
  const scripts = await page.evaluate(() =>
    Array.from(document.querySelectorAll('script:not([src])'))
      .map(s => s.textContent.trim())
      .filter(s => s.length > 20)
  );

  // Find the one with the level logic
  const levelScript = scripts.find(s => s.includes('startBtn') || s.includes('rtg-snp') || s.includes('continueCount') || s.includes('step_box'));
  if (levelScript) {
    console.log('=== LEVEL LOGIC SCRIPT ===\n', levelScript);
  } else {
    console.log('Level script not found in inline scripts. All scripts:');
    scripts.forEach((s, i) => {
      if (s.includes('count') || s.includes('rtg') || s.includes('btn') || s.includes('overlay') || s.includes('popup')) {
        console.log(`\n--- Script ${i} (len=${s.length}) ---\n`, s.substring(0, 2000));
      }
    });
  }

  // Also dump all scripts loaded from external sources that are hindisink.com
  const externalScripts = await page.evaluate(() =>
    Array.from(document.querySelectorAll('script[src]'))
      .map(s => s.src)
      .filter(s => s.includes('hindisink') || s.includes('wp-content'))
  );
  console.log('\nExternal scripts:', externalScripts);

  await browser.close();
})();
