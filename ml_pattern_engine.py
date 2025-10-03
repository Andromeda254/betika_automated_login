#!/usr/bin/env python3

"""
Phase 2: Machine Learning Pattern Analysis Engine
Advanced betting odds analysis, user behavior detection, and competitive intelligence
"""

import json
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
import re
import sqlite3
from collections import defaultdict, deque
from typing import Dict, List, Tuple, Optional
import asyncio
import websockets
import logging
from dataclasses import dataclass
import pickle
import os
import sys

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('ml_pattern_engine.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

@dataclass
class OddsChange:
    """Represents a betting odds change event"""
    timestamp: datetime
    match_id: str
    market_type: str
    old_odds: float
    new_odds: float
    change_magnitude: float
    source_ip: str
    api_endpoint: str

@dataclass
class UserBehavior:
    """Represents user behavior pattern"""
    session_id: str
    timestamp: datetime
    action_type: str
    page_url: str
    duration: float
    api_calls: int
    bet_amount: Optional[float] = None

@dataclass
class CompetitorActivity:
    """Represents competitor intelligence data"""
    domain: str
    timestamp: datetime
    activity_type: str
    frequency: int
    details: Dict

class PatternAnalysisEngine:
    """Advanced ML-based pattern analysis for betting data"""
    
    def __init__(self, db_path: str = "pattern_analysis.db"):
        self.db_path = db_path
        self.init_database()
        
        # Pattern detection windows
        self.odds_window = deque(maxlen=1000)  # Last 1000 odds changes
        self.user_sessions = defaultdict(list)  # User behavior tracking
        self.competitor_data = defaultdict(list)  # Competitor intelligence
        
        # ML models (simple implementations)
        self.odds_model = None
        self.behavior_model = None
        
        # Real-time thresholds
        self.odds_threshold = 0.1  # 10% change threshold
        self.frequency_threshold = 10  # API calls per minute
        
        logger.info("Pattern Analysis Engine initialized")

    def init_database(self):
        """Initialize SQLite database for pattern storage"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Odds changes table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS odds_changes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                match_id TEXT,
                market_type TEXT,
                old_odds REAL,
                new_odds REAL,
                change_magnitude REAL,
                source_ip TEXT,
                api_endpoint TEXT
            )
        """)
        
        # User behavior table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_behavior (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT,
                timestamp TEXT NOT NULL,
                action_type TEXT,
                page_url TEXT,
                duration REAL,
                api_calls INTEGER,
                bet_amount REAL
            )
        """)
        
        # Competitor activity table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS competitor_activity (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                domain TEXT,
                timestamp TEXT NOT NULL,
                activity_type TEXT,
                frequency INTEGER,
                details TEXT
            )
        """)
        
        # Pattern alerts table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS pattern_alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                alert_type TEXT,
                severity TEXT,
                description TEXT,
                data TEXT
            )
        """)
        
        conn.commit()
        conn.close()
        logger.info("Database initialized successfully")

    def analyze_http_packets(self, packets_file: str) -> Dict:
        """Analyze HTTP packets for betting patterns"""
        if not os.path.exists(packets_file):
            logger.warning(f"Packets file not found: {packets_file}")
            return {}
        
        try:
            with open(packets_file, 'r') as f:
                packets = [json.loads(line) for line in f if line.strip()]
        except Exception as e:
            logger.error(f"Error reading packets file: {e}")
            return {}
        
        analysis_results = {
            'total_packets': len(packets),
            'betting_events': 0,
            'odds_changes': [],
            'user_patterns': [],
            'api_calls': defaultdict(int),
            'suspicious_activity': []
        }
        
        for packet in packets:
            try:
                self._process_packet(packet, analysis_results)
            except Exception as e:
                logger.error(f"Error processing packet: {e}")
                continue
        
        # Detect patterns
        self._detect_odds_patterns(analysis_results)
        self._detect_user_patterns(analysis_results)
        self._detect_anomalies(analysis_results)
        
        return analysis_results

    def _process_packet(self, packet: dict, results: dict):
        """Process individual packet for pattern detection"""
        try:
            layers = packet.get('_source', {}).get('layers', {})
            
            # HTTP analysis
            if 'http' in layers:
                http_data = layers['http']
                self._analyze_http_request(http_data, layers, results)
            
            # QUIC analysis
            if 'quic' in layers:
                quic_data = layers['quic']
                self._analyze_quic_connection(quic_data, layers, results)
            
            # TLS analysis for domain detection
            if 'tls' in layers:
                tls_data = layers['tls']
                self._analyze_tls_handshake(tls_data, layers, results)
                
        except Exception as e:
            logger.debug(f"Error processing packet data: {e}")

    def _analyze_http_request(self, http_data: dict, layers: dict, results: dict):
        """Analyze HTTP request for betting patterns"""
        method = http_data.get('http.request.method', 'GET')
        uri = http_data.get('http.request.uri', '')
        
        # Track API calls
        if '/api/' in uri or '/v' in uri and any(x in uri for x in ['bet', 'odds', 'live']):
            results['api_calls'][uri] += 1
            
        # Detect betting-related endpoints
        betting_keywords = ['bet', 'odds', 'live', 'match', 'sport', 'market']
        if any(keyword in uri.lower() for keyword in betting_keywords):
            results['betting_events'] += 1
            
            # Extract potential odds data
            odds_match = re.search(r'odds?[=:]([0-9.]+)', uri)
            if odds_match:
                odds_value = float(odds_match.group(1))
                
                # Create odds change event
                odds_change = OddsChange(
                    timestamp=datetime.now(),
                    match_id=self._extract_match_id(uri),
                    market_type=self._extract_market_type(uri),
                    old_odds=0.0,  # Would need historical data
                    new_odds=odds_value,
                    change_magnitude=0.0,
                    source_ip=layers.get('ip', {}).get('ip.src', ''),
                    api_endpoint=uri
                )
                
                results['odds_changes'].append(odds_change)

    def _analyze_quic_connection(self, quic_data: dict, layers: dict, results: dict):
        """Analyze QUIC connections for HTTP/3 betting traffic"""
        connection_id = quic_data.get('quic.connection.id')
        if connection_id:
            # Track QUIC connections to betting domains
            ip_dst = layers.get('ip', {}).get('ip.dst', '')
            if any(domain in ip_dst for domain in ['betika', 'live', 'api']):
                logger.info(f"HTTP/3 betting connection detected: {connection_id}")

    def _analyze_tls_handshake(self, tls_data: dict, layers: dict, results: dict):
        """Analyze TLS handshakes for domain identification"""
        server_name = tls_data.get('tls.handshake.extensions_server_name')
        if server_name and any(domain in server_name for domain in ['betika', 'bet365', 'sportpesa']):
            # Track competitor activity
            competitor_activity = CompetitorActivity(
                domain=server_name,
                timestamp=datetime.now(),
                activity_type='tls_handshake',
                frequency=1,
                details={'ip': layers.get('ip', {}).get('ip.dst', '')}
            )
            
            results.setdefault('competitor_activity', []).append(competitor_activity)

    def _extract_match_id(self, uri: str) -> str:
        """Extract match ID from URI"""
        match = re.search(r'match[_-]?(?:id)?[=:]?([0-9]+)', uri)
        return match.group(1) if match else 'unknown'

    def _extract_market_type(self, uri: str) -> str:
        """Extract market type from URI"""
        if 'live' in uri.lower():
            return 'live_betting'
        elif 'pre' in uri.lower():
            return 'pre_match'
        elif 'inplay' in uri.lower():
            return 'in_play'
        else:
            return 'unknown'

    def _detect_odds_patterns(self, results: dict):
        """Detect betting odds patterns and anomalies"""
        odds_changes = results.get('odds_changes', [])
        
        if len(odds_changes) < 2:
            return
        
        # Analyze odds movement patterns
        rapid_changes = []
        for i in range(1, len(odds_changes)):
            current = odds_changes[i]
            previous = odds_changes[i-1]
            
            if (current.timestamp - previous.timestamp).seconds < 60:  # Less than 1 minute
                magnitude = abs(current.new_odds - previous.new_odds) / previous.new_odds
                if magnitude > self.odds_threshold:
                    rapid_changes.append({
                        'match_id': current.match_id,
                        'magnitude': magnitude,
                        'timespan': (current.timestamp - previous.timestamp).seconds
                    })
        
        if rapid_changes:
            self._create_alert('rapid_odds_changes', 'HIGH', f"Detected {len(rapid_changes)} rapid odds changes", rapid_changes)

    def _detect_user_patterns(self, results: dict):
        """Detect suspicious user behavior patterns"""
        api_calls = results.get('api_calls', {})
        
        # Detect high-frequency API usage
        suspicious_endpoints = []
        for endpoint, count in api_calls.items():
            if count > self.frequency_threshold:
                suspicious_endpoints.append({
                    'endpoint': endpoint,
                    'frequency': count,
                    'type': 'high_frequency_api'
                })
        
        if suspicious_endpoints:
            results['suspicious_activity'].extend(suspicious_endpoints)
            self._create_alert('high_frequency_api', 'MEDIUM', f"Detected {len(suspicious_endpoints)} high-frequency API endpoints", suspicious_endpoints)

    def _detect_anomalies(self, results: dict):
        """Detect statistical anomalies in betting patterns"""
        # Simple anomaly detection based on frequency
        betting_events = results.get('betting_events', 0)
        
        if betting_events > 100:  # Threshold for unusual activity
            self._create_alert('high_betting_activity', 'MEDIUM', f"Unusually high betting activity: {betting_events} events", {
                'event_count': betting_events,
                'threshold': 100
            })

    def _create_alert(self, alert_type: str, severity: str, description: str, data: any):
        """Create and store pattern alert"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO pattern_alerts (timestamp, alert_type, severity, description, data)
            VALUES (?, ?, ?, ?, ?)
        """, (
            datetime.now().isoformat(),
            alert_type,
            severity,
            description,
            json.dumps(data, default=str)
        ))
        
        conn.commit()
        conn.close()
        
        logger.warning(f"ALERT [{severity}] {alert_type}: {description}")

    def generate_intelligence_report(self) -> str:
        """Generate comprehensive intelligence report"""
        conn = sqlite3.connect(self.db_path)
        
        # Get recent data
        odds_df = pd.read_sql_query("""
            SELECT * FROM odds_changes 
            WHERE timestamp > datetime('now', '-1 hour')
            ORDER BY timestamp DESC
        """, conn)
        
        alerts_df = pd.read_sql_query("""
            SELECT * FROM pattern_alerts 
            WHERE timestamp > datetime('now', '-1 hour')
            ORDER BY timestamp DESC
        """, conn)
        
        conn.close()
        
        report = f"""
