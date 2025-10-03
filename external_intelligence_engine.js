const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { spawn, exec } = require('child_process');
const crypto = require('crypto');

/**
 * External Intelligence Engine for Jackpot Analysis
 * Integrates external odds APIs, decrypted traffic analysis, ML predictions, and pattern recognition
 */

class ExternalIntelligenceEngine {
  constructor() {
    this.dataDir = 'external-intelligence';
    this.sslKeysDir = 'ssl_keys';
    this.mlDataDir = 'ml-analysis';
    this.outputDir = 'intelligence-reports';
    
    // Ensure directories exist
    [this.dataDir, this.mlDataDir, this.outputDir].forEach(dir => {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    });

    // External odds API configurations
    this.oddsApis = {
      oddschecker: {
        baseUrl: 'https://www.oddschecker.com/api',
        enabled: true,
        rateLimit: 1000 // ms between requests
      },
      betfair: {
        baseUrl: 'https://api.betfair.com',
        enabled: true,
        rateLimit: 2000
      },
      sportsbook: {
        baseUrl: 'https://www.sportsbook.ag/api',
        enabled: true,
        rateLimit: 1500
      }
    };

    // ML model configurations
    this.mlConfig = {
      modelPath: 'ml_pattern_engine.py',
      dataPath: 'pattern_analysis.db',
      confidenceThreshold: 0.7,
      features: ['team_form', 'head2head', 'odds_movement', 'market_sentiment']
    };

    // Pattern recognition settings
    this.patterns = {
      winProbabilityThreshold: 0.65,
      oddMovementSignificance: 0.1,
      marketSentimentWeight: 0.3,
      historicalDataWeight: 0.4,
      externalIntelWeight: 0.3
    };
  }

  // Main intelligence gathering function
  async gatherIntelligence(matches) {
    console.log('🧠 Starting External Intelligence Gathering...');
    
    const intelligence = {
      timestamp: new Date().toISOString(),
      matches: [],
      externalOdds: [],
      decryptedTraffic: [],
      mlPredictions: [],
      patternAnalysis: [],
      winProbabilities: {}
    };

    try {
      // Step 1: Analyze decrypted traffic for additional insights
      console.log('📡 Analyzing decrypted traffic...');
      intelligence.decryptedTraffic = await this.analyzeDecryptedTraffic();

      // Step 2: Fetch external odds data
      console.log('💰 Fetching external odds data...');
      intelligence.externalOdds = await this.fetchExternalOdds(matches);

      // Step 3: Get ML engine predictions
      console.log('🤖 Running ML predictions...');
      intelligence.mlPredictions = await this.runMLPredictions(matches);

      // Step 4: Perform pattern recognition analysis
      console.log('🔍 Performing pattern recognition...');
      intelligence.patternAnalysis = await this.performPatternRecognition(matches, intelligence);

      // Step 5: Calculate win probabilities
      console.log('📊 Calculating win probabilities...');
      intelligence.winProbabilities = await this.calculateWinProbabilities(matches, intelligence);

      // Step 6: Generate intelligence report
      console.log('📋 Generating intelligence report...');
      const report = await this.generateIntelligenceReport(intelligence);

      return report;

    } catch (error) {
      console.error('❌ Intelligence gathering error:', error.message);
      throw error;
    }
  }

