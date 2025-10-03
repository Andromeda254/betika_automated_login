const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
require('dotenv').config();

// Use stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

(async () => {
  const username = process.env.BETIKA_USERNAME;
  const password = process.env.BETIKA_PASSWORD;
  const baseUrl = 'https://www.betika.com/en-ke';
  const homeUrl = 'https://betika.com';

  // Ensure output dirs
  if (!fs.existsSync('screenshots')) fs.mkdirSync('screenshots');
  if (!fs.existsSync('html-dumps')) fs.mkdirSync('html-dumps');

  console.log('🚀 Launching browser with stealth mode...');
  console.log(`📱 Username: ${username ? '✓ Loaded' : '✗ Missing'}`);
  console.log(`🔑 Password: ${password ? '✓ Loaded' : '✗ Missing'}`);

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
      '--window-size=1920,1080'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  // Extra stealth
  await page.evaluateOnNewDocument(() => {
    window.chrome = { runtime: {} };
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
  });

  page.setDefaultTimeout(60000);

  // Passive network monitor to stimulate logging (no interception changes)
  const interestingHosts = ['betika.com', 'api.betika.com', 'live.betika.com', 'bidr.io', 'eskimi.com'];
  page.on('response', async (response) => {
    try {
      const url = response.url();
      const host = new URL(url).hostname;
      if (interestingHosts.some(h => host.includes(h))) {
        const ct = response.headers()['content-type'] || '';
        console.log(`📡 [${response.status()}] ${host} ${ct.includes('json') ? '(json)' : ''} -> ${url.substring(0, 140)}`);
      }
    } catch {}
  });

  // Helper: wait
  const wait = (ms) => new Promise(r => setTimeout(r, ms));

  // Helper: retry wrapper for unreliable actions
  async function withRetry(fn, {tries = 3, delayMs = 2000, label = 'action'} = {}) {
    let lastErr;
    for (let i = 1; i <= tries; i++) {
      try {
        return await fn(i);
      } catch (e) {
        lastErr = e;
        console.log(`↻ Retry ${i}/${tries} for ${label}: ${e.message}`);
        await wait(delayMs);
      }
    }
    throw lastErr || new Error(`Failed: ${label}`);
  }

  // Helper: safe click by text
  async function clickByText(selectors, textVariants) {
    for (const sel of selectors) {
      const els = await page.$$(sel);
      for (const el of els) {
        const txt = (await page.evaluate(e => e.textContent || '', el)).trim().toLowerCase();
        if (textVariants.some(t => txt.includes(t))) {
          await el.click();
          return true;
        }
      }
    }
    return false;
  }

  // Helper: incremental scroll to trigger lazy loads
  async function incrementalScroll(total = 4, step = 1200, delay = 800) {
    for (let i = 0; i < total; i++) {
      await page.evaluate((s) => window.scrollBy(0, s), step);
      await wait(delay);
    }
  }

  try {
    console.log(`\n🌐 Navigating to ${homeUrl}...`);
    await page.goto(homeUrl, { waitUntil: 'networkidle2', timeout: 90000 });
    await wait(4000);

    // Save initial state
    await page.screenshot({ path: 'screenshots/LIVE_01_home.png', fullPage: true });

    // Locate and click login in nav
    const loginSelectors = [
      'a[href="/login"]',
      'a[href*="login"]',
      'button[class*="login"]',
      '.login-button',
      '.btn-login',
      '[data-testid="login"]',
      '[data-test="login"]'
    ];

    let clicked = false;
    for (const sel of loginSelectors) {
      const el = await page.$(sel);
      if (el) {
        const vis = await page.evaluate(e => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width>0 && r.height>0 && s.visibility!=='hidden' && s.display!=='none'; }, el);
        if (vis) { await el.click(); clicked = true; break; }
      }
    }

    if (!clicked) throw new Error('Login button not found');

    // Wait for login form
    await Promise.race([
      page.waitForSelector('input[name="phone-number"], input[type="tel"]', { visible: true }),
      wait(6000)
    ]);

    // Fill phone and password
    const phoneInput = await page.$('input[name="phone-number"], input[name="phone"], input[type="tel"]');
    const passInput = await page.$('input[type="password"]');
    if (!phoneInput || !passInput) throw new Error('Login inputs not found');

    await phoneInput.click({ clickCount: 3 });
    await page.keyboard.press('Backspace');
    await phoneInput.type(username, { delay: 80 });

    await passInput.click();
    await passInput.type(password, { delay: 70 });

    // Submit
    const submitBtn = await page.$('button.session__form__button, button[type="submit"]');
    if (submitBtn) {
      await submitBtn.click();
    }

    // Wait for navigation or success state
    await Promise.race([
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => null),
      wait(5000)
    ]);

    // Verify login by checking logout or homepage cues
    const loggedIn = await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll('a,button')).map(e => (e.textContent||'').toLowerCase());
      const hasLogout = all.some(t => t.includes('logout') || t.includes('sign out'));
      return !location.href.includes('/login') && hasLogout;
    });

    console.log(loggedIn ? '✅ Logged in' : '⚠️ Could not verify login (continuing)');

    // Navigate to Live via visible UI first (more reliable than direct /live-betting)
    console.log(`\n🏟️ Opening Live via navigation...`);
    const liveNavClicked = await clickByText([
      'a', 'button', '[role="tab"]', 'li', '[data-testid]', '[class]'
    ], ['live', 'in-play']);

    if (!liveNavClicked) {
      // Fallback to direct URL with retries (handles occasional ERR_ABORTED)
      const liveUrl = `${baseUrl}/live-betting`;
      await withRetry(async (attempt) => {
        console.log(`🚚 Navigating directly to Live (attempt ${attempt})...`);
        await page.goto(liveUrl, { waitUntil: 'networkidle2', timeout: 90000 });
      }, { tries: 3, delayMs: 3000, label: 'goto live-betting' });
    }

    // Wait for some live content to appear
    await wait(4000);
    await page.screenshot({ path: 'screenshots/LIVE_02_live_betting.png', fullPage: true });

    // Select Football/Soccer with retries
    console.log('🎯 Selecting Football/Soccer filter...');
    const footballSelected = await withRetry(async () => {
      const clicked = await clickByText([
        'button', 'a', 'li', '[role="tab"]', '[data-testid]', '[class*="chip"]', '[class*="filter"]'
      ], ['football', 'soccer']);
      if (!clicked) throw new Error('Football filter not clickable yet');
      return true;
    }, { tries: 3, delayMs: 2000, label: 'select football filter' }).catch(() => false);

    if (!footballSelected) {
      console.log('⚠️ Could not click filter by text; attempting direct football section...');
      const footballUrl = `${baseUrl}/sports/football`;
      await withRetry(async (attempt) => {
        await page.goto(footballUrl, { waitUntil: 'networkidle2', timeout: 90000 });
      }, { tries: 2, delayMs: 2000, label: 'goto football section' }).catch(()=>null);
      await wait(3000);
    } else {
      await wait(3000);
    }

    await page.screenshot({ path: 'screenshots/LIVE_03_after_filter.png', fullPage: true });

    // Trigger lazy loads by scrolling (more cycles to stimulate WS/polling)
    console.log('📜 Scrolling to trigger lazy loads...');
    await incrementalScroll(10, 1400, 700);

    // Collect potential match links/cards, prefer live indicators
    console.log('🔗 Looking for live match items...');
    const matchSelectors = [
      'a[href*="/match"], a[href*="/event"], a[href*="/game"]',
      '[class*="match"], [class*="event"], [class*="game"] a',
      '[data-testid*="live" ] a, [data-test*="live" ] a'
    ];

    let matchLinks = await page.evaluate((sels) => {
      const urls = new Set();
      sels.forEach(sel => {
        document.querySelectorAll(sel).forEach(a => {
          const href = a.getAttribute('href') || '';
          if (href && href.length < 200 && !href.startsWith('javascript')) {
            const u = href.startsWith('http') ? href : (location.origin + href);
            urls.add(u);
          }
        });
      });
      return Array.from(urls);
    }, matchSelectors);

    // Keep only internal betika links
    matchLinks = (matchLinks || []).filter(u => u.includes('betika.com'));
    // De-dup and trim to first few
    matchLinks = Array.from(new Set(matchLinks)).slice(0, 6);
    console.log(`➕ Found ${matchLinks.length} candidate match links`);

    // Visit first 3 matches with extended dwell to stimulate streaming odds
    let idx = 0;
    for (const link of matchLinks.slice(0, 3)) {
      idx++;
      console.log(`\n🟢 Opening match ${idx}: ${link}`);
      await withRetry(async (attempt) => {
        await page.goto(link, { waitUntil: 'networkidle2', timeout: 90000 });
      }, { tries: 2, delayMs: 2500, label: `goto match ${idx}` }).catch(()=>null);

      // Handle occasional userinfo.betika.com 500 noise by soft refresh
      await wait(4000);
      const hadUserInfo500 = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('*')).some(e => /userinfo\.betika\.com/i.test(e.textContent||''));
      });
      if (hadUserInfo500) {
        console.log('↻ Detected userinfo 500 artifacts, soft reload...');
        await withRetry(async () => {
          await Promise.all([
            page.reload({ waitUntil: 'networkidle2' }),
            new Promise(r => setTimeout(r, 2000))
          ]);
        }, { tries: 2, delayMs: 2000, label: 'soft reload after userinfo 500' }).catch(()=>null);
      }

      // Extended dwell + scroll cycles to trigger WS/polling
      await incrementalScroll(8, 1000, 500);
      await wait(6000);
      await incrementalScroll(6, 1200, 600);
      await page.screenshot({ path: `screenshots/LIVE_10_match_${idx}.png`, fullPage: true });
    }

    // Return to live area and idle to catch background streams
    console.log('\n↩️ Returning to Live and idling for stream capture...');
    await withRetry(async () => {
      await page.goBack({ waitUntil: 'networkidle2' });
    }, { tries: 2, delayMs: 2000, label: 'goBack to live list' }).catch(()=>null);

    await incrementalScroll(8, 1400, 600);
    await wait(8000);
    await page.screenshot({ path: 'screenshots/LIVE_20_after_roundtrip.png', fullPage: true });

    console.log('\n🎉 Live navigation complete. Keeping browser open briefly...');
    await wait(8000);

  } catch (err) {
    console.log('❌ Error in live navigation:', err.message);
    try { await page.screenshot({ path: 'screenshots/LIVE_error.png', fullPage: true }); } catch {}
  } finally {
    console.log('🔚 Script completed (browser remains open).');
    // await browser.close();
  }
})();
