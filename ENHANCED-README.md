# 🤖 Enhanced Betika Automation Bot

A comprehensive automation bot for Betika.com with advanced features including login, profile checking, bet placement, and sign out capabilities.

## 🚀 Features

### ✅ Core Functionality
- **Automated Login**: Secure login with stealth mode to avoid detection
- **Profile Information**: Extract and monitor user profile data
- **Bet Placement**: Automatically place bets on available matches
- **Sign Out**: Clean logout functionality
- **Screenshot Capture**: Automatic screenshots at each step for debugging
- **HTML Dumps**: Save page content for analysis

### 🛡️ Security & Stealth
- Puppeteer-extra with stealth plugin
- Realistic human-like interactions
- Random delays between actions
- Anti-detection measures

## 📁 Files Structure

```
betika_automated_login/
├── enhanced-betika-bot.js    # Main bot class with all functionality
├── usage-examples.js         # Various usage examples
├── script3.js               # Original login script
├── .env                     # Environment variables (create this)
├── screenshots/             # Auto-generated screenshots
├── html-dumps/             # Auto-generated HTML dumps
└── node_modules/           # Dependencies
```

## 🔧 Installation

1. **Install Dependencies**:
```bash
npm install puppeteer-extra puppeteer-extra-plugin-stealth puppeteer dotenv
```

2. **Create Environment File**:
Create a `.env` file in the project root:
```env
BETIKA_USERNAME=your_phone_number
BETIKA_PASSWORD=your_password
```

## 📖 Usage

### Basic Usage

```javascript
const BetikaBot = require('./enhanced-betika-bot');

const bot = new BetikaBot();

// Simple login and profile check
await bot.init();
await bot.login();
await bot.checkProfile();
```

### Advanced Usage

```javascript
// Full automation with all features
await bot.runFullAutomation({
  checkProfile: true,      // Check user profile
  placeBet: true,         // Place a bet
  betOptions: {
    sport: 'football',
    betAmount: '10',
    autoSelect: true
  },
  signOut: true,          // Sign out when done
  keepBrowserOpen: false  // Close browser
});
```

## 🎯 Available Methods

### Core Methods

#### `init()`
Initialize the browser with stealth configuration
```javascript
await bot.init();
```

#### `login()`
Perform automated login
```javascript
await bot.login();
```

#### `checkProfile()`
Extract user profile information
```javascript
const profileInfo = await bot.checkProfile();
console.log(profileInfo);
// Returns: { username, email, phone, balance, accountInfo, url, title }
```

#### `placeBet(options)`
Place a bet automatically
```javascript
await bot.placeBet({
  sport: 'football',      // Sport type
  betAmount: '10',        // Bet amount
  autoSelect: true        // Auto-select first available match
});
```

#### `signOut()`
Sign out from the account
```javascript
await bot.signOut();
```

#### `close()`
Close the browser
```javascript
await bot.close();
```

### Utility Methods

#### `takeScreenshot(name, description)`
Take a screenshot
```javascript
await bot.takeScreenshot("custom-screenshot", "Custom description");
```

#### `waitRandom(min, max)`
Wait for a random duration
```javascript
await bot.waitRandom(1000, 3000); // Wait 1-3 seconds
```

#### `clickElement(selector, description)`
Click an element safely
```javascript
await bot.clickElement('.login-button', 'Login button');
```

## 📋 Usage Examples

### Example 1: Login and Profile Check
```javascript
async function checkProfile() {
  const bot = new BetikaBot();
  await bot.init();
  await bot.login();
  const profile = await bot.checkProfile();
  console.log('Balance:', profile.balance);
}
```

### Example 2: Automated Betting
```javascript
async function placeBets() {
  const bot = new BetikaBot();
  await bot.init();
  await bot.login();
  
  await bot.placeBet({
    sport: 'football',
    betAmount: '5',
    autoSelect: true
  });
  
  await bot.signOut();
  await bot.close();
}
```

### Example 3: Profile Monitoring
```javascript
async function monitorProfile() {
  const bot = new BetikaBot();
  await bot.init();
  await bot.login();
  
  // Check profile every 30 seconds
  setInterval(async () => {
    const profile = await bot.checkProfile();
    console.log(`Balance: ${profile.balance}`);
  }, 30000);
}
```

### Example 4: Scheduled Automation
```javascript
async function scheduledBot() {
  const runBot = async () => {
    const bot = new BetikaBot();
    await bot.runFullAutomation({
      checkProfile: true,
      placeBet: false,
      signOut: true,
      keepBrowserOpen: false
    });
  };
  
  // Run every hour
  setInterval(runBot, 3600000);
}
```

## 🔧 Configuration Options

### Bot Options
```javascript
const bot = new BetikaBot();

// Custom configuration
bot.baseUrl = "https://betika.com";
bot.username = "custom_username";
bot.password = "custom_password";
```

### Bet Options
```javascript
const betOptions = {
  sport: 'football',        // Sport type to bet on
  betAmount: '10',          // Amount to bet
  autoSelect: true,         // Auto-select first match
  searchTerm: null          // Search for specific matches
};
```

### Automation Options
```javascript
const automationOptions = {
  checkProfile: true,       // Check profile information
  placeBet: false,         // Place bets
  betOptions: {},          // Bet configuration
  signOut: false,          // Sign out when done
  keepBrowserOpen: true    // Keep browser open for inspection
};
```

## 🐛 Debugging

### Screenshots
Screenshots are automatically saved to `screenshots/` directory:
- `01-homepage.png` - Initial homepage
- `02-login-modal.png` - Login form
- `03-credentials-filled.png` - After filling credentials
- `04-login-success.png` - Successful login
- `05-profile-page.png` - Profile information
- `06-sports-section.png` - Sports betting section
- `07-bet-selected.png` - Bet selection
- `08-bet-placed.png` - Bet placement
- `09-signed-out.png` - After sign out

### HTML Dumps
HTML content is saved to `html-dumps/` directory for analysis.

### Error Handling
```javascript
try {
  await bot.login();
} catch (error) {
  console.error('Login failed:', error.message);
  // Error screenshots are automatically saved
}
```

## ⚠️ Important Notes

### Security
- Never commit your `.env` file to version control
- Use strong, unique passwords
- Monitor your account regularly

### Rate Limiting
- The bot includes random delays to appear human-like
- Don't run multiple instances simultaneously
- Respect the website's terms of service

### Betting Responsibility
- Only bet what you can afford to lose
- Set reasonable bet amounts
- Monitor your spending

### Legal Compliance
- Ensure automation is allowed in your jurisdiction
- Follow local gambling laws
- Use responsibly

## 🚨 Troubleshooting

### Common Issues

#### Login Fails
- Check credentials in `.env` file
- Verify phone number format
- Check for CAPTCHA requirements

#### Bet Placement Fails
- Ensure sufficient account balance
- Check if matches are available
- Verify betting limits

#### Browser Crashes
- Update Puppeteer: `npm update puppeteer`
- Increase system resources
- Check for conflicting processes

#### Element Not Found
- Website layout may have changed
- Update selectors in the code
- Check screenshots for debugging

### Getting Help
1. Check the screenshots in `screenshots/` directory
2. Review HTML dumps in `html-dumps/` directory
3. Enable verbose logging
4. Test with `keepBrowserOpen: true` for manual inspection

## 📝 License

This project is for educational purposes only. Use responsibly and in compliance with local laws and website terms of service.

## 🤝 Contributing

Feel free to submit issues and enhancement requests!

---

**⚠️ Disclaimer**: This bot is for educational purposes. Always gamble responsibly and within your means. Ensure compliance with local laws and website terms of service.
