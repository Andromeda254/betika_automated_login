const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const FirecrawlApp = require('@mendable/firecrawl-js').default;
const fs = require('fs');
require('dotenv').config();

// Use stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

class BetikaOddsAnalyzer {
  constructor() {
    this.browser = null;
    this.page = null;
    this.firecrawl = null;
    this.discoveredUrls = [];
    this.apiResponses = [];
    this.soccerMatches = [];
  }

  async initialize() {
    console.log('🚀 Initializing Betika Odds Analyzer...');
    
    // Initialize Firecrawl
    try {
      this.firecrawl = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });
      console.log('✅ Firecrawl initialized');
    } catch (error) {
      console.log('⚠️  Firecrawl initialization failed:', error.message);
    }

    // Launch browser
    this.browser = await puppeteer.launch({
      headless: false,
      defaultViewport: null,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--window-size=1920,1080'
      ]
    });

    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1920, height: 1080 });
    this.page.setDefaultTimeout(30000);

    // Set up response monitoring without request interception
    this.page.on('response', async (response) => {
      const url = response.url();
      const domain = new URL(url).hostname;
      
      // Log interesting responses
      if (url.includes('api') || url.includes('odds') || url.includes('bet') || url.includes('sport')) {
        console.log(`📡 API Call detected: ${domain} - ${response.status()}`);
        
        try {
          const contentType = response.headers()['content-type'] || '';
          if (contentType.includes('application/json') && response.status() === 200) {
            const data = await response.json();
            
            this.apiResponses.push({
              url: url.substring(0, 150),
              domain,
              status: response.status(),
              timestamp: new Date().toISOString(),
              dataPreview: JSON.stringify(data).substring(0, 500)
            });
            
            // Check for soccer/football content
            const jsonString = JSON.stringify(data).toLowerCase();
            if (jsonString.includes('soccer') || jsonString.includes('football') || 
                jsonString.includes('premier') || jsonString.includes('champions')) {
              this.soccerMatches.push({
                source: domain,
                url: url.substring(0, 150),
                data: data,
                timestamp: new Date().toISOString()
              });
            }
          }
        } catch (error) {
          // Skip non-JSON responses
        }
      }
      
      // Track external domains
      if (!domain.includes('betika') && !domain.includes('google') && !domain.includes('facebook')) {
        this.discoveredUrls.push({
          url: url.substring(0, 150),
          domain,
          timestamp: new Date().toISOString()
        });
      }
    });
  }

  async authenticateAndExplore() {
    const username = process.env.BETIKA_USERNAME;
    const password = process.env.BETIKA_PASSWORD;
    const url = "https://betika.com";

    console.log('🔑 Starting Betika exploration...');
    
    try {
      // Navigate to Betika
      console.log(`🌐 Navigating to ${url}...`);
      await this.page.goto(url, { waitUntil: 'networkidle2' });
      console.log('✅ Page loaded successfully');
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Try to login if credentials are available
      if (username && password) {
        try {
          console.log('🔍 Looking for login button...');
          const loginButton = await this.page.$('a[href*="login"]');
          
          if (loginButton) {
            await loginButton.click();
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const phoneInput = await this.page.$('input[name="phone-number"], input[type="tel"]');
            const passwordInput = await this.page.$('input[type="password"]');
            
            if (phoneInput && passwordInput) {
              console.log('⌨️  Attempting login...');
              await phoneInput.type(username, { delay: 100 });
              await passwordInput.type(password, { delay: 100 });
              
              const submitButton = await this.page.$('button[type="submit"], button.session__form__button');
              if (submitButton) {
                await submitButton.click();
                await new Promise(resolve => setTimeout(resolve, 5000));
              }
            }
          }
        } catch (loginError) {
          console.log('⚠️  Login failed, continuing without authentication...');
        }
      }

      // Navigate to sports sections to trigger API calls
      const sections = [
        'https://betika.com/en-ke/sports/football',
        'https://betika.com/en-ke/live-betting',
        'https://betika.com/en-ke/upcoming',
        'https://betika.com/en-ke/'
      ];
      
      for (const sectionUrl of sections) {
        try {
          console.log(`📄 Exploring: ${sectionUrl.split('/').pop() || 'home'}`);
          await this.page.goto(sectionUrl, { waitUntil: 'networkidle0', timeout: 20000 });
          
          // Scroll to trigger lazy loading
          await this.page.evaluate(() => {
            window.scrollTo(0, document.body.scrollHeight / 2);
          });
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          await this.page.evaluate(() => {
            window.scrollTo(0, document.body.scrollHeight);
          });
          await new Promise(resolve => setTimeout(resolve, 3000));
          
        } catch (error) {
          console.log(`⚠️  Could not explore ${sectionUrl}:`, error.message);
        }
      }

      // Extract visible soccer matches from the current page
      await this.extractVisibleMatches();

    } catch (error) {
      console.log('❌ Exploration error:', error.message);
    }
  }

  async extractVisibleMatches() {
    console.log('⚽ Extracting visible soccer matches...');
    
    try {
      const matches = await this.page.evaluate(() => {
        const elements = document.querySelectorAll('[class*="match"], [class*="game"], [class*="event"], [class*="fixture"]');
        const soccerMatches = [];
        
        elements.forEach((element, index) => {
          if (index > 50) return; // Limit to first 50 elements
          
          const text = element.textContent.toLowerCase();
          const hasFootball = text.includes('football') || text.includes('soccer') || 
                             text.includes('premier') || text.includes('champions') ||
                             text.includes('vs') || text.includes('v ');
          
          if (hasFootball) {
            soccerMatches.push({
              text: element.textContent.trim().substring(0, 200),
              classes: element.className,
              html: element.outerHTML.substring(0, 300)
            });
          }
        });
        
        return soccerMatches;
      });
      
      console.log(`⚽ Found ${matches.length} soccer match elements`);
      this.soccerMatches.push(...matches.map(match => ({
        ...match,
        source: 'betika_page_content',
        timestamp: new Date().toISOString()
      })));
      
    } catch (error) {
      console.log('❌ Error extracting matches:', error.message);
    }
  }

  async analyzeWithFirecrawl() {
    if (!this.firecrawl) {
      console.log('⚠️  Firecrawl not available, skipping external analysis');
      return;
    }

    // Get unique external domains
    const externalDomains = [...new Set(this.discoveredUrls.map(u => u.domain))];
    console.log(`🔥 Found ${externalDomains.length} external domains to analyze with Firecrawl`);

    for (const domain of externalDomains.slice(0, 3)) { // Limit to first 3 domains
      try {
        console.log(`🔥 Analyzing domain: ${domain}`);
        const result = await this.firecrawl.scrapeUrl(`https://${domain}`, {
          formats: ['markdown'],
          onlyMainContent: true
        });
        
        if (result && result.markdown) {
          console.log(`✅ Firecrawl analysis complete for ${domain} - ${result.markdown.length} characters`);
        }
        
        // Add small delay between requests
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.log(`❌ Firecrawl failed for ${domain}:`, error.message);
      }
    }
  }

  async generateReport() {
    console.log('📊 Generating comprehensive analysis report...');
    
    // Analyze discovered domains
    const externalDomains = [...new Set(this.discoveredUrls.map(u => u.domain))];
    const apiDomains = [...new Set(this.apiResponses.map(r => r.domain))];
    
    const report = {
      metadata: {
        analysisTimestamp: new Date().toISOString(),
        totalExternalDomains: externalDomains.length,
        totalApiCalls: this.apiResponses.length,
        totalSoccerMatches: this.soccerMatches.length
      },
      externalDomains: externalDomains.slice(0, 20), // Top 20 domains
      apiResponses: this.apiResponses.slice(0, 15), // Top 15 API responses
      soccerMatches: this.soccerMatches.slice(0, 10), // Top 10 soccer matches
      potentialOddsProviders: apiDomains.filter(domain => 
        !domain.includes('betika') && 
        !domain.includes('google') && 
        !domain.includes('facebook') &&
        !domain.includes('analytics')
      ).slice(0, 10),
      insights: {
        likelyOddsProviders: apiDomains.filter(d => 
          d.includes('odds') || d.includes('bet') || d.includes('sport')
        ),
        soccerDataSources: [...new Set(this.soccerMatches.map(m => m.source))],
        apiCallPatterns: this.apiResponses.reduce((acc, resp) => {
          const pattern = resp.url.split('?')[0].split('/').slice(-2).join('/');
          acc[pattern] = (acc[pattern] || 0) + 1;
          return acc;
        }, {})
      },
      recommendations: [
        'Monitor API calls to external domains for rate limiting patterns',
        'Analyze JSON response structures for consistent data extraction',
        'Focus on domains making frequent API calls as primary odds providers',
        'Consider real-time monitoring of the identified external domains'
      ]
    };
    
    // Save detailed report
    fs.writeFileSync('betika_odds_analysis.json', JSON.stringify(report, null, 2));
    console.log('📁 Detailed report saved to betika_odds_analysis.json');
    
    // Save raw data for further analysis
    fs.writeFileSync('raw_api_responses.json', JSON.stringify(this.apiResponses, null, 2));
    fs.writeFileSync('raw_soccer_matches.json', JSON.stringify(this.soccerMatches, null, 2));
    
    return report;
  }

  async run() {
    try {
      await this.initialize();
      await this.authenticateAndExplore();
      
      console.log('⏳ Allowing network activity to settle...');
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      await this.analyzeWithFirecrawl();
      const report = await this.generateReport();
      
      console.log('🎉 Analysis Complete!');
      console.log(`📊 Summary: Found ${report.metadata.totalExternalDomains} external domains, ${report.metadata.totalApiCalls} API calls, ${report.metadata.totalSoccerMatches} soccer matches`);
      console.log(`🎯 Potential odds providers: ${report.potentialOddsProviders.join(', ')}`);
      
      // Keep browser open briefly for inspection
      console.log('💡 Keeping browser open for 30 seconds for inspection...');
      await new Promise(resolve => setTimeout(resolve, 30000));
      
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
    const report = await analyzer.run();
    console.log('\n🏁 Final Summary:');
    console.log('================================');
    console.log(`External Domains: ${report.metadata.totalExternalDomains}`);
    console.log(`API Calls Detected: ${report.metadata.totalApiCalls}`);
    console.log(`Soccer Matches Found: ${report.metadata.totalSoccerMatches}`);
    console.log(`Top Potential Odds Providers:`);
    report.potentialOddsProviders.forEach(provider => console.log(`  - ${provider}`));
    console.log('================================');
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
})();