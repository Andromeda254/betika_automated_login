#!/bin/bash

# Phase 2 Output Checker Script
# Quick commands to check what files are being generated

clear
echo "
🔍 PHASE 2 OUTPUT CHECKER
========================
"

echo "📊 CURRENT DIRECTORY STRUCTURE:"
echo "================================"
find . -maxdepth 2 -type d | grep -E "(captures|analysis|intel|ssl_keys|pattern|realtime)" | sort

echo ""
echo "📁 LATEST FILES GENERATED:"
echo "=========================="

# Check realtime captures
if [ -d "realtime_captures" ]; then
    echo "🚀 Real-time Captures:"
    ls -lah realtime_captures/ | tail -5
    echo ""
fi

# Check live analysis
if [ -d "live_analysis" ]; then
    echo "📊 Live Analysis:"
    find live_analysis/ -name "*.jsonl" -o -name "*.csv" | xargs ls -lah 2>/dev/null | tail -5
    echo ""
fi

# Check SSL keys
if [ -d "ssl_keys" ]; then
    echo "🔒 SSL/QUIC Keys:"
    ls -lah ssl_keys/ | tail -5
    echo ""
fi

# Check pattern analysis
if [ -f "pattern_analysis.db" ]; then
    echo "🧠 Pattern Analysis Database:"
    ls -lah pattern_analysis.db
    echo "   Tables:" 
    sqlite3 pattern_analysis.db ".tables" 2>/dev/null || echo "   Database not accessible"
    echo ""
fi

# Check competitive intelligence
if [ -d "competitive_intel" ]; then
    echo "🕵️ Competitive Intelligence:"
    ls -lah competitive_intel/ | tail -5
    echo ""
fi

# Check status files
echo "📋 STATUS FILES:"
echo "==============="
for file in phase2_integrated_status.json phase2_integrated.log phase2_master.log ml_pattern_engine.log; do
    if [ -f "$file" ]; then
        ls -lah "$file"
    fi
done

echo ""
echo "⚡ RUNNING PROCESSES:"
echo "===================="
ps aux | grep -E "(python3.*phase2|node.*\.js|tcpdump|tshark)" | grep -v grep || echo "No Phase 2 processes running"

echo ""
echo "🌐 NETWORK SERVICES:"
echo "==================="
netstat -tulpn | grep -E ":3000|:8090|:9001" | head -5 || echo "No Phase 2 web services running"

echo ""
echo "📈 DISK USAGE:"
echo "============="
for dir in realtime_captures live_analysis ssl_keys captures competitive_intel pattern_analysis; do
    if [ -d "$dir" ]; then
        echo "$dir: $(du -sh $dir | cut -f1)"
    fi
done

# Check database contents if exists
if [ -f "pattern_analysis.db" ]; then
    echo ""
    echo "🔍 RECENT PATTERN ALERTS:"
    echo "========================"
    sqlite3 pattern_analysis.db "SELECT timestamp, alert_type, severity, description FROM pattern_alerts ORDER BY timestamp DESC LIMIT 5;" 2>/dev/null || echo "No alerts yet"
fi

if [ -f "event_detection.db" ]; then
    echo ""
    echo "⚡ RECENT EVENTS:"
    echo "================"
    sqlite3 event_detection.db "SELECT timestamp, event_type, severity FROM events ORDER BY timestamp DESC LIMIT 5;" 2>/dev/null || echo "No events yet"
fi

echo ""
echo "🎯 QUICK ACCESS COMMANDS:"
echo "========================="
echo "  📊 View system status:     cat phase2_integrated_status.json | jq ."
echo "  📋 Monitor logs:           tail -f phase2_integrated.log"
echo "  🔍 Check packets:          tail -f live_analysis/realtime_analysis_*/realtime_packets.jsonl"
echo "  🔒 Check QUIC keys:        tail -f ssl_keys/sslkeys_*.log"
echo "  🌐 Open dashboard:         firefox http://localhost:8090/competitive_intel_dashboard.html"
echo "  ⚡ Connect to WebSocket:   wscat -c ws://localhost:9001"
echo ""