#!/usr/bin/env python3

"""
Phase 2: Integrated Control System
Combines advanced monitoring with web automation (enhanced_betika_bot.js integration)
"""

import asyncio
import subprocess
import time
import logging
import signal
import sys
import os
import json
import webbrowser
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('phase2_integrated.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class Phase2IntegratedControl:
    """Integrated control system for Phase 2 monitoring + web automation"""
    
    def __init__(self):
        self.components = {}
        self.status = {
            'real_time_monitor': 'stopped',
            'ml_pattern_engine': 'stopped',
            'event_detection': 'stopped',
            'security_bypass': 'stopped',
            'dashboard_server': 'stopped',
            'web_automation': 'stopped'  # New: Web automation component
        }
        self.processes = {}
        self.shutdown_requested = False
        
        # Available automation scripts
        self.automation_scripts = {
            'enhanced_betika_crawler': 'enhanced_betika_crawler.js',
            'betika_odds_crawler': 'betika_odds_crawler.js',
            'enhanced_script_v2': 'enhanced-script-v2.js',
            'navigate_script': 'navigate-script.js',
            'script3': 'script3.js',
            'script3_live_nav': 'script3_live_nav.js'
        }
        
        # Setup signal handlers
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)
        
    def _signal_handler(self, signum, frame):
        """Handle shutdown signals"""
        logger.info(f"Received signal {signum}, initiating shutdown...")
        self.shutdown_requested = True
        asyncio.create_task(self.shutdown_all_components())
    
    def display_banner(self):
        """Display Phase 2 integrated startup banner"""
        banner = """
╔══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                          ║
║  ██████╗ ██╗  ██╗ █████╗ ███████╗███████╗    ██████╗                                    ║
║  ██╔══██╗██║  ██║██╔══██╗██╔════╝██╔════╝    ╚════██╗                                   ║
║  ██████╔╝███████║███████║███████╗█████╗       █████╔╝                                   ║
║  ██╔═══╝ ██╔══██║██╔══██║╚════██║██╔══╝      ██╔═══╝                                    ║
║  ██║     ██║  ██║██║  ██║███████║███████╗    ███████╗                                   ║
║  ╚═╝     ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚══════╝    ╚══════╝                                   ║
║                                                                                          ║
║           INTEGRATED MONITORING + WEB AUTOMATION CONTROL SYSTEM                         ║
║                                                                                          ║
║  🔒 HTTP/3 QUIC Decryption     🧠 ML Pattern Analysis      🤖 Web Automation           ║
║  ⚡ Real-Time Event Detection  🛡️ Security Bypass         📊 Live Dashboard            ║
║                                                                                          ║
╚══════════════════════════════════════════════════════════════════════════════════════════╝
        """
        print(banner)
        
        # Display available automation scripts
        print("🤖 Available Web Automation Scripts:")
        for i, (key, script) in enumerate(self.automation_scripts.items(), 1):
            print(f"   {i}. {script}")
        print()
    
    def select_automation_script(self):
        """Interactive script selection"""
        scripts_list = list(self.automation_scripts.items())
        
        while True:
            try:
                print("Select automation script to run with Phase 2 monitoring:")
                for i, (key, script) in enumerate(scripts_list, 1):
                    print(f"  {i}. {script}")
                print(f"  {len(scripts_list) + 1}. Run monitoring only (no automation)")
                
                choice = input(f"\nEnter choice (1-{len(scripts_list) + 1}): ").strip()
                
                if choice == str(len(scripts_list) + 1):
                    return None  # No automation
                
                choice_idx = int(choice) - 1
                if 0 <= choice_idx < len(scripts_list):
                    selected_key, selected_script = scripts_list[choice_idx]
                    logger.info(f"Selected automation script: {selected_script}")
                    return selected_script
                else:
                    print("Invalid choice. Please try again.")
                    
            except (ValueError, KeyboardInterrupt):
                print("\nInvalid input. Please try again.")
    
    async def start_web_automation(self, script_name: Optional[str] = None):
        """Start the selected web automation script"""
        if not script_name:
            logger.info("⚡ Skipping web automation - monitoring only mode")
            self.status['web_automation'] = 'skipped'
            return True
            
        logger.info(f"🤖 Starting Web Automation: {script_name}")
        
        # Check if script exists
        if not os.path.exists(script_name):
            logger.error(f"❌ Script not found: {script_name}")
            self.status['web_automation'] = 'error'
            return False
        
        try:
            # Check if node_modules exists, install if needed
            if not os.path.exists('node_modules'):
                logger.info("Installing Node.js dependencies...")
                install_process = await asyncio.create_subprocess_exec(
                    'npm', 'install',
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE
                )
                await install_process.wait()
            
            # Start the automation script with Node.js
            process = await asyncio.create_subprocess_exec(
                'node', script_name,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            self.processes['web_automation'] = process
            self.status['web_automation'] = 'running'
            
            logger.info(f"✅ Web automation started successfully: {script_name}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to start web automation: {e}")
            self.status['web_automation'] = 'error'
            return False
    
    async def start_real_time_monitor(self):
        """Start the real-time monitoring system"""
        logger.info("🚀 Starting Phase 2 Real-Time Monitor...")
        
        try:
            # Start the real-time monitoring script
            process = await asyncio.create_subprocess_exec(
                './phase2_realtime_monitor.sh',
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            self.processes['real_time_monitor'] = process
            self.status['real_time_monitor'] = 'running'
            
            logger.info("✅ Real-time monitor started successfully")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to start real-time monitor: {e}")
            self.status['real_time_monitor'] = 'error'
            return False
    
    async def start_ml_pattern_engine(self):
        """Start the ML pattern analysis engine"""
        logger.info("🧠 Starting ML Pattern Analysis Engine...")
        
        try:
            # Install required packages if needed
            await self._ensure_python_packages()
            
            # Start the ML pattern engine
            process = await asyncio.create_subprocess_exec(
                'python3', './ml_pattern_engine.py',
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            self.processes['ml_pattern_engine'] = process
            self.status['ml_pattern_engine'] = 'running'
            
            logger.info("✅ ML pattern engine started successfully")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to start ML pattern engine: {e}")
            self.status['ml_pattern_engine'] = 'error'
            return False
    
    async def start_event_detection(self):
        """Start the event detection system"""
        logger.info("⚡ Starting Event Detection System...")
        
        try:
            # Start the event detection system
            process = await asyncio.create_subprocess_exec(
                'python3', './event_detection_system.py',
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            self.processes['event_detection'] = process
            self.status['event_detection'] = 'running'
            
            logger.info("✅ Event detection system started successfully")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to start event detection system: {e}")
            self.status['event_detection'] = 'error'
            return False
    
    async def start_security_bypass(self):
        """Start the advanced security bypass system"""
        logger.info("🛡️ Starting Advanced Security Bypass System...")
        
        try:
            # Start the security bypass system
            process = await asyncio.create_subprocess_exec(
                'python3', './advanced_security_bypass.py',
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            self.processes['security_bypass'] = process
            self.status['security_bypass'] = 'running'
            
            logger.info("✅ Security bypass system started successfully")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to start security bypass system: {e}")
            self.status['security_bypass'] = 'error'
            return False
    
    async def start_dashboard_server(self):
        """Start the competitive intelligence dashboard"""
        logger.info("📊 Starting Competitive Intelligence Dashboard...")
        
        try:
            # Start simple HTTP server for dashboard
            process = await asyncio.create_subprocess_exec(
                'python3', '-m', 'http.server', '8090',
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            self.processes['dashboard_server'] = process
            self.status['dashboard_server'] = 'running'
            
            logger.info("✅ Dashboard server started on http://localhost:8090")
            logger.info("🌐 Access dashboard at: http://localhost:8090/competitive_intel_dashboard.html")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to start dashboard server: {e}")
            self.status['dashboard_server'] = 'error'
            return False
    
    async def _ensure_python_packages(self):
        """Ensure required Python packages are installed"""
        required_packages = [
            'numpy', 'pandas', 'scipy', 'requests', 'websockets'
        ]
        
        for package in required_packages:
            try:
                __import__(package)
            except ImportError:
                logger.info(f"Installing {package}...")
                process = await asyncio.create_subprocess_exec(
                    'pip3', 'install', package,
                    stdout=asyncio.subprocess.DEVNULL,
                    stderr=asyncio.subprocess.DEVNULL
                )
                await process.wait()
    
    async def monitor_components(self):
        """Monitor all running components including web automation"""
        while not self.shutdown_requested:
            for component, process in list(self.processes.items()):
                if process and process.returncode is not None:
                    logger.warning(f"⚠️ Component {component} has stopped (return code: {process.returncode})")
                    
                    if process.returncode != 0:
                        self.status[component] = 'error'
                    else:
                        self.status[component] = 'stopped'
                    
                    # Attempt to restart critical components
                    if component in ['real_time_monitor', 'ml_pattern_engine', 'web_automation']:
                        logger.info(f"🔄 Attempting to restart {component}...")
                        if component == 'real_time_monitor':
                            await self.start_real_time_monitor()
                        elif component == 'ml_pattern_engine':
                            await self.start_ml_pattern_engine()
                        # Note: Web automation restart would need script name
            
            # Log status every 30 seconds
            running_components = [k for k, v in self.status.items() if v == 'running']
            logger.info(f"📊 Status: {len(running_components)}/6 components running: {running_components}")
            
            await asyncio.sleep(30)
    
    async def generate_status_report(self):
        """Generate comprehensive status report"""
        report = {
            'timestamp': datetime.now().isoformat(),
            'phase': 'Phase 2 - Integrated Monitoring + Web Automation',
            'components': self.status.copy(),
            'capabilities': {
                'http3_quic_decryption': self.status['real_time_monitor'] == 'running',
                'ml_pattern_analysis': self.status['ml_pattern_engine'] == 'running',
                'event_detection': self.status['event_detection'] == 'running',
                'security_bypass': self.status['security_bypass'] == 'running',
                'competitive_intelligence': self.status['dashboard_server'] == 'running',
                'web_automation': self.status['web_automation'] == 'running'
            },
            'urls': {
                'dashboard': 'http://localhost:8090/competitive_intel_dashboard.html',
                'realtime_monitor': 'http://localhost:3000/dashboard.html',
                'websocket_events': 'ws://localhost:9001'
            },
            'automation_scripts': self.automation_scripts
        }
        
        # Save report
        with open('phase2_integrated_status.json', 'w') as f:
            json.dump(report, f, indent=2)
        
        return report
    
    async def shutdown_all_components(self):
        """Gracefully shutdown all components"""
        logger.info("🛑 Initiating Phase 2 integrated system shutdown...")
        
        for component, process in self.processes.items():
            if process and process.returncode is None:
                logger.info(f"Stopping {component}...")
                try:
                    process.terminate()
                    await asyncio.wait_for(process.wait(), timeout=10)
                except asyncio.TimeoutError:
                    logger.warning(f"Force killing {component}...")
                    process.kill()
                    await process.wait()
                
                self.status[component] = 'stopped'
        
        logger.info("✅ All Phase 2 integrated components stopped successfully")
    
    async def run(self):
        """Main execution method"""
        self.display_banner()
        
        # Select automation script
        selected_script = self.select_automation_script()
        
        logger.info("🚀 Initializing Phase 2: Integrated Monitoring + Web Automation System")
        
        # Start all components including web automation
        components_to_start = [
            ('Real-Time Monitor', self.start_real_time_monitor),
            ('ML Pattern Engine', self.start_ml_pattern_engine),
            ('Event Detection System', self.start_event_detection),
            ('Security Bypass System', self.start_security_bypass),
            ('Dashboard Server', self.start_dashboard_server),
            ('Web Automation', lambda: self.start_web_automation(selected_script))
        ]
        
        start_tasks = []
        for name, start_func in components_to_start:
            logger.info(f"🔄 Starting {name}...")
            start_tasks.append(start_func())
        
        # Wait for all components to start
        results = await asyncio.gather(*start_tasks, return_exceptions=True)
        
        # Check results
        successful_starts = sum(1 for result in results if result is True)
        logger.info(f"✅ Successfully started {successful_starts}/{len(components_to_start)} components")
        
        if successful_starts > 0:
            # Generate and display status report
            status_report = await self.generate_status_report()
            logger.info("📊 Phase 2 Integrated Status Report generated")
            
            # Display key URLs and automation status
            print("\n🌐 Phase 2 Access Points:")
            print(f"   📊 Intelligence Dashboard: {status_report['urls']['dashboard']}")
            print(f"   🔍 Real-time Monitor: {status_report['urls']['realtime_monitor']}")
            print(f"   ⚡ WebSocket Events: {status_report['urls']['websocket_events']}")
            
            print("\n🎯 Phase 2 Capabilities Active:")
            for capability, active in status_report['capabilities'].items():
                status_icon = "✅" if active else "❌"
                print(f"   {status_icon} {capability.replace('_', ' ').title()}")
            
            if selected_script:
                print(f"\n🤖 Web Automation: {selected_script} is running with full monitoring")
            else:
                print(f"\n🤖 Web Automation: Monitoring only mode (no automation script)")
            
            print("\n🚀 Phase 2 Integrated System is now OPERATIONAL!")
            print("   Press Ctrl+C to shutdown all components gracefully")
            
            # Auto-open dashboard after delay
            await asyncio.sleep(3)
            try:
                webbrowser.open('http://localhost:8090/competitive_intel_dashboard.html')
            except:
                pass  # Ignore browser opening errors
            
            # Start monitoring components
            await self.monitor_components()
        else:
            logger.error("❌ Failed to start Phase 2 integrated system - no components running")
            sys.exit(1)

async def main():
    """Main entry point"""
    try:
        integrated_control = Phase2IntegratedControl()
        await integrated_control.run()
    except KeyboardInterrupt:
        logger.info("👋 Phase 2 integrated system shutdown completed")
    except Exception as e:
        logger.error(f"💥 Unexpected error in Phase 2 integrated system: {e}")
        sys.exit(1)
    finally:
        # Ensure cleanup
        if 'integrated_control' in locals():
            await integrated_control.shutdown_all_components()

if __name__ == "__main__":
    # Ensure we're in the right directory
    script_dir = Path(__file__).parent.absolute()
    os.chdir(script_dir)
    
    # Run the integrated control system
    asyncio.run(main())