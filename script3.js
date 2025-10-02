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
    // Pass chrome checks
    window.chrome = {
      runtime: {}
    };

    // Pass plugin checks
    Object.defineProperty(navigator, 'plugins', {
      get: () => [1, 2, 3, 4, 5]
    });

    // Pass languages check
    Object.defineProperty(navigator, 'languages', {
      get: () => ['en-US', 'en']
    });
  });

  page.setDefaultTimeout(60000);

  console.log(`\n🌐 Navigating to ${url}...`);
  await page.goto(url, { 
    waitUntil: 'networkidle2', 
    timeout: 90000 
  });

  console.log("✅ Page loaded successfully");
  console.log("⏳ Waiting 5s for page to fully stabilize...");
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Create directories if they don't exist
  if (!fs.existsSync('screenshots')) fs.mkdirSync('screenshots');
  if (!fs.existsSync('html-dumps')) fs.mkdirSync('html-dumps');

  // Take initial screenshot
  await page.screenshot({ path: "screenshots/01-initial-load.png", fullPage: true });
  fs.writeFileSync("html-dumps/01-initial-load.html", await page.content());
  console.log("📸 Initial state captured");

  // ===========================================
  // STEP 1: FIND AND CLICK LOGIN BUTTON (TOP NAV)
  // ===========================================
  console.log("\n" + "=".repeat(50));
  console.log("STEP 1: FINDING LOGIN BUTTON IN TOP NAV");
  console.log("=".repeat(50));

  let loginClicked = false;

  try {
    // Strategy 1: Common CSS selectors
    console.log("\n🔍 Strategy 1: Trying CSS selectors...");
    const cssSelectors = [
      'a[href="/login"]',
      'a[href*="login"]',
      'button[class*="login"]',
      '.login-button',
      '.btn-login',
      '[data-testid="login"]',
      '[data-test="login"]'
    ];

    for (const selector of cssSelectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          const isVisible = await page.evaluate(el => {
            const rect = el.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0 && 
                   window.getComputedStyle(el).visibility !== 'hidden' &&
                   window.getComputedStyle(el).display !== 'none';
          }, element);

          if (isVisible) {
            console.log(`✅ Found visible login element: ${selector}`);
            await element.click();
            console.log("✅ Clicked login button");
            loginClicked = true;
            break;
          }
        }
      } catch (e) {
        // Continue to next selector
      }
    }

    if (!loginClicked) {
      console.log("⚠️  Could not find login button with any strategy");
      throw new Error("Login button not found");
    }

    // Wait for login modal/page to load
    console.log("\n⏳ Waiting for login form to appear...");
    await Promise.race([
      page.waitForSelector('input[name="phone-number"], input[type="tel"]', { visible: true, timeout: 10000 }),
      new Promise(resolve => setTimeout(resolve, 5000))
    ]);

    await page.screenshot({ path: "screenshots/02-after-login-click.png", fullPage: true });
    fs.writeFileSync("html-dumps/02-after-login-click.html", await page.content());
    console.log("📸 State captured after login click");

  } catch (err) {
    console.log("❌ Error during login button interaction:", err.message);
    throw err;
  }

  // ===========================================
  // STEP 2: FIND AND FILL LOGIN FORM
  // ===========================================
  console.log("\n" + "=".repeat(50));
  console.log("STEP 2: FINDING AND FILLING LOGIN FORM");
  console.log("=".repeat(50));

  try {
    // Get all frames
    const frames = page.frames();
    console.log(`\n🔍 Found ${frames.length} frame(s) on page`);

    let loginFrame = page;
    let phoneInput = null;
    let passwordInput = null;

    // Function to find inputs in a frame
    const findInputsInFrame = async (frame) => {
      try {
        const phone = await frame.$('input[name="phone-number"], input[name="phone"], input[name="mobile"], input[type="tel"]');
        const pass = await frame.$('input[name="password"], input[type="password"]');
        return { phone, pass, frame };
      } catch (e) {
        return { phone: null, pass: null, frame: null };
      }
    };

    // Try main page first
    console.log("\n🔍 Searching in main page...");
    let result = await findInputsInFrame(page);
    
    if (result.phone && result.pass) {
      phoneInput = result.phone;
      passwordInput = result.pass;
      loginFrame = result.frame;
      console.log("✅ Found login inputs in main page");
    }

    if (!phoneInput || !passwordInput) {
      throw new Error("Login form inputs not found");
    }

    console.log("\n" + "=".repeat(50));
    console.log("✅ LOGIN FORM FOUND - PROCEEDING TO FILL");
    console.log("=".repeat(50));

    // Clear any existing values and focus on phone input
    console.log("\n⌨️  Preparing to enter phone number...");
    await phoneInput.click();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Select all and delete
    await phoneInput.click({ clickCount: 3 });
    await phoneInput.press('Backspace');
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Type phone number with realistic delays
    console.log("⌨️  Typing phone number...");
    for (const char of username) {
      await phoneInput.type(char, { delay: 100 + Math.random() * 100 });
      await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 50));
    }
    console.log("✅ Phone number entered");

    // Trigger input events to ensure validation
    await phoneInput.evaluate(el => {
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.blur();
    });

    // Verify the value was entered correctly
    const phoneValue = await phoneInput.evaluate(el => el.value);
    console.log(`📝 Phone input value: ${phoneValue}`);
    
    // Check phone input validity
    const phoneValidity = await phoneInput.evaluate(el => ({
      valid: el.validity.valid,
      valueMissing: el.validity.valueMissing,
      patternMismatch: el.validity.patternMismatch,
      tooShort: el.validity.tooShort,
      tooLong: el.validity.tooLong
    }));
    console.log(`📝 Phone validation: ${JSON.stringify(phoneValidity)}`);

    // Wait between fields
    await new Promise(resolve => setTimeout(resolve, 800));

    // Type password
    console.log("\n⌨️  Preparing to enter password...");
    await passwordInput.click();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    console.log("⌨️  Typing password...");
    for (const char of password) {
      await passwordInput.type(char, { delay: 80 + Math.random() * 80 });
      await new Promise(resolve => setTimeout(resolve, 40 + Math.random() * 40));
    }
    console.log("✅ Password entered");

    // Trigger input events for password
    await passwordInput.evaluate(el => {
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.blur();
    });

    // Verify password field has value
    const passwordValue = await passwordInput.evaluate(el => el.value);
    console.log(`📝 Password length: ${passwordValue.length} characters`);

    // Check password validity
    const passwordValidity = await passwordInput.evaluate(el => ({
      valid: el.validity.valid,
      valueMissing: el.validity.valueMissing
    }));
    console.log(`📝 Password validation: ${JSON.stringify(passwordValidity)}`);

    await page.screenshot({ path: "screenshots/03-form-filled.png", fullPage: true });
    console.log("📸 Form filled state captured");

    // Wait for validation to complete
    console.log("\n⏳ Waiting for form validation...");
    await new Promise(resolve => setTimeout(resolve, 2000));

    // ===========================================
    // STEP 3: CHECK BUTTON STATE AND SUBMIT
    // ===========================================
    console.log("\n" + "=".repeat(50));
    console.log("STEP 3: CHECKING BUTTON STATE");
    console.log("=".repeat(50));

    // Check login button state
    const loginButton = await loginFrame.$('button.session__form__button');
    
    if (loginButton) {
      const buttonInfo = await loginFrame.evaluate(el => {
        const rect = el.getBoundingClientRect();
        return {
          text: el.textContent.trim(),
          visible: rect.width > 0 && rect.height > 0,
          disabled: el.disabled,
          className: el.className
        };
      }, loginButton);

      console.log(`\n📋 Button Status:`);
      console.log(`   - Text: "${buttonInfo.text}"`);
      console.log(`   - Visible: ${buttonInfo.visible ? '✅' : '❌'}`);
      console.log(`   - Disabled: ${buttonInfo.disabled ? '❌ YES (PROBLEM!)' : '✅ NO'}`);

      if (buttonInfo.disabled) {
        console.log("\n⚠️  LOGIN BUTTON IS DISABLED!");
        console.log("🔍 Investigating why...");

        // Check for validation errors
        const validationInfo = await loginFrame.evaluate(() => {
          // Check all inputs
          const phoneInput = document.querySelector('input[name="phone-number"], input[type="tel"]');
          const passwordInput = document.querySelector('input[type="password"]');
          
          // Check for error messages
          const errors = Array.from(document.querySelectorAll('[class*="error"], [class*="invalid"], [role="alert"]'))
            .map(el => el.textContent.trim())
            .filter(t => t.length > 0 && !t.match(/^New$/i));

          // Check form validity
          const form = document.querySelector('form');
          
          return {
            phoneValue: phoneInput?.value || '',
            phoneValid: phoneInput?.validity.valid,
            phoneRequired: phoneInput?.required,
            phonePattern: phoneInput?.pattern,
            passwordValue: passwordInput?.value ? '***' : '',
            passwordValid: passwordInput?.validity.valid,
            passwordRequired: passwordInput?.required,
            formValid: form?.checkValidity(),
            errors
          };
        });

        console.log("\n📊 Form Validation Details:");
        console.log(`   Phone:`);
        console.log(`     - Value: ${validationInfo.phoneValue}`);
        console.log(`     - Valid: ${validationInfo.phoneValid ? '✅' : '❌'}`);
        console.log(`     - Required: ${validationInfo.phoneRequired}`);
        console.log(`     - Pattern: ${validationInfo.phonePattern || 'none'}`);
        console.log(`   Password:`);
        console.log(`     - Has value: ${validationInfo.passwordValue ? '✅' : '❌'}`);
        console.log(`     - Valid: ${validationInfo.passwordValid ? '✅' : '❌'}`);
        console.log(`     - Required: ${validationInfo.passwordRequired}`);
        console.log(`   Form:`);
        console.log(`     - Overall valid: ${validationInfo.formValid ? '✅' : '❌'}`);
        
        if (validationInfo.errors.length > 0) {
          console.log(`   Errors found:`);
          validationInfo.errors.forEach(err => console.log(`     - ${err}`));
        }

        // Try to force enable the button and click
        console.log("\n⚠️  Attempting to force-enable button and submit...");
        
        const clicked = await loginFrame.evaluate(() => {
          const button = document.querySelector('button.session__form__button');
          if (button) {
            // Remove disabled attribute
            button.disabled = false;
            button.removeAttribute('disabled');
            
            // Try to click
            button.click();
            return true;
          }
          return false;
        });

        if (clicked) {
          console.log("✅ Force-clicked the button");
        } else {
          console.log("❌ Could not force-click button");
        }

      } else {
        console.log("\n✅ Button is enabled, clicking...");
        
        const navigationPromise = page.waitForNavigation({ 
          waitUntil: 'networkidle2', 
          timeout: 30000 
        }).catch(e => {
          console.log("⚠️  Navigation timeout");
          return null;
        });
        
        await loginButton.click();
        console.log("✅ Clicked Login button");
        
        await navigationPromise;
      }
    }

    // Wait for response
    console.log("\n⏳ Waiting for login response...");
    await new Promise(resolve => setTimeout(resolve, 5000));

    await page.screenshot({ path: "screenshots/04-after-submit.png", fullPage: true });
    fs.writeFileSync("html-dumps/04-after-submit.html", await page.content());

    // ===========================================
    // STEP 4: HANDLE PASSWORD BREACH WARNING
    // ===========================================
    console.log("\n" + "=".repeat(50));
    console.log("STEP 4: CHECKING FOR MODALS/WARNINGS");
    console.log("=".repeat(50));

    await new Promise(resolve => setTimeout(resolve, 2000));

    const modalInfo = await page.evaluate(() => {
      const bodyText = document.body.textContent;
      const hasWarning = bodyText.includes('Change your password') || 
                        bodyText.includes('data breach') ||
                        bodyText.includes('Password Manager');
      
      const modalButtons = document.querySelectorAll('[role="dialog"] button, .modal button, [class*="modal"] button');
      const buttonTexts = Array.from(modalButtons).map(btn => btn.textContent.trim());
      
      return {
        hasWarning,
        buttonTexts,
        buttonCount: modalButtons.length
      };
    });

    console.log(`Modal detected: ${modalInfo.hasWarning ? 'YES' : 'NO'}`);
    if (modalInfo.buttonTexts.length > 0) {
      console.log(`Buttons found: ${modalInfo.buttonTexts.join(', ')}`);
    }

    if (modalInfo.hasWarning) {
      console.log("⚠️  Password breach warning detected - dismissing...");
      
      try {
        const okButtons = await page.$x("//button[contains(translate(text(), 'OK', 'ok'), 'ok')]");
        if (okButtons.length > 0) {
          const navigationPromise = page.waitForNavigation({ 
            waitUntil: 'networkidle2', 
            timeout: 15000 
          }).catch(() => null);
          
          await okButtons[0].click();
          console.log("✅ Clicked OK button");
          
          await navigationPromise;
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (e) {
        console.log("⚠️  Could not dismiss modal");
      }
    }

    // ===========================================
    // STEP 5: VERIFY LOGIN SUCCESS
    // ===========================================
    console.log("\n" + "=".repeat(50));
    console.log("STEP 5: VERIFYING LOGIN SUCCESS");
    console.log("=".repeat(50));

    await new Promise(resolve => setTimeout(resolve, 3000));

    const currentUrl = page.url();
    console.log(`\n📍 Current URL: ${currentUrl}`);

    const loginStatus = await page.evaluate(() => {
      const onLoginPage = window.location.href.includes('/login');
      
      const allButtons = document.querySelectorAll('a, button');
      const hasLogout = Array.from(allButtons).some(el => {
        const text = el.textContent.toLowerCase();
        return text.includes('logout') || text.includes('log out') || text.includes('sign out');
      });
      
      const hasHomeElements = document.querySelectorAll(
        '[class*="jackpot"], [class*="live-betting"], [class*="sports"], .home, [class*="homepage"]'
      ).length > 0;
      
      const errorElements = document.querySelectorAll('[class*="error"], [class*="alert"], .message, [role="alert"]');
      const errors = Array.from(errorElements)
        .map(el => el.textContent.trim())
        .filter(t => t.length > 3 && !t.match(/^New$/i) && t.length < 200);
      
      return {
        onLoginPage,
        hasLogout,
        hasHomeElements,
        errors,
        title: document.title
      };
    });

    console.log("\n📊 Login Status:");
    console.log(`   - On login page: ${loginStatus.onLoginPage ? '❌ YES' : '✅ NO'}`);
    console.log(`   - Logout button: ${loginStatus.hasLogout ? '✅ YES' : '❌ NO'}`);
    console.log(`   - Homepage elements: ${loginStatus.hasHomeElements ? '✅ YES' : '❌ NO'}`);
    console.log(`   - Page title: ${loginStatus.title}`);

    if (loginStatus.errors.length > 0) {
      console.log(`\n⚠️  Errors:`);
      loginStatus.errors.forEach(err => console.log(`   - ${err}`));
    }

    const isSuccessfulLogin = !loginStatus.onLoginPage && 
                             (loginStatus.hasLogout || loginStatus.hasHomeElements);

    if (isSuccessfulLogin) {
      console.log("\n" + "=".repeat(50));
      console.log("🎉 LOGIN SUCCESSFUL!");
      console.log("🏠 HOMEPAGE LOADED");
      console.log("=".repeat(50));
    } else {
      console.log("\n" + "=".repeat(50));
      console.log("❌ LOGIN FAILED");
      console.log("=".repeat(50));
      console.log("\n💡 Common reasons:");
      console.log("   - Phone number format invalid (needs country code?)");
      console.log("   - Password incorrect");
      console.log("   - Form validation not passing");
    }

    await page.screenshot({ path: "screenshots/05-final-state.png", fullPage: true });
    fs.writeFileSync("html-dumps/05-final-state.html", await page.content());
    console.log("\n📸 Final state captured");

  } catch (err) {
    console.log("\n❌ Error:", err.message);
    
    await page.screenshot({ path: "screenshots/error-state.png", fullPage: true });
    fs.writeFileSync("html-dumps/error-state.html", await page.content());
    
    throw err;
  }

  console.log("\n" + "=".repeat(50));
  console.log("⏸️  PAUSING FOR 5 SECONDS");
  console.log("=".repeat(50));
  
  await new Promise(resolve => setTimeout(resolve, 5000));

  console.log("\n🔚 Script completed");
  console.log("💡 Browser remains open for inspection");
  
  // await browser.close();
})();
