#!/bin/bash
# Mode A: Stealth Capture (No MITM) - TLS Key Logging + Packet Capture
# This preserves browser's native TLS fingerprint for maximum stealth

set -e

# Configuration
CAPTURE_DIR="/home/kali/betika_automated_login/captures"
SSL_KEYS_DIR="/home/kali/betika_automated_login/sslkeys"
HTTP_OBJECTS_DIR="/home/kali/betika_automated_login/http_objects"
CHROME_DATA_DIR="/home/kali/.chrome-betika-stealth"
CAPTURE_FILE="${CAPTURE_DIR}/betika_stealth_$(date +%Y%m%d_%H%M%S).pcap"
SSL_KEYLOG_FILE="${SSL_KEYS_DIR}/sslkeys.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔒 Betika Stealth Capture Mode A - TLS Key Logging${NC}"
echo -e "${BLUE}=================================================${NC}"
echo ""

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}🧹 Cleaning up...${NC}"
    
    # Stop tcpdump if running
    if [ ! -z "$TCPDUMP_PID" ]; then
        echo -e "${YELLOW}📡 Stopping packet capture (PID: $TCPDUMP_PID)${NC}"
        sudo kill -TERM "$TCPDUMP_PID" 2>/dev/null || true
        wait "$TCPDUMP_PID" 2>/dev/null || true
    fi
    
    # Kill Chrome if we started it
    if [ ! -z "$CHROME_PID" ]; then
        echo -e "${YELLOW}🌐 Stopping Chrome (PID: $CHROME_PID)${NC}"
        kill -TERM "$CHROME_PID" 2>/dev/null || true
        wait "$CHROME_PID" 2>/dev/null || true
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
mkdir -p "$CHROME_DATA_DIR"

# Set permissions for SSL keys directory
chmod 700 "$SSL_KEYS_DIR"

echo -e "${GREEN}✅ Directories created${NC}"

# Check if we have necessary tools
echo -e "${BLUE}🔧 Checking required tools...${NC}"

if ! command -v tcpdump &> /dev/null; then
    echo -e "${RED}❌ tcpdump not found. Installing...${NC}"
    sudo apt-get update && sudo apt-get install -y tcpdump
fi

if ! command -v tshark &> /dev/null; then
    echo -e "${RED}❌ tshark (Wireshark) not found. Installing...${NC}"
    sudo apt-get install -y wireshark-common tshark
fi

if ! command -v chromium &> /dev/null && ! command -v google-chrome &> /dev/null; then
    echo -e "${RED}❌ Chromium/Chrome not found. Installing Chromium...${NC}"
    sudo apt-get install -y chromium
fi

echo -e "${GREEN}✅ All tools available${NC}"

# Determine Chrome/Chromium command
CHROME_CMD=""
if command -v chromium &> /dev/null; then
    CHROME_CMD="chromium"
elif command -v google-chrome &> /dev/null; then
    CHROME_CMD="google-chrome"
else
    echo -e "${RED}❌ No Chrome/Chromium found!${NC}"
    exit 1
fi

echo -e "${BLUE}🌐 Using browser: $CHROME_CMD${NC}"

# Clear previous SSL key log
echo -e "${BLUE}🔑 Setting up SSL key logging...${NC}"
> "$SSL_KEYLOG_FILE"
echo -e "${GREEN}✅ SSL keylog file ready: $SSL_KEYLOG_FILE${NC}"

# Target hosts for packet capture
TARGET_HOSTS="(host api.betika.com or host live.betika.com or host segment.prod.bidr.io or host match.prod.bidr.io or host dsp-ap.eskimi.com or host www.betika.com)"

echo -e "${BLUE}📡 Starting packet capture...${NC}"
echo -e "${YELLOW}Capturing: $TARGET_HOSTS${NC}"

# Start tcpdump in background
sudo tcpdump -i any -s 0 -w "$CAPTURE_FILE" "$TARGET_HOSTS" &
TCPDUMP_PID=$!

echo -e "${GREEN}✅ Packet capture started (PID: $TCPDUMP_PID)${NC}"
echo -e "${BLUE}📁 Capture file: $CAPTURE_FILE${NC}"

# Wait a moment for tcpdump to initialize
sleep 2

# Export SSL key logging environment variable and start Chrome
echo -e "${BLUE}🚀 Starting Chrome with SSL key logging...${NC}"
echo -e "${YELLOW}SSL keys will be logged to: $SSL_KEYLOG_FILE${NC}"

# Chrome arguments for stealth and functionality
CHROME_ARGS=(
    "--user-data-dir=$CHROME_DATA_DIR"
    "--disable-web-security"
    "--disable-features=VizDisplayCompositor"
    "--disable-extensions"
    "--no-sandbox"
    "--disable-setuid-sandbox"
    "--disable-dev-shm-usage"
    "--window-size=1920,1080"
    "--start-maximized"
    "https://betika.com"
)

# Start Chrome with SSL key logging
SSLKEYLOGFILE="$SSL_KEYLOG_FILE" "$CHROME_CMD" "${CHROME_ARGS[@]}" &
CHROME_PID=$!