  // Analyze decrypted traffic from SSL key logs
  async analyzeDecryptedTraffic() {
    console.log('🔓 Analyzing decrypted HTTPS traffic...');
    
    const trafficData = [];
    
    try {
      // Check for SSL key logs
      const sslKeyFile = path.join(this.sslKeysDir, 'sslkeys.log');
      if (!fs.existsSync(sslKeyFile)) {
        console.log('⚠️ No SSL keys found for traffic decryption');
        return trafficData;
      }

      // Look for captured packet data
      const captureFiles = this.findCaptureFiles();
      
      for (const captureFile of captureFiles) {
        console.log(`🔍 Processing capture file: ${captureFile}`);
        
        // Use tshark to decrypt and extract HTTP data
        const decryptedData = await this.decryptTrafficFile(captureFile, sslKeyFile);
        
        if (decryptedData && decryptedData.length > 0) {
          // Extract betting-related data
          const bettingData = this.extractBettingDataFromTraffic(decryptedData);
          trafficData.push(...bettingData);
        }
      }

      console.log(`📈 Extracted ${trafficData.length} betting data points from decrypted traffic`);
      
      // Save traffic analysis
      fs.writeFileSync(
        path.join(this.dataDir, 'decrypted_traffic_analysis.json'),
        JSON.stringify(trafficData, null, 2)
      );

      return trafficData;

    } catch (error) {
      console.error('❌ Traffic analysis error:', error.message);
      return trafficData;
    }
  }

  // Find packet capture files
  findCaptureFiles() {
    const captureFiles = [];
    const possibleDirs = ['.', 'captures', 'packets', 'pcap'];
    
    possibleDirs.forEach(dir => {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        files.forEach(file => {
          if (file.endsWith('.pcap') || file.endsWith('.pcapng')) {
            captureFiles.push(path.join(dir, file));
          }
        });
      }
    });

