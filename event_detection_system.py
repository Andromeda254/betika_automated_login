#!/usr/bin/env python3

"""
Phase 2: Advanced Event Detection System
Real-time event detection, streaming data pipeline, and competitive intelligence alerts
"""

import asyncio
import json
import websockets
import sqlite3
import redis
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Callable
from dataclasses import dataclass, asdict
from collections import defaultdict, deque
import logging
import threading
import time
from enum import Enum
import numpy as np
from scipy import stats
import hashlib
import requests

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class EventType(Enum):
    ODDS_CHANGE = "odds_change"
    API_SPIKE = "api_spike" 
    USER_SESSION = "user_session"
    COMPETITOR_ACTIVITY = "competitor_activity"
    ANOMALY_DETECTED = "anomaly_detected"
    SECURITY_ALERT = "security_alert"

class Severity(Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM" 
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

@dataclass
class Event:
    """Real-time event data structure"""
    event_id: str
    event_type: EventType
    severity: Severity
    timestamp: datetime
    source: str
    data: Dict
    metadata: Dict
    
    def to_dict(self):
        return {
            'event_id': self.event_id,
            'event_type': self.event_type.value,
            'severity': self.severity.value,
            'timestamp': self.timestamp.isoformat(),
            'source': self.source,
            'data': self.data,
            'metadata': self.metadata
        }

class EventDetector:
    """Core event detection engine"""
    
    def __init__(self):
        self.rules = []
        self.event_handlers = defaultdict(list)
        self.event_history = deque(maxlen=10000)
        self.stats_window = deque(maxlen=1000)
        self.baseline_metrics = {}
        
        # Statistical thresholds
        self.z_score_threshold = 2.5
        self.frequency_window = 300  # 5 minutes
        
    def add_rule(self, rule_func: Callable, event_type: EventType):
        """Add detection rule"""
        self.rules.append((rule_func, event_type))
        logger.info(f"Added rule for {event_type.value}")
    
    def add_handler(self, event_type: EventType, handler: Callable):
        """Add event handler"""
        self.event_handlers[event_type].append(handler)
        
    def detect_events(self, data_stream: Dict) -> List[Event]:
        """Detect events from data stream"""
        detected_events = []
        
        for rule_func, event_type in self.rules:
            try:
                event = rule_func(data_stream, self)
                if event:
                    detected_events.append(event)
            except Exception as e:
                logger.error(f"Error in rule {rule_func.__name__}: {e}")
        
        # Store events in history
        self.event_history.extend(detected_events)
        
        return detected_events
    
    def update_baseline(self, metrics: Dict):
        """Update baseline metrics for anomaly detection"""
        self.stats_window.append(metrics)
        
        if len(self.stats_window) >= 30:  # Minimum sample size
            for metric, value in metrics.items():
                values = [m.get(metric, 0) for m in self.stats_window if metric in m]
                if values:
                    self.baseline_metrics[metric] = {
                        'mean': np.mean(values),
                        'std': np.std(values),
                        'percentile_95': np.percentile(values, 95),
                        'last_updated': datetime.now()
                    }

class RealTimeDataPipeline:
    """Real-time data streaming and processing pipeline"""
    
    def __init__(self, redis_host='localhost', redis_port=6379):
        self.redis_client = None
        try:
            import redis
            self.redis_client = redis.Redis(host=redis_host, port=redis_port, decode_responses=True)
            logger.info("Redis connection established")
        except Exception as e:
            logger.warning(f"Redis not available: {e}")
            
        self.websocket_clients = set()
        self.data_streams = {}
        self.event_detector = EventDetector()
        
        # Setup detection rules
        self._setup_detection_rules()
        
    def _setup_detection_rules(self):
        """Setup built-in detection rules"""
        
        # Odds change detection
        def odds_change_rule(data: Dict, detector: EventDetector) -> Optional[Event]:
            if 'odds' in data and 'previous_odds' in data:
                change = abs(data['odds'] - data['previous_odds'])
                change_pct = change / data['previous_odds'] if data['previous_odds'] > 0 else 0
                
                if change_pct > 0.1:  # 10% change
                    severity = Severity.HIGH if change_pct > 0.25 else Severity.MEDIUM
                    
                    return Event(
                        event_id=self._generate_event_id(),
                        event_type=EventType.ODDS_CHANGE,
                        severity=severity,
                        timestamp=datetime.now(),
                        source='odds_monitor',
                        data={
                            'match_id': data.get('match_id'),
                            'old_odds': data['previous_odds'],
                            'new_odds': data['odds'],
                            'change_percent': change_pct * 100
                        },
                        metadata={'rule': 'odds_change_detection'}
                    )
            return None
        
        # API frequency spike detection
        def api_spike_rule(data: Dict, detector: EventDetector) -> Optional[Event]:
            if 'api_calls_per_minute' in data:
                rate = data['api_calls_per_minute']
                
                if 'api_calls_per_minute' in detector.baseline_metrics:
                    baseline = detector.baseline_metrics['api_calls_per_minute']
                    z_score = (rate - baseline['mean']) / baseline['std'] if baseline['std'] > 0 else 0
                    
                    if abs(z_score) > detector.z_score_threshold:
                        return Event(
                            event_id=self._generate_event_id(),
                            event_type=EventType.API_SPIKE,
                            severity=Severity.HIGH if abs(z_score) > 3 else Severity.MEDIUM,
                            timestamp=datetime.now(),
                            source='api_monitor',
                            data={
                                'current_rate': rate,
                                'baseline_mean': baseline['mean'],
                                'z_score': z_score
                            },
                            metadata={'rule': 'api_spike_detection'}
                        )
            return None
        
        # Competitor activity detection
        def competitor_activity_rule(data: Dict, detector: EventDetector) -> Optional[Event]:
            if 'competitor_domains' in data:
                domains = data['competitor_domains']
                unusual_domains = []
                
                for domain, frequency in domains.items():
                    if frequency > 50:  # High activity threshold
                        unusual_domains.append({'domain': domain, 'frequency': frequency})
                
                if unusual_domains:
                    return Event(
                        event_id=self._generate_event_id(),
                        event_type=EventType.COMPETITOR_ACTIVITY,
                        severity=Severity.MEDIUM,
                        timestamp=datetime.now(),
                        source='competitor_monitor',
                        data={'active_competitors': unusual_domains},
                        metadata={'rule': 'competitor_activity_detection'}
                    )
            return None
        
        # Add rules to detector
        self.event_detector.add_rule(odds_change_rule, EventType.ODDS_CHANGE)
        self.event_detector.add_rule(api_spike_rule, EventType.API_SPIKE)
        self.event_detector.add_rule(competitor_activity_rule, EventType.COMPETITOR_ACTIVITY)
    
    def _generate_event_id(self) -> str:
        """Generate unique event ID"""
        return hashlib.md5(f"{datetime.now().isoformat()}{time.time()}".encode()).hexdigest()[:12]
    
    async def start_websocket_server(self, port: int = 9001):
        """Start WebSocket server for real-time streaming"""
        async def handle_client(websocket, path):
            self.websocket_clients.add(websocket)
            logger.info(f"Client connected: {websocket.remote_address}")
            
            try:
                await websocket.wait_closed()
            finally:
                self.websocket_clients.remove(websocket)
                logger.info(f"Client disconnected: {websocket.remote_address}")
        
        logger.info(f"Starting WebSocket server on port {port}")
        await websockets.serve(handle_client, "localhost", port)
    
    async def broadcast_event(self, event: Event):
        """Broadcast event to all connected WebSocket clients"""
        if self.websocket_clients:
            message = json.dumps(event.to_dict())
            disconnected = set()
            
            for client in self.websocket_clients.copy():
                try:
                    await client.send(message)
                except websockets.exceptions.ConnectionClosed:
                    disconnected.add(client)
                except Exception as e:
                    logger.error(f"Error broadcasting to client: {e}")
                    disconnected.add(client)
            
            # Remove disconnected clients
            self.websocket_clients -= disconnected
    
    def store_event(self, event: Event):
        """Store event in database and cache"""
        # SQLite storage
        conn = sqlite3.connect('event_detection.db')
        cursor = conn.cursor()
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS events (
                event_id TEXT PRIMARY KEY,
                event_type TEXT,
                severity TEXT,
                timestamp TEXT,
                source TEXT,
                data TEXT,
                metadata TEXT
            )
        """)
        
        cursor.execute("""
            INSERT OR REPLACE INTO events 
            (event_id, event_type, severity, timestamp, source, data, metadata)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            event.event_id,
            event.event_type.value,
            event.severity.value,
            event.timestamp.isoformat(),
            event.source,
            json.dumps(event.data),
            json.dumps(event.metadata)
        ))
        
        conn.commit()
        conn.close()
        
        # Redis cache (if available)
        if self.redis_client:
            try:
                self.redis_client.setex(
                    f"event:{event.event_id}",
                    3600,  # 1 hour expiry
                    json.dumps(event.to_dict())
                )
                
                # Add to event stream
                self.redis_client.lpush(
                    f"event_stream:{event.event_type.value}",
                    json.dumps(event.to_dict())
                )
                self.redis_client.ltrim(f"event_stream:{event.event_type.value}", 0, 999)  # Keep last 1000
                
            except Exception as e:
                logger.error(f"Redis storage error: {e}")
    
    async def process_data_stream(self, data: Dict):
        """Process incoming data stream and detect events"""
        # Update baseline metrics
        metrics = {
            'api_calls_per_minute': data.get('api_calls_per_minute', 0),
            'betting_events': data.get('betting_events', 0),
            'unique_users': data.get('unique_users', 0),
            'data_volume': data.get('data_volume', 0)
        }
        
        self.event_detector.update_baseline(metrics)
        
        # Detect events
        events = self.event_detector.detect_events(data)
        
        # Process each detected event
        for event in events:
            # Store event
            self.store_event(event)
            
            # Broadcast to clients
            await self.broadcast_event(event)
            
            # Log event
            logger.info(f"Event detected: {event.event_type.value} ({event.severity.value})")
            
        return events

