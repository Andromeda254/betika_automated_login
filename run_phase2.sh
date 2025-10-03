#!/bin/bash

# Phase 2: Quick Launch Script
# Provides easy access to all Phase 2 options

clear
echo "
╔══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                          ║
║  ██████╗ ██╗  ██╗ █████╗ ███████╗███████╗    ██████╗                                    ║
║  ██╔══██╗██║  ██║██╔══██╗██╔════╝██╔════╝    ╚════██╗                                   ║
║  ██████╔╝███████║███████║███████╗█████╗       █████╔╝                                   ║
║  ██╔═══╝ ██╔══██║██╔══██║╚════██║██╔══╝      ██╔═══╝                                    ║
║  ██║     ██║  ██║██║  ██║███████║███████╗    ███████╗                                   ║
║  ╚═╝     ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚══════╝    ╚══════╝                                   ║
║                                                                                          ║
║                        PHASE 2 QUICK LAUNCHER                                           ║
║                                                                                          ║
╚══════════════════════════════════════════════════════════════════════════════════════════╝
"

echo "🚀 Phase 2: Advanced Real-Time Analysis & Web Automation"
echo ""
echo "Choose your launch option:"
echo ""
echo "  1. 🤖 Full Integration (Monitoring + Web Automation)"
echo "  2. 📊 Monitoring Only (No web automation)"
echo "  3. ⚡ Quick Start with Enhanced Betika Crawler"
echo "  4. 🔍 Quick Start with Odds Crawler"
echo "  5. 📈 Quick Start with Enhanced Script v2"
echo "  6. 🎯 Live Navigation Script"
echo "  7. ❓ View available scripts"
echo "  8. 🛠️  Component Testing Mode"
echo ""

read -p "Enter your choice (1-8): " choice

case $choice in
    1)
        echo "🚀 Launching Full Integration Mode..."
        python3 phase2_integrated_control.py
        ;;
    2)
        echo "📊 Launching Monitoring Only Mode..."
        python3 phase2_master_control.py
        ;;
    3)
        echo "⚡ Quick Start: Enhanced Betika Crawler + Full Monitoring..."
        echo "Starting enhanced_betika_crawler.js with Phase 2 monitoring..."
        # Pre-select the enhanced betika crawler
        echo "1" | python3 phase2_integrated_control.py
        ;;
    4)
        echo "🔍 Quick Start: Odds Crawler + Full Monitoring..."
        echo "Starting betika_odds_crawler.js with Phase 2 monitoring..."
        echo "2" | python3 phase2_integrated_control.py
        ;;
    5)
        echo "📈 Quick Start: Enhanced Script v2 + Full Monitoring..."
        echo "Starting enhanced-script-v2.js with Phase 2 monitoring..."
        echo "3" | python3 phase2_integrated_control.py
        ;;
    6)
        echo "🎯 Quick Start: Live Navigation Script + Full Monitoring..."
        echo "Starting script3_live_nav.js with Phase 2 monitoring..."
        echo "6" | python3 phase2_integrated_control.py
        ;;
    7)
        echo "📋 Available JavaScript Automation Scripts:"
        echo ""
        ls -la *.js | awk '{print "   " $9 " (" $5 " bytes)"}'
        echo ""
        echo "🔧 Available Phase 2 Components:"
        echo "   phase2_integrated_control.py  # Full monitoring + automation"
        echo "   phase2_master_control.py      # Monitoring only"
        echo "   phase2_realtime_monitor.sh    # HTTP/3 QUIC capture"
        echo "   ml_pattern_engine.py          # ML pattern analysis"
        echo "   event_detection_system.py     # Real-time event detection"
        echo "   advanced_security_bypass.py   # Security bypass testing"
        echo ""
        read -p "Press Enter to return to menu..." dummy
        exec $0
        ;;
    8)
        echo "🛠️ Component Testing Mode"
        echo ""
        echo "Choose component to test:"
        echo "  1. HTTP/3 QUIC Monitor"
        echo "  2. ML Pattern Engine"
        echo "  3. Event Detection System"
        echo "  4. Security Bypass System"
        echo "  5. Dashboard Server"
        echo ""
        read -p "Enter component choice (1-5): " comp_choice
        
        case $comp_choice in
            1)
                echo "Testing HTTP/3 QUIC Monitor..."
                ./phase2_realtime_monitor.sh
                ;;
            2)
                echo "Testing ML Pattern Engine..."
                python3 ml_pattern_engine.py
                ;;
            3)
                echo "Testing Event Detection System..."
                python3 event_detection_system.py
                ;;
            4)
                echo "Testing Security Bypass System..."
                python3 advanced_security_bypass.py
                ;;
            5)
                echo "Starting Dashboard Server..."
                python3 -m http.server 8090
                ;;
            *)
                echo "Invalid choice"
                ;;
        esac
        ;;
    *)
        echo "Invalid choice. Please run the script again."
        exit 1
        ;;
esac