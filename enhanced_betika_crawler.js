const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const FirecrawlApp = require('@mendable/firecrawl-js').default;
const { Actor } = require('apify');
const fs = require('fs');
require('dotenv').config();

// Use stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

class BetikaOddsAnalyzer {
  constructor() {
    this.browser = null;
    this.page = null;
    this.firecrawl = null;
    this.externalProviders = [];
    this.soccerData = [];
  }

  async initialize() {
    console.log('🚀 Initializing Betika Odds Analyzer...');
    
    // Initialize Firecrawl (you may need to set FIRECRAWL_API_KEY)
    try {
      this.firecrawl = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });
      console.log('✅ Firecrawl initialized');
    } catch (error) {
      console.log('⚠️  Firecrawl initialization failed:', error.message);
    }

    // Launch browser with enhanced stealth
    this.browser = await puppeteer.launch({
      headless: false,
      defaultViewport: null,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
        '--window-size=1920,1080',
        '--disable-blink-features=AutomationControlled'
      ]
    });

    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1920, height: 1080 });

    // Enhanced stealth measures
    await this.page.evaluateOnNewDocument(() => {
      window.chrome = { runtime: {} };
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5]
      });
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en']
      });
      delete navigator.__proto__.webdriver;
    });

    this.page.setDefaultTimeout(60000);
  }

  async authenticateToBetika() {
    const username = process.env.BETIKA_USERNAME;
    const password = process.env.BETIKA_PASSWORD;
    const url = "https://betika.com";

    console.log('🔑 Starting Betika authentication...');
    console.log(`📱 Username: ${username ? '✓ Loaded' : '✗ Missing'}`);
    console.log(`🔑 Password: ${password ? '✓ Loaded' : '✗ Missing'}`);

    if (!username || !password) {
      throw new Error('Missing credentials in .env file');
    }

    // Navigate to Betika
    console.log(`🌐 Navigating to ${url}...`);
    await this.page.goto(url, { 
      waitUntil: 'networkidle2', 
      timeout: 90000 
    });

    console.log('✅ Page loaded successfully');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Find and click login button
    console.log('🔍 Looking for login button...');
    const loginSelectors = [
      'a[href*="login"]',
      'button[class*="login"]',
      '.login-button',
      '.btn-login'
    ];

    let loginClicked = false;
    for (const selector of loginSelectors) {
      try {
        const element = await this.page.$(selector);
        if (element) {
          const isVisible = await this.page.evaluate(el => {
            const rect = el.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
          }, element);

          if (isVisible) {
            console.log(`✅ Found login button: ${selector}`);
            await element.click();
            loginClicked = true;
            break;
          }
        }
      } catch (e) {
        continue;
      }
    }

    if (!loginClicked) {
      throw new Error('Could not find login button');
    }

    // Wait for login form
    console.log('⏳ Waiting for login form...');
    await Promise.race([
      this.page.waitForSelector('input[name="phone-number"], input[type="tel"]', { visible: true }),
      new Promise(resolve => setTimeout(resolve, 5000))
    ]);

    // Fill login form
    const phoneInput = await this.page.$('input[name="phone-number"], input[type="tel"]');
    const passwordInput = await this.page.$('input[type="password"]');

    if (!phoneInput || !passwordInput) {
      throw new Error('Could not find login form inputs');
    }

    console.log('⌨️  Filling login form...');
    await phoneInput.click({ clickCount: 3 });
    await phoneInput.press('Backspace');
    await phoneInput.type(username, { delay: 100 });

    await passwordInput.click();
    await passwordInput.type(password, { delay: 100 });

    // Submit form
    const loginButton = await this.page.$('button.session__form__button, button[type="submit"]');
    if (loginButton) {
      console.log('✅ Submitting login form...');
      await loginButton.click();
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    // Check if login was successful
    const currentUrl = this.page.url();
    console.log(`📍 Current URL after login: ${currentUrl}`);
    
    if (currentUrl.includes('login')) {
      console.log('⚠️  Still on login page - authentication may have failed');
    } else {
      console.log('✅ Authentication successful!');
    }

    return !currentUrl.includes('login');
  }

  async setupNetworkInterception() {
    console.log('🕵️  Setting up network interception...');
    
    // Enable request interception
    await this.page.setRequestInterception(true);
    
    const apiCalls = [];
    const externalDomains = new Set();
    
    this.page.on('request', (request) => {
      const url = request.url();
      const domain = new URL(url).hostname;
      
      // Look for API calls and external domains
      if (url.includes('api') || url.includes('odds') || url.includes('betting')) {
        apiCalls.push({
          url,
          method: request.method(),
          headers: request.headers(),
          timestamp: new Date().toISOString()
        });
        
        if (!domain.includes('betika')) {
          externalDomains.add(domain);
        }
      }
      
      request.continue();
    });
    
    this.page.on('response', async (response) => {
      const url = response.url();
      const domain = new URL(url).hostname;
      
      if (url.includes('odds') || url.includes('match') || url.includes('sport')) {
        try {
          const contentType = response.headers()['content-type'] || '';
          if (contentType.includes('application/json')) {
            const data = await response.json();
            console.log(`📡 API Response from ${domain}:`, {
              url: url.substring(0, 100) + '...',
              status: response.status(),
              dataKeys: Object.keys(data || {})
            });
            
            // Store soccer-related data
            if (JSON.stringify(data).toLowerCase().includes('soccer') || 
                JSON.stringify(data).toLowerCase().includes('football')) {
              this.soccerData.push({
                source: domain,
                url,
                data,
                timestamp: new Date().toISOString()
              });
            }
          }
        } catch (error) {
          // Non-JSON response, continue
        }
      }
    });
    
    // Store discovered external domains
    setTimeout(() => {
      this.externalProviders = Array.from(externalDomains).map(domain => ({
        domain,
        discoveredAt: new Date().toISOString()
      }));
      console.log(`🎯 Discovered ${this.externalProviders.length} external domains`);
    }, 10000);
  }

  async crawlForOddsProviders() {
    console.log('🔍 Crawling for external odds providers...');
    
    // Navigate to different sections to trigger API calls
    const sections = [
      '/sports/football',
      '/live-betting',
      '/upcoming',
      '/jackpot'
    ];
    
    for (const section of sections) {
      try {
        console.log(`📄 Crawling section: ${section}`);
        const fullUrl = `https://betika.com${section}`;
        await this.page.goto(fullUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Scroll to trigger lazy loading
        await this.page.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight);
        });
        await new Promise(resolve => setTimeout(resolve, 3000));
        
      } catch (error) {
        console.log(`⚠️  Could not crawl ${section}:`, error.message);
      }
    }
  }

  async analyzeWithFirecrawl(url) {
    if (!this.firecrawl) {
      console.log('⚠️  Firecrawl not available, skipping external analysis');
      return null;
    }

    try {
      console.log(`🔥 Using Firecrawl to analyze: ${url}`);
      const result = await this.firecrawl.scrapeUrl(url, {
        formats: ['markdown', 'html'],
        onlyMainContent: true
      });
      
      return result;
    } catch (error) {
      console.log(`❌ Firecrawl analysis failed for ${url}:`, error.message);
      return null;
    }
  }

  async extractSoccerMatchData() {
    console.log('⚽ Extracting soccer match data...');
    
    try {
      // Look for soccer/football matches on the current page
      const matches = await this.page.evaluate(() => {
        const matchElements = document.querySelectorAll('[class*="match"], [class*="game"], [class*="event"]');
        const soccerMatches = [];
        
        matchElements.forEach(element => {
          const text = element.textContent.toLowerCase();
          if (text.includes('football') || text.includes('soccer') || 
              text.includes('premier league') || text.includes('champions league')) {
            soccerMatches.push({
              html: element.outerHTML.substring(0, 500),
              text: element.textContent.trim().substring(0, 200),
              classes: element.className
            });
          }
        });
        
        return soccerMatches;
      });
      
      console.log(`⚽ Found ${matches.length} soccer-related elements`);
      return matches;
    } catch (error) {
      console.log('❌ Error extracting soccer data:', error.message);
      return [];
    }
  }

  async generateReport() {
    console.log('📊 Generating analysis report...');
    
    const report = {
      analysis: {
        timestamp: new Date().toISOString(),
        externalProviders: this.externalProviders,
        soccerDataEntries: this.soccerData.length,
        summary: `Found ${this.externalProviders.length} external domains and ${this.soccerData.length} soccer data entries`
      },
      externalProviders: this.externalProviders,
      soccerData: this.soccerData.slice(0, 10), // Limit to first 10 entries
      recommendations: [
        'Monitor API calls to external domains for rate limiting patterns',
        'Analyze JSON response structures for data extraction opportunities',
        'Consider implementing caching for frequently accessed match data'
      ]
    };
    
    // Save report to file
    fs.writeFileSync('odds_analysis_report.json', JSON.stringify(report, null, 2));
    console.log('📁 Report saved to odds_analysis_report.json');
    
    return report;
  }

  async run() {
    try {
      await this.initialize();
      
      const loginSuccess = await this.authenticateToBetika();
      if (!loginSuccess) {
        console.log('⚠️  Continuing without authentication...');
      }
      
      await this.setupNetworkInterception();
      await this.crawlForOddsProviders();
      
      // Wait for network activity to settle
      console.log('⏳ Waiting for network activity to complete...');
      await new Promise(resolve => setTimeout(resolve, 15000));
      
      await this.extractSoccerMatchData();
      const report = await this.generateReport();
      
      console.log('🎉 Analysis complete!');
      console.log('📊 Summary:', report.analysis.summary);
      
      // Keep browser open for inspection
      console.log('💡 Browser will remain open for 60 seconds for inspection...');
      await new Promise(resolve => setTimeout(resolve, 60000));
      
      return report;
      
    } catch (error) {
      console.error('❌ Analysis failed:', error);
      throw error;
    } finally {
      if (this.browser) {
        await this.browser.close();
      }
    }
  }
}

// Run the analyzer
(async () => {
  const analyzer = new BetikaOddsAnalyzer();
  try {
    await analyzer.run();
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
})();