# Machine Learning Pattern Analysis Report
## Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

### Odds Analysis Summary
- Total odds changes detected: {len(odds_df)}
- Rapid changes (>10%): {len(odds_df[odds_df['change_magnitude'] > 0.1])}
- Most active markets: {odds_df['market_type'].value_counts().to_dict() if not odds_df.empty else 'None'}

### Alert Summary
- Total alerts: {len(alerts_df)}
- High severity alerts: {len(alerts_df[alerts_df['severity'] == 'HIGH'])}
- Medium severity alerts: {len(alerts_df[alerts_df['severity'] == 'MEDIUM'])}

### Recent Alerts
{alerts_df[['timestamp', 'alert_type', 'severity', 'description']].to_string(index=False) if not alerts_df.empty else 'No recent alerts'}

### Pattern Insights
- **Odds Volatility**: {'High' if len(odds_df) > 50 else 'Normal'}
- **API Activity**: {'Suspicious' if len(alerts_df[alerts_df['alert_type'] == 'high_frequency_api']) > 0 else 'Normal'}
- **Betting Volume**: {'High' if len(odds_df) > 100 else 'Normal'}

---
Generated by ML Pattern Analysis Engine v2.0
        """
        
        return report

    async def start_realtime_analysis(self, packets_source: str):
        """Start real-time pattern analysis"""
        logger.info("Starting real-time pattern analysis...")
        
        while True:
            try:
                if os.path.exists(packets_source):
                    results = self.analyze_http_packets(packets_source)
                    
                    if results['total_packets'] > 0:
                        logger.info(f"Analyzed {results['total_packets']} packets, found {results['betting_events']} betting events")
                        
                        # Store results
                        self._store_analysis_results(results)
                        
                        # Generate report if significant activity
                        if results['betting_events'] > 10:
                            report = self.generate_intelligence_report()
                            self._save_report(report)
                    
                await asyncio.sleep(30)  # Analyze every 30 seconds
                
            except Exception as e:
                logger.error(f"Error in real-time analysis: {e}")
                await asyncio.sleep(60)

    def _store_analysis_results(self, results: dict):
        """Store analysis results in database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Store odds changes
        for odds_change in results.get('odds_changes', []):
            cursor.execute("""
                INSERT INTO odds_changes 
                (timestamp, match_id, market_type, old_odds, new_odds, change_magnitude, source_ip, api_endpoint)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                odds_change.timestamp.isoformat(),
                odds_change.match_id,
                odds_change.market_type,
                odds_change.old_odds,
                odds_change.new_odds,
                odds_change.change_magnitude,
                odds_change.source_ip,
                odds_change.api_endpoint
            ))
        
        # Store competitor activity
        for activity in results.get('competitor_activity', []):
            cursor.execute("""
                INSERT INTO competitor_activity (domain, timestamp, activity_type, frequency, details)
                VALUES (?, ?, ?, ?, ?)
            """, (
                activity.domain,
                activity.timestamp.isoformat(),
                activity.activity_type,
                activity.frequency,
                json.dumps(activity.details)
            ))
        
        conn.commit()
        conn.close()

    def _save_report(self, report: str):
        """Save intelligence report to file"""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"competitive_intel/ml_intelligence_report_{timestamp}.md"
        
        os.makedirs(os.path.dirname(filename), exist_ok=True)
        
        with open(filename, 'w') as f:
            f.write(report)
        
        logger.info(f"Intelligence report saved: {filename}")

class WebSocketAnalysisServer:
    """WebSocket server for real-time pattern analysis updates"""
    
    def __init__(self, engine: PatternAnalysisEngine, port: int = 9001):
        self.engine = engine
        self.port = port
        self.clients = set()
        
    async def register_client(self, websocket, path):
        """Register new WebSocket client"""
        self.clients.add(websocket)
        logger.info(f"Client connected: {websocket.remote_address}")
        
        try:
            await websocket.wait_closed()
        finally:
            self.clients.remove(websocket)

    async def broadcast_analysis(self, analysis_data: dict):
        """Broadcast analysis results to all connected clients"""
        if self.clients:
            message = json.dumps(analysis_data, default=str)
            await asyncio.gather(
                *[client.send(message) for client in self.clients],
                return_exceptions=True
            )

    async def start_server(self):
        """Start WebSocket server"""
        logger.info(f"Starting WebSocket server on port {self.port}")
        await websockets.serve(self.register_client, "localhost", self.port)

def main():
    """Main execution function"""
    logger.info("Starting ML Pattern Analysis Engine")
    
    # Initialize engine
    engine = PatternAnalysisEngine()
    
    # Start WebSocket server
    ws_server = WebSocketAnalysisServer(engine)
    
    # Start real-time analysis
    packets_source = "live_analysis/realtime_analysis_*/realtime_packets.jsonl"
    
    async def run_analysis():
        # Start WebSocket server
        await ws_server.start_server()
        
        # Start real-time analysis
        await engine.start_realtime_analysis(packets_source)
    
    # Run the analysis
    try:
        asyncio.run(run_analysis())
    except KeyboardInterrupt:
        logger.info("Analysis engine stopped by user")
    except Exception as e:
        logger.error(f"Analysis engine error: {e}")

if __name__ == "__main__":
    main()