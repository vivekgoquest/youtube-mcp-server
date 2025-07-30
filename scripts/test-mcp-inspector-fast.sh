#!/bin/bash

# Fast MCP Inspector Testing Script for Restart Workflows
# Only tests basic connectivity and lightweight tools (under 2 minutes)

set -e

# Source common utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/lib/common.sh"

# Configuration - optimized for speed
TEST_LOG="test-results-fast.log"
SERVER_PID=""
FAST_TIMEOUT=10  # Reduced from 30 to 10 seconds
STARTUP_WAIT=2   # Reduced startup wait

# Fast test tools (only lightweight, quick-response tools)
declare -A FAST_TEST_TOOLS=(
    ["search_videos"]='{"query": "test", "maxResults": 3}'
    ["search_channels"]='{"query": "test", "maxResults": 3}'
    ["get_trending_videos"]='{"regionCode": "US", "maxResults": 5}'
    ["get_video_details"]='{"videoId": "dQw4w9WgXcQ"}'
    ["extract_keywords_from_text"]='{"text": "test video content", "maxKeywords": 10}'
)

# Initialize log file
echo "MCP Inspector Fast Test - $(date)" > "$TEST_LOG"

enhanced_log() {
    echo -e "$1" | tee -a "$TEST_LOG"
}

# Override logging to write to test log
error() {
    enhanced_log "${RED}ERROR: $1${NC}"
}

success() {
    enhanced_log "${GREEN}SUCCESS: $1${NC}"
}

warning() {
    enhanced_log "${YELLOW}WARNING: $1${NC}"
}

info() {
    enhanced_log "${BLUE}INFO: $1${NC}"
}

cleanup() {
    if [ ! -z "$SERVER_PID" ]; then
        info "Shutting down MCP server (PID: $SERVER_PID)"
        kill "$SERVER_PID" 2>/dev/null || true
        wait "$SERVER_PID" 2>/dev/null || true
    fi
}

trap cleanup EXIT

load_api_key() {
    info "Loading API key from tests/.env.test..."
    
    local env_file="tests/.env.test"
    
    if [ ! -f "$env_file" ]; then
        error "API key file not found: $env_file"
        exit 1
    fi
    
    set -a
    source "$env_file"
    set +a
    
    if [ -z "$YOUTUBE_API_KEY" ] || [ "$YOUTUBE_API_KEY" = "YOUR_YOUTUBE_API_KEY_HERE" ]; then
        error "Invalid API key in $env_file"
        exit 1
    fi
    
    success "API key loaded"
}

check_prerequisites() {
    info "Fast prerequisites check..."
    
    load_api_key
    
    if ! command -v npx &> /dev/null; then
        error "npx not found"
        exit 1
    fi
    
    if command -v youtube-mcp-server &> /dev/null; then
        SERVER_COMMAND="youtube-mcp-server"
    elif [ -f "dist/index.js" ]; then
        SERVER_COMMAND="node dist/index.js"
    else
        error "No server found"
        exit 1
    fi
    
    export DEBUG_CONSOLE="false"
    export NODE_ENV="test"
    
    success "Prerequisites OK - using: $SERVER_COMMAND"
}

start_server() {
    info "Starting server (fast mode)..."
    
    env YOUTUBE_API_KEY="$YOUTUBE_API_KEY" $SERVER_COMMAND > server.log 2>&1 &
    SERVER_PID=$!
    
    # Shorter wait for startup
    sleep $STARTUP_WAIT
    
    if ! kill -0 "$SERVER_PID" 2>/dev/null; then
        error "Server failed to start"
        [ -f server.log ] && cat server.log
        exit 1
    fi
    
    success "Server started (PID: $SERVER_PID)"
}

test_connectivity() {
    info "Testing connectivity..."
    
    local tools_output
    tools_output=$(timeout $FAST_TIMEOUT npx @modelcontextprotocol/inspector --command "tools/list" stdio "$SERVER_COMMAND" 2>&1) || {
        error "Failed to connect to server"
        return 1
    }
    
    if echo "$tools_output" | grep -q "tools"; then
        success "Connectivity OK"
        return 0
    else
        error "Invalid tools response"
        return 1
    fi
}

test_tool_discovery() {
    info "Testing tool discovery..."
    
    local tools_output tool_count
    tools_output=$(timeout $FAST_TIMEOUT npx @modelcontextprotocol/inspector --command "tools/list" stdio "$SERVER_COMMAND" 2>&1)
    tool_count=$(echo "$tools_output" | grep -o '"name"' | wc -l)
    
    if [ "$tool_count" -gt 15 ]; then
        success "Tool discovery OK - found $tool_count tools"
    else
        warning "Only found $tool_count tools (expected 20+)"
    fi
}

test_fast_tools() {
    info "Testing fast tools only..."
    
    local passed=0
    local failed=0
    
    for tool in "${!FAST_TEST_TOOLS[@]}"; do
        info "Testing: $tool"
        
        local args="${FAST_TEST_TOOLS[$tool]}"
        local output
        
        output=$(timeout $FAST_TIMEOUT npx @modelcontextprotocol/inspector --command "tools/call" --args "{\"name\": \"$tool\", \"arguments\": $args}" stdio "$SERVER_COMMAND" 2>&1) || {
            error "Tool $tool failed"
            ((failed++))
            continue
        }
        
        if echo "$output" | grep -q -E "(success|content|result)" && ! echo "$output" | grep -q -E "(error|Error|ERROR)"; then
            success "Tool $tool OK"
            ((passed++))
        else
            warning "Tool $tool questionable"
            ((failed++))
        fi
    done
    
    info "Fast tool tests: $passed passed, $failed failed"
    
    if [ $passed -ge 3 ]; then
        success "Fast tool testing passed"
        return 0
    else
        error "Too many fast tool failures"
        return 1
    fi
}

main() {
    log "=== MCP Inspector Fast Test ==="
    log "Started at: $(date)"
    
    check_prerequisites
    start_server
    
    sleep 1  # Brief initialization wait
    
    test_connectivity || exit 1
    test_tool_discovery
    test_fast_tools || exit 1
    
    log "=== Fast Test Completed ==="
    success "Fast MCP Inspector testing completed in under 2 minutes!"
}

main "$@"
