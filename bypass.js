const path = require('path');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const delay = ms => new Promise(r => setTimeout(r, ms));

async function runLevel(page, levelNum, log) {
  // Wait for the verify button to become visible
  await page.waitForFunction(
    () => { const e = document.querySelector('.start_btn'); return e && e.offsetParent !== null; },
    { timeout: 30000 }
  );
  await delay(100);

  log(`Level ${levelNum}: clicking "Click here to verify"…`);
  await page.evaluate(() => { const e = document.querySelector('.start_btn'); e.scrollIntoView(); e.click(); });

  // Zero out the countdown immediately so the interval fires on the next tick (~1.4s)
  await page.evaluate(() => { try { count = 0; isPageVisible = true; } catch(e) {} });

  log(`Level ${levelNum}: waiting for Continue button…`);
  await page.waitForFunction(
    () => { const e = document.querySelector('.continue_btn'); return e && !e.classList.contains('no_display'); },
    { timeout: 10000 }
  );
  await delay(100);

  log(`Level ${levelNum}: clicking Continue…`);
  await page.evaluate(() => {
    const e = document.querySelector('.continue_btn');
    e.scrollIntoView({ block: 'center' });
    e.click();
  });

  // Fast-forward the post-continue timer so #rtg-snp21 appears immediately
  await page.evaluate(() => {
    try { isPageVisible = true; } catch(e) {}
    try { continueCount = -1; } catch(e) {}
  });

  log(`Level ${levelNum}: waiting for Now-Continue button…`);
  await page.waitForFunction(
    () => {
      const div = document.getElementById('rtg-snp21');
      const btn = document.getElementById('rtg-snp-btn');
      return (div && !div.classList.contains('no_display')) ||
             (btn && btn.offsetParent !== null);
    },
    { timeout: 10000 }
  );
  await delay(100);

  log(`Level ${levelNum}: clicking Now-Continue…`);
  // Levels 1-3 use a POST form with #rtg-snp-btn; level 4 uses a plain button with onclick inside #rtg-snp21
  await page.evaluate(() => {
    const formBtn = document.getElementById('rtg-snp-btn');
    if (formBtn) { formBtn.scrollIntoView({ block: 'center' }); formBtn.click(); return; }
    const snpDiv = document.getElementById('rtg-snp21');
    if (snpDiv) {
      const btn = snpDiv.querySelector('button, a');
      if (btn) { btn.scrollIntoView({ block: 'center' }); btn.click(); }
    }
  });

  log(`Level ${levelNum}: done ✓`);
}

