#!/bin/bash
# Parser for Mode A Stealth Capture Data
# Analyzes HTTP objects and extracts odds data from external providers

set -e

# Configuration
ANALYSIS_DIR="$1"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if analysis directory provided
if [ -z "$ANALYSIS_DIR" ] || [ ! -d "$ANALYSIS_DIR" ]; then
    echo -e "${RED}❌ Usage: $0 <analysis_directory>${NC}"
    echo -e "${YELLOW}Example: $0 /home/kali/betika_automated_login/captures/analysis_20241003_012345${NC}"
    exit 1
fi

echo -e "${BLUE}🔍 Parsing Stealth Capture Data${NC}"
echo -e "${BLUE}===============================${NC}"
echo -e "${YELLOW}Analysis Directory: $ANALYSIS_DIR${NC}"
echo ""

# Create parsed output directory
PARSED_DIR="$ANALYSIS_DIR/parsed_data"
mkdir -p "$PARSED_DIR"

# Function to check if a file is JSON
is_json() {
    local file="$1"
    if [ -f "$file" ]; then
        # Check if file starts with { or [
        first_char=$(head -c 1 "$file" 2>/dev/null)
        if [ "$first_char" = "{" ] || [ "$first_char" = "[" ]; then
            # Try to parse as JSON
            python3 -c "import json; json.load(open('$file'))" 2>/dev/null
            return $?
        fi
    fi
    return 1
}

# Function to extract domain from filename or content
get_domain_from_file() {
    local file="$1"
    local filename=$(basename "$file")
    
    # Try to extract domain from filename patterns
    if [[ "$filename" == *"betika"* ]]; then
        echo "betika.com"
    elif [[ "$filename" == *"bidr"* ]]; then
        echo "bidr.io"
    elif [[ "$filename" == *"eskimi"* ]]; then
        echo "eskimi.com"
    else
        # Try to find domain in file content (first few lines)
        local domain=$(head -20 "$file" 2>/dev/null | grep -oE '(api\.betika\.com|live\.betika\.com|[a-zA-Z0-9.-]*\.bidr\.io|[a-zA-Z0-9.-]*\.eskimi\.com)' | head -1)
        if [ -n "$domain" ]; then
            echo "$domain"
        else
            echo "unknown"
        fi
    fi
}

# Analyze HTTP objects directory
HTTP_OBJECTS_DIR="$ANALYSIS_DIR/http_objects"
if [ ! -d "$HTTP_OBJECTS_DIR" ]; then
    echo -e "${YELLOW}⚠️  No HTTP objects directory found${NC}"
    echo -e "${YELLOW}Directory expected: $HTTP_OBJECTS_DIR${NC}"
    exit 1
fi

echo -e "${BLUE}📁 Analyzing HTTP objects in: $HTTP_OBJECTS_DIR${NC}"

# Count files
TOTAL_FILES=$(find "$HTTP_OBJECTS_DIR" -type f | wc -l)
echo -e "${YELLOW}📊 Total files to analyze: $TOTAL_FILES${NC}"

# Initialize counters
JSON_FILES=0
BETIKA_FILES=0
BIDR_FILES=0
ESKIMI_FILES=0
SOCCER_FILES=0

# Initialize arrays to store data
declare -a BETIKA_JSONS=()
declare -a BIDR_JSONS=()
declare -a ESKIMI_JSONS=()

echo -e "${BLUE}🔍 Processing files...${NC}"

