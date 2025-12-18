#!/bin/bash

##############################################################################
# Frigate WebSocket jsmpeg Stream Test Script
#
# This script tests the backend's WebSocket proxy for Frigate jsmpeg streams.
# It provides two ways to test:
# 1. Direct Frigate connection (baseline test)
# 2. Backend proxy connection (integration test)
#
# NOTE: Uses Node.js WebSocket client (curl doesn't support WSS/WS natively)
#
# Prerequisites:
# - Frigate running at https://localhost:8971
# - Backend running at http://localhost:3000
# - Node.js installed (for WebSocket client)
# - ws package: npm install -g ws
#
# Usage:
#   ./test-jsmpeg-stream.sh [direct|proxy] [duration]
#
# Examples:
#   ./test-jsmpeg-stream.sh direct 10    # Test Frigate directly for 10 seconds
#   ./test-jsmpeg-stream.sh proxy 10     # Test backend proxy for 10 seconds
#   ./test-jsmpeg-stream.sh direct       # Test Frigate directly (no timeout)
##############################################################################

set -e

# ============================================================================
# Configuration
# ============================================================================

# Frigate Configuration
FRIGATE_HOST="localhost"
FRIGATE_PORT="8971"
FRIGATE_PROTO="wss"
FRIGATE_URL="${FRIGATE_PROTO}://${FRIGATE_HOST}:${FRIGATE_PORT}"

# Frigate credentials (from the curl you provided)
CAMERA_KEY="webcam"
FRIGATE_TOKEN="eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhZG1pbiIsInJvbGUiOiJhZG1pbiIsImV4cCI6MTc2NjExNzg2NX0.wLd2y_205XVkO2w2AEN7jUm1ECQeV9CwQu-I5f2pIiQ"

# Backend Configuration
BACKEND_HOST="localhost"
BACKEND_PORT="3000"
BACKEND_URL="ws://${BACKEND_HOST}:${BACKEND_PORT}"
API_VERSION="v1"
BACKEND_TOKEN="test-jwt-token-here"  # Replace with actual JWT token

# Test Configuration
TEST_TYPE="${1:-proxy}"  # direct or proxy
TEST_DURATION="${2:-0}"  # 0 = infinite, or seconds
OUTPUT_FILE="/tmp/jsmpeg_stream_$(date +%s).bin"

# ============================================================================
# Colors for output
# ============================================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================================================
# Helper Functions
# ============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_separator() {
    echo -e "${BLUE}============================================================================${NC}"
}

# ============================================================================
# Test: Direct Frigate Connection
# ============================================================================

test_direct_frigate() {
    print_separator
    log_info "Testing DIRECT Frigate WebSocket connection"
    print_separator

    local url="${FRIGATE_URL}/live/jsmpeg/${CAMERA_KEY}"

    log_info "WebSocket URL: ${url}"
    log_info "Camera: ${CAMERA_KEY}"
    log_info "Output file: ${OUTPUT_FILE}"

    if [ "$TEST_DURATION" -gt 0 ]; then
        log_info "Stream duration: ${TEST_DURATION} seconds"
    else
        log_info "Stream duration: infinite (Ctrl+C to stop)"
    fi

    print_separator
    log_info "Starting stream..."
    print_separator

    # Build curl command with WebSocket headers and cookie auth
    local curl_cmd="curl -i -N -H 'Upgrade: websocket' -H 'Connection: Upgrade' \
        -H 'Sec-WebSocket-Key: 4glRQtG92lul9ufXPGjWWQ==' \
        -H 'Sec-WebSocket-Version: 13' \
        -H 'Origin: ${FRIGATE_URL}' \
        -H 'User-Agent: jsmpeg-test/1.0' \
        -H 'Pragma: no-cache' \
        -H 'Cache-Control: no-cache' \
        -b 'frigate_token=${FRIGATE_TOKEN}' \
        --output '${OUTPUT_FILE}' \
        --max-time ${TEST_DURATION} \
        '${url}'"

    log_info "Curl command:"
    echo -e "${YELLOW}${curl_cmd}${NC}"
    print_separator

    # Execute curl with optional timeout
    if [ "$TEST_DURATION" -gt 0 ]; then
        timeout ${TEST_DURATION}s bash -c "${curl_cmd}" || {
            local exit_code=$?
            if [ $exit_code -eq 124 ]; then
                log_success "Stream test completed (timeout after ${TEST_DURATION}s)"
            else
                log_error "Curl failed with exit code: $exit_code"
                return 1
            fi
        }
    else
        bash -c "${curl_cmd}" || {
            local exit_code=$?
            if [ $exit_code -ne 0 ]; then
                log_error "Curl failed with exit code: $exit_code"
                return 1
            fi
        }
    fi

    # Check output file
    if [ -f "$OUTPUT_FILE" ]; then
        local file_size=$(stat -f%z "$OUTPUT_FILE" 2>/dev/null || stat -c%s "$OUTPUT_FILE" 2>/dev/null)
        log_success "Stream received: ${file_size} bytes written to ${OUTPUT_FILE}"
    else
        log_error "No output file generated"
        return 1
    fi
}

