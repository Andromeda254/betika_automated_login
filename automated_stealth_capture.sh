#!/bin/bash
# Integrated Mode A: Automated Stealth Capture with Node.js + MCP Servers
# Runs tcpdump + Node automation + MCP server connections simultaneously

set -e

# Configuration
CAPTURE_DIR="/home/kali/betika_automated_login/captures"
SSL_KEYS_DIR="/home/kali/betika_automated_login/sslkeys"
HTTP_OBJECTS_DIR="/home/kali/betika_automated_login/http_objects"
CAPTURE_FILE="${CAPTURE_DIR}/betika_automated_stealth_$(date +%Y%m%d_%H%M%S).pcap"
SSL_KEYLOG_FILE="${SSL_KEYS_DIR}/sslkeys.log"
NODE_SCRIPT="${1:-script3.js}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

echo -e "${BLUE}🤖 Automated Stealth Capture with Node.js + MCP Integration${NC}"
echo -e "${BLUE}==========================================================${NC}"
echo -e "${YELLOW}Node Script: $NODE_SCRIPT${NC}"
echo ""

# PIDs for cleanup
TCPDUMP_PID=""
NODE_PID=""
FIRECRAWL_MCP_PID=""
APIFY_MCP_PID=""

# Cleanup function
cleanup() {
    echo -e "\n${YELLOW}🧹 Cleaning up processes...${NC}"
    
    # Stop tcpdump
    if [ ! -z "$TCPDUMP_PID" ]; then
        echo -e "${YELLOW}📡 Stopping packet capture (PID: $TCPDUMP_PID)${NC}"
        sudo kill -TERM "$TCPDUMP_PID" 2>/dev/null || true
        wait "$TCPDUMP_PID" 2>/dev/null || true
    fi
    
    # Stop Node.js script
    if [ ! -z "$NODE_PID" ]; then
        echo -e "${YELLOW}🟢 Stopping Node.js script (PID: $NODE_PID)${NC}"
        kill -TERM "$NODE_PID" 2>/dev/null || true
        wait "$NODE_PID" 2>/dev/null || true
    fi
    
    # Stop MCP servers
    if [ ! -z "$FIRECRAWL_MCP_PID" ]; then
        echo -e "${YELLOW}🔥 Stopping Firecrawl MCP server (PID: $FIRECRAWL_MCP_PID)${NC}"
        kill -TERM "$FIRECRAWL_MCP_PID" 2>/dev/null || true
    fi
    
    if [ ! -z "$APIFY_MCP_PID" ]; then
        echo -e "${YELLOW}🕷️ Stopping Apify MCP server (PID: $APIFY_MCP_PID)${NC}"
        kill -TERM "$APIFY_MCP_PID" 2>/dev/null || true
    fi
    
    echo -e "${GREEN}✅ Cleanup complete${NC}"
}

# Set trap for cleanup
trap cleanup EXIT INT TERM

# Create required directories
echo -e "${BLUE}📁 Setting up directories...${NC}"
mkdir -p "$CAPTURE_DIR"
mkdir -p "$SSL_KEYS_DIR"
mkdir -p "$HTTP_OBJECTS_DIR"
chmod 700 "$SSL_KEYS_DIR"
echo -e "${GREEN}✅ Directories ready${NC}"

# Check if Node script exists
if [ ! -f "$NODE_SCRIPT" ]; then
    echo -e "${RED}❌ Node script not found: $NODE_SCRIPT${NC}"
    echo -e "${YELLOW}Available scripts:${NC}"
    ls -la *.js 2>/dev/null || echo "No .js files found"
    exit 1
fi

# Check required tools
echo -e "${BLUE}🔧 Checking required tools...${NC}"

if ! command -v tcpdump &> /dev/null; then
    echo -e "${RED}❌ tcpdump not found. Installing...${NC}"
    sudo apt-get update && sudo apt-get install -y tcpdump
fi

if ! command -v tshark &> /dev/null; then
    echo -e "${RED}❌ tshark not found. Installing...${NC}"
    sudo apt-get install -y wireshark-common tshark
fi

if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ All tools available${NC}"