async function bypass(url, onLog) {
  const log = onLog || console.log;

  // When packaged with pkg, use the Chromium bundled next to the .exe
  const isPackaged = typeof process.pkg !== 'undefined';
  const chromiumExe = isPackaged
    ? path.join(path.dirname(process.execPath), 'chromium', 'chrome.exe')
    : undefined;

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: chromiumExe,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
    ],
  });

  let telegramUrl = null;
  let resolveTelegram;
  const telegramReady = new Promise(r => { resolveTelegram = r; });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });

    // Block ad scripts (prevents Google interstitial/vignette from hijacking form navigation)
    // and capture Telegram URLs
    const AD_BLOCK = [
      'googlesyndication.com',
      'doubleclick.net',
      'googletagservices.com',
      'googletagmanager.com',
      'pagead2.google',
      'adservice.google',
      'googletag',
      'googleads.g.doubleclick',
      'securepubads.g.doubleclick',
      'tpc.googlesyndication',
      'google-analytics.com',
      'googleoptimize.com',
    ];

    await page.setRequestInterception(true);
    page.on('request', req => {
      const u = req.url();
      if (u.startsWith('https://t.me/') || u.startsWith('tg://')) {
        telegramUrl = u;
        log(`Telegram URL captured: ${u}`);
        resolveTelegram?.();
        req.abort();
        return;
      }
      // Block ad scripts/resources that cause interstitial vignette popups.
      // Only block sub-resources (script, xhr, image…), NOT full page navigations —
      // aborting a navigation causes chrome-error://chromewebdata/.
      const type = req.resourceType();
      if (type !== 'document' && AD_BLOCK.some(pattern => u.includes(pattern))) {
        req.abort();
        return;
      }
      req.continue().catch(() => {});
    });

    log(`Opening ${url}…`);
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    } catch (e) { /* JS redirects may throw */ }

    // Wait for hindisink article page with the level widget
    log('Waiting for hindisink ad-wall page to load…');
    await page.waitForFunction(
      () => document.querySelector('.start_btn') !== null,
      { timeout: 40000 }
    );
    log(`Ad-wall loaded: ${page.url()}`);

    const isShortxHost = (hostname) =>
      hostname.includes('linkshortx') || hostname.includes('urlshortx');

    let level3Url = null;

    // 4 levels — each one submits a POST form that navigates to the next level page
    for (let i = 1; i <= 4; i++) {
      // Save the level-3 page URL so we can retry level 4 from here if needed
      if (i === 4) level3Url = page.url();

      await runLevel(page, i, log);

      // After the form submit, wait for the URL base to change AND next level widget to appear
      // (Google vignette ads add #google_vignette to the URL without a real navigation)
      const baseUrl = page.url().split('#')[0];

      try {
        await page.waitForFunction(
          (base) => {
            const newBase = window.location.href.split('#')[0];
            const h = window.location.hostname;
            return newBase !== base && (
              document.querySelector('.start_btn') !== null ||
              h.includes('linkshortx') || h.includes('urlshortx')
            );
          },
          { timeout: 60000 },
          baseUrl
        );
      } catch (e) {
        log(`Level ${i} wait timeout: ${e.message} — trying to recover`);
        await page.keyboard.press('Escape');
        await delay(500);
      }

      let curUrl = page.url();

      // If Chrome blocked the navigation (vignette hijack), go back and retry the level submit
      if (curUrl.startsWith('chrome-error://') || curUrl.startsWith('about:')) {
        log(`Blocked navigation detected (${curUrl}) — going back and retrying…`);
        await page.goBack({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
        await delay(1000);
        // Retry the form click
        await page.evaluate(() => {
          const formBtn = document.getElementById('rtg-snp-btn');
          if (formBtn) { formBtn.click(); return; }
          const snpDiv = document.getElementById('rtg-snp21');
          if (snpDiv) { const btn = snpDiv.querySelector('button,a'); if(btn) btn.click(); }
        });
        await page.waitForFunction(
          (base) => {
            const newBase = window.location.href.split('#')[0];
            const h = window.location.hostname;
            return newBase !== base && (
              document.querySelector('.start_btn') !== null ||
              h.includes('linkshortx') || h.includes('urlshortx')
            );
          },
          { timeout: 45000 },
          baseUrl
        ).catch(() => {});
        curUrl = page.url();
        log(`After retry: ${curUrl}`);
      }

      log(`After level ${i}: ${curUrl}`);

      if (isShortxHost(new URL(curUrl).hostname)) {
        log(`Landed on ${new URL(curUrl).hostname}!`);
        break;
      }
    }

    // If level 4 didn't land on a shortx page, retry it from the saved level-3 URL (no time limit)
    if (!isShortxHost(new URL(page.url()).hostname) && level3Url) {
      log('Level 4 failed — retrying from level 3 page (no time limit)…');
      try {
        await page.goto(level3Url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      } catch (e) { /* JS redirects may throw */ }

      log('Waiting for level 4 ad-wall to load…');
      await page.waitForFunction(
        () => document.querySelector('.start_btn') !== null,
        { timeout: 0 }
      );

      await runLevel(page, 4, log);

      log('Waiting for shortx page after retry (no time limit)…');
      await page.waitForFunction(
        () => {
          const h = window.location.hostname;
          return h.includes('linkshortx') || h.includes('urlshortx');
        },
        { timeout: 0 }
      );
      log(`Retry succeeded: ${page.url()}`);
    }

    // Wait for the shortx Get Link page (linkshortx.in or urlshortx.io)
    await page.waitForFunction(
      () => window.location.hostname.includes('linkshortx') || window.location.hostname.includes('urlshortx'),
      { timeout: 60000 }
    );

    log(`Get Link page: ${page.url()}`);

    // Ensure the page is treated as visible so the countdown timer runs
    await page.evaluate(() => {
      try {
        Object.defineProperty(document, 'visibilityState', { get: () => 'visible', configurable: true });
        document.dispatchEvent(new Event('visibilitychange'));
      } catch(e) {}
    });

    // Wait for the 5s countdown to enable the Get Link button, then click it
    log('Waiting for Get Link button…');
    await page.waitForFunction(
      () => { const b = document.querySelector('.get-link'); return b && !b.classList.contains('disabled'); },
      { timeout: 20000 }
    );

    log('Clicking Get Link…');
    await page.evaluate(() => {
      const btn = document.querySelector('.get-link');
      if (btn) { btn.scrollIntoView({ block: 'center' }); btn.click(); }
    });

    // Wait until the request interceptor captures the Telegram URL (max 10s)
    await Promise.race([telegramReady, new Promise(r => setTimeout(r, 10000))]);

    // Fallback: scan DOM for t.me links (excluding the support channel in the nav)
    if (!telegramUrl) {
      telegramUrl = await page.evaluate(() => {
        const a = Array.from(document.querySelectorAll('a'))
          .find(a => a.href && (a.href.startsWith('https://t.me/') || a.href.startsWith('tg://'))
            && !a.href.includes('LinkShortXSupport'));
        return a ? a.href : null;
      });
    }

    // Normalize tg://resolve?domain=BOT&start=X  →  https://t.me/BOT?start=X
    if (telegramUrl && telegramUrl.startsWith('tg://resolve?')) {
      const p = new URLSearchParams(telegramUrl.slice('tg://resolve?'.length));
      const domain = p.get('domain');
      const start = p.get('start');
      telegramUrl = `https://t.me/${domain}${start ? `?start=${start}` : ''}`;
    }

    return {
      success: !!telegramUrl,
      telegramUrl,
      message: telegramUrl ? 'Done!' : 'Completed all levels but Telegram URL not found.',
    };

  } finally {
    await browser.close();
  }
}

module.exports = { bypass };