class CompetitiveIntelligenceEngine:
    """Advanced competitive intelligence gathering and analysis"""
    
    def __init__(self, pipeline: RealTimeDataPipeline):
        self.pipeline = pipeline
        self.competitor_profiles = {}
        self.market_intelligence = {}
        
    def analyze_competitor_patterns(self, domain_data: Dict) -> Dict:
        """Analyze competitor activity patterns"""
        intelligence = {
            'domain_analysis': {},
            'traffic_patterns': {},
            'technology_stack': {},
            'market_positioning': {}
        }
        
        for domain, activity in domain_data.items():
            # Analyze traffic patterns
            intelligence['traffic_patterns'][domain] = {
                'frequency': activity.get('frequency', 0),
                'peak_hours': self._identify_peak_hours(activity.get('timestamps', [])),
                'api_endpoints': activity.get('api_calls', {}),
                'user_behavior': activity.get('user_patterns', {})
            }
            
            # Technology stack analysis
            intelligence['technology_stack'][domain] = {
                'http_version': activity.get('http_version', 'unknown'),
                'ssl_version': activity.get('ssl_version', 'unknown'),
                'cdn_usage': activity.get('cdn', 'unknown'),
                'security_measures': activity.get('security', [])
            }
        
        return intelligence
    
    def _identify_peak_hours(self, timestamps: List[str]) -> List[int]:
        """Identify peak activity hours"""
        if not timestamps:
            return []
        
        hours = defaultdict(int)
        for timestamp_str in timestamps:
            try:
                dt = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
                hours[dt.hour] += 1
            except:
                continue
        
        if not hours:
            return []
        
        # Return top 3 peak hours
        sorted_hours = sorted(hours.items(), key=lambda x: x[1], reverse=True)
        return [hour for hour, count in sorted_hours[:3]]
    
    def generate_market_report(self) -> Dict:
        """Generate comprehensive market intelligence report"""
        return {
            'timestamp': datetime.now().isoformat(),
            'market_overview': self.market_intelligence,
            'competitor_analysis': self.competitor_profiles,
            'trends': self._analyze_market_trends(),
            'opportunities': self._identify_opportunities(),
            'threats': self._assess_threats()
        }
    
    def _analyze_market_trends(self) -> Dict:
        """Analyze current market trends"""
        return {
            'technology_adoption': {
                'http3_usage': 0.75,  # Placeholder - would calculate from real data
                'api_modernization': 0.60,
                'mobile_optimization': 0.85
            },
            'user_behavior': {
                'live_betting_growth': 0.25,
                'mobile_usage': 0.70,
                'api_integration': 0.45
            }
        }
    
    def _identify_opportunities(self) -> List[Dict]:
        """Identify market opportunities"""
        return [
            {
                'opportunity': 'HTTP/3 Early Adoption Advantage',
                'description': 'Low competitor adoption of HTTP/3 presents speed advantage',
                'priority': 'HIGH'
            },
            {
                'opportunity': 'Real-time Analytics Gap',
                'description': 'Limited real-time pattern analysis in competitor systems',
                'priority': 'MEDIUM'
            }
        ]
    
    def _assess_threats(self) -> List[Dict]:
        """Assess competitive threats"""
        return [
            {
                'threat': 'API Rate Limiting Detection',
                'description': 'Competitors may implement advanced bot detection',
                'severity': 'MEDIUM'
            },
            {
                'threat': 'Enhanced Security Measures',
                'description': 'Increasing adoption of advanced anti-automation',
                'severity': 'HIGH'
            }
        ]

