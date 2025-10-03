# Mode A: Stealth Capture Setup Guide
## TLS Key Logging + Packet Capture (No MITM)

### 🎯 **Overview**

Mode A is the most stealthy approach for capturing raw odds data from external providers (bidr.io and eskimi.com) before Betika integration. It preserves the browser's native TLS fingerprint, making it virtually undetectable by anti-bot systems.

**Key Advantages:**
- ✅ No TLS fingerprint modification
- ✅ Browser appears completely normal to servers
- ✅ No certificate warnings or SSL issues
- ✅ Bypasses most anti-proxy detection
- ✅ Full HTTPS decryption capability

---

## 🔧 **Prerequisites**

### System Requirements
- **OS**: Linux (Kali recommended)
- **Tools**: tcpdump, tshark/Wireshark, Chromium/Chrome
- **Permissions**: sudo access for packet capture
- **Storage**: ~500MB for captures and analysis

### Required Packages
```bash
# Install required tools
sudo apt-get update
sudo apt-get install -y tcpdump wireshark-common tshark chromium python3

# Verify installations
tcpdump --version
tshark --version
chromium --version
```

---

## 🚀 **Quick Start**

### 1. Make Scripts Executable
```bash
cd /home/kali/betika_automated_login
chmod +x stealth_capture.sh
chmod +x parse_stealth_capture.sh
```

### 2. Run Stealth Capture
```bash
./stealth_capture.sh
```

### 3. Follow Interactive Session
- Chrome will open automatically with SSL key logging enabled
- Login to Betika using your credentials
- Navigate through betting sections (Football, Live Betting, etc.)
- Let it run for 2-5 minutes to capture sufficient data
- Press Ctrl+C to stop and analyze

### 4. Analysis Results
The script automatically analyzes captured data and provides:
- HTTP objects extracted from encrypted traffic
- JSON responses from external providers
- Correlation analysis between external and internal APIs
- Detailed report with next steps

---

## 📊 **How It Works**

### Technical Process

#### Phase 1: Setup
1. **Directory Creation**: Sets up capture, SSL keys, and analysis directories
2. **Tool Verification**: Checks and installs required packages
3. **SSL Key Logging**: Configures `SSLKEYLOGFILE` environment variable

#### Phase 2: Capture
1. **Packet Capture**: tcpdump monitors target hosts in background
2. **Browser Launch**: Chrome starts with SSL key logging enabled
3. **User Interaction**: Manual navigation triggers API calls
4. **Key Export**: TLS session keys saved for decryption

#### Phase 3: Decryption & Analysis
1. **TLS Decryption**: tshark uses SSL keys to decrypt HTTPS traffic
2. **HTTP Extraction**: Raw API responses extracted as files
3. **Pattern Analysis**: JSON responses categorized by provider
4. **Correlation**: External provider data correlated with Betika APIs

### Target Hosts Monitored
- `api.betika.com` - Internal Betika API
- `live.betika.com` - Live betting API
- `segment.prod.bidr.io` - Real-time bidding
- `match.prod.bidr.io` - Match data provider
- `dsp-ap.eskimi.com` - Digital advertising platform

---

## 📁 **Output Structure**

```
captures/
├── betika_stealth_YYYYMMDD_HHMMSS.pcap    # Raw packet capture
├── sslkeys/
│   └── sslkeys.log                          # TLS session keys
└── analysis_YYYYMMDD_HHMMSS/
    ├── http_objects/                        # Extracted HTTP responses
    │   ├── api.betika.com_response_001      # Betika API data
    │   ├── segment.prod.bidr.io_response_002 # bidr.io odds data
    │   └── dsp-ap.eskimi.com_response_003   # eskimi.com data
    ├── http_summary.csv                     # Request/response log
    ├── capture_report.txt                   # Initial analysis
    └── parsed_data/                         # Processed analysis
        ├── bidr_*.json                      # bidr.io data files
        ├── eskimi_*.json                    # eskimi.com data files
        ├── betika_*.json                    # Betika API files
        └── analysis_report.md               # Final report
```

---

## 🎯 **Usage Scenarios**

### Scenario 1: First-Time Discovery
**Goal**: Identify if external providers are being used

```bash
# Run stealth capture
./stealth_capture.sh

# Navigate in Chrome:
# 1. Login to Betika
# 2. Visit Sports → Football
# 3. Check Live Betting
# 4. Browse match odds
# 5. Ctrl+C to stop after 3-5 minutes

# Check results
ls captures/analysis_*/parsed_data/
```

### Scenario 2: Deep Analysis
**Goal**: Understand data transformation patterns

```bash
# Run extended capture (10-15 minutes)
./stealth_capture.sh

# During capture:
# - Multiple sports sections
# - Different match types
# - Live vs upcoming odds
# - Various bet types

# Detailed analysis
./parse_stealth_capture.sh captures/analysis_YYYYMMDD_HHMMSS/
```

### Scenario 3: Pattern Validation
**Goal**: Confirm external provider integration

