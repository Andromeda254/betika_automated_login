const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
require('dotenv').config();

// Use stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

(async () => {
  const username = process.env.BETIKA_USERNAME;
  const password = process.env.BETIKA_PASSWORD;
  const url = "https://betika.com";

  console.log(`🚀 Launching browser with stealth mode...`);
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

  // Set realistic viewport
  await page.setViewport({ width: 1920, height: 1080 });

  // Additional stealth measures
  await page.evaluateOnNewDocument(() => {
    window.chrome = { runtime: {} };
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
  });

  page.setDefaultTimeout(60000);

  // Create directories
  if (!fs.existsSync('screenshots')) fs.mkdirSync('screenshots');
  if (!fs.existsSync('html-dumps')) fs.mkdirSync('html-dumps');

  // ===========================================
  // HELPER FUNCTIONS
  // ===========================================
  
  const takeScreenshot = async (name, description) => {
    await page.screenshot({ path: `screenshots/${name}.png`, fullPage: false });
    console.log(`📸 ${description}`);
  };

  const waitRandom = async (min = 1000, max = 3000) => {
    const delay = min + Math.random() * (max - min);
    await new Promise(resolve => setTimeout(resolve, delay));
  };

  const scrollPage = async (direction = 'down', amount = 300) => {
    await page.evaluate((dir, amt) => {
      if (dir === 'down') {
        window.scrollBy(0, amt);
      } else if (dir === 'up') {
        window.scrollBy(0, -amt);
      }
    }, direction, amount);
    await waitRandom(500, 1000);
  };

  const clickElement = async (selector, description) => {
    try {
      const element = await page.$(selector);
      if (element) {
        const isVisible = await page.evaluate(el => {
          const rect = el.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        }, element);

        if (isVisible) {
          await element.click();
          console.log(`✅ Clicked: ${description}`);
          await waitRandom(1000, 2000);
          return true;
        }
      }
      console.log(`⚠️  Not found: ${description}`);
      return false;
    } catch (e) {
      console.log(`❌ Error clicking ${description}: ${e.message}`);
      return false;
    }
  };

  // ===========================================
  // STEP 1: LOGIN
  // ===========================================
  console.log("\n" + "=".repeat(60));
  console.log("STEP 1: LOGGING IN");
  console.log("=".repeat(60));

  await page.goto(url, { waitUntil: 'networkidle2', timeout: 90000 });
  console.log("✅ Page loaded");
  await waitRandom(3000, 5000);
  await takeScreenshot("01-homepage", "Homepage loaded");

  // Click login button
  const loginSelectors = ['a[href*="login"]', 'button[class*="login"]'];
  let loginClicked = false;
  
  for (const selector of loginSelectors) {
    if (await clickElement(selector, "Login button")) {
      loginClicked = true;
      break;
    }
  }

  if (!loginClicked) {
    console.log("❌ Could not find login button");
    throw new Error("Login button not found");
  }

  await waitRandom(2000, 3000);
  await takeScreenshot("02-login-modal", "Login modal opened");

  // Fill login form
  console.log("\n⌨️  Filling login form...");
  const phoneInput = await page.$('input[name="phone-number"], input[type="tel"]');
  const passwordInput = await page.$('input[type="password"]');

  if (phoneInput && passwordInput) {
    await phoneInput.click();
    await waitRandom(300, 500);
    await phoneInput.type(username, { delay: 100 });
    console.log("✅ Phone number entered");

    await passwordInput.click();
    await waitRandom(300, 500);
    await passwordInput.type(password, { delay: 100 });
    console.log("✅ Password entered");

    // Trigger validation
    await passwordInput.evaluate(el => {
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.blur();
    });

    await waitRandom(2000, 3000);
    await takeScreenshot("03-form-filled", "Form filled");

    // Click login button or force submit
    const loginButton = await page.$('button.session__form__button');
    if (loginButton) {
      const isDisabled = await page.evaluate(el => el.disabled, loginButton);
      
      if (isDisabled) {
        console.log("⚠️  Button disabled, forcing enable...");
        await page.evaluate(() => {
          const btn = document.querySelector('button.session__form__button');
          if (btn) {
            btn.disabled = false;
            btn.click();
          }
        });
      } else {
        await loginButton.click();
      }
      console.log("✅ Clicked login button");
    } else {
      await passwordInput.press('Enter');
      console.log("✅ Pressed Enter");
    }

    await waitRandom(5000, 7000);
    await takeScreenshot("04-after-login", "After login attempt");

    // Handle password breach modal if present
    const okButtons = await page.$x("//button[contains(translate(text(), 'OK', 'ok'), 'ok')]");
    if (okButtons.length > 0) {
      await okButtons[0].click();
      console.log("✅ Dismissed password warning");
      await waitRandom(3000, 5000);
    }

    // Verify login
    const currentUrl = page.url();
    const onLoginPage = currentUrl.includes('/login');
    
    if (onLoginPage) {
      console.log("❌ Login failed - still on login page");
      console.log(`Current URL: ${currentUrl}`);
      await takeScreenshot("05-login-failed", "Login failed");
      throw new Error("Login unsuccessful");
    }

    console.log("✅ Login successful!");
    await takeScreenshot("05-logged-in", "Successfully logged in");
  }

  // ===========================================
  // STEP 2: EXPLORE HOMEPAGE
  // ===========================================
  console.log("\n" + "=".repeat(60));
  console.log("STEP 2: EXPLORING HOMEPAGE");
  console.log("=".repeat(60));

  await waitRandom(2000, 3000);

  // Get account balance if visible
  const accountInfo = await page.evaluate(() => {
    const balanceEl = document.querySelector('[class*="balance"], [class*="wallet"]');
    return balanceEl ? balanceEl.textContent.trim() : 'Not found';
  });
  console.log(`💰 Account info: ${accountInfo}`);

  // Scroll through homepage
  console.log("\n📜 Scrolling through homepage...");
  for (let i = 0; i < 3; i++) {
    await scrollPage('down', 400);
    console.log(`   Scrolled down ${i + 1}/3`);
  }
  await takeScreenshot("06-homepage-scrolled", "Homepage scrolled");

  await waitRandom(2000, 3000);

  // Scroll back up
  for (let i = 0; i < 3; i++) {
    await scrollPage('up', 400);
  }

  // ===========================================
  // STEP 3: NAVIGATE TO LIVE BETTING
  // ===========================================
  console.log("\n" + "=".repeat(60));
  console.log("STEP 3: NAVIGATING TO LIVE BETTING");
  console.log("=".repeat(60));

  const liveBettingClicked = await clickElement(
    'a[href*="live"], [class*="live-betting"], [class*="live"]',
    "Live betting section"
  );

  if (liveBettingClicked) {
    await waitRandom(3000, 5000);
    await takeScreenshot("07-live-betting", "Live betting page");

    // Get live matches
    const liveMatches = await page.evaluate(() => {
      const matches = document.querySelectorAll('[class*="match"], [class*="game"], [class*="event"]');
      return Array.from(matches).slice(0, 5).map(m => m.textContent.trim().substring(0, 100));
    });

    console.log(`\n📊 Found ${liveMatches.length} live events:`);
    liveMatches.forEach((match, idx) => {
      console.log(`   ${idx + 1}. ${match}`);
    });

    // Scroll through live betting
    await scrollPage('down', 500);
    await waitRandom(2000, 3000);
  }

  // ===========================================
  // STEP 4: NAVIGATE TO JACKPOTS
  // ===========================================
  console.log("\n" + "=".repeat(60));
  console.log("STEP 4: CHECKING JACKPOTS");
  console.log("=".repeat(60));

  const jackpotClicked = await clickElement(
    'a[href*="jackpot"], [class*="jackpot"]',
    "Jackpots section"
  );

  if (jackpotClicked) {
    await waitRandom(3000, 5000);
    await takeScreenshot("08-jackpots", "Jackpots page");

    // Get jackpot information
    const jackpotInfo = await page.evaluate(() => {
      const jackpots = document.querySelectorAll('[class*="jackpot"]');
      return Array.from(jackpots).slice(0, 3).map(j => {
        const text = j.textContent.trim();
        return text.substring(0, 150);
      });
    });

    console.log(`\n🎰 Jackpot information:`);
    jackpotInfo.forEach((info, idx) => {
      console.log(`   ${idx + 1}. ${info}`);
    });

    await scrollPage('down', 400);
    await waitRandom(2000, 3000);
  }

  // ===========================================
  // STEP 5: NAVIGATE TO SPORTS BETTING
  // ===========================================
  console.log("\n" + "=".repeat(60));
  console.log("STEP 5: EXPLORING SPORTS BETTING");
  console.log("=".repeat(60));

  const sportsClicked = await clickElement(
    'a[href*="sports"], [class*="sports"], a[href="/"]',
    "Sports betting"
  );

  if (sportsClicked) {
    await waitRandom(3000, 5000);
    await takeScreenshot("09-sports-betting", "Sports betting page");

    // Look for popular sports
    const sports = await page.evaluate(() => {
      const sportLinks = document.querySelectorAll('a[class*="sport"], [class*="sport-"]');
      return Array.from(sportLinks).slice(0, 10).map(s => s.textContent.trim());
    });

    console.log(`\n⚽ Available sports:`);
    sports.forEach((sport, idx) => {
      if (sport.length > 0) {
        console.log(`   ${idx + 1}. ${sport}`);
      }
    });

    // Click on a sport (e.g., Football/Soccer)
    const footballClicked = await clickElement(
      'a[href*="football"], a[href*="soccer"]',
      "Football section"
    );

    if (footballClicked) {
      await waitRandom(3000, 5000);
      await takeScreenshot("10-football", "Football betting");

      // Get available matches
      const matches = await page.evaluate(() => {
        const matchElements = document.querySelectorAll('[class*="match"], [class*="game"], [class*="fixture"]');
        return Array.from(matchElements).slice(0, 5).map(m => ({
          text: m.textContent.trim().substring(0, 100)
        }));
      });

      console.log(`\n⚽ Football matches:`);
      matches.forEach((match, idx) => {
        console.log(`   ${idx + 1}. ${match.text}`);
      });

      await scrollPage('down', 500);
      await waitRandom(2000, 3000);
    }
  }

  // ===========================================
  // STEP 6: CHECK MY BETS / ACCOUNT
  // ===========================================
  console.log("\n" + "=".repeat(60));
  console.log("STEP 6: CHECKING ACCOUNT & BETS");
  console.log("=".repeat(60));

  const myBetsClicked = await clickElement(
    'a[href*="my-bets"], a[href*="mybets"], [class*="my-bets"]',
    "My bets section"
  );

  if (myBetsClicked) {
    await waitRandom(3000, 5000);
    await takeScreenshot("11-my-bets", "My bets page");

    // Get betting history
    const bets = await page.evaluate(() => {
      const betElements = document.querySelectorAll('[class*="bet"], [class*="ticket"]');
      return Array.from(betElements).slice(0, 5).map(b => b.textContent.trim().substring(0, 100));
    });

    if (bets.length > 0) {
      console.log(`\n🎫 Recent bets:`);
      bets.forEach((bet, idx) => {
        console.log(`   ${idx + 1}. ${bet}`);
      });
    } else {
      console.log("   No recent bets found");
    }
  }

  // Try to access account/profile
  const accountClicked = await clickElement(
    'a[href*="account"], a[href*="profile"], [class*="account"], [class*="profile"]',
    "Account/Profile"
  );

  if (accountClicked) {
    await waitRandom(3000, 5000);
    await takeScreenshot("12-account", "Account page");

    const accountDetails = await page.evaluate(() => {
      const details = document.querySelector('[class*="account"], [class*="profile"]');
      return details ? details.textContent.trim().substring(0, 200) : 'Not found';
    });

    console.log(`\n👤 Account details: ${accountDetails}`);
  }

  // ===========================================
  // STEP 7: INTERACT WITH BET SLIP (OPTIONAL)
  // ===========================================
  console.log("\n" + "=".repeat(60));
  console.log("STEP 7: EXPLORING BET SLIP");
  console.log("=".repeat(60));

  // Look for betslip
  const betslipClicked = await clickElement(
    '[class*="betslip"], [class*="bet-slip"], a[href*="betslip"]',
    "Bet slip"
  );

  if (betslipClicked) {
    await waitRandom(2000, 3000);
    await takeScreenshot("13-betslip", "Bet slip");

    const betslipInfo = await page.evaluate(() => {
      const betslip = document.querySelector('[class*="betslip"], [class*="bet-slip"]');
      return betslip ? betslip.textContent.trim().substring(0, 300) : 'Empty';
    });

    console.log(`\n🎟️  Bet slip: ${betslipInfo}`);
  }

  // ===========================================
  // STEP 8: NAVIGATE THROUGH MENU OPTIONS
  // ===========================================
  console.log("\n" + "=".repeat(60));
  console.log("STEP 8: EXPLORING NAVIGATION MENU");
  console.log("=".repeat(60));

  // Try to find and explore menu items
  const menuItems = await page.evaluate(() => {
    const navItems = document.querySelectorAll('nav a, header a, [class*="menu"] a, [class*="nav"] a');
    return Array.from(navItems)
      .map(item => ({
        text: item.textContent.trim(),
        href: item.getAttribute('href')
      }))
      .filter(item => item.text.length > 0 && item.text.length < 50)
      .slice(0, 15);
  });

  console.log(`\n🧭 Navigation menu items:`);
  menuItems.forEach((item, idx) => {
    console.log(`   ${idx + 1}. ${item.text} (${item.href})`);
  });

  // Click on a few random menu items
  for (let i = 0; i < Math.min(3, menuItems.length); i++) {
    const randomItem = menuItems[Math.floor(Math.random() * menuItems.length)];
    if (randomItem.href && !randomItem.href.includes('logout')) {
      console.log(`\n🔗 Navigating to: ${randomItem.text}`);
      
      try {
        await page.goto(`https://betika.com${randomItem.href}`, { 
          waitUntil: 'networkidle2', 
          timeout: 30000 
        });
        await waitRandom(3000, 5000);
        await takeScreenshot(`14-nav-${i}`, `Navigated to ${randomItem.text}`);
      } catch (e) {
        console.log(`   ⚠️  Could not navigate to ${randomItem.text}`);
      }
    }
  }

  // ===========================================
  // STEP 9: FINAL SUMMARY
  // ===========================================
  console.log("\n" + "=".repeat(60));
  console.log("NAVIGATION COMPLETE - SUMMARY");
  console.log("=".repeat(60));

  const finalUrl = page.url();
  const finalTitle = await page.title();

  console.log(`\n📊 Session Summary:`);
  console.log(`   - Current URL: ${finalUrl}`);
  console.log(`   - Current Page: ${finalTitle}`);
  console.log(`   - Screenshots taken: Check 'screenshots' folder`);
  console.log(`   - Session duration: ~2-3 minutes`);

  await takeScreenshot("15-final-state", "Final state");

  // ===========================================
  // FINAL WAIT
  // ===========================================
  console.log("\n" + "=".repeat(60));
  console.log("⏸️  PAUSING FOR 10 SECONDS FOR INSPECTION");
  console.log("=".repeat(60));
  console.log("💡 You can now manually interact with the site");
  
  await new Promise(resolve => setTimeout(resolve, 10000));

  console.log("\n🎉 SCRIPT COMPLETED SUCCESSFULLY");
  console.log("💡 Browser will remain open. Close manually or uncomment browser.close()");
  
  // Uncomment to auto-close:
  // await browser.close();
})();