# ============================================================================
# Test: Backend Proxy Connection
# ============================================================================

test_backend_proxy() {
    print_separator
    log_info "Testing BACKEND PROXY WebSocket connection"
    print_separator

    local ws_url="${BACKEND_URL}/api/${API_VERSION}/cameras/streams/${CAMERA_KEY}?token=${FRIGATE_TOKEN}"

    log_info "WebSocket Proxy URL: ${ws_url}"
    log_info "Camera: ${CAMERA_KEY}"
    log_info "Backend: ${BACKEND_HOST}:${BACKEND_PORT}"
    log_info "Output file: ${OUTPUT_FILE}"

    if [ "$TEST_DURATION" -gt 0 ]; then
        log_info "Stream duration: ${TEST_DURATION} seconds"
    else
        log_info "Stream duration: infinite (Ctrl+C to stop)"
    fi

    print_separator
    log_info "Starting stream..."
    print_separator

    # Build curl command for backend proxy
    local curl_cmd="curl -i -N -H 'Upgrade: websocket' -H 'Connection: Upgrade' \
        -H 'Sec-WebSocket-Key: 4glRQtG92lul9ufXPGjWWQ==' \
        -H 'Sec-WebSocket-Version: 13' \
        -H 'Origin: ${BACKEND_URL}' \
        -H 'User-Agent: jsmpeg-test/1.0' \
        -H 'Authorization: Bearer ${BACKEND_TOKEN}' \
        -H 'Pragma: no-cache' \
        -H 'Cache-Control: no-cache' \
        --output '${OUTPUT_FILE}' \
        --max-time ${TEST_DURATION} \
        '${ws_url}'"

    log_info "Curl command:"
    echo -e "${YELLOW}${curl_cmd}${NC}"
    print_separator

    # Execute curl with optional timeout
    if [ "$TEST_DURATION" -gt 0 ]; then
        timeout ${TEST_DURATION}s bash -c "${curl_cmd}" || {
            local exit_code=$?
            if [ $exit_code -eq 124 ]; then
                log_success "Stream test completed (timeout after ${TEST_DURATION}s)"
            else
                log_error "Curl failed with exit code: $exit_code"
                return 1
            fi
        }
    else
        bash -c "${curl_cmd}" || {
            local exit_code=$?
            if [ $exit_code -ne 0 ]; then
                log_error "Curl failed with exit code: $exit_code"
                return 1
            fi
        }
    fi

    # Check output file
    if [ -f "$OUTPUT_FILE" ]; then
        local file_size=$(stat -f%z "$OUTPUT_FILE" 2>/dev/null || stat -c%s "$OUTPUT_FILE" 2>/dev/null)
        log_success "Stream received: ${file_size} bytes written to ${OUTPUT_FILE}"
    else
        log_error "No output file generated"
        return 1
    fi
}

# ============================================================================
# Main Test Execution
# ============================================================================

main() {
    print_separator
    log_info "Frigate jsmpeg Stream Test Suite"
    print_separator
    log_info "Test Type: ${TEST_TYPE}"
    log_info "Camera: ${CAMERA_KEY}"
    log_info "Timestamp: $(date)"
    print_separator

    case "$TEST_TYPE" in
        direct)
            test_direct_frigate
            ;;
        proxy)
            test_backend_proxy
            ;;
        *)
            log_error "Unknown test type: ${TEST_TYPE}"
            echo "Usage: $0 [direct|proxy] [duration]"
            exit 1
            ;;
    esac

    print_separator
    log_success "Test completed!"
    print_separator
}

# Run main function
main "$@"
