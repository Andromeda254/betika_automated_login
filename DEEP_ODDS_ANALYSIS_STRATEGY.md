# Deep Odds Data Extraction Strategy
## Focus: bidr.io & eskimi.com Raw Data Interception

### 📋 **Strategic Objectives**

**Primary Goals:**
1. **Focus on bidr.io and eskimi.com** for core odds data extraction
2. **Analyze api.betika.com response patterns** for data structure changes
3. **Intercept data BEFORE integration** - capture raw odds before Betika transforms them

**Key Insight:** Since Odds Provider APIs integrate to api.betika.com before being rendered to web, we must intercept data at the network level before transformation.

---

## 🎯 **High-Level Strategy**

### **1. Browser-First Capture** (Lowest friction, highest signal-to-noise)
- **Method:** Headful browser (Puppeteer/Playwright) with domain filters
- **Target Domains:** 
  - `*.bidr.io`, `*.eskimi.com`
  - `live.betika.com`, `api.betika.com`
- **Capture:** Request/response metadata + JSON bodies
- **Hooks:** 
  - Browser response events (`page.on('response')`)
  - Runtime fetch/XHR wrappers for raw payloads before UI transforms

### **2. Proxy-Based Interception** (Strongest coverage)
- **Method:** Route browser traffic through local proxy (mitmproxy)
- **Setup:** Install CA certificate, set domain whitelist
- **Benefits:** See exactly what enters/leaves browser, independent of JavaScript
- **Output:** Structured store (JSONL) tagged by host/path/query

### **3. Real-Time Correlation "Before Integration"**
- **Method:** Sequence navigation triggering odds loading
- **Correlation:** Match api.betika.com requests with prior external calls (3-10s window)
- **Detection:** Identify upstream signals from `*.bidr.io`/`*.eskimi.com`
- **Instrumentation:** Patch `window.fetch` and `XMLHttpRequest` for pre-integration data

### **4. Schema Monitoring for api.betika.com**
- **Method:** Version API responses and detect structural changes
- **Tracking:** Field presence/absence, type changes, enum expansions
- **Alerting:** Breaking changes with changelog maintenance

---

## 🛠️ **Recommended Tools & Technologies**

### **Network Interception & Monitoring**

#### **1. mitmproxy (Primary Recommendation)**
```bash
# HTTPS MITM with Python addons
mitmproxy --mode transparent --set confdir=~/.mitmproxy
```
- **Purpose:** HTTPS MITM to dump raw requests/responses
- **Benefits:** Python addons for filtering, JSON-only storage
- **Use Case:** Filter hosts (`*.bidr.io`, `*.eskimi.com`, `api.betika.com`)

#### **2. Puppeteer/Playwright Enhanced**
```javascript
// Advanced network monitoring with pre-integration hooks
await page.setRequestInterception(true);
page.on('request', interceptExternalRequests);
page.on('response', analyzeOddsResponses);
// Patch WebSocket for streaming odds
```
- **Purpose:** Browser automation with network control
- **Benefits:** Real browser environment, JavaScript execution context
- **Use Case:** Capture data as it flows through browser APIs

#### **3. tcpdump + tshark (Advanced Analysis)**
```bash
# Connection analysis and timing validation
tcpdump -i any -s 0 -w betika_traffic.pcap host api.betika.com
tshark -r betika_traffic.pcap -T fields -e http.host -e http.uri
```
- **Purpose:** Low-level network analysis
- **Benefits:** Timing analysis, connection validation
- **Use Case:** Validate flows, volumes, and timing patterns

### **Data Analysis & Processing**

#### **4. jq and gron (JSON Processing)**
```bash
# Filter and transform JSON responses
cat odds_data.json | jq '.odds[] | select(.sport=="soccer")'
# Flatten JSON for easy diffing
gron odds_data.json > flattened.txt
```
- **Purpose:** JSON filtering, transformation, and comparison
- **Benefits:** Command-line JSON processing, diff-friendly output
- **Use Case:** Process captured odds data, prepare for analysis

