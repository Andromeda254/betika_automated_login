#!/bin/bash
# Real-time QUIC traffic decryption

PCAP_FILE="$1"
KEYS_FILE="$2"
OUTPUT_DIR="$3"

if [ -z "$PCAP_FILE" ] || [ -z "$KEYS_FILE" ] || [ -z "$OUTPUT_DIR" ]; then
    echo "Usage: $0 <pcap_file> <keys_file> <output_dir>"
    exit 1
fi

mkdir -p "$OUTPUT_DIR/decrypted"

# Decrypt QUIC traffic with tshark
tshark -r "$PCAP_FILE" \
    -o tls.keylog_file:"$KEYS_FILE" \
    -Y "quic" \
    -T json \
    -e frame.time \
    -e ip.src \
    -e ip.dst \
    -e quic.connection.id \
    -e http3.headers \
    -e http3.data \
    > "$OUTPUT_DIR/decrypted/quic_decrypted_$(basename "$PCAP_FILE" .pcap).json"

# Extract HTTP/3 streams
tshark -r "$PCAP_FILE" \
    -o tls.keylog_file:"$KEYS_FILE" \
    -Y "http3" \
    -T fields \
    -e frame.time \
    -e ip.src \
    -e ip.dst \
    -e http3.method \
    -e http3.uri \
    -e http3.status \
    -e http3.response.phrase \
    -E header=y \
    -E separator=, \
    > "$OUTPUT_DIR/decrypted/http3_streams_$(basename "$PCAP_FILE" .pcap).csv"

echo "Decryption complete. Output in: $OUTPUT_DIR/decrypted/"