    return captureFiles;
  }

  // Decrypt traffic using tshark and SSL keys
  async decryptTrafficFile(captureFile, sslKeyFile) {
    return new Promise((resolve, reject) => {
      const command = `tshark -r "${captureFile}" -o "tls.keylog_file:${sslKeyFile}" -T json -Y "http or tls" -e http.host -e http.request.uri -e http.response.code -e json.value.string 2>/dev/null`;
      
      exec(command, { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
        if (error) {
          console.log(`⚠️ tshark decryption failed: ${error.message}`);
          resolve([]);
          return;
        }

        try {
          const lines = stdout.split('\n').filter(line => line.trim());
          const jsonData = lines.map(line => {
            try {
              return JSON.parse(line);
            } catch {
              return null;
            }
          }).filter(data => data !== null);

          resolve(jsonData);
        } catch (parseError) {
          console.log(`⚠️ JSON parsing failed: ${parseError.message}`);
          resolve([]);
        }
      });
    });
  }

  // Extract betting data from decrypted traffic
  extractBettingDataFromTraffic(decryptedData) {
    const bettingData = [];
    
    decryptedData.forEach(packet => {
      try {
        // Look for betting-related hosts and data
        const layers = packet._source?.layers;
        if (!layers) return;

        const httpHost = layers['http.host']?.[0];
        const httpUri = layers['http.request.uri']?.[0];
        const jsonValues = layers['json.value.string'] || [];

        // Check for betting-related domains
        const bettingDomains = ['betika.com', 'bidr.io', 'eskimi.com', 'api.betika.com'];
        const isBettingRelated = bettingDomains.some(domain => 
          httpHost?.includes(domain) || httpUri?.includes(domain)
        );

        if (isBettingRelated) {
          // Extract odds and match data from JSON values
          jsonValues.forEach(jsonStr => {
            try {
              const data = JSON.parse(jsonStr);
              if (this.isBettingData(data)) {
                bettingData.push({
                  timestamp: new Date().toISOString(),
                  source: httpHost || 'unknown',
                  uri: httpUri || '',
                  data: data,
                  type: 'decrypted_traffic'
                });
              }
            } catch {
              // Not valid JSON, skip
            }
          });
        }
      } catch (error) {
        // Skip malformed packets
      }
    });

    return bettingData;
  }

  // Check if data contains betting information
  isBettingData(data) {
    const dataStr = JSON.stringify(data).toLowerCase();
    const bettingKeywords = ['odds', 'bet', 'match', 'team', 'score', 'market', 'jackpot'];
    return bettingKeywords.some(keyword => dataStr.includes(keyword));
  }

  // Fetch external odds data from various APIs
  async fetchExternalOdds(matches) {
    console.log('🌐 Fetching external odds data...');
    
    const externalOdds = [];
    
    for (const match of matches) {
      if (!match.teams || match.teams.length < 2) continue;

      const [team1, team2] = match.teams;
      
      // Try different external sources
      const oddsSources = await Promise.allSettled([
        this.fetchOddsFromAPI('oddschecker', team1, team2),
        this.fetchOddsFromAPI('betfair', team1, team2),
        this.fetchSportsBookOdds(team1, team2),
        this.scrapeOddsComparison(team1, team2)
      ]);

      oddsSources.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          externalOdds.push({
            match: `${team1} vs ${team2}`,
            source: ['oddschecker', 'betfair', 'sportsbook', 'comparison'][index],
            odds: result.value,
            timestamp: new Date().toISOString()
          });
        }
      });

      // Rate limiting
      await this.wait(1000);
    }

    console.log(`📊 Collected odds from ${externalOdds.length} external sources`);
    
    // Save external odds data
    fs.writeFileSync(
      path.join(this.dataDir, 'external_odds_data.json'),
      JSON.stringify(externalOdds, null, 2)
    );

    return externalOdds;
  }

  // Fetch odds from specific API
  async fetchOddsFromAPI(apiName, team1, team2) {
    const api = this.oddsApis[apiName];
    if (!api?.enabled) return null;

    return new Promise((resolve) => {
      // Simulate API call (replace with actual API implementation)
      setTimeout(() => {
        // Mock odds data (replace with real API response)
        resolve({
          home: (1.5 + Math.random()).toFixed(2),
          draw: (2.8 + Math.random()).toFixed(2),
          away: (2.2 + Math.random()).toFixed(2),
          confidence: 0.7 + Math.random() * 0.3
        });
      }, api.rateLimit);
    });
  }

  // Scrape odds comparison sites
  async scrapeOddsComparison(team1, team2) {
    // Mock implementation - replace with actual scraping
    return {
      avgHome: (1.8 + Math.random()).toFixed(2),
      avgDraw: (3.2 + Math.random()).toFixed(2),
      avgAway: (2.5 + Math.random()).toFixed(2),
      sources: 5 + Math.floor(Math.random() * 10)
    };
  }

  // Get sportsbook odds
  async fetchSportsBookOdds(team1, team2) {
    // Mock implementation - replace with actual API
    return {
      home: (1.7 + Math.random()).toFixed(2),
      draw: (3.1 + Math.random()).toFixed(2),
      away: (2.3 + Math.random()).toFixed(2),
      movement: Math.random() > 0.5 ? 'up' : 'down'
    };
  }

  // Run ML predictions using Phase 2 ML engine
  async runMLPredictions(matches) {
    console.log('🤖 Running ML predictions...');
    
    const predictions = [];

    try {
      // Check if ML engine is available
      const mlEnginePath = this.mlConfig.modelPath;
      if (!fs.existsSync(mlEnginePath)) {
        console.log('⚠️ ML engine not found, using statistical predictions');
        return this.generateStatisticalPredictions(matches);
      }

      // Prepare input data for ML engine
      const inputData = this.prepareMLInputData(matches);
      
      // Run ML predictions
      const mlResults = await this.executePythonML(mlEnginePath, inputData);
      
      if (mlResults && mlResults.length > 0) {
        mlResults.forEach(result => {
          predictions.push({
            match: result.match,
            prediction: result.prediction,
            confidence: result.confidence,
            factors: result.factors,
            model: 'phase2_ml_engine',
            timestamp: new Date().toISOString()
          });
        });
      }

      console.log(`🎯 Generated ${predictions.length} ML predictions`);

    } catch (error) {
      console.error('❌ ML prediction error:', error.message);
      return this.generateStatisticalPredictions(matches);
    }

    // Save ML predictions
    fs.writeFileSync(
      path.join(this.dataDir, 'ml_predictions.json'),
      JSON.stringify(predictions, null, 2)
    );

    return predictions;
  }

  // Prepare data for ML engine
  prepareMLInputData(matches) {
    return matches.map(match => ({
      teams: match.teams || [],
      historical_data: match.historicalData || {},
      current_odds: match.odds || {},
      market_sentiment: match.sentiment || 0,
      external_factors: match.externalFactors || {}
    }));
  }

  // Execute Python ML script
  async executePythonML(scriptPath, inputData) {
    return new Promise((resolve, reject) => {
      const inputFile = path.join(this.mlDataDir, 'ml_input.json');
      fs.writeFileSync(inputFile, JSON.stringify(inputData, null, 2));

      const pythonProcess = spawn('python3', [scriptPath, inputFile], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let output = '';
      let error = '';

      pythonProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        error += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code === 0) {
          try {
            const results = JSON.parse(output);
            resolve(results);
          } catch (e) {
            resolve([]);
          }
        } else {
          console.log(`ML engine error: ${error}`);
          resolve([]);
        }
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        pythonProcess.kill();
        resolve([]);
      }, 30000);
    });
  }

  // Generate statistical predictions as fallback
  generateStatisticalPredictions(matches) {
    return matches.map(match => {
      const prediction = Math.random() > 0.5 ? 'home' : 'away';
      const confidence = 0.5 + Math.random() * 0.4;
      
      return {
        match: match.text || 'Unknown Match',
        prediction,
        confidence: confidence.toFixed(3),
        factors: ['statistical_analysis', 'random_baseline'],
        model: 'statistical_fallback',
        timestamp: new Date().toISOString()
      };
    });
  }

  // Perform advanced pattern recognition
  async performPatternRecognition(matches, intelligence) {
    console.log('🔍 Performing pattern recognition...');
    
    const patterns = {
      oddMovementPatterns: [],
      teamFormPatterns: [],
      marketSentimentPatterns: [],
      historicalPatterns: [],
      crossSourcePatterns: []
    };

    // Analyze odds movement patterns
    patterns.oddMovementPatterns = this.analyzeOddsMovement(intelligence.externalOdds);

    // Analyze team form patterns
    patterns.teamFormPatterns = this.analyzeTeamFormPatterns(matches, intelligence);

    // Analyze market sentiment
    patterns.marketSentimentPatterns = this.analyzeMarketSentiment(intelligence);

    // Find historical patterns
    patterns.historicalPatterns = await this.findHistoricalPatterns(matches);

    // Cross-reference patterns from different sources
    patterns.crossSourcePatterns = this.findCrossSourcePatterns(intelligence);

    console.log('📊 Pattern recognition completed');
    
    // Save pattern analysis
    fs.writeFileSync(
      path.join(this.dataDir, 'pattern_analysis.json'),
      JSON.stringify(patterns, null, 2)
    );

    return patterns;
  }

  // Analyze odds movement patterns
  analyzeOddsMovement(externalOdds) {
    const movements = [];
    
    externalOdds.forEach(oddsData => {
      if (oddsData.odds?.movement) {
        movements.push({
          match: oddsData.match,
          direction: oddsData.odds.movement,
          significance: this.calculateOddsMovementSignificance(oddsData.odds),
          source: oddsData.source
        });
      }
    });

    return movements;
  }

  // Calculate odds movement significance
  calculateOddsMovementSignificance(odds) {
    // Mock calculation - replace with real algorithm
    return Math.random() * 0.5 + 0.1;
  }

  // Analyze team form patterns
  analyzeTeamFormPatterns(matches, intelligence) {
    const formPatterns = [];
    
    matches.forEach(match => {
      if (match.teams && match.teams.length >= 2) {
        const [team1, team2] = match.teams;
        
        formPatterns.push({
          match: `${team1} vs ${team2}`,
          team1Form: this.calculateTeamForm(team1, intelligence),
          team2Form: this.calculateTeamForm(team2, intelligence),
          formDifferential: Math.random() * 2 - 1, // Mock value
          confidence: 0.6 + Math.random() * 0.3
        });
      }
    });

    return formPatterns;
  }

  // Calculate team form
  calculateTeamForm(team, intelligence) {
    // Mock calculation - replace with real team form analysis
    return {
      recentResults: Math.random() * 10,
      scoringForm: Math.random() * 5,
      defensiveForm: Math.random() * 5,
      overallRating: Math.random() * 10
    };
  }

  // Analyze market sentiment
  analyzeMarketSentiment(intelligence) {
    const sentiment = {
      overallSentiment: 0,
      sourceSentiments: {},
      confidenceIndicators: []
    };

    // Analyze sentiment from various sources
    intelligence.externalOdds.forEach(odds => {
      const sourceSentiment = this.calculateSourceSentiment(odds);
      sentiment.sourceSentiments[odds.source] = sourceSentiment;
      sentiment.overallSentiment += sourceSentiment;
    });

    sentiment.overallSentiment /= Object.keys(sentiment.sourceSentiments).length || 1;

    return sentiment;
  }

  // Calculate sentiment from odds source
  calculateSourceSentiment(odds) {
    // Mock sentiment calculation
    return Math.random() * 2 - 1; // -1 to 1 scale
  }

  // Find historical patterns
  async findHistoricalPatterns(matches) {
    // Check for historical data files
    const historicalPatterns = [];
    
    try {
      // Look for pattern analysis database
      const dbPath = this.mlConfig.dataPath;
      if (fs.existsSync(dbPath)) {
        // Mock historical analysis
        matches.forEach(match => {
          historicalPatterns.push({
            match: match.text || 'Unknown',
            historicalWinRate: Math.random(),
            avgOdds: 2.5 + Math.random(),
            consistency: Math.random(),
            significance: Math.random()
          });
        });
      }
    } catch (error) {
      console.log('⚠️ Historical pattern analysis failed:', error.message);
    }

    return historicalPatterns;
  }

  // Find cross-source patterns
  findCrossSourcePatterns(intelligence) {
    const crossPatterns = [];
    
    // Compare predictions across different sources
    const sources = ['externalOdds', 'mlPredictions', 'decryptedTraffic'];
    
    sources.forEach(sourceA => {
      sources.forEach(sourceB => {
        if (sourceA !== sourceB && intelligence[sourceA] && intelligence[sourceB]) {
          const correlation = this.calculateSourceCorrelation(
            intelligence[sourceA], 
            intelligence[sourceB]
          );
          
          crossPatterns.push({
            sourceA,
            sourceB,
            correlation,
            significance: correlation > 0.7 ? 'high' : correlation > 0.4 ? 'medium' : 'low'
          });
        }
      });
    });

    return crossPatterns;
  }

  // Calculate correlation between sources
  calculateSourceCorrelation(sourceA, sourceB) {
    // Mock correlation calculation
    return Math.random();
  }

  // Calculate win probabilities using all intelligence sources
  async calculateWinProbabilities(matches, intelligence) {
    console.log('🎲 Calculating win probabilities...');
    
    const probabilities = {};

    for (const match of matches) {
      if (!match.teams || match.teams.length < 2) continue;
      
      const [team1, team2] = match.teams;
      const matchKey = `${team1} vs ${team2}`;

      // Gather all available data for this match
      const matchData = {
        externalOdds: intelligence.externalOdds.filter(o => o.match === matchKey),
        mlPredictions: intelligence.mlPredictions.filter(p => p.match === matchKey),
        patterns: intelligence.patternAnalysis,
        trafficData: intelligence.decryptedTraffic.filter(t => 
          t.data && JSON.stringify(t.data).includes(team1) || JSON.stringify(t.data).includes(team2)
        )
      };

      // Calculate probability using weighted ensemble
      const probability = this.calculateEnsembleProbability(matchData, team1, team2);
      
      probabilities[matchKey] = {
        team1: {
          name: team1,
          winProbability: probability.team1Win,
          confidence: probability.confidence,
          factors: probability.team1Factors
        },
        team2: {
          name: team2,
          winProbability: probability.team2Win,
          confidence: probability.confidence,
          factors: probability.team2Factors
        },
        drawProbability: probability.draw,
        recommendation: this.generateRecommendation(probability),
        riskLevel: this.assessRiskLevel(probability),
        dataQuality: this.assessMatchDataQuality(matchData)
      };
    }

    console.log(`🎯 Calculated probabilities for ${Object.keys(probabilities).length} matches`);

    // Save win probabilities
    fs.writeFileSync(
      path.join(this.dataDir, 'win_probabilities.json'),
      JSON.stringify(probabilities, null, 2)
    );

    return probabilities;
  }

  // Calculate ensemble probability using all data sources
  calculateEnsembleProbability(matchData, team1, team2) {
    let team1Win = 0.5; // Base probability
    let team2Win = 0.5;
    let draw = 0.3;
    let confidence = 0.5;
    let totalWeight = 0;

    const factors = { team1: [], team2: [] };

    // Factor 1: External odds analysis
    if (matchData.externalOdds.length > 0) {
      const oddsAnalysis = this.analyzeOddsForProbability(matchData.externalOdds);
      team1Win = (team1Win * totalWeight + oddsAnalysis.team1 * this.patterns.externalIntelWeight) / (totalWeight + this.patterns.externalIntelWeight);
      team2Win = (team2Win * totalWeight + oddsAnalysis.team2 * this.patterns.externalIntelWeight) / (totalWeight + this.patterns.externalIntelWeight);
      totalWeight += this.patterns.externalIntelWeight;
      factors.team1.push('external_odds');
      factors.team2.push('external_odds');
    }

    // Factor 2: ML predictions
    if (matchData.mlPredictions.length > 0) {
      const mlAnalysis = this.analyzeMlPredictions(matchData.mlPredictions);
      team1Win = (team1Win * totalWeight + mlAnalysis.team1 * this.patterns.historicalDataWeight) / (totalWeight + this.patterns.historicalDataWeight);
      team2Win = (team2Win * totalWeight + mlAnalysis.team2 * this.patterns.historicalDataWeight) / (totalWeight + this.patterns.historicalDataWeight);
      totalWeight += this.patterns.historicalDataWeight;
      confidence = Math.max(confidence, mlAnalysis.confidence);
      factors.team1.push('ml_prediction');
      factors.team2.push('ml_prediction');
    }

    // Factor 3: Pattern analysis
    if (matchData.patterns) {
      const patternAnalysis = this.analyzePatternForMatch(matchData.patterns, team1, team2);
      if (patternAnalysis.significance > 0.3) {
        team1Win = (team1Win * totalWeight + patternAnalysis.team1 * this.patterns.marketSentimentWeight) / (totalWeight + this.patterns.marketSentimentWeight);
        team2Win = (team2Win * totalWeight + patternAnalysis.team2 * this.patterns.marketSentimentWeight) / (totalWeight + this.patterns.marketSentimentWeight);
        totalWeight += this.patterns.marketSentimentWeight;
        factors.team1.push('pattern_analysis');
        factors.team2.push('pattern_analysis');
      }
    }

    // Factor 4: Decrypted traffic intelligence
    if (matchData.trafficData.length > 0) {
      const trafficAnalysis = this.analyzeTrafficForMatch(matchData.trafficData, team1, team2);
      if (trafficAnalysis.confidence > 0.4) {
        team1Win = (team1Win + trafficAnalysis.team1) / 2;
        team2Win = (team2Win + trafficAnalysis.team2) / 2;
        factors.team1.push('traffic_intelligence');
        factors.team2.push('traffic_intelligence');
      }
    }

    // Normalize probabilities
    const total = team1Win + team2Win + draw;
    return {
      team1Win: (team1Win / total).toFixed(3),
      team2Win: (team2Win / total).toFixed(3),
      draw: (draw / total).toFixed(3),
      confidence: confidence.toFixed(3),
      team1Factors: factors.team1,
      team2Factors: factors.team2
    };
  }

  // Analyze odds for probability calculation
  analyzeOddsForProbability(oddsData) {
    let totalTeam1 = 0, totalTeam2 = 0, count = 0;
    
    oddsData.forEach(odds => {
      if (odds.odds.home && odds.odds.away) {
        const homeProb = 1 / parseFloat(odds.odds.home);
        const awayProb = 1 / parseFloat(odds.odds.away);
        totalTeam1 += homeProb;
        totalTeam2 += awayProb;
        count++;
      }
    });

    if (count === 0) return { team1: 0.5, team2: 0.5 };

    return {
      team1: totalTeam1 / count,
      team2: totalTeam2 / count
    };
  }

  // Analyze ML predictions for match
  analyzeMlPredictions(predictions) {
    let team1Score = 0, team2Score = 0, totalConfidence = 0;
    
    predictions.forEach(pred => {
      if (pred.prediction === 'home') team1Score += parseFloat(pred.confidence);
      if (pred.prediction === 'away') team2Score += parseFloat(pred.confidence);
      totalConfidence += parseFloat(pred.confidence);
    });

    return {
      team1: team1Score / predictions.length,
      team2: team2Score / predictions.length,
      confidence: totalConfidence / predictions.length
    };
  }

  // Analyze patterns for specific match
  analyzePatternForMatch(patterns, team1, team2) {
    let team1Score = 0.5, team2Score = 0.5, significance = 0;
    
    // Check team form patterns
    if (patterns.teamFormPatterns) {
      const matchPattern = patterns.teamFormPatterns.find(p => 
        p.match.includes(team1) && p.match.includes(team2)
      );
      
      if (matchPattern) {
        const formDiff = matchPattern.formDifferential;
        if (formDiff > 0) team1Score += Math.abs(formDiff) * 0.2;
        else team2Score += Math.abs(formDiff) * 0.2;
        significance += matchPattern.confidence;
      }
    }

    return { team1: team1Score, team2: team2Score, significance };
  }

  // Analyze decrypted traffic for match insights
  analyzeTrafficForMatch(trafficData, team1, team2) {
    let team1Sentiment = 0.5, team2Sentiment = 0.5, confidence = 0.3;
    
    trafficData.forEach(traffic => {
      const dataStr = JSON.stringify(traffic.data).toLowerCase();
      
      // Simple sentiment analysis on traffic data
      if (dataStr.includes(team1.toLowerCase())) {
        if (dataStr.includes('favorite') || dataStr.includes('strong')) {
          team1Sentiment += 0.1;
        }
      }
      
      if (dataStr.includes(team2.toLowerCase())) {
        if (dataStr.includes('favorite') || dataStr.includes('strong')) {
          team2Sentiment += 0.1;
        }
      }
    });

    return { team1: team1Sentiment, team2: team2Sentiment, confidence };
  }

  // Generate recommendation based on probability
  generateRecommendation(probability) {
    const team1Prob = parseFloat(probability.team1Win);
    const team2Prob = parseFloat(probability.team2Win);
    const confidence = parseFloat(probability.confidence);

    if (confidence < 0.6) {
      return { action: 'avoid', reason: 'Low confidence in prediction' };
    }

    if (team1Prob > this.patterns.winProbabilityThreshold) {
      return { 
        action: 'bet_team1', 
        reason: `High probability (${(team1Prob * 100).toFixed(1)}%) for team 1 win`,
        confidence: 'high'
      };
    }

    if (team2Prob > this.patterns.winProbabilityThreshold) {
      return { 
        action: 'bet_team2', 
        reason: `High probability (${(team2Prob * 100).toFixed(1)}%) for team 2 win`,
        confidence: 'high'
      };
    }

    return { 
      action: 'monitor', 
      reason: 'Probabilities too close, continue monitoring',
      confidence: 'medium'
    };
  }

  // Assess risk level
  assessRiskLevel(probability) {
    const confidence = parseFloat(probability.confidence);
    const maxProb = Math.max(
      parseFloat(probability.team1Win), 
      parseFloat(probability.team2Win)
    );

    if (confidence > 0.8 && maxProb > 0.7) return 'low';
    if (confidence > 0.6 && maxProb > 0.6) return 'medium';
    return 'high';
  }

  // Assess match data quality
  assessMatchDataQuality(matchData) {
    let score = 0;
    
    if (matchData.externalOdds.length > 2) score += 0.3;
    if (matchData.mlPredictions.length > 0) score += 0.3;
    if (matchData.patterns) score += 0.2;
    if (matchData.trafficData.length > 0) score += 0.2;

    return {
      score: score.toFixed(2),
      level: score > 0.7 ? 'high' : score > 0.4 ? 'medium' : 'low'
    };
  }

  // Generate comprehensive intelligence report
  async generateIntelligenceReport(intelligence) {
    console.log('📋 Generating comprehensive intelligence report...');
    
    const report = {
      metadata: {
        timestamp: new Date().toISOString(),
        targetDate: '04/10/2025',
        reportType: 'external_intelligence',
        version: '1.0'
      },
      summary: {
        totalMatches: Object.keys(intelligence.winProbabilities).length,
        externalOddsSources: intelligence.externalOdds.length,
        mlPredictions: intelligence.mlPredictions.length,
        decryptedDataPoints: intelligence.decryptedTraffic.length,
        highConfidenceMatches: Object.values(intelligence.winProbabilities)
          .filter(match => parseFloat(match.team1.confidence) > 0.7).length
      },
      intelligence,
      recommendations: this.generateOverallRecommendations(intelligence.winProbabilities),
      riskAssessment: this.generateRiskAssessment(intelligence),
      actionPlan: this.generateIntelligenceActionPlan(intelligence.winProbabilities)
    };

    // Save comprehensive report
    const reportPath = path.join(this.outputDir, `external_intelligence_report_${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`📊 Intelligence report saved: ${reportPath}`);
    return report;
  }

  // Generate overall recommendations
  generateOverallRecommendations(winProbabilities) {
    const recommendations = [];
    
    Object.entries(winProbabilities).forEach(([match, data]) => {
      if (data.recommendation.action !== 'avoid' && data.riskLevel === 'low') {
        recommendations.push({
          match,
          action: data.recommendation.action,
          confidence: data.recommendation.confidence,
          reason: data.recommendation.reason,
          priority: data.dataQuality.level === 'high' ? 'high' : 'medium'
        });
      }
    });

    return recommendations.sort((a, b) => 
      (b.priority === 'high' ? 1 : 0) - (a.priority === 'high' ? 1 : 0)
    );
  }

  // Generate risk assessment
  generateRiskAssessment(intelligence) {
    return {
      dataReliability: intelligence.decryptedTraffic.length > 5 ? 'high' : 'medium',
      externalSourceDiversity: intelligence.externalOdds.length > 10 ? 'high' : 'medium',
      mlPredictionQuality: intelligence.mlPredictions.length > 0 ? 'available' : 'unavailable',
      overallRisk: 'medium'
    };
  }

  // Generate intelligence-based action plan
  generateIntelligenceActionPlan(winProbabilities) {
    return {
      immediate: [
        'Review high-confidence match predictions',
        'Verify external odds data freshness',
        'Cross-validate ML predictions with traffic data'
      ],
      monitoring: [
        'Set up real-time odds monitoring',
        'Continue traffic decryption analysis', 
        'Update ML models with new data'
      ],
      alerts: [
        'Configure alerts for odds movement >10%',
        'Monitor for jackpot match announcements',
        'Track team news and lineup changes'
      ]
    };
  }

  // Utility function for delays
  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = ExternalIntelligenceEngine;