echo -e "${GREEN}✅ Chrome started (PID: $CHROME_PID)${NC}"
echo ""
echo -e "${BLUE}🎯 CAPTURE SESSION ACTIVE${NC}"
echo -e "${BLUE}=========================${NC}"
echo -e "${YELLOW}1. Chrome is now running with SSL key logging enabled${NC}"
echo -e "${YELLOW}2. Packet capture is recording target host traffic${NC}"
echo -e "${YELLOW}3. Navigate to betting sections to trigger odds API calls${NC}"
echo -e "${YELLOW}4. Focus on soccer/football sections for match data${NC}"
echo ""
echo -e "${GREEN}📋 Manual Steps:${NC}"
echo -e "${GREEN}  • Login to Betika (credentials should be in .env)${NC}"
echo -e "${GREEN}  • Visit Sports → Football section${NC}"
echo -e "${GREEN}  • Check Live Betting section${NC}"
echo -e "${GREEN}  • Browse different matches and odds${NC}"
echo ""
echo -e "${BLUE}⏱️  Let the session run for 2-5 minutes to capture sufficient data${NC}"
echo -e "${RED}🛑 Press Ctrl+C when you're ready to stop and analyze${NC}"
echo ""

# Wait for user interrupt or Chrome to exit
wait "$CHROME_PID" 2>/dev/null || true

echo -e "\n${BLUE}🔍 Analyzing captured data...${NC}"

# Wait a moment for tcpdump to finish writing
sleep 2

# Analyze the capture
echo -e "${BLUE}📊 Extracting HTTPS data with SSL key decryption...${NC}"

# Create analysis output directory
ANALYSIS_DIR="${CAPTURE_DIR}/analysis_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$ANALYSIS_DIR"

# Extract HTTP objects (including JSON responses)
echo -e "${YELLOW}🔓 Decrypting and extracting HTTP objects...${NC}"
if [ -f "$SSL_KEYLOG_FILE" ] && [ -s "$SSL_KEYLOG_FILE" ]; then
    tshark -r "$CAPTURE_FILE" \
           -o tls.keylog_file:"$SSL_KEYLOG_FILE" \
           --export-objects "http,$ANALYSIS_DIR/http_objects" \
           2>/dev/null || echo -e "${YELLOW}⚠️  Some objects may not have been decrypted${NC}"
    
    echo -e "${GREEN}✅ HTTP objects extracted to: $ANALYSIS_DIR/http_objects${NC}"
else
    echo -e "${YELLOW}⚠️  SSL keylog file is empty - TLS keys may not have been captured${NC}"
fi

# Generate HTTP summary
echo -e "${YELLOW}📋 Generating HTTP traffic summary...${NC}"
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

if [ -s "$ANALYSIS_DIR/http_summary.csv" ]; then
    echo -e "${GREEN}✅ HTTP summary saved to: $ANALYSIS_DIR/http_summary.csv${NC}"
    echo -e "${BLUE}📊 Quick stats:${NC}"
    echo -e "${YELLOW}Total HTTP requests: $(( $(wc -l < "$ANALYSIS_DIR/http_summary.csv") - 1 ))${NC}"
    echo -e "${YELLOW}API endpoints found:${NC}"
    tail -n +2 "$ANALYSIS_DIR/http_summary.csv" | cut -d'|' -f2,4 | sort -u | head -10
else
    echo -e "${YELLOW}⚠️  No decrypted HTTP traffic found${NC}"
fi

# Look for JSON files in extracted objects
echo -e "${BLUE}🔍 Searching for JSON responses...${NC}"
JSON_COUNT=0
if [ -d "$ANALYSIS_DIR/http_objects" ]; then
    for file in "$ANALYSIS_DIR/http_objects"/*; do
        if [ -f "$file" ]; then
            # Check if file contains JSON
            if file "$file" | grep -q "JSON\|ASCII text" && head -c 1000 "$file" | grep -q '{"'; then
                JSON_COUNT=$((JSON_COUNT + 1))
                echo -e "${GREEN}📄 JSON response found: $(basename "$file")${NC}"
            fi
        fi
    done
fi

echo -e "${GREEN}✅ Found $JSON_COUNT JSON response files${NC}"

# Generate final report
cat > "$ANALYSIS_DIR/capture_report.txt" << EOF
Betika Stealth Capture Report
=============================

Capture Time: $(date)
Capture File: $CAPTURE_FILE
SSL Keylog: $SSL_KEYLOG_FILE
Analysis Directory: $ANALYSIS_DIR

Files Generated:
- http_objects/: Extracted HTTP response bodies
- http_summary.csv: Traffic summary with timestamps and URLs  
- capture_report.txt: This report

Target Hosts Captured:
- api.betika.com
- live.betika.com  
- segment.prod.bidr.io
- match.prod.bidr.io
- dsp-ap.eskimi.com

JSON Responses Found: $JSON_COUNT

Next Steps:
1. Review http_objects/ for raw API responses from bidr.io and eskimi.com
2. Analyze http_summary.csv to understand API call patterns
3. Correlate external provider responses with Betika API calls
4. Run the parser script to extract soccer odds data

Use the parser script to analyze the captured data:
./parse_stealth_capture.sh "$ANALYSIS_DIR"
EOF

echo -e "${GREEN}✅ Analysis complete!${NC}"
echo -e "${BLUE}📊 Report saved to: $ANALYSIS_DIR/capture_report.txt${NC}"
echo ""
echo -e "${GREEN}🎉 Stealth capture session completed successfully!${NC}"
echo -e "${BLUE}📁 All data saved in: $ANALYSIS_DIR${NC}"
echo ""
echo -e "${YELLOW}Next: Run the parser to analyze captured odds data${NC}"
echo -e "${YELLOW}Command: ./parse_stealth_capture.sh \"$ANALYSIS_DIR\"${NC}"