```bash
# Multiple short captures at different times
for i in {1..3}; do
    ./stealth_capture.sh
    sleep 300  # Wait 5 minutes between captures
done

# Compare results across captures
find captures/ -name "*.json" -path "*/bidr*" -o -path "*/eskimi*"
```

---

## 🔍 **Analysis Guide**

### Understanding Output Files

#### HTTP Objects
- **Betika Files**: Internal API responses (already processed)
- **bidr.io Files**: Raw external odds data (gold mine!)
- **eskimi.com Files**: Advertising/distribution data

#### Key Indicators of Success
✅ **bidr.io JSON files present** = External odds provider data captured  
✅ **eskimi.com JSON files present** = Distribution network data captured  
✅ **Soccer content detected** = Match-specific data captured  
✅ **Request timing correlation** = External → Internal flow mapped  

#### Analysis Commands
```bash
# Check for external provider data
find captures/ -name "*bidr*.json" -o -name "*eskimi*.json"

# Examine JSON structure
jq keys captures/analysis_*/parsed_data/bidr_*.json

# Look for soccer odds
grep -i "football\|soccer\|premier" captures/analysis_*/parsed_data/*.json

# Compare external vs internal data
diff <(jq -r '.data[].match_id' bidr_file.json) <(jq -r '.data[].match_id' betika_file.json)
```

---

## 🛡️ **Stealth Features**

### Why Mode A is Undetectable

#### 1. Native TLS Fingerprint
- Browser uses its own TLS stack
- JA3/JA4 fingerprints remain unchanged
- No proxy signatures in TLS handshake

#### 2. Normal Network Behavior
- Direct browser → server connections
- No additional proxy hops
- Original timing and connection patterns

#### 3. No Browser Modifications
- No certificate warnings
- No proxy configuration required
- Standard Chrome user agent and headers

#### 4. Passive Monitoring
- Traffic capture happens outside browser
- No request/response interception
- No connection manipulation

---

## 🔧 **Troubleshooting**

### Common Issues

#### No SSL Keys Generated
```bash
# Check if SSLKEYLOGFILE is set
echo $SSLKEYLOGFILE

# Verify file is being written
tail -f captures/sslkeys/sslkeys.log

# Chrome should show TLS keys being logged
```

#### No External Provider Data
```bash
# Check if target hosts were contacted
grep -i "bidr\|eskimi" captures/analysis_*/http_summary.csv

# Verify packet capture worked
tcpdump -r captures/betika_stealth_*.pcap | head -20

# Try longer capture session or more user interaction
```

#### Decryption Fails
```bash
# Check tshark can read SSL keylog
tshark -r capture.pcap -o tls.keylog_file:sslkeys.log -Y http | head

# Verify file permissions
ls -la captures/sslkeys/sslkeys.log

# Try different Chrome/Chromium version
```

#### Permission Denied (tcpdump)
```bash
# Run with sudo
sudo ./stealth_capture.sh

# Or add user to wireshark group
sudo usermod -a -G wireshark $USER
# Logout and login again
```

---

## 📈 **Advanced Usage**

### Automated Capture Sessions
```bash
# Scheduled captures
0 */2 * * * /home/kali/betika_automated_login/stealth_capture.sh >/dev/null 2>&1

# Capture with specific duration
timeout 300 ./stealth_capture.sh  # 5 minutes
```

### Custom Target Hosts
Edit `stealth_capture.sh` to add more targets:
```bash
TARGET_HOSTS="(host api.betika.com or host your-target.com)"
```

### Analysis Automation
```bash
# Auto-parse all captures
for dir in captures/analysis_*; do
    ./parse_stealth_capture.sh "$dir"
done
```

---

## 🎯 **Expected Results**

### Success Indicators
- **bidr.io JSON files**: 1-5 files with odds data
- **eskimi.com JSON files**: 2-10 files with distribution data
- **Betika API files**: 10-50 files with internal responses
- **Soccer matches**: 5-20 matches with odds data

### Data Quality Metrics
- **External provider data**: Raw odds before transformation
- **Timing correlation**: External calls precede internal APIs by 1-3 seconds
- **Data mapping**: Common identifiers (match_id, team names, odds values)

### Analysis Deliverables
1. **Raw external provider API responses**
2. **Data transformation pattern documentation**
3. **External → Internal correlation mapping**
4. **Soccer odds data extraction pipeline**

---

## 🔄 **Next Steps After Successful Capture**

1. **Review parsed_data/ files** for raw external provider responses
2. **Map data transformations** between external and internal APIs
3. **Identify stable patterns** for automated extraction
4. **Build real-time monitoring** based on discovered patterns
5. **Implement data correlation** algorithms for live odds tracking

---

## 📞 **Support & Optimization**

### Performance Tuning
- **Capture Duration**: 3-5 minutes for discovery, 10-15 for deep analysis
- **Storage**: ~50MB per 5-minute session
- **CPU Usage**: Minimal during capture, moderate during analysis

### Security Considerations
- All captures stored locally
- SSL keys are session-specific and temporary
- No external data transmission
- Compliant with research and testing purposes

---

This Mode A setup provides the most stealthy and effective method for capturing raw odds data from external providers while maintaining complete invisibility to detection systems.