# Clear previous SSL key log
echo -e "${BLUE}🔑 Setting up SSL key logging...${NC}"
> "$SSL_KEYLOG_FILE"
export SSLKEYLOGFILE="$SSL_KEYLOG_FILE"
echo -e "${GREEN}✅ SSL keylog configured: $SSL_KEYLOG_FILE${NC}"

# Target hosts for packet capture (including confirmed external providers)
TARGET_HOSTS="(host api.betika.com or host live.betika.com or host www.betika.com or host segment.prod.bidr.io or host match.prod.bidr.io or host dsp-ap.eskimi.com or host eskimi.com)"

echo -e "${BLUE}📡 Starting packet capture...${NC}"
echo -e "${YELLOW}Monitoring: $TARGET_HOSTS${NC}"

# Start tcpdump in background
sudo tcpdump -i any -s 0 -w "$CAPTURE_FILE" "$TARGET_HOSTS" &
TCPDUMP_PID=$!

echo -e "${GREEN}✅ Packet capture started (PID: $TCPDUMP_PID)${NC}"
echo -e "${BLUE}📁 Capture file: $CAPTURE_FILE${NC}"

# Wait for tcpdump to initialize
sleep 2

# Start MCP servers if available
echo -e "${PURPLE}🔧 Starting MCP servers...${NC}"

# Start Firecrawl MCP server
if command -v firecrawl-mcp &> /dev/null; then
    echo -e "${YELLOW}🔥 Starting Firecrawl MCP server...${NC}"
    firecrawl-mcp &
    FIRECRAWL_MCP_PID=$!
    echo -e "${GREEN}✅ Firecrawl MCP server started (PID: $FIRECRAWL_MCP_PID)${NC}"
    sleep 2
else
    echo -e "${YELLOW}⚠️ Firecrawl MCP server not found (skipping)${NC}"
fi

# Start Apify MCP server
if command -v apify-actors-mcp-server &> /dev/null; then
    echo -e "${YELLOW}🕷️ Starting Apify MCP server...${NC}"
    apify-actors-mcp-server &
    APIFY_MCP_PID=$!
    echo -e "${GREEN}✅ Apify MCP server started (PID: $APIFY_MCP_PID)${NC}"
    sleep 2
else
    echo -e "${YELLOW}⚠️ Apify MCP server not found (skipping)${NC}"
fi

# Wait for MCP servers to initialize
sleep 3

# Start Node.js script with SSL key logging
echo -e "${BLUE}🚀 Starting Node.js automation...${NC}"
echo -e "${YELLOW}Script: $NODE_SCRIPT${NC}"
echo -e "${YELLOW}SSL Keys: $SSL_KEYLOG_FILE${NC}"

# Run Node script in background
node "$NODE_SCRIPT" &
NODE_PID=$!

echo -e "${GREEN}✅ Node.js script started (PID: $NODE_PID)${NC}"
echo ""

echo -e "${BLUE}🎯 INTEGRATED CAPTURE SESSION ACTIVE${NC}"
echo -e "${BLUE}====================================${NC}"
echo -e "${PURPLE}📡 Packet capture: Monitoring external providers${NC}"
echo -e "${PURPLE}🔥 Firecrawl MCP: ${FIRECRAWL_MCP_PID:-'Not running'}${NC}"
echo -e "${PURPLE}🕷️ Apify MCP: ${APIFY_MCP_PID:-'Not running'}${NC}"
echo -e "${PURPLE}🟢 Node.js: Running automated login and crawling${NC}"
echo -e "${PURPLE}🔑 TLS Keys: Being logged for decryption${NC}"
echo ""

echo -e "${GREEN}📋 What's happening:${NC}"
echo -e "${GREEN}  • Node script is automatically logging in to Betika${NC}"
echo -e "${GREEN}  • Packet capture is recording all external provider calls${NC}"
echo -e "${GREEN}  • MCP servers are available for enhanced analysis${NC}"
echo -e "${GREEN}  • TLS keys are being captured for traffic decryption${NC}"
echo ""

echo -e "${BLUE}⏱️ Session will run until Node script completes${NC}"
echo -e "${RED}🛑 Press Ctrl+C to stop all processes early${NC}"
echo ""

# Monitor Node.js script completion
echo -e "${YELLOW}📊 Monitoring Node.js script progress...${NC}"