#### **5. ajv + quicktype (Schema Tooling)**
```bash
# Validate against generated schemas
ajv validate -s schema.json -d response.json
# Generate schemas from samples
quicktype -l schema response1.json response2.json
```
- **Purpose:** Schema generation and validation
- **Benefits:** Automated schema inference, validation
- **Use Case:** Monitor API structure changes over time

---

## 🔍 **Specific Implementation Strategy**

### **Phase 1: Network Traffic Interception Setup**

#### **mitmproxy Configuration**
```python
# mitmproxy addon for odds data extraction
from mitmproxy import http
import json

class OddsInterceptor:
    def response(self, flow: http.HTTPFlow) -> None:
        if any(domain in flow.request.pretty_host for domain in 
               ['bidr.io', 'eskimi.com', 'api.betika.com']):
            if 'application/json' in flow.response.headers.get('content-type', ''):
                self.save_odds_data(flow)
    
    def save_odds_data(self, flow):
        data = {
            'timestamp': flow.response.timestamp_start,
            'host': flow.request.pretty_host,
            'path': flow.request.path,
            'method': flow.request.method,
            'status': flow.response.status_code,
            'request_body': flow.request.text,
            'response_body': flow.response.text
        }
        # Save to structured store
        with open('odds_intercept.jsonl', 'a') as f:
            f.write(json.dumps(data) + '\n')
```

#### **Enhanced Browser Interception**
```javascript
const interceptOddsData = async (page) => {
    // Install network interception
    await page.setRequestInterception(true);
    
    // Track external provider requests
    const externalProviders = ['bidr.io', 'eskimi.com'];
    const capturedData = [];
    
    page.on('request', async (request) => {
        const url = request.url();
        if (externalProviders.some(domain => url.includes(domain))) {
            console.log('🎯 External Provider Request:', {
                url: url,
                method: request.method(),
                headers: request.headers(),
                timestamp: Date.now()
            });
        }
        request.continue();
    });
    
    page.on('response', async (response) => {
        const url = response.url();
        if (externalProviders.some(domain => url.includes(domain))) {
            try {
                const contentType = response.headers()['content-type'] || '';
                if (contentType.includes('application/json')) {
                    const rawData = await response.json();
                    capturedData.push({
                        timestamp: Date.now(),
                        url: url,
                        status: response.status(),
                        data: rawData
                    });
                    console.log('📊 Raw Odds Data Captured:', rawData);
                }
            } catch (error) {
                console.log('❌ Error parsing response:', error);
            }
        }
    });
    
    return capturedData;
};
```

### **Phase 2: In-Page Data Interception**

#### **Fetch/XHR Wrapper for Pre-Integration Data**
```javascript
const installDataInterceptors = () => {
    // Store original functions
    const originalFetch = window.fetch;
    const originalXHRSend = XMLHttpRequest.prototype.send;
    
    // Wrapper for fetch
    window.fetch = async function(...args) {
        const [url, options] = args;
        
        if (url.includes('bidr.io') || url.includes('eskimi.com')) {
            console.log('🔍 Pre-integration fetch:', url, options);
        }
        
        const response = await originalFetch.apply(this, args);
        
        if (url.includes('bidr.io') || url.includes('eskimi.com')) {
            const clonedResponse = response.clone();
            const data = await clonedResponse.json();
            console.log('📥 Raw odds payload before integration:', data);
            
            // Store for analysis
            window.rawOddsData = window.rawOddsData || [];
            window.rawOddsData.push({
                timestamp: Date.now(),
                url: url,
                data: data
            });
        }
        
        return response;
    };
    
    // Wrapper for XMLHttpRequest
    XMLHttpRequest.prototype.send = function(data) {
        const xhr = this;
        
        // Capture response
        xhr.addEventListener('load', function() {
            const url = xhr.responseURL;
            if (url.includes('bidr.io') || url.includes('eskimi.com')) {
                try {
                    const responseData = JSON.parse(xhr.responseText);
                    console.log('📥 XHR raw odds data:', responseData);
                } catch (e) {
                    console.log('Non-JSON XHR response from external provider');
                }
            }
        });
        
        return originalXHRSend.call(this, data);
    };
};
```

### **Phase 3: API Pattern Analysis for api.betika.com**

#### **Schema Change Detection System**
```javascript
const monitorApiPatterns = async () => {
    const endpoints = [
        '/v1/sports',
        '/v1/uo/sport',
        '/v1/uo/matches',
        '/v1/uo/totalMatches'
    ];
    
    const schemas = new Map();
    const sampleHistory = new Map();
    
    setInterval(async () => {
        for (const endpoint of endpoints) {
            try {
                const response = await fetch(`https://api.betika.com${endpoint}?sport_id=14`);
                const data = await response.json();
                
                // Generate schema fingerprint
                const schema = generateSchema(data);
                const schemaKey = `${endpoint}_${JSON.stringify(schema)}`;
                
                // Detect changes
                const lastSchema = schemas.get(endpoint);
                if (lastSchema && lastSchema !== schemaKey) {
                    console.log('🚨 Schema change detected:', {
                        endpoint: endpoint,
                        timestamp: new Date().toISOString(),
                        changes: diffSchemas(lastSchema, schemaKey)
                    });
                }
                
                schemas.set(endpoint, schemaKey);
                
                // Store sample
                const samples = sampleHistory.get(endpoint) || [];
                samples.push({
                    timestamp: Date.now(),
                    data: data,
                    schema: schema
                });
                
                // Keep last 100 samples
                if (samples.length > 100) samples.shift();
                sampleHistory.set(endpoint, samples);
                
            } catch (error) {
                console.error('Error monitoring endpoint:', endpoint, error);
            }
        }
    }, 30000); // Every 30 seconds
};

const generateSchema = (obj) => {
    if (Array.isArray(obj)) {
        return { type: 'array', items: obj.length > 0 ? generateSchema(obj[0]) : {} };
    } else if (obj && typeof obj === 'object') {
        const properties = {};
        for (const [key, value] of Object.entries(obj)) {
            properties[key] = generateSchema(value);
        }
        return { type: 'object', properties };
    } else {
        return { type: typeof obj };
    }
};
```

### **Phase 4: Data Correlation and Analysis**

#### **External-to-Internal Data Flow Mapping**
```javascript
const correlateDataFlows = () => {
    const correlationWindow = 10000; // 10 seconds
    const externalData = window.rawOddsData || [];
    const betikaRequests = [];
    
    // Monitor Betika API calls
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
        const [url] = args;
        
        if (url.includes('api.betika.com')) {
            const timestamp = Date.now();
            const response = await originalFetch.apply(this, args);
            
            if (response.ok) {
                const data = await response.clone().json();
                betikaRequests.push({
                    timestamp,
                    url,
                    data
                });
                
                // Find correlated external data
                const correlatedExternal = externalData.filter(ext => 
                    Math.abs(ext.timestamp - timestamp) <= correlationWindow
                );
                
                if (correlatedExternal.length > 0) {
                    console.log('🔗 Data correlation found:', {
                        betika: { url, timestamp },
                        external: correlatedExternal.map(e => ({ 
                            url: e.url, 
                            timestamp: e.timestamp 
                        })),
                        dataMapping: analyzeDataMapping(data, correlatedExternal)
                    });
                }
            }
            
            return response;
        }
        
        return originalFetch.apply(this, args);
    };
};

const analyzeDataMapping = (betikaData, externalData) => {
    const mappings = [];
    
    // Look for common identifiers
    const betikaFields = flattenObject(betikaData);
    
    externalData.forEach(ext => {
        const extFields = flattenObject(ext.data);
        
        // Find potential field mappings
        for (const [betikaKey, betikaValue] of Object.entries(betikaFields)) {
            for (const [extKey, extValue] of Object.entries(extFields)) {
                if (betikaValue === extValue) {
                    mappings.push({
                        betikaField: betikaKey,
                        externalField: extKey,
                        value: betikaValue,
                        source: ext.url
                    });
                }
            }
        }
    });
    
    return mappings;
};

const flattenObject = (obj, prefix = '') => {
    const flattened = {};
    for (const [key, value] of Object.entries(obj)) {
        const newKey = prefix ? `${prefix}.${key}` : key;
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            Object.assign(flattened, flattenObject(value, newKey));
        } else {
            flattened[newKey] = value;
        }
    }
    return flattened;
};
```

---

## 📊 **Analysis Focus Areas**

### **1. bidr.io Domain Analysis**
- **segment.prod.bidr.io:** User segmentation and targeting data
- **match.prod.bidr.io:** Match data and odds distribution
- **API Patterns:** Reverse engineer odds API structure
- **Data Format:** Identify raw odds format before transformation

### **2. eskimi.com Integration Analysis**
- **dsp-ap.eskimi.com:** Demand-side platform analysis
- **Creative Formats:** Odds packaging and delivery methods
- **AI Targeting:** Personalization algorithms for odds display
- **Data Flow:** Map integration points with Betika

### **3. api.betika.com Pattern Monitoring**
- **Endpoints Priority:**
  - `/v1/sports` - Sports catalog
  - `/v1/uo/matches` - Live match data
  - `/v1/uo/totalMatches` - Match statistics
  - `live.betika.com/v1/uo/sports` - Live sports data
- **Change Detection:** Schema evolution, field additions/removals
- **Transformation Mapping:** External → Internal data flow

---

## 🎯 **Expected Deliverables**

### **Immediate Outputs:**
1. **Raw Odds Data Extraction Scripts**
2. **Network Traffic Analysis Reports**
3. **API Pattern Change Detection System**
4. **External Provider Integration Maps**

### **Analysis Reports:**
1. **bidr.io Data Structure Documentation**
2. **eskimi.com Integration Pattern Analysis**
3. **api.betika.com Schema Evolution Timeline**
4. **Data Transformation Pipeline Documentation**

### **Monitoring Systems:**
1. **Real-time Odds Data Interceptor**
2. **Schema Change Alert System**
3. **Data Correlation Dashboard**
4. **External Provider Health Monitoring**

---

## ⚡ **Implementation Notes**

### **Legal/ToS Considerations:**
- Keep activities within acceptable use policies
- Use local proxy with own browser session (generally acceptable)
- Verify compliance with site terms of service
- Focus on diagnostic and research purposes

### **Technical Constraints:**
- **SSL Pinning:** May block proxy interception (fallback to browser-level logging)
- **Rate Limiting:** Implement respectful request timing
- **CORS/Auth:** Browser-based approach handles authentication naturally

### **Next Steps:**
1. **Choose Approach:** Browser-only vs Proxy + Browser
2. **Set up mitmproxy** profile with custom addon
3. **Extend existing Node crawler** with fetch/XHR/WebSocket patching
4. **Implement schema watcher** for api.betika.com responses
5. **Deploy correlation system** for data flow mapping

---

## 🚀 **Ready for Implementation**

This strategy document provides a comprehensive roadmap for deep odds data extraction from bidr.io and eskimi.com, with robust monitoring of api.betika.com patterns. The approach balances technical depth with practical implementation considerations, ensuring we can capture raw odds data before Betika's internal transformations while monitoring for API changes over time.

**Key Success Metrics:**
- ✅ Raw odds data captured from external providers
- ✅ Data correlation between external and internal APIs
- ✅ Schema change detection with alerting
- ✅ Complete data transformation pipeline mapping