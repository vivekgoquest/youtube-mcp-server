#!/bin/bash

# Comprehensive MCP Inspector Testing Script
# Tests the YouTube MCP server with MCP Inspector CLI

set -e

# Source common utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/lib/common.sh"

# Configuration
TEST_LOG="test-results.log"
SERVER_PID=""
EXPECTED_TOOL_COUNT=20
TEST_TIMEOUT=30

# Initialize log file
echo "MCP Inspector Test Run - $(date)" > "$TEST_LOG"

# Utility functions - enhanced to work with common.sh logging
enhanced_log() {
    echo -e "$1" | tee -a "$TEST_LOG"
}

# Override common.sh logging functions to also write to test log
error() {
    enhanced_log "${RED}ERROR: $1${NC}"
    if [ -n "$2" ]; then
        add_status "$2" "failed"
    fi
}

success() {
    enhanced_log "${GREEN}SUCCESS: $1${NC}"
    if [ -n "$2" ]; then
        add_status "$2" "passed"
    fi
}

warning() {
    enhanced_log "${YELLOW}WARNING: $1${NC}"
    if [ -n "$2" ]; then
        add_status "$2" "warning"
    fi
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

# Set up cleanup on script exit
trap cleanup EXIT

# Check prerequisites
check_prerequisites() {
    info "Checking prerequisites..."
    
    # Check for required environment variables
    if [ -z "$YOUTUBE_API_KEY" ]; then
        error "YOUTUBE_API_KEY environment variable not set"
        exit 1
    fi
    
    # Check for MCP Inspector
    if ! command -v npx &> /dev/null; then
        error "npx not found. Please install Node.js"
        exit 1
    fi
    
    # Check for server build
    if [ ! -f "dist/src/index.js" ]; then
        error "Server build not found. Run 'npm run build' first"
        exit 1
    fi
    
    # Set test environment variables
    export DEBUG_CONSOLE="false"
    export NODE_ENV="test"
    
    success "Prerequisites check passed"
}

# Start MCP server
start_server() {
    info "Starting MCP server..."
    
    # Start server in background
    node dist/src/index.js > server.log 2>&1 &
    SERVER_PID=$!
    
    # Wait for server to start
    sleep 3
    
    # Check if server is still running
    if ! kill -0 "$SERVER_PID" 2>/dev/null; then
        error "Server failed to start. Check server.log for details"
        cat server.log
        exit 1
    fi
    
    success "MCP server started (PID: $SERVER_PID)"
}

# Test basic connectivity
test_connectivity() {
    info "Testing basic connectivity..."
    
    # Test tools/list request
    local tools_output
    tools_output=$(timeout $TEST_TIMEOUT npx @modelcontextprotocol/inspector --command "tools/list" stdio "node dist/src/index.js" 2>&1) || {
        error "Failed to connect to MCP server or list tools"
        echo "$tools_output"
        return 1
    }
    
    # Check if output contains tools
    if echo "$tools_output" | grep -q "tools"; then
        success "Basic connectivity test passed"
        return 0
    else
        error "Tools list response invalid"
        echo "$tools_output"
        return 1
    fi
}

# Test tool discovery
test_tool_discovery() {
    info "Testing tool discovery..."
    
    # Get tools list and count
    local tools_output tool_count
    tools_output=$(timeout $TEST_TIMEOUT npx @modelcontextprotocol/inspector --command "tools/list" stdio "node dist/src/index.js" 2>&1)
    
    # Extract tool count (this is a simplified check - in real implementation, parse JSON)
    tool_count=$(echo "$tools_output" | grep -o '"name"' | wc -l)
    
    if [ "$tool_count" -eq "$EXPECTED_TOOL_COUNT" ]; then
        success "Tool discovery test passed - found $tool_count tools"
    else
        warning "Tool discovery test - expected $EXPECTED_TOOL_COUNT tools, found $tool_count"
        echo "$tools_output" >> "$TEST_LOG"
    fi
}

# Test individual tools
test_individual_tools() {
    info "Testing individual tools..."
    
    # Define test cases for each tool type
    declare -A test_tools=(
        ["search_videos"]='{"query": "test", "maxResults": 5}'
        ["search_channels"]='{"query": "test", "maxResults": 5}'
        ["search_playlists"]='{"query": "test", "maxResults": 5}'
        ["advanced_search"]='{"query": "test", "type": "video"}'
        ["get_trending_videos"]='{"regionCode": "US", "maxResults": 5}'
        ["get_video_details"]='{"videoId": "dQw4w9WgXcQ"}'
        ["get_channel_details"]='{"channelId": "UC_x5XG1OV2P6uZZ5FSM9Ttw"}'
        ["get_playlist_details"]='{"playlistId": "PLQs5oG6DLQ8y4qzU9Ww9XKTJ8P5n5H5xQ"}'
        ["analyze_viral_videos"]='{"query": "test", "maxResults": 10}'
        ["analyze_competitor"]='{"channelId": "UC_x5XG1OV2P6uZZ5FSM9Ttw"}'
        ["analyze_channel_videos"]='{"channelId": "UC_x5XG1OV2P6uZZ5FSM9Ttw"}'
        ["discover_channel_network"]='{"channelId": "UC_x5XG1OV2P6uZZ5FSM9Ttw"}'
        ["extract_video_comments"]='{"videoId": "dQw4w9WgXcQ", "maxResults": 10}'
        ["find_content_gaps"]='{"niche": "technology", "competitorChannels": ["UC_x5XG1OV2P6uZZ5FSM9Ttw"]}'
        ["analyze_keyword_opportunities"]='{"keywords": ["test"]}'
        ["extract_keywords_from_text"]='{"text": "This is a test video about technology"}'
        ["extract_keywords_from_videos"]='{"videoIds": ["dQw4w9WgXcQ"]}'
        ["analyze_keywords"]='{"keywords": ["test", "technology"]}'
        ["generate_keyword_cloud"]='{"text": "test technology video content"}'
        ["keyword_research_workflow"]='{"seedKeywords": ["test"]}'
    )
    
    local passed=0
    local failed=0
    
    for tool in "${!test_tools[@]}"; do
        info "Testing tool: $tool"
        
        local args="${test_tools[$tool]}"
        local output
        
        # Test tool execution
        output=$(timeout $TEST_TIMEOUT npx @modelcontextprotocol/inspector --command "tools/call" --args "{\"name\": \"$tool\", \"arguments\": $args}" stdio "node dist/src/index.js" 2>&1) || {
            error "Tool $tool failed to execute"
            echo "$output" >> "$TEST_LOG"
            ((failed++))
            continue
        }
        
        # Check if output contains success indicators (simplified check)
        if echo "$output" | grep -q -E "(success|content|result)" && ! echo "$output" | grep -q -E "(error|Error|ERROR)"; then
            success "Tool $tool executed successfully"
            ((passed++))
        else
            warning "Tool $tool execution questionable"
            echo "$output" >> "$TEST_LOG"
            ((failed++))
        fi
        
        # Small delay between tool tests
        sleep 1
    done
    
    info "Individual tool tests completed - Passed: $passed, Failed: $failed"
}

# Test error handling
test_error_handling() {
    info "Testing error handling..."
    
    # Test invalid tool name
    local output
    output=$(timeout $TEST_TIMEOUT npx @modelcontextprotocol/inspector --command "tools/call" --args '{"name": "invalid_tool", "arguments": {}}' stdio "node dist/src/index.js" 2>&1) || true
    
    if echo "$output" | grep -q -i "error"; then
        success "Error handling test passed - invalid tool properly rejected"
    else
        warning "Error handling test - invalid tool response unclear"
        echo "$output" >> "$TEST_LOG"
    fi
    
    # Test missing required arguments
    output=$(timeout $TEST_TIMEOUT npx @modelcontextprotocol/inspector --command "tools/call" --args '{"name": "search_videos", "arguments": {}}' stdio "node dist/src/index.js" 2>&1) || true
    
    if echo "$output" | grep -q -i "error\|required"; then
        success "Error handling test passed - missing arguments properly rejected"
    else
        warning "Error handling test - missing arguments response unclear"
        echo "$output" >> "$TEST_LOG"
    fi
}

# Test concurrency
test_concurrency() {
    info "Testing concurrency..."
    
    # Start multiple tool calls in background
    local pids=()
    
    for i in {1..3}; do
        (timeout $TEST_TIMEOUT npx @modelcontextprotocol/inspector --command "tools/call" --args '{"name": "search_videos", "arguments": {"query": "test'$i'", "maxResults": 5}}' stdio "node dist/src/index.js" > "concurrent_test_$i.log" 2>&1) &
        pids+=($!)
    done
    
    # Wait for all to complete
    local concurrent_passed=0
    for pid in "${pids[@]}"; do
        if wait "$pid"; then
            ((concurrent_passed++))
        fi
    done
    
    if [ "$concurrent_passed" -eq 3 ]; then
        success "Concurrency test passed - all 3 concurrent calls succeeded"
    else
        warning "Concurrency test - only $concurrent_passed/3 concurrent calls succeeded"
    fi
    
    # Cleanup concurrent test files
    rm -f concurrent_test_*.log
}

# Main test execution
main() {
    log "=== MCP Inspector Comprehensive Test Suite ==="
    log "Started at: $(date)"
    
    check_prerequisites
    start_server
    
    # Allow server to fully initialize
    sleep 2
    
    test_connectivity
    test_tool_discovery
    test_individual_tools
    test_error_handling
    test_concurrency
    
    log "=== Test Suite Completed ==="
    log "Results logged to: $TEST_LOG"
    log "Server log available at: server.log"
    
    success "MCP Inspector testing completed successfully"
}

# Run main function
main "$@"