async def main():
    """Main execution function"""
    logger.info("Starting Advanced Event Detection System")
    
    # Initialize pipeline
    pipeline = RealTimeDataPipeline()
    
    # Initialize competitive intelligence
    intel_engine = CompetitiveIntelligenceEngine(pipeline)
    
    # Start WebSocket server
    websocket_task = asyncio.create_task(pipeline.start_websocket_server())
    
    # Simulate real-time data processing
    async def simulate_data_stream():
        while True:
            try:
                # Simulate incoming data
                sample_data = {
                    'api_calls_per_minute': np.random.poisson(25),
                    'betting_events': np.random.poisson(15),
                    'unique_users': np.random.poisson(100),
                    'data_volume': np.random.normal(1000, 200),
                    'odds': np.random.uniform(1.5, 5.0),
                    'previous_odds': np.random.uniform(1.5, 5.0),
                    'match_id': f"match_{np.random.randint(1, 100)}",
                    'competitor_domains': {
                        'bet365.com': np.random.randint(0, 100),
                        'sportpesa.com': np.random.randint(0, 80),
                        '1xbet.com': np.random.randint(0, 60)
                    }
                }
                
                # Process data stream
                events = await pipeline.process_data_stream(sample_data)
                
                if events:
                    logger.info(f"Processed {len(events)} events")
                
                await asyncio.sleep(5)  # Process every 5 seconds
                
            except Exception as e:
                logger.error(f"Error in data stream processing: {e}")
                await asyncio.sleep(10)
    
    # Start data stream processing
    stream_task = asyncio.create_task(simulate_data_stream())
    
    try:
        # Run both tasks
        await asyncio.gather(websocket_task, stream_task)
    except KeyboardInterrupt:
        logger.info("System shutdown requested")
    except Exception as e:
        logger.error(f"System error: {e}")
    finally:
        logger.info("Advanced Event Detection System stopped")

if __name__ == "__main__":
    asyncio.run(main())