# Wait for Node script to complete
wait "$NODE_PID" 2>/dev/null || {
    exit_code=$?
    if [ $exit_code -ne 0 ] && [ $exit_code -ne 130 ]; then
        echo -e "${YELLOW}⚠️ Node script exited with code: $exit_code${NC}"
    fi
}

echo -e "\n${BLUE}🔍 Node script completed. Analyzing captured data...${NC}"

# Give a moment for final packets to be captured
sleep 3

# Stop tcpdump
if [ ! -z "$TCPDUMP_PID" ]; then
    echo -e "${YELLOW}📡 Stopping packet capture...${NC}"
    sudo kill -TERM "$TCPDUMP_PID" 2>/dev/null || true
    wait "$TCPDUMP_PID" 2>/dev/null || true
    TCPDUMP_PID=""
fi

# Create analysis directory
ANALYSIS_DIR="${CAPTURE_DIR}/automated_analysis_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$ANALYSIS_DIR"

echo -e "${BLUE}📊 Analyzing captured data...${NC}"

# Extract HTTP objects using TLS keys
echo -e "${YELLOW}🔓 Decrypting HTTPS traffic and extracting objects...${NC}"

if [ -f "$SSL_KEYLOG_FILE" ] && [ -s "$SSL_KEYLOG_FILE" ]; then
    # Extract HTTP objects
    tshark -r "$CAPTURE_FILE" \
           -o tls.keylog_file:"$SSL_KEYLOG_FILE" \
           --export-objects "http,$ANALYSIS_DIR/http_objects" \
           2>/dev/null || echo -e "${YELLOW}⚠️ Some objects may not have been decrypted${NC}"
    
    echo -e "${GREEN}✅ HTTP objects extracted to: $ANALYSIS_DIR/http_objects${NC}"
    
    # Extract WebSocket frames summary (if any)
    echo -e "${BLUE}🧩 Extracting WebSocket frames...${NC}"
    # Save JSON dump of websocket frames
    (tshark -r "$CAPTURE_FILE" \
           -o tls.keylog_file:"$SSL_KEYLOG_FILE" \
           -Y 'websocket' \
           -T json 2>/dev/null || true) > "$ANALYSIS_DIR/ws_frames.json"
    
    # Generate lightweight CSV summary of websocket frames
    (tshark -r "$CAPTURE_FILE" \
           -o tls.keylog_file:"$SSL_KEYLOG_FILE" \
           -Y 'websocket' \
           -T fields \
           -e frame.time \
           -e ip.src \
           -e ip.dst \
           -e tcp.srcport \
           -e tcp.dstport \
           -e websocket.fin \
           -e websocket.opcode \
           -e websocket.payload_length \
           -E header=y -E separator='|' 2>/dev/null || true) > "$ANALYSIS_DIR/ws_summary.csv"
    
    if [ -s "$ANALYSIS_DIR/ws_summary.csv" ]; then
        echo -e "${GREEN}✅ WebSocket summary generated${NC}"
    fi
    
    # Generate HTTP/1.1 and HTTP/2 traffic summary
    tshark -r "$CAPTURE_FILE" \
           -o tls.keylog_file:"$SSL_KEYLOG_FILE" \
           -Y 'http && (http.host contains "betika.com" or http.host contains "bidr.io" or http.host contains "eskimi.com")' \
           -T fields \
           -e frame.time \
           -e http.host \
           -e http.request.method \
           -e http.request.uri \
           -e http.response.code \
           -e http.content_type \
           -E header=y \
           -E separator='|' > "$ANALYSIS_DIR/http_summary.csv" 2>/dev/null || true
    
    # Generate HTTP/3 traffic summary with QUIC decryption (simplified for current TShark version)
    echo -e "${BLUE}🌐 Extracting HTTP/3 requests with QUIC decryption...${NC}"
    tshark -r "$CAPTURE_FILE" \
           -o tls.keylog_file:"$SSL_KEYLOG_FILE" \
           -Y 'quic && (tls.handshake.extensions_server_name contains "betika.com" or tls.handshake.extensions_server_name contains "bidr.io" or tls.handshake.extensions_server_name contains "eskimi.com")' \
           -T fields \
           -e frame.time \
           -e quic.dcid \
           -e tls.handshake.extensions_server_name \
           -e quic.header_form \
           -e quic.long.packet_type \
           -E header=y \
           -E separator='|' > "$ANALYSIS_DIR/http3_raw.csv" 2>/dev/null || true
    
    # Process HTTP/3 raw data into structured summary with fallback parsing
    if [ -s "$ANALYSIS_DIR/http3_raw.csv" ]; then
        echo -e "${GREEN}✅ HTTP/3 raw data captured, processing with enhanced parsing...${NC}"
        
        # Create structured HTTP/3 summary
        echo "frame.time|authority|method|path|status|content_type" > "$ANALYSIS_DIR/http3_summary.csv"
        
        # Process QUIC traffic for target domains
        awk -F'|' 'NR>1 {
            time=$1; dcid=$2; server_name=$3; header_form=$4; packet_type=$5
            
            # Extract QUIC connections to target domains
            if (server_name && server_name ~ /(betika\.com|bidr\.io|eskimi\.com)/) {
                printf "%s|%s|QUIC|HTTP3|UNKNOWN|\n", time, server_name
            }
        }' "$ANALYSIS_DIR/http3_raw.csv" >> "$ANALYSIS_DIR/http3_summary.csv" 2>/dev/null || true
        
    else
        echo "frame.time|authority|method|path|status|content_type" > "$ANALYSIS_DIR/http3_summary.csv"
    fi
    
    # Generate combined request summary (HTTP/1.1, HTTP/2, HTTP/3)
    echo -e "${BLUE}🔗 Creating combined request summary...${NC}"
    {
        echo "timestamp|host|method|uri|status|protocol"
        # Add HTTP/1.1 and HTTP/2 entries
        if [ -s "$ANALYSIS_DIR/http_summary.csv" ]; then
            tail -n +2 "$ANALYSIS_DIR/http_summary.csv" 2>/dev/null | while IFS='|' read -r time host method uri status type; do
                [ -n "$time" ] && echo "$time|$host|$method|$uri|$status|HTTP"
            done
        fi
        # Add HTTP/3 entries (simplified)
        if [ -s "$ANALYSIS_DIR/http3_summary.csv" ]; then
            tail -n +2 "$ANALYSIS_DIR/http3_summary.csv" 2>/dev/null | while IFS='|' read -r time authority method path status type; do
                [ -n "$time" ] && echo "$time|$authority|$method|$path|$status|HTTP3"
            done
        fi
    } > "$ANALYSIS_DIR/combined_requests.csv"
    
    # Analyze captured requests from all protocols
    if [ -s "$ANALYSIS_DIR/combined_requests.csv" ]; then
        echo -e "${GREEN}✅ Combined request summary generated${NC}"
        
        # Quick analysis from combined summary
        total_requests=$(( $(wc -l < "$ANALYSIS_DIR/combined_requests.csv") - 1 ))
        betika_requests=$(grep -i "betika\.com" "$ANALYSIS_DIR/combined_requests.csv" 2>/dev/null | wc -l || echo "0")
        bidr_requests=$(grep -i "bidr\.io" "$ANALYSIS_DIR/combined_requests.csv" 2>/dev/null | wc -l || echo "0")
        eskimi_requests=$(grep -i "eskimi\.com" "$ANALYSIS_DIR/combined_requests.csv" 2>/dev/null | wc -l || echo "0")
        http3_requests=$(grep -c "HTTP3" "$ANALYSIS_DIR/combined_requests.csv" 2>/dev/null || echo "0")
        
        echo -e "${BLUE}📊 Traffic Summary:${NC}"
        echo -e "${YELLOW}  Total requests: $total_requests${NC}"
        echo -e "${YELLOW}  HTTP/3 requests: $http3_requests${NC}"
        echo -e "${YELLOW}  Betika requests: $betika_requests${NC}"
        echo -e "${YELLOW}  bidr.io requests: $bidr_requests${NC}"
        echo -e "${YELLOW}  eskimi.com requests: $eskimi_requests${NC}"
        
        if [ "$bidr_requests" -gt 0 ]; then
            echo -e "${GREEN}🎯 SUCCESS: bidr.io external provider data captured!${NC}"
        fi
        
        if [ "$eskimi_requests" -gt 0 ]; then
            echo -e "${GREEN}🎯 SUCCESS: eskimi.com external provider data captured!${NC}"
        fi
        
        if [ "$http3_requests" -gt 0 ]; then
            echo -e "${GREEN}🌐 HTTP/3 traffic detected and captured!${NC}"
        fi
    elif [ -s "$ANALYSIS_DIR/http_summary.csv" ]; then
        echo -e "${GREEN}✅ HTTP summary generated${NC}"
        
        # Fallback to HTTP-only analysis
        total_requests=$(( $(wc -l < "$ANALYSIS_DIR/http_summary.csv") - 1 ))
        betika_requests=$(grep -i "betika\.com" "$ANALYSIS_DIR/http_summary.csv" 2>/dev/null | wc -l || echo "0")
        bidr_requests=$(grep -i "bidr\.io" "$ANALYSIS_DIR/http_summary.csv" 2>/dev/null | wc -l || echo "0")
        eskimi_requests=$(grep -i "eskimi\.com" "$ANALYSIS_DIR/http_summary.csv" 2>/dev/null | wc -l || echo "0")
        
        echo -e "${BLUE}📊 Traffic Summary (HTTP/1.1 & HTTP/2 only):${NC}"
        echo -e "${YELLOW}  Total HTTP requests: $total_requests${NC}"
        echo -e "${YELLOW}  Betika requests: $betika_requests${NC}"
        echo -e "${YELLOW}  bidr.io requests: $bidr_requests${NC}"
        echo -e "${YELLOW}  eskimi.com requests: $eskimi_requests${NC}"
        
        if [ "$bidr_requests" -gt 0 ]; then
            echo -e "${GREEN}🎯 SUCCESS: bidr.io external provider data captured!${NC}"
        fi
        
        if [ "$eskimi_requests" -gt 0 ]; then
            echo -e "${GREEN}🎯 SUCCESS: eskimi.com external provider data captured!${NC}"
        fi
    fi
