const fs = require('fs');
const path = require('path');

/**
 * Advanced Jackpot Prediction Analyzer
 * Processes collected jackpot data to generate insights for 04/10/2025 matches
 */

class JackpotAnalyzer {
  constructor() {
    this.dataDir = 'jackpot-data';
    this.outputDir = 'predictions';
    this.targetDate = '04/10/2025';
    
    // Ensure output directory exists
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir);
    }
  }

  loadCapturedData() {
    console.log('📊 Loading captured jackpot data...');
    
    const dataFiles = [
      'final_report.json',
      'insights_summary.json'
    ];

    const data = {};
    
    dataFiles.forEach(file => {
      const filepath = path.join(this.dataDir, file);
      if (fs.existsSync(filepath)) {
        try {
          const content = fs.readFileSync(filepath, 'utf8');
          data[file.replace('.json', '')] = JSON.parse(content);
          console.log(`✅ Loaded ${file}`);
        } catch (e) {
          console.log(`❌ Error loading ${file}: ${e.message}`);
        }
      } else {
        console.log(`⚠️ ${file} not found`);
      }
    });

    // Load match insights from all JSON files
    const matchInsightsDir = 'match-insights';
    if (fs.existsSync(matchInsightsDir)) {
      const insightFiles = fs.readdirSync(matchInsightsDir).filter(f => f.endsWith('.json'));
      data.matchInsights = [];
      
      insightFiles.forEach(file => {
        try {
          const filepath = path.join(matchInsightsDir, file);
          const content = JSON.parse(fs.readFileSync(filepath, 'utf8'));
          data.matchInsights.push(content);
        } catch (e) {
          console.log(`⚠️ Error loading insight file ${file}`);
        }
      });
      
      console.log(`📈 Loaded ${data.matchInsights?.length || 0} match insight files`);
    }

    return data;
  }

  analyzeJackpotPatterns(data) {
    console.log('\n🔍 Analyzing jackpot patterns with external intelligence...');
    
    const patterns = {
      teamFrequency: {},
      competitionTypes: {},
      oddRanges: {},
      datePatterns: {},
      matchTypes: {},
      winProbabilities: {},
      externalOddsAnalysis: {},
      mlPredictions: {},
      trafficIntelligence: {}
    };

    // Analyze captured jackpot data
    if (data.final_report?.capturedData?.jackpotData) {
      data.final_report.capturedData.jackpotData.forEach(item => {
        if (item.matches) {
          item.matches.forEach(match => {
            // Extract team names from match text
            const teams = this.extractTeamNames(match.text);
            teams.forEach(team => {
              patterns.teamFrequency[team] = (patterns.teamFrequency[team] || 0) + 1;
            });

            // Analyze match types (vs, v, etc.)
            if (match.text.includes(' vs ')) {
              patterns.matchTypes['vs'] = (patterns.matchTypes['vs'] || 0) + 1;
            } else if (match.text.includes(' v ')) {
              patterns.matchTypes['v'] = (patterns.matchTypes['v'] || 0) + 1;
            }
          });
        }

        // Check for date-related patterns
        if (item.type === 'date_match') {
          item.elements?.forEach(element => {
            const datePattern = element.date;
            patterns.datePatterns[datePattern] = (patterns.datePatterns[datePattern] || 0) + 1;
          });
        }
      });
    }

    // Analyze odds data
    if (data.final_report?.capturedData?.oddsData) {
      data.final_report.capturedData.oddsData.forEach(oddsItem => {
        oddsItem.odds?.forEach(odd => {
          const value = parseFloat(odd.value);
          if (!isNaN(value)) {
            const range = this.categorizeOdds(value);
            patterns.oddRanges[range] = (patterns.oddRanges[range] || 0) + 1;
          }
        });
      });
    }

    // Analyze external intelligence if available
    if (data.final_report?.intelligenceReport) {
      const intel = data.final_report.intelligenceReport;
      console.log('🧠 Processing external intelligence data...');
      
      // Extract win probabilities
      if (intel.intelligence?.winProbabilities) {
        patterns.winProbabilities = intel.intelligence.winProbabilities;
        console.log(`   - ${Object.keys(patterns.winProbabilities).length} matches with win probability analysis`);
      }
      
      // Extract external odds analysis
      if (intel.intelligence?.externalOdds) {
        patterns.externalOddsAnalysis = this.analyzeExternalOddsPatterns(intel.intelligence.externalOdds);
        console.log(`   - ${intel.intelligence.externalOdds.length} external odds data points`);
      }
      
      // Extract ML predictions
      if (intel.intelligence?.mlPredictions) {
        patterns.mlPredictions = this.analyzeMLPredictionPatterns(intel.intelligence.mlPredictions);
        console.log(`   - ${intel.intelligence.mlPredictions.length} ML prediction data points`);
      }
      
      // Extract traffic intelligence
      if (intel.intelligence?.decryptedTraffic) {
        patterns.trafficIntelligence = this.analyzeTrafficIntelligence(intel.intelligence.decryptedTraffic);
        console.log(`   - ${intel.intelligence.decryptedTraffic.length} decrypted traffic data points`);
      }
    }

    console.log(`📊 Found patterns:`);
    console.log(`   - ${Object.keys(patterns.teamFrequency).length} unique teams`);
    console.log(`   - ${Object.keys(patterns.oddRanges).length} odds ranges`);
    console.log(`   - ${Object.keys(patterns.datePatterns).length} date patterns`);
    console.log(`   - ${Object.keys(patterns.winProbabilities).length} matches with probability analysis`);

    return patterns;
  }

  extractTeamNames(matchText) {
    const teams = [];
    
    // Common patterns for team separation
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

  categorizeOdds(value) {
    if (value <= 1.5) return 'Low (≤́1.5)';
    if (value <= 2.0) return 'Medium-Low (1.5-2.0)';
    if (value <= 3.0) return 'Medium (2.0-3.0)';
    if (value <= 5.0) return 'Medium-High (3.0-5.0)';
    return 'High (>5.0)';
  }

  analyzeExternalOddsPatterns(externalOdds) {
    const analysis = {
      sourceDistribution: {},
      averageOdds: {},
      oddsMovement: {},
      consensus: {}
    };

    // Analyze source distribution
    externalOdds.forEach(odds => {
      analysis.sourceDistribution[odds.source] = (analysis.sourceDistribution[odds.source] || 0) + 1;
    });

    // Analyze average odds by match
    const matchOdds = {};
    externalOdds.forEach(odds => {
      if (!matchOdds[odds.match]) matchOdds[odds.match] = [];
      matchOdds[odds.match].push(odds.odds);
    });

    Object.entries(matchOdds).forEach(([match, oddsArray]) => {
      const avgHome = oddsArray.reduce((sum, o) => sum + (parseFloat(o.home) || 0), 0) / oddsArray.length;
      const avgAway = oddsArray.reduce((sum, o) => sum + (parseFloat(o.away) || 0), 0) / oddsArray.length;
      
      analysis.averageOdds[match] = {
        homeAvg: avgHome.toFixed(2),
        awayAvg: avgAway.toFixed(2),
        sources: oddsArray.length,
        recommendation: avgHome < avgAway ? 'home_favored' : 'away_favored'
      };
    });

    return analysis;
  }

  analyzeMLPredictionPatterns(mlPredictions) {
    const analysis = {
      predictionDistribution: {},
      confidenceLevels: {},
      modelTypes: {},
      consensus: {}
    };

    mlPredictions.forEach(pred => {
      // Prediction distribution
      analysis.predictionDistribution[pred.prediction] = (analysis.predictionDistribution[pred.prediction] || 0) + 1;
      
      // Confidence levels
      const confLevel = parseFloat(pred.confidence) > 0.7 ? 'high' : parseFloat(pred.confidence) > 0.5 ? 'medium' : 'low';
      analysis.confidenceLevels[confLevel] = (analysis.confidenceLevels[confLevel] || 0) + 1;
      
      // Model types
      analysis.modelTypes[pred.model] = (analysis.modelTypes[pred.model] || 0) + 1;
    });

    // Calculate consensus
    const totalPredictions = mlPredictions.length;
    Object.entries(analysis.predictionDistribution).forEach(([prediction, count]) => {
      analysis.consensus[prediction] = (count / totalPredictions * 100).toFixed(1) + '%';
    });

    return analysis;
  }

  analyzeTrafficIntelligence(trafficData) {
    const analysis = {
      sourceBreakdown: {},
      dataTypes: {},
      insights: [],
      significance: 0
    };

    trafficData.forEach(traffic => {
      // Source breakdown
      analysis.sourceBreakdown[traffic.source] = (analysis.sourceBreakdown[traffic.source] || 0) + 1;
      
      // Data type analysis
      analysis.dataTypes[traffic.type] = (analysis.dataTypes[traffic.type] || 0) + 1;
      
      // Extract insights from traffic data
      if (traffic.data) {
        const dataStr = JSON.stringify(traffic.data).toLowerCase();
        if (dataStr.includes('jackpot')) {
          analysis.insights.push({
            type: 'jackpot_reference',
            source: traffic.source,
            timestamp: traffic.timestamp,
            significance: 'high'
          });
        }
        
        if (dataStr.includes('04/10/2025') || dataStr.includes('2025-10-04')) {
          analysis.insights.push({
            type: 'target_date_reference',
            source: traffic.source,
            timestamp: traffic.timestamp,
            significance: 'critical'
          });
        }
      }
    });

    // Calculate overall significance
    analysis.significance = analysis.insights.length > 0 ? 
      (analysis.insights.filter(i => i.significance === 'critical').length * 0.8 + 
       analysis.insights.filter(i => i.significance === 'high').length * 0.5) / analysis.insights.length
      : 0;

    return analysis;
  }

  generatePredictionInsights(patterns, data) {
    console.log('\n🎯 Generating prediction insights...');

    const insights = {
      timestamp: new Date().toISOString(),
      targetDate: this.targetDate,
      confidence: 'medium', // Will be calculated based on data quality
      predictions: [],
      riskFactors: [],
      recommendations: []
    };

    // Most frequent teams (likely to appear in jackpots)
    const topTeams = Object.entries(patterns.teamFrequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);

    if (topTeams.length > 0) {
      insights.predictions.push({
        type: 'team_frequency',
        description: 'Teams most likely to appear in jackpot matches',
        data: topTeams.map(([team, count]) => ({ team, frequency: count }))
      });
    }
    
    // Win probability predictions from external intelligence
    if (Object.keys(patterns.winProbabilities).length > 0) {
      const highProbMatches = Object.entries(patterns.winProbabilities)
        .filter(([match, data]) => {
          const maxProb = Math.max(
            parseFloat(data.team1.winProbability),
            parseFloat(data.team2.winProbability)
          );
          return maxProb > 0.65 && data.riskLevel === 'low';
        })
        .map(([match, data]) => ({
          match,
          favored: parseFloat(data.team1.winProbability) > parseFloat(data.team2.winProbability) ? data.team1.name : data.team2.name,
          probability: Math.max(parseFloat(data.team1.winProbability), parseFloat(data.team2.winProbability)),
          confidence: data.team1.confidence,
          factors: parseFloat(data.team1.winProbability) > parseFloat(data.team2.winProbability) ? data.team1.factors : data.team2.factors,
          recommendation: data.recommendation.action
        }));
      
      if (highProbMatches.length > 0) {
        insights.predictions.push({
          type: 'win_probability',
          description: 'High-confidence match predictions from external intelligence',
          data: highProbMatches.sort((a, b) => b.probability - a.probability)
        });
      }
    }
    
    // External odds consensus predictions
    if (patterns.externalOddsAnalysis?.averageOdds) {
      const oddsConsensus = Object.entries(patterns.externalOddsAnalysis.averageOdds)
        .filter(([match, data]) => data.sources >= 2)
        .map(([match, data]) => ({
          match,
          recommendation: data.recommendation,
          homeOdds: data.homeAvg,
          awayOdds: data.awayAvg,
          sources: data.sources,
          value: data.recommendation === 'home_favored' ? 'Home team favored' : 'Away team favored'
        }));
      
      if (oddsConsensus.length > 0) {
        insights.predictions.push({
          type: 'odds_consensus',
          description: 'External odds consensus recommendations',
          data: oddsConsensus
        });
      }
    }
    
    // ML model consensus
    if (patterns.mlPredictions?.consensus) {
      const mlConsensus = Object.entries(patterns.mlPredictions.consensus)
        .filter(([prediction, percentage]) => parseFloat(percentage) > 60)
        .map(([prediction, percentage]) => ({
          prediction,
          consensus: percentage,
          confidence: patterns.mlPredictions.confidenceLevels
        }));
      
      if (mlConsensus.length > 0) {
        insights.predictions.push({
          type: 'ml_consensus',
          description: 'Machine learning model consensus predictions',
          data: mlConsensus
        });
      }
    }

    // Odds distribution analysis
    const oddsDistribution = Object.entries(patterns.oddRanges)
      .sort(([,a], [,b]) => b - a);

    if (oddsDistribution.length > 0) {
      insights.predictions.push({
        type: 'odds_distribution',
        description: 'Expected odds ranges for jackpot matches',
        data: oddsDistribution.map(([range, count]) => ({ range, frequency: count }))
      });
    }

    // Calculate confidence based on data availability
    const dataQuality = this.assessDataQuality(data);
    insights.confidence = dataQuality.overallScore > 0.7 ? 'high' : 
                         dataQuality.overallScore > 0.4 ? 'medium' : 'low';

    // Risk factors
    if (dataQuality.jackpotDataAvailable === 0) {
      insights.riskFactors.push('Limited jackpot-specific data available');
    }
    
    if (dataQuality.dateSpecificData === 0) {
      insights.riskFactors.push('No specific data found for target date 04/10/2025');
    }

    // Recommendations based on analysis
    insights.recommendations = [
      'Monitor team frequency patterns for jackpot selection',
      'Focus on matches with medium odds ranges (2.0-3.0) as they often appear in jackpots',
      'Track API endpoints that returned jackpot data for real-time updates',
      'Set up alerts for matches involving frequently appearing teams'
    ];

    if (topTeams.length > 5) {
      insights.recommendations.push(
        `Priority teams to watch: ${topTeams.slice(0, 5).map(([team]) => team).join(', ')}`
      );
    }

    return insights;
  }

  assessDataQuality(data) {
    const quality = {
      jackpotDataAvailable: 0,
      matchDataAvailable: 0,
      oddsDataAvailable: 0,
      dateSpecificData: 0,
      overallScore: 0
    };

    if (data.final_report?.capturedData) {
      const captured = data.final_report.capturedData;
      
      quality.jackpotDataAvailable = captured.jackpotData?.length || 0;
      quality.matchDataAvailable = captured.matchData?.length || 0;
      quality.oddsDataAvailable = captured.oddsData?.length || 0;
      
      // Check for target date specific data
      const hasTargetDate = captured.jackpotData?.some(item => 
        item.type === 'date_match' || 
        JSON.stringify(item).includes('04/10/2025') ||
        JSON.stringify(item).includes('2025-10-04')
      );
      
      quality.dateSpecificData = hasTargetDate ? 1 : 0;
    }

    // Calculate overall score (0-1)
    const maxScores = { jackpot: 10, match: 20, odds: 15, date: 1 };
    quality.overallScore = (
      Math.min(quality.jackpotDataAvailable / maxScores.jackpot, 1) * 0.4 +
      Math.min(quality.matchDataAvailable / maxScores.match, 1) * 0.3 +
      Math.min(quality.oddsDataAvailable / maxScores.odds, 1) * 0.2 +
      quality.dateSpecificData * 0.1
    );

    return quality;
  }

  generateActionPlan(insights) {
    console.log('\n📋 Generating action plan...');

    const actionPlan = {
      immediate: [],
      shortTerm: [],
      longTerm: [],
      monitoring: []
    };

    // Immediate actions (next 24 hours)
    actionPlan.immediate = [
      'Review collected data for any missed jackpot indicators',
      'Set up monitoring for API endpoints that returned jackpot data',
      'Cross-reference team frequency data with current league standings'
    ];

    // Short-term actions (next week)
    actionPlan.shortTerm = [
      'Schedule daily crawls to capture new jackpot announcements',
      'Implement alerts for 04/10/2025 date appearances on the site',
      'Analyze historical jackpot patterns from similar betting sites'
    ];

    // Long-term actions (until target date)
    actionPlan.longTerm = [
      'Develop machine learning model using collected patterns',
      'Create automated prediction system based on team frequency and odds',
      'Build real-time dashboard for jackpot match monitoring'
    ];

    // Monitoring strategies
    actionPlan.monitoring = [
      'Monitor betika.com/jackpot page daily',
      'Track API calls to api.betika.com for jackpot-related endpoints',
      'Watch for changes in team lineups and match schedules',
      'Alert on any mention of 04/10/2025 in site content'
    ];

    if (insights.predictions.length > 0) {
      const topTeam = insights.predictions
        .find(p => p.type === 'team_frequency')
        ?.data?.[0]?.team;
      
      if (topTeam) {
        actionPlan.monitoring.push(`Special focus on matches involving ${topTeam}`);
      }
    }

    return actionPlan;
  }

  exportResults(patterns, insights, actionPlan, dataQuality) {
    console.log('\n💾 Exporting analysis results...');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // Main analysis report
    const analysisReport = {
      metadata: {
        timestamp: new Date().toISOString(),
        targetDate: this.targetDate,
        analysisVersion: '1.0',
        dataQuality
      },
      patterns,
      insights,
      actionPlan
    };

    const reportPath = path.join(this.outputDir, `jackpot_analysis_${timestamp}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(analysisReport, null, 2));

    // Executive summary
    const summary = {
      title: `Jackpot Prediction Analysis for ${this.targetDate}`,
      timestamp: new Date().toISOString(),
      confidence: insights.confidence,
      keyFindings: [
        `Identified ${Object.keys(patterns.teamFrequency).length} unique teams in historical data`,
        `Analyzed ${Object.keys(patterns.oddRanges).length} different odds ranges`,
        `Data confidence level: ${insights.confidence}`
      ],
      topRecommendations: actionPlan.immediate.slice(0, 3),
      riskFactors: insights.riskFactors,
      nextSteps: [
        'Implement real-time monitoring',
        'Schedule regular data collection',
        'Develop predictive models'
      ]
    };

    const summaryPath = path.join(this.outputDir, `executive_summary_${timestamp}.json`);
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

    // CSV export for easy analysis
    if (insights.predictions.length > 0) {
      const teamData = insights.predictions.find(p => p.type === 'team_frequency');
      if (teamData) {
        const csvContent = [
          'Team,Frequency,Probability',
          ...teamData.data.map(item => 
            `${item.team},${item.frequency},${(item.frequency / teamData.data.length * 100).toFixed(2)}%`
          )
        ].join('\n');

        const csvPath = path.join(this.outputDir, `team_frequency_${timestamp}.csv`);
        fs.writeFileSync(csvPath, csvContent);
      }
    }

    console.log(`📁 Results exported to ${this.outputDir}/`);
    console.log(`   - Analysis Report: ${reportPath}`);
    console.log(`   - Executive Summary: ${summaryPath}`);
    
    return {
      reportPath,
      summaryPath,
      analysisReport
    };
  }

  run() {
    console.log('🚀 Starting Jackpot Prediction Analysis...\n');

    try {
      // Load all collected data
      const data = this.loadCapturedData();
      
      if (!data.final_report && !data.matchInsights) {
        console.log('❌ No data found. Please run enhanced_jackpot_crawler.js first.');
        return;
      }

      // Analyze patterns
      const patterns = this.analyzeJackpotPatterns(data);
      
      // Generate insights
      const insights = this.generatePredictionInsights(patterns, data);
      
      // Create action plan
      const actionPlan = this.generateActionPlan(insights);
      
      // Assess data quality
      const dataQuality = this.assessDataQuality(data);
      
      // Export results
      const results = this.exportResults(patterns, insights, actionPlan, dataQuality);
      
      console.log('\n🎉 Jackpot Prediction Analysis Complete!');
      console.log(`🎯 Target Date: ${this.targetDate}`);
      console.log(`📊 Confidence Level: ${insights.confidence}`);
      console.log(`📈 Data Quality Score: ${(dataQuality.overallScore * 100).toFixed(1)}%`);
      
      if (insights.predictions.length > 0) {
        console.log(`\n🏆 Key Predictions:`);
        insights.predictions.forEach((pred, idx) => {
          console.log(`   ${idx + 1}. ${pred.description}`);
        });
      }

      if (insights.riskFactors.length > 0) {
        console.log(`\n⚠️ Risk Factors:`);
        insights.riskFactors.forEach((factor, idx) => {
          console.log(`   ${idx + 1}. ${factor}`);
        });
      }

      console.log(`\n📋 Next Actions:`);
      actionPlan.immediate.forEach((action, idx) => {
        console.log(`   ${idx + 1}. ${action}`);
      });

      return results;
      
    } catch (error) {
      console.error('❌ Analysis failed:', error.message);
      
      // Save error log
      const errorLog = {
        timestamp: new Date().toISOString(),
        error: error.message,
        stack: error.stack
      };
      
      fs.writeFileSync(
        path.join(this.outputDir, 'error_log.json'), 
        JSON.stringify(errorLog, null, 2)
      );
    }
  }
}

// Run the analyzer if called directly
if (require.main === module) {
  const analyzer = new JackpotAnalyzer();
  analyzer.run();
}

module.exports = JackpotAnalyzer;