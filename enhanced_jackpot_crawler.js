const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const ExternalIntelligenceEngine = require('./external_intelligence_engine');
require('dotenv').config();

// Use stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

// Initialize External Intelligence Engine
const intelligenceEngine = new ExternalIntelligenceEngine();

(async () => {
  const username = process.env.BETIKA_USERNAME;
  const password = process.env.BETIKA_PASSWORD;
  const baseUrl = 'https://www.betika.com/en-ke';
  const homeUrl = 'https://betika.com';

  // Ensure output directories
  const outputDirs = ['screenshots', 'html-dumps', 'jackpot-data', 'match-insights'];
  outputDirs.forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
  });

  console.log('🚀 Enhanced Jackpot Crawler - Launching browser with stealth mode...');
  console.log(`📱 Username: ${username ? '✓ Loaded' : '✗ Missing'}`);
  console.log(`🔑 Password: ${password ? '✓ Loaded' : '✗ Missing'}`);
  console.log('🎯 Target Date: 04/10/2025 Jackpot Matches');

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

  // Enhanced stealth configuration
  await page.evaluateOnNewDocument(() => {
    window.chrome = { runtime: {} };
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  page.setDefaultTimeout(60000);

  // Network monitoring for API calls and data collection
  const capturedData = {
    apiResponses: [],
    matchData: [],
    jackpotData: [],
    oddsData: []
  };

  const interestingHosts = ['betika.com', 'api.betika.com', 'live.betika.com', 'bidr.io', 'eskimi.com'];
  
  page.on('response', async (response) => {
    try {
      const url = response.url();
      const host = new URL(url).hostname;
      
      if (interestingHosts.some(h => host.includes(h))) {
        const ct = response.headers()['content-type'] || '';
        console.log(`📡 [${response.status()}] ${host} ${ct.includes('json') ? '(json)' : ''} -> ${url.substring(0, 140)}`);
        
        // Capture JSON responses for analysis
        if (ct.includes('json') && response.status() === 200) {
          try {
            const jsonData = await response.json();
            capturedData.apiResponses.push({
              url,
              timestamp: new Date().toISOString(),
              data: jsonData
            });
            
            // Check for jackpot-related data
            const jsonStr = JSON.stringify(jsonData).toLowerCase();
            if (jsonStr.includes('jackpot') || jsonStr.includes('04/10/2025') || jsonStr.includes('2025-10-04')) {
              console.log('🎰 JACKPOT DATA DETECTED!');
              capturedData.jackpotData.push({
                url,
                timestamp: new Date().toISOString(),
                data: jsonData
              });
            }
          } catch (e) {
            // Non-JSON or parsing error, skip
          }
        }
      }
    } catch (e) {
      // URL parsing error, skip
    }
  });

  // Helper functions
  const wait = (ms) => new Promise(r => setTimeout(r, ms));

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

  async function clickByText(selectors, textVariants) {
    for (const sel of selectors) {
      const els = await page.$$(sel);
      for (const el of els) {
        const txt = (await page.evaluate(e => e.textContent || '', el)).trim().toLowerCase();
        if (textVariants.some(t => txt.includes(t))) {
          await el.click();
          console.log(`✅ Clicked: ${txt.substring(0, 50)}...`);
          return true;
        }
      }
    }
    return false;
  }

  async function incrementalScroll(total = 4, step = 1200, delay = 800) {
    for (let i = 0; i < total; i++) {
      await page.evaluate((s) => window.scrollBy(0, s), step);
      await wait(delay);
    }
  }

  async function savePageData(pageName, additionalData = {}) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${pageName}_${timestamp}`;
    
    // Save screenshot
    await page.screenshot({ 
      path: `screenshots/${filename}.png`, 
      fullPage: true 
    });
    
    // Save HTML
    const html = await page.content();
    fs.writeFileSync(`html-dumps/${filename}.html`, html);
    
    // Extract and save match data
    const matchData = await extractMatchData();
    const pageData = {
      page: pageName,
      timestamp: new Date().toISOString(),
      url: page.url(),
      matchData,
      ...additionalData
    };
    
    fs.writeFileSync(`match-insights/${filename}.json`, JSON.stringify(pageData, null, 2));
    console.log(`💾 Saved data for ${pageName}`);
    
    return pageData;
  }

  async function extractMatchData() {
    return await page.evaluate(() => {
      const matches = [];
      const selectors = [
        '[class*="match"]',
        '[class*="event"]',
        '[class*="game"]',
        '[data-testid*="match"]',
        '[data-testid*="event"]',
        '.sport-event',
        '.betting-event'
      ];

      selectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(element => {
          const text = element.textContent || '';
          const links = Array.from(element.querySelectorAll('a')).map(a => a.href);
          
          // Look for soccer/football matches
          if (text.toLowerCase().includes('football') || 
              text.toLowerCase().includes('soccer') ||
              text.includes('vs') || 
              text.includes('v ')) {
            
            // Extract team names for external intelligence
            const teams = extractTeamsFromText(text);
            
            // Extract visible odds if available
            const odds = extractOddsFromElement(element);
            
            matches.push({
              text: text.trim(),
              teams: teams,
              odds: odds,
              links,
              html: element.outerHTML.substring(0, 500),
              selector,
              timestamp: new Date().toISOString()
            });
          }
        });
      });

      // Helper function to extract team names
      function extractTeamsFromText(matchText) {
        const teams = [];
        const separators = [' vs ', ' v ', ' - ', ' : '];
        
        for (const sep of separators) {
          if (matchText.includes(sep)) {
            const parts = matchText.split(sep);
            if (parts.length === 2) {
              parts.forEach(part => {
                const cleaned = part.trim().replace(/[^\w\s]/g, '').trim();
                if (cleaned.length > 2 && cleaned.length < 30) {
                  teams.push(cleaned);
                }
              });
              break;
            }
          }
        }
        return teams;
      }
      
      // Helper function to extract odds from element
      function extractOddsFromElement(element) {
        const odds = {};
        const oddsElements = element.querySelectorAll('[class*="odd"], [class*="bet"], [data-testid*="odd"]');
        
        oddsElements.forEach((oddEl, index) => {
          const oddValue = oddEl.textContent.trim();
          if (oddValue && /^\d+(\.\d+)?$/.test(oddValue)) {
            odds[`option_${index + 1}`] = parseFloat(oddValue);
          }
        });
        
        return odds;
      }

      return matches;
    });
  }

  async function searchForJackpotDate() {
    const targetDateVariants = [
      '04/10/2025',
      '4/10/2025', 
      '2025-10-04',
      'Oct 4, 2025',
      'October 4, 2025',
      '4th October 2025'
    ];

    const dateFound = await page.evaluate((dates) => {
      const pageText = document.body.textContent || '';
      return dates.some(date => pageText.includes(date));
    }, targetDateVariants);

    if (dateFound) {
      console.log('📅 TARGET DATE FOUND ON PAGE!');
      const elements = await page.evaluate((dates) => {
        const results = [];
        dates.forEach(date => {
          const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            null,
            false
          );
          
          let node;
          while (node = walker.nextNode()) {
            if (node.nodeValue.includes(date)) {
              const parent = node.parentElement;
              results.push({
                date,
                text: parent.textContent.trim(),
                html: parent.outerHTML
              });
            }
          }
        });
        return results;
      }, targetDateVariants);

      capturedData.jackpotData.push({
        type: 'date_match',
        timestamp: new Date().toISOString(),
        url: page.url(),
        elements
      });
    }

    return dateFound;
  }

  try {
    // ===== PHASE 1: LOGIN =====
    console.log(`\n🌐 Phase 1: Navigating to ${homeUrl}...`);
    await page.goto(homeUrl, { waitUntil: 'networkidle2', timeout: 90000 });
    await wait(4000);

    await savePageData('01_homepage');

    // Login process
    const loginSelectors = [
      'a[href="/login"]',
      'a[href*="login"]',
      'button[class*="login"]',
      '.login-button',
      '.btn-login',
      '[data-testid="login"]'
    ];

    let loginClicked = false;
    for (const sel of loginSelectors) {
      const el = await page.$(sel);
      if (el) {
        const visible = await page.evaluate(e => {
          const rect = e.getBoundingClientRect();
          const style = getComputedStyle(e);
          return rect.width > 0 && rect.height > 0 && 
                 style.visibility !== 'hidden' && style.display !== 'none';
        }, el);
        
        if (visible) { 
          await el.click(); 
          loginClicked = true; 
          console.log('✅ Login button clicked');
          break; 
        }
      }
    }

    if (!loginClicked) throw new Error('Login button not found');

    await Promise.race([
      page.waitForSelector('input[name="phone-number"], input[type="tel"]', { visible: true }),
      wait(6000)
    ]);

    // Fill credentials
    const phoneInput = await page.$('input[name="phone-number"], input[name="phone"], input[type="tel"]');
    const passInput = await page.$('input[type="password"]');
    
    if (!phoneInput || !passInput) throw new Error('Login inputs not found');

    await phoneInput.click({ clickCount: 3 });
    await page.keyboard.press('Backspace');
    await phoneInput.type(username, { delay: 80 });

    await passInput.click();
    await passInput.type(password, { delay: 70 });

    const submitBtn = await page.$('button.session__form__button, button[type="submit"]');
    if (submitBtn) await submitBtn.click();

    await Promise.race([
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => null),
      wait(5000)
    ]);

    const loggedIn = await page.evaluate(() => {
      const allText = Array.from(document.querySelectorAll('a,button')).map(e => (e.textContent||'').toLowerCase());
      const hasLogout = allText.some(t => t.includes('logout') || t.includes('sign out'));
      return !location.href.includes('/login') && hasLogout;
    });

    console.log(loggedIn ? '✅ Successfully logged in' : '⚠️ Could not verify login (continuing)');

    // ===== PHASE 2: HOME PAGE ANALYSIS =====
    console.log('\n🏠 Phase 2: Analyzing HOME page...');
    await page.goto(homeUrl, { waitUntil: 'networkidle2' });
    await wait(3000);
    
    await incrementalScroll(8, 1200, 1000);
    await searchForJackpotDate();
    await savePageData('02_home_analysis');

    // Look for jackpot section on homepage
    const jackpotHomepageClicked = await clickByText([
      'a', 'button', '[role="tab"]', 'li', '[data-testid]', '[class*="jackpot"]'
    ], ['jackpot', 'grand jackpot', 'midweek jackpot']);

    if (jackpotHomepageClicked) {
      await wait(4000);
      await incrementalScroll(6, 1000, 800);
      await searchForJackpotDate();
      await savePageData('03_jackpot_from_home');
    }

    // ===== PHASE 3: LIVE BETTING SECTION =====
    console.log('\n🏟️ Phase 3: Navigating to LIVE betting...');
    
    const liveNavClicked = await clickByText([
      'a', 'button', '[role="tab"]', 'li', '[data-testid]'
    ], ['live', 'in-play', 'live betting']);

    if (!liveNavClicked) {
      const liveUrl = `${baseUrl}/live-betting`;
      await withRetry(async (attempt) => {
        console.log(`🚚 Direct navigation to Live (attempt ${attempt})...`);
        await page.goto(liveUrl, { waitUntil: 'networkidle2', timeout: 90000 });
      }, { tries: 3, delayMs: 3000, label: 'goto live-betting' });
    }

    await wait(4000);
    await savePageData('04_live_betting_page');

    // Filter for football/soccer in live
    console.log('🎯 Selecting Football/Soccer in Live...');
    const footballInLiveSelected = await withRetry(async () => {
      return await clickByText([
        'button', 'a', 'li', '[role="tab"]', '[data-testid]', '[class*="chip"]', '[class*="filter"]'
      ], ['football', 'soccer']);
    }, { tries: 3, delayMs: 2000, label: 'select football in live' }).catch(() => false);

    if (footballInLiveSelected) {
      await wait(3000);
      await incrementalScroll(10, 1400, 700);
      await searchForJackpotDate();
      await savePageData('05_live_football');
    }

    // Click on live matches to gather odds data
    console.log('🔗 Analyzing live match details...');
    const matchLinks = await page.evaluate(() => {
      const selectors = [
        'a[href*="/match"]', 
        'a[href*="/event"]', 
        'a[href*="/game"]',
        '[class*="match"] a', 
        '[class*="event"] a'
      ];
      
      const urls = new Set();
      selectors.forEach(sel => {
        document.querySelectorAll(sel).forEach(a => {
          const href = a.getAttribute('href') || '';
          if (href && href.length < 200 && !href.startsWith('javascript')) {
            const url = href.startsWith('http') ? href : (location.origin + href);
            urls.add(url);
          }
        });
      });
      return Array.from(urls).filter(u => u.includes('betika.com')).slice(0, 5);
    });

    console.log(`🎮 Found ${matchLinks.length} live matches to analyze`);
    
    let matchIdx = 0;
    for (const matchUrl of matchLinks) {
      matchIdx++;
      console.log(`\n⚽ Analyzing live match ${matchIdx}: ${matchUrl}`);
      
      await withRetry(async (attempt) => {
        await page.goto(matchUrl, { waitUntil: 'networkidle2', timeout: 90000 });
      }, { tries: 2, delayMs: 2500, label: `goto live match ${matchIdx}` }).catch(()=>null);

      await wait(4000);
      await incrementalScroll(6, 1000, 800);
      await searchForJackpotDate();
      
      const matchData = await savePageData(`06_live_match_${matchIdx}`);
      capturedData.matchData.push(matchData);
      
      // Look for odds and betting options
      const oddsData = await page.evaluate(() => {
        const odds = [];
        const oddsSelectors = [
          '[class*="odd"]',
          '[class*="bet"]',
          '[data-testid*="odd"]',
          '.betting-odd',
          '.market-odd'
        ];

        oddsSelectors.forEach(selector => {
          document.querySelectorAll(selector).forEach(element => {
            const text = element.textContent.trim();
            if (text && /^\d+(\.\d+)?$/.test(text)) {
              odds.push({
                value: text,
                selector,
                parent: element.parentElement?.textContent?.trim()
              });
            }
          });
        });

        return odds;
      });

      if (oddsData.length > 0) {
        capturedData.oddsData.push({
          matchUrl,
          timestamp: new Date().toISOString(),
          odds: oddsData
        });
        console.log(`📊 Collected ${oddsData.length} odds from match ${matchIdx}`);
      }
    }

    // ===== PHASE 4: JACKPOT SECTION =====
    console.log('\n🎰 Phase 4: Navigating to JACKPOT section...');
    
    // Try multiple ways to access jackpot
    const jackpotUrls = [
      `${baseUrl}/jackpot`,
      `${baseUrl}/games/jackpot`,
      `${baseUrl}/betting/jackpot`
    ];

    let jackpotAccessed = false;
    
    // First try clicking jackpot navigation
    const jackpotNavClicked = await clickByText([
      'a', 'button', '[role="tab"]', 'li', '[data-testid]', '[class*="nav"]'
    ], ['jackpot', 'grand jackpot', 'midweek jackpot', 'sportpesa jackpot']);

    if (jackpotNavClicked) {
      jackpotAccessed = true;
      await wait(4000);
    } else {
      // Try direct URLs
      for (const jackpotUrl of jackpotUrls) {
        try {
          console.log(`🎯 Trying jackpot URL: ${jackpotUrl}`);
          await page.goto(jackpotUrl, { waitUntil: 'networkidle2', timeout: 60000 });
          await wait(3000);
          
          // Check if we successfully reached a jackpot page
          const isJackpotPage = await page.evaluate(() => {
            const pageText = document.body.textContent.toLowerCase();
            return pageText.includes('jackpot') && (pageText.includes('matches') || pageText.includes('games'));
          });
          
          if (isJackpotPage) {
            jackpotAccessed = true;
            console.log('✅ Successfully accessed jackpot page');
            break;
          }
        } catch (e) {
          console.log(`❌ Failed to access ${jackpotUrl}: ${e.message}`);
        }
      }
    }

    if (jackpotAccessed) {
      await incrementalScroll(12, 1200, 1000);
      const dateFoundInJackpot = await searchForJackpotDate();
      
      if (dateFoundInJackpot) {
        console.log('🎉 JACKPOT DATE MATCH FOUND!');
      }
      
      await savePageData('07_jackpot_main');

      // Look for jackpot matches and predictions
      const jackpotMatches = await page.evaluate(() => {
        const matches = [];
        const selectors = [
          '[class*="jackpot"]',
          '[class*="prediction"]',
          '[class*="match"]',
          '[data-testid*="jackpot"]',
          '.game-row',
          '.match-row'
        ];

        selectors.forEach(selector => {
          document.querySelectorAll(selector).forEach(element => {
            const text = element.textContent;
            if (text && text.toLowerCase().includes('v')) {
              matches.push({
                text: text.trim(),
                html: element.outerHTML.substring(0, 300),
                selector
              });
            }
          });
        });

        return matches;
      });

      console.log(`🎲 Found ${jackpotMatches.length} potential jackpot matches`);
      
      capturedData.jackpotData.push({
        type: 'jackpot_matches',
        timestamp: new Date().toISOString(),
        url: page.url(),
        matches: jackpotMatches
      });

      // Try to click on jackpot matches for detailed view
      const jackpotMatchElements = await page.$$('[class*="jackpot"] a, [class*="match"] a, [data-testid*="jackpot"] a');
      
      let jackpotMatchIdx = 0;
      for (const element of jackpotMatchElements.slice(0, 3)) {
        jackpotMatchIdx++;
        try {
          console.log(`🎯 Clicking jackpot match ${jackpotMatchIdx}`);
          await element.click();
          await wait(3000);
          await incrementalScroll(4, 800, 600);
          await searchForJackpotDate();
          await savePageData(`08_jackpot_match_${jackpotMatchIdx}`);
          await page.goBack();
          await wait(2000);
        } catch (e) {
          console.log(`⚠️ Error accessing jackpot match ${jackpotMatchIdx}: ${e.message}`);
        }
      }
    } else {
      console.log('⚠️ Could not access jackpot section');
    }

    // ===== PHASE 5: EXTERNAL INTELLIGENCE ANALYSIS =====
    console.log('\n🧠 Phase 5: Running External Intelligence Analysis...');
    
    // Prepare matches for external intelligence analysis
    const allMatches = [];
    capturedData.matchData.forEach(pageData => {
      if (pageData.matchData && pageData.matchData.length > 0) {
        allMatches.push(...pageData.matchData);
      }
    });
    
    console.log(`🎯 Analyzing ${allMatches.length} matches with external intelligence...`);
    
    let intelligenceReport = null;
    try {
      if (allMatches.length > 0) {
        intelligenceReport = await intelligenceEngine.gatherIntelligence(allMatches);
        console.log('✅ External intelligence analysis completed');
      } else {
        console.log('⚠️ No matches found for external intelligence analysis');
      }
    } catch (error) {
      console.log('❌ External intelligence analysis failed:', error.message);
    }
    
    // ===== PHASE 6: FINAL DATA COLLECTION =====
    console.log('\n💾 Phase 6: Final data collection and comprehensive analysis...');
    
    // Save all captured data with intelligence
    const finalReport = {
      timestamp: new Date().toISOString(),
      targetDate: '04/10/2025',
      summary: {
        totalApiResponses: capturedData.apiResponses.length,
        jackpotDataItems: capturedData.jackpotData.length,
        matchDataItems: capturedData.matchData.length,
        oddsDataItems: capturedData.oddsData.length,
        intelligenceAnalyzed: allMatches.length,
        externalIntelligence: intelligenceReport ? 'completed' : 'failed'
      },
      capturedData,
      intelligenceReport
    };

    fs.writeFileSync('jackpot-data/final_report.json', JSON.stringify(finalReport, null, 2));
    console.log('📊 Final report with intelligence saved to jackpot-data/final_report.json');

    // Generate insights summary
    const insights = [];
    
    if (capturedData.jackpotData.length > 0) {
      insights.push(`✅ Found ${capturedData.jackpotData.length} jackpot-related data items`);
    }
    
    if (capturedData.matchData.length > 0) {
      insights.push(`⚽ Analyzed ${capturedData.matchData.length} matches`);
    }
    
    if (capturedData.oddsData.length > 0) {
      insights.push(`📊 Collected odds data from ${capturedData.oddsData.length} matches`);
    }

    const insightsReport = {
      insights,
      recommendations: [
        "Monitor API endpoints that returned jackpot data for real-time updates",
        "Analyze odds patterns from collected match data",
        "Set up automated monitoring for 04/10/2025 date appearances",
        "Cross-reference match data with historical jackpot outcomes"
      ],
      nextSteps: [
        "Schedule regular crawls leading up to 04/10/2025",
        "Implement real-time monitoring of detected API endpoints",
        "Develop predictive models using collected odds data",
        "Create alerts for new jackpot matches with target date"
      ]
    };

    fs.writeFileSync('jackpot-data/insights_summary.json', JSON.stringify(insightsReport, null, 2));
    
    console.log('\n🎉 Enhanced Jackpot Crawler completed successfully!');
    console.log(`📈 Insights: ${insights.join(', ')}`);
    console.log('💡 Check jackpot-data/ directory for detailed results');

    await wait(5000);

  } catch (err) {
    console.log('❌ Error in enhanced jackpot crawler:', err.message);
    try { 
      await page.screenshot({ path: 'screenshots/ERROR_jackpot_crawler.png', fullPage: true }); 
      fs.writeFileSync('jackpot-data/error_log.json', JSON.stringify({
        timestamp: new Date().toISOString(),
        error: err.message,
        stack: err.stack,
        capturedData: capturedData
      }, null, 2));
    } catch {}
  } finally {
    console.log('🔚 Enhanced Jackpot Crawler completed (browser remains open for review)');
    // await browser.close(); // Keep browser open for manual inspection
  }
})();