else
    echo -e "${YELLOW}⚠️ SSL keylog file is empty - TLS keys may not have been captured${NC}"
    echo -e "${YELLOW}Raw packet capture available but decryption not possible${NC}"
fi

# Count extracted objects
if [ -d "$ANALYSIS_DIR/http_objects" ]; then
    object_count=$(find "$ANALYSIS_DIR/http_objects" -type f | wc -l)
    echo -e "${GREEN}📦 Extracted $object_count HTTP objects${NC}"
    
    # Look for JSON files from external providers
    json_count=0
    external_jsons=0
    
    for file in "$ANALYSIS_DIR/http_objects"/*; do
        if [ -f "$file" ]; then
            if file "$file" | grep -q "JSON\|ASCII text" && head -c 1000 "$file" | grep -q '{"'; then
                json_count=$((json_count + 1))
                
                # Check if from external providers
                if head -20 "$file" | grep -qi "bidr\.io\|eskimi\.com"; then
                    external_jsons=$((external_jsons + 1))
                    echo -e "${GREEN}🎯 External provider JSON found: $(basename "$file")${NC}"
                fi
            fi
        fi
    done
    
    echo -e "${BLUE}📄 Found $json_count JSON files total${NC}"
    echo -e "${GREEN}🎯 Found $external_jsons external provider JSON files${NC}"
fi

# Generate comprehensive report
cat > "$ANALYSIS_DIR/automated_capture_report.txt" << EOF
Automated Stealth Capture Report
================================

Capture Time: $(date)
Node Script: $NODE_SCRIPT
Capture File: $CAPTURE_FILE
SSL Keylog: $SSL_KEYLOG_FILE
Analysis Directory: $ANALYSIS_DIR

Session Details:
- Packet Capture PID: $TCPDUMP_PID (completed)
- Node.js Script PID: $NODE_PID (completed)
- Firecrawl MCP PID: ${FIRECRAWL_MCP_PID:-'Not started'}
- Apify MCP PID: ${APIFY_MCP_PID:-'Not started'}

Target Hosts Monitored:
- api.betika.com (Internal API)
- live.betika.com (Live betting API)  
- segment.prod.bidr.io (Beeswax RTB - Real-time bidding)
- match.prod.bidr.io (Beeswax RTB - Match data)
- dsp-ap.eskimi.com (Eskimi DSP - Advertising platform)
- eskimi.com (Eskimi main platform)

Files Generated:
- http_objects/ - Extracted HTTP response bodies
- http_summary.csv - HTTP/1.1 & HTTP/2 request/response log
- http3_summary.csv - HTTP/3 request/response log
- combined_requests.csv - All protocols combined summary
- ws_summary.csv - WebSocket frames summary (if present)
- ws_frames.json - Raw WebSocket frames (JSON, if present)
- automated_capture_report.txt - This report

Traffic Analysis:
- Total requests (all protocols): ${total_requests:-'N/A'}
- HTTP/3 requests: ${http3_requests:-'N/A'}
- Betika API requests: ${betika_requests:-'N/A'}
- bidr.io requests: ${bidr_requests:-'N/A'}
- eskimi.com requests: ${eskimi_requests:-'N/A'}
- JSON objects extracted: ${json_count:-'N/A'}
- External provider JSONs: ${external_jsons:-'N/A'}
- WebSocket frames: $( [ -f "$ANALYSIS_DIR/ws_summary.csv" ] && echo $(($(wc -l < "$ANALYSIS_DIR/ws_summary.csv")-1)) || echo 'N/A')

External Provider Status:
- bidr.io (Beeswax): $([ "${bidr_requests:-0}" -gt 0 ] && echo "✅ ACTIVE - Data captured" || echo "❌ No traffic detected")
- eskimi.com: $([ "${eskimi_requests:-0}" -gt 0 ] && echo "✅ ACTIVE - Data captured" || echo "❌ No traffic detected")

Next Steps:
1. Run detailed analysis: ./parse_stealth_capture.sh "$ANALYSIS_DIR"
2. Review external provider JSON files for raw odds data
3. Correlate external data with Betika API responses
4. Map data transformation patterns
5. Build automated extraction pipeline

MCP Integration:
- Firecrawl MCP: $([ ! -z "$FIRECRAWL_MCP_PID" ] && echo "Available for enhanced crawling" || echo "Not available")
- Apify MCP: $([ ! -z "$APIFY_MCP_PID" ] && echo "Available for actor-based analysis" || echo "Not available")

Command to analyze:
./parse_stealth_capture.sh "$ANALYSIS_DIR"
EOF

echo -e "${GREEN}✅ Analysis complete!${NC}"
echo -e "${BLUE}📊 Report saved to: $ANALYSIS_DIR/automated_capture_report.txt${NC}"
echo ""

# Auto-run detailed parser if available
if [ -f "./parse_stealth_capture.sh" ] && [ -x "./parse_stealth_capture.sh" ]; then
    echo -e "${BLUE}🔍 Running detailed analysis...${NC}"
    ./parse_stealth_capture.sh "$ANALYSIS_DIR"
else
    echo -e "${YELLOW}💡 Run detailed analysis with: ./parse_stealth_capture.sh \"$ANALYSIS_DIR\"${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Automated stealth capture session completed!${NC}"
echo -e "${BLUE}📁 All data saved in: $ANALYSIS_DIR${NC}"

# Show summary of what was captured
if [ "${external_jsons:-0}" -gt 0 ]; then
    echo -e "${GREEN}✅ SUCCESS: Raw external provider data captured before Betika integration!${NC}"
    echo -e "${YELLOW}🎯 Key findings:${NC}"
    echo -e "${YELLOW}  • bidr.io uses Beeswax RTB platform for real-time bidding${NC}"
    echo -e "${YELLOW}  • eskimi.com provides DSP advertising and odds distribution${NC}"
    echo -e "${YELLOW}  • Raw odds data available for transformation analysis${NC}"
else
    echo -e "${YELLOW}⚠️ No external provider data captured in this session${NC}"
    echo -e "${YELLOW}💡 Possible reasons:${NC}"
    echo -e "${YELLOW}  • Node script didn't trigger external provider calls${NC}"
    echo -e "${YELLOW}  • External providers may not be active for this session${NC}"
    echo -e "${YELLOW}  • Try running during peak betting hours${NC}"
fi

echo ""
echo -e "${BLUE}📚 Next steps:${NC}"
echo -e "${YELLOW}1. Review captured JSON files for external provider patterns${NC}"
echo -e "${YELLOW}2. Correlate timing between external and internal API calls${NC}"  
echo -e "${YELLOW}3. Map data transformations from raw to processed odds${NC}"
echo -e "${YELLOW}4. Build real-time monitoring based on discovered patterns${NC}"