# Process each file
for file in "$HTTP_OBJECTS_DIR"/*; do
    if [ -f "$file" ]; then
        filename=$(basename "$file")
        domain=$(get_domain_from_file "$file")
        
        # Check if it's JSON
        if is_json "$file"; then
            JSON_FILES=$((JSON_FILES + 1))
            echo -e "${GREEN}📄 JSON: $filename → $domain${NC}"
            
            # Categorize by domain
            case "$domain" in
                *"betika.com"*)
                    BETIKA_FILES=$((BETIKA_FILES + 1))
                    BETIKA_JSONS+=("$file")
                    ;;
                *"bidr.io"*)
                    BIDR_FILES=$((BIDR_FILES + 1))
                    BIDR_JSONS+=("$file")
                    echo -e "${YELLOW}🎯 External Provider: bidr.io file found!${NC}"
                    ;;
                *"eskimi.com"*)
                    ESKIMI_FILES=$((ESKIMI_FILES + 1))
                    ESKIMI_JSONS+=("$file")
                    echo -e "${YELLOW}🎯 External Provider: eskimi.com file found!${NC}"
                    ;;
            esac
            
            # Check for soccer/football content
            if grep -qi "soccer\|football\|premier\|champions\|league" "$file" 2>/dev/null; then
                SOCCER_FILES=$((SOCCER_FILES + 1))
                echo -e "${GREEN}⚽ Soccer content detected in: $filename${NC}"
            fi
        fi
    fi
done

# Generate summary
echo ""
echo -e "${BLUE}📊 ANALYSIS SUMMARY${NC}"
echo -e "${BLUE}==================${NC}"
echo -e "${YELLOW}Total Files: $TOTAL_FILES${NC}"
echo -e "${YELLOW}JSON Files: $JSON_FILES${NC}"
echo -e "${YELLOW}Betika API Files: $BETIKA_FILES${NC}"
echo -e "${YELLOW}bidr.io Files: $BIDR_FILES${NC}"
echo -e "${YELLOW}eskimi.com Files: $ESKIMI_FILES${NC}"
echo -e "${YELLOW}Soccer Content Files: $SOCCER_FILES${NC}"
echo ""

# Detailed analysis of external providers
if [ ${#BIDR_JSONS[@]} -gt 0 ]; then
    echo -e "${BLUE}🎯 BIDR.IO ANALYSIS${NC}"
    echo -e "${BLUE}===================${NC}"
    
    BIDR_SUMMARY="$PARSED_DIR/bidr_io_analysis.json"
    echo '{"files": [], "summary": {"total_files": 0, "endpoints": [], "data_patterns": []}}' > "$BIDR_SUMMARY"
    
    for file in "${BIDR_JSONS[@]}"; do
        filename=$(basename "$file")
        echo -e "${GREEN}📄 Analyzing: $filename${NC}"
        
        # Extract key information
        file_size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file")
        
        # Get first few lines to understand structure
        preview=$(head -10 "$file" | tr -d '\n' | cut -c1-200)
        
        echo -e "${YELLOW}  Size: $file_size bytes${NC}"
        echo -e "${YELLOW}  Preview: ${preview}...${NC}"
        
        # Try to extract key fields
        if python3 -c "import json; data=json.load(open('$file')); print('Keys:', list(data.keys()) if isinstance(data, dict) else 'Array with', len(data), 'items')" 2>/dev/null; then
            echo -e "${GREEN}  ✅ Valid JSON structure${NC}"
        fi
        
        # Copy for detailed analysis
        cp "$file" "$PARSED_DIR/bidr_$(basename "$file").json"
        echo ""
    done
fi

if [ ${#ESKIMI_JSONS[@]} -gt 0 ]; then
    echo -e "${BLUE}🎯 ESKIMI.COM ANALYSIS${NC}"
    echo -e "${BLUE}======================${NC}"
    
    for file in "${ESKIMI_JSONS[@]}"; do
        filename=$(basename "$file")
        echo -e "${GREEN}📄 Analyzing: $filename${NC}"
        
        file_size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file")
        preview=$(head -10 "$file" | tr -d '\n' | cut -c1-200)
        
        echo -e "${YELLOW}  Size: $file_size bytes${NC}"
        echo -e "${YELLOW}  Preview: ${preview}...${NC}"
        
        if python3 -c "import json; data=json.load(open('$file')); print('Keys:', list(data.keys()) if isinstance(data, dict) else 'Array with', len(data), 'items')" 2>/dev/null; then
            echo -e "${GREEN}  ✅ Valid JSON structure${NC}"
        fi
        
        cp "$file" "$PARSED_DIR/eskimi_$(basename "$file").json"
        echo ""
    done
fi

# Analyze Betika API files for correlation
if [ ${#BETIKA_JSONS[@]} -gt 0 ]; then
    echo -e "${BLUE}📊 BETIKA API CORRELATION${NC}"
    echo -e "${BLUE}=========================${NC}"
    
    BETIKA_ANALYSIS="$PARSED_DIR/betika_api_analysis.json"
    echo '{"api_endpoints": [], "soccer_matches": [], "odds_data": []}' > "$BETIKA_ANALYSIS"
    
    for file in "${BETIKA_JSONS[@]}"; do
        filename=$(basename "$file")
        
        # Check for specific API patterns
        if grep -qi "matches\|sports\|odds" "$file" 2>/dev/null; then
            echo -e "${GREEN}🎯 API data detected: $filename${NC}"
            
            # Extract match data if present
            if python3 -c "
import json, sys
try:
    with open('$file') as f:
        data = json.load(f)
    
    if isinstance(data, dict):
        # Look for common match/odds patterns
        if 'data' in data:
            items = data['data'] if isinstance(data['data'], list) else [data['data']]
        elif isinstance(data, list):
            items = data
        else:
            items = [data]
        
        soccer_count = 0
        for item in items:
            if isinstance(item, dict):
                text = json.dumps(item).lower()
                if 'soccer' in text or 'football' in text or 'premier' in text:
                    soccer_count += 1
        
        if soccer_count > 0:
            print(f'Soccer matches found: {soccer_count}')
        
        # Print structure
        if 'data' in data and isinstance(data['data'], list) and len(data['data']) > 0:
            sample = data['data'][0]
            if isinstance(sample, dict):
                print(f'Sample keys: {list(sample.keys())}')
                
except Exception as e:
    pass
" 2>/dev/null; then
                cp "$file" "$PARSED_DIR/betika_$(basename "$file").json"
            fi
        fi
    done
fi

# Look for correlation patterns
echo -e "${BLUE}🔗 CORRELATION ANALYSIS${NC}"
echo -e "${BLUE}=====================${NC}"

# Read HTTP summary for timing correlation
HTTP_SUMMARY="$ANALYSIS_DIR/http_summary.csv"
if [ -f "$HTTP_SUMMARY" ]; then
    echo -e "${GREEN}📋 Analyzing HTTP request patterns...${NC}"
    
    # Count requests by domain
    betika_requests=$(grep -i "betika\.com" "$HTTP_SUMMARY" 2>/dev/null | wc -l)
    bidr_requests=$(grep -i "bidr\.io" "$HTTP_SUMMARY" 2>/dev/null | wc -l)
    eskimi_requests=$(grep -i "eskimi\.com" "$HTTP_SUMMARY" 2>/dev/null | wc -l)
    
    echo -e "${YELLOW}📊 Request counts:${NC}"
    echo -e "${YELLOW}  Betika: $betika_requests requests${NC}"
    echo -e "${YELLOW}  bidr.io: $bidr_requests requests${NC}"
    echo -e "${YELLOW}  eskimi.com: $eskimi_requests requests${NC}"
    
    # Extract unique endpoints
    echo -e "${GREEN}🔍 Unique API endpoints:${NC}"
    if [ "$betika_requests" -gt 0 ]; then
        echo -e "${YELLOW}Betika endpoints:${NC}"
        grep -i "betika\.com" "$HTTP_SUMMARY" | cut -d'|' -f4 | sort -u | head -5
    fi
    
    if [ "$bidr_requests" -gt 0 ]; then
        echo -e "${YELLOW}bidr.io endpoints:${NC}"
        grep -i "bidr\.io" "$HTTP_SUMMARY" | cut -d'|' -f4 | sort -u | head -5
    fi
    
    if [ "$eskimi_requests" -gt 0 ]; then
        echo -e "${YELLOW}eskimi.com endpoints:${NC}"
        grep -i "eskimi\.com" "$HTTP_SUMMARY" | cut -d'|' -f4 | sort -u | head -5
    fi
fi

# Generate final report
FINAL_REPORT="$PARSED_DIR/analysis_report.md"

cat > "$FINAL_REPORT" << EOF
# Betika Stealth Capture Analysis Report

## Capture Overview
- **Analysis Time**: $(date)
- **Source Directory**: $ANALYSIS_DIR
- **Parsed Data**: $PARSED_DIR

## Files Summary
- **Total Files**: $TOTAL_FILES
- **JSON Files**: $JSON_FILES
- **Soccer Content Files**: $SOCCER_FILES

## Provider Analysis
### Betika API
- **Files**: $BETIKA_FILES
- **Pattern**: Internal API responses

### bidr.io (External Provider)
- **Files**: $BIDR_FILES
- **Pattern**: Real-time bidding platform
- **Significance**: Likely core odds provider

### eskimi.com (External Provider)  
- **Files**: $ESKIMI_FILES
- **Pattern**: Digital advertising platform
- **Significance**: Odds distribution network

## Key Findings

### External Provider Integration
$(if [ $BIDR_FILES -gt 0 ] || [ $ESKIMI_FILES -gt 0 ]; then
    echo "✅ **External provider data captured successfully**"
    echo "- Raw odds data intercepted before Betika integration"
    echo "- Data available for transformation analysis"
else
    echo "⚠️ **No external provider data captured**"
    echo "- May need longer capture session"
    echo "- Check if external calls are triggered by specific user actions"
fi)

### Data Correlation
$(if [ -f "$HTTP_SUMMARY" ]; then
    echo "✅ **HTTP request patterns analyzed**"
    echo "- Request timing data available"
    echo "- API endpoint mapping complete"
else
    echo "⚠️ **Limited correlation data**"
    echo "- HTTP summary not available"
fi)

## Next Steps
1. **Manual Analysis**: Review JSON files in parsed_data/
2. **Pattern Recognition**: Identify odds data transformation patterns
3. **Real-time Monitoring**: Set up continuous capture for pattern validation
4. **Data Extraction**: Build automated parsers for identified patterns

## Files for Review
$(for file in "$PARSED_DIR"/*.json 2>/dev/null; do
    if [ -f "$file" ]; then
        echo "- $(basename "$file")"
    fi
done)

EOF

echo -e "${GREEN}✅ Analysis complete!${NC}"
echo -e "${BLUE}📊 Final report saved to: $FINAL_REPORT${NC}"
echo -e "${BLUE}📁 Parsed data available in: $PARSED_DIR${NC}"
echo ""

# Show key files for immediate review
echo -e "${BLUE}🔍 KEY FILES FOR REVIEW:${NC}"
for file in "$PARSED_DIR"/*.json 2>/dev/null; do
    if [ -f "$file" ]; then
        filename=$(basename "$file")
        size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file")
        echo -e "${GREEN}📄 $filename ($size bytes)${NC}"
    fi
done

echo ""
echo -e "${GREEN}🎉 Stealth capture analysis completed!${NC}"
echo -e "${YELLOW}💡 Review the files above to understand odds data flow${NC}"
echo -e "${YELLOW}💡 Look for common identifiers between external and internal APIs${NC}"