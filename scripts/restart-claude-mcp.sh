#!/usr/bin/env bash

# Enhanced restart script for YouTube MCP Server
# Provides comprehensive workflow: build, test, Claude integration, and rollback
# Usage: ./restart-claude-mcp.sh [--skip-build] [--help]

set -Eeuo pipefail

# Source common utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/lib/common.sh"

# Global variables
SKIP_BUILD=false
SIMPLE_MODE=false
BACKUP_TGZ=""
PREV_VERSION=""
TEMP_DIR="/tmp/youtube-mcp-server-$(date +%s)"
START_TIME=$(date +%s)

# Cleanup function
cleanup() {
    local exit_code=$?
    local end_time=$(date +%s)
    local duration=$((end_time - START_TIME))
    
    info "Cleaning up..."
    cleanup_temp_files "$TEMP_DIR"
    
    if [ -d "$TEMP_DIR" ]; then
        rm -rf "$TEMP_DIR" 2>/dev/null || true
    fi
    
    print_final_summary "$exit_code" "$duration"
}

# Trap for cleanup and error handling
trap cleanup EXIT
trap 'handle_error $LINENO "$BASH_COMMAND"' ERR

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-build)
                SKIP_BUILD=true
                shift
                ;;
            --simple)
                SIMPLE_MODE=true
                shift
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            *)
                error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
}

# Show help information
show_help() {
    cat << EOF
Enhanced restart script for YouTube MCP Server

USAGE:
    ./restart-claude-mcp.sh [OPTIONS]

OPTIONS:
    --skip-build    Skip the build phase (useful for quick restarts)
    --simple        Minimal restart workflow (no build, no tests, just restart)
    --help, -h      Show this help message

DESCRIPTION:
    This script provides a comprehensive workflow for restarting Claude Desktop
    with the YouTube MCP Server. It includes:
    
    1. Backup of current installation
    2. Optional build and install phase
    3. API health testing
    4. MCP inspector testing
    5. Claude Desktop restart
    6. Rollback on failure
    7. Comprehensive status reporting

EXAMPLES:
    # Full workflow with build
    ./restart-claude-mcp.sh

    # Quick restart (skip build)
    ./restart-claude-mcp.sh --skip-build

    # Simple restart (minimal workflow)
    ./restart-claude-mcp.sh --simple

    # Via npm
    npm run restart:claude

EXIT CODES:
    0   Success
    1   General error
    2   Build failure
    3   Test failure
    4   Claude restart failure
EOF
}

# Backup current installation
backup_current_install() {
    info "Checking for existing global installation..."
    
    # Check if youtube-mcp-server is installed globally
    if npm list -g youtube-mcp-server --json >/dev/null 2>&1; then
        PREV_VERSION=$(npm list -g youtube-mcp-server --json 2>/dev/null | jq -r '.dependencies["youtube-mcp-server"].version' 2>/dev/null || echo "unknown")
        
        info "Found existing installation: v$PREV_VERSION"
        
        # Create backup directory
        mkdir -p "$TEMP_DIR"
        
        # Create backup tarball
        BACKUP_TGZ="$TEMP_DIR/youtube-mcp-server-backup-$PREV_VERSION.tgz"
        
        info "Creating backup of current installation..."
        if npm pack youtube-mcp-server@$PREV_VERSION --pack-destination "$TEMP_DIR" >/dev/null 2>&1; then
            mv "$TEMP_DIR"/youtube-mcp-server-*.tgz "$BACKUP_TGZ"
            success "Backup created: $BACKUP_TGZ"
            add_status "Backup creation" "passed"
        else
            warning "Could not create backup tarball"
            add_status "Backup creation" "skipped"
        fi
    else
        info "No existing global installation found"
        add_status "Backup creation" "skipped"
    fi
}

# Build and install phase
build_and_install() {
    if [ "$SKIP_BUILD" = true ]; then
        info "Skipping build phase (--skip-build flag set)"
        add_status "Build phase" "skipped"
        return 0
    fi
    
    info "Starting build phase..."
    
    # Check prerequisites
    check_command "npm" || exit 1
    check_command "node" || exit 1
    
    # Clean previous build
    info "Cleaning previous build..."
    npm run clean || {
        error "Failed to clean previous build"
        add_status "Build clean" "failed"
        return 2
    }
    add_status "Build clean" "passed"
    
    # Build production version
    info "Building production version..."
    npm run build:prod || {
        error "Failed to build production version"
        add_status "Build production" "failed"
        return 2
    }
    add_status "Build production" "passed"
    
    # Create package
    info "Creating package..."
    npm pack || {
        error "Failed to create package"
        add_status "Package creation" "failed"
        return 2
    }
    add_status "Package creation" "passed"
    
    # Install globally
    info "Installing globally..."
    local tgz_file=$(ls youtube-mcp-server-*.tgz 2>/dev/null | head -n 1)
    if [ -z "$tgz_file" ]; then
        error "No .tgz file found after npm pack"
        add_status "Global install" "failed"
        return 2
    fi
    
    if npm install -g "$tgz_file"; then
        success "Global installation successful"
        add_status "Global install" "passed"
    else
        error "Failed to install globally"
        add_status "Global install" "failed"
        return 2
    fi
    
    # Verify installation
    info "Verifying installation..."
    if command -v youtube-mcp-server >/dev/null 2>&1; then
        local installed_version=$(youtube-mcp-server --version 2>/dev/null || echo "unknown")
        success "Installation verified: $installed_version"
        add_status "Installation verification" "passed"
    else
        error "Installation verification failed"
        add_status "Installation verification" "failed"
        return 2
    fi
}

# Test server functionality
test_server() {
    info "Starting server testing phase..."
    
    # Test API health if API key is available
    if [ -n "${YOUTUBE_API_KEY:-}" ]; then
        info "Testing API health..."
        if node scripts/verify-api-health.js; then
            success "API health check passed"
            add_status "API health check" "passed"
        else
            warning "API health check failed (check API key and quota)"
            add_status "API health check" "failed"
        fi
    else
        warning "YOUTUBE_API_KEY not set, skipping API health check"
        add_status "API health check" "skipped"
    fi
    
    # Test tool discovery
    info "Testing tool discovery..."
    if node scripts/verify-tool-discovery.js; then
        success "Tool discovery test passed"
        add_status "Tool discovery" "passed"
    else
        error "Tool discovery test failed"
        add_status "Tool discovery" "failed"
        return 3
    fi
    
    # Run MCP inspector tests
    info "Running MCP inspector tests..."
    if bash scripts/test-mcp-inspector.sh; then
        success "MCP inspector tests passed"
        add_status "MCP inspector tests" "passed"
    else
        error "MCP inspector tests failed"
        add_status "MCP inspector tests" "failed"
        return 3
    fi
}

# Simple restart function (minimal workflow)
simple_restart() {
    info "🔄 Starting simple restart workflow..."
    
    local logs_dir
    logs_dir=$(get_claude_logs_dir)
    
    # Delete existing MCP logs
    info "🗑️  Deleting existing MCP logs..."
    if [ -d "$logs_dir" ]; then
        rm -f "$logs_dir"/*.log
        success "✅ Deleted all existing log files"
        add_status "Log cleanup" "passed"
    else
        info "📁 Creating logs directory..."
        mkdir -p "$logs_dir"
        add_status "Log cleanup" "passed"
    fi
    
    # Kill Claude Desktop if running
    info "🔴 Stopping Claude Desktop..."
    if pkill -f "Claude" 2>/dev/null; then
        success "Claude Desktop stopped"
        add_status "Claude stop" "passed"
    else
        info "Claude Desktop was not running"
        add_status "Claude stop" "skipped"
    fi
    
    # Wait a moment
    sleep 2
    
    # Start Claude Desktop
    info "🟢 Starting Claude Desktop..."
    if open -a "Claude" 2>/dev/null; then
        success "Claude Desktop started"
        add_status "Claude start" "passed"
    else
        error "Failed to start Claude Desktop"
        add_status "Claude start" "failed"
        return 4
    fi
    
    # Wait for Claude to initialize
    info "⏳ Waiting for Claude Desktop to initialize..."
    sleep 5
    
    # Display MCP logs
    info "📋 Displaying fresh MCP logs..."
    local log_file="$logs_dir/mcp.log"
    
    # Create log file if it doesn't exist
    touch "$log_file"
    
    # Display recent logs with tail
    info "Recent MCP logs:"
    echo "====================================="
    tail -50 "$log_file"
    
    # Check for YouTube MCP Server registration
    if grep -q "youtube-mcp-server" "$log_file" 2>/dev/null; then
        success "✅ YouTube MCP Server found in logs"
        add_status "MCP registration" "passed"
    else
        warning "⚠️  YouTube MCP Server not found in logs yet"
        add_status "MCP registration" "pending"
    fi
    
    # Offer continuous monitoring
    echo ""
    info "🔍 Log monitoring started. Press Ctrl+C to stop monitoring."
    echo "====================================="
    
    # Start monitoring in background so script can complete
    tail -f "$log_file" &
    local tail_pid=$!
    
    # Wait for a few seconds to show some live output
    sleep 3
    
    # Kill the tail process
    kill $tail_pid 2>/dev/null || true
    
    echo ""
    success "Simple restart completed!"
    info "💡 For continuous monitoring, run: tail -f $log_file"
    
    return 0
}

# Restart Claude Desktop
restart_claude() {
    info "Starting Claude Desktop restart phase..."
    
    local logs_dir
    logs_dir=$(get_claude_logs_dir)
    
    # Delete existing logs
    info "Cleaning up existing Claude logs..."
    if [ -d "$logs_dir" ]; then
        rm -f "$logs_dir"/*.log
        success "Deleted existing log files"
    else
        mkdir -p "$logs_dir"
        info "Created logs directory"
    fi
    
    # Kill Claude Desktop if running
    info "Stopping Claude Desktop..."
    if pkill -f "Claude" 2>/dev/null; then
        success "Claude Desktop stopped"
        sleep 2
    else
        info "Claude Desktop was not running"
    fi
    
    # Start Claude Desktop
    info "Starting Claude Desktop..."
    if open -a "Claude" 2>/dev/null; then
        success "Claude Desktop started"
        add_status "Claude restart" "passed"
    else
        error "Failed to start Claude Desktop"
        add_status "Claude restart" "failed"
        return 4
    fi
    
    # Wait for initialization
    info "Waiting for Claude Desktop to initialize..."
    sleep 5
    
    # Monitor MCP logs
    info "Monitoring MCP registration..."
    local log_file="$logs_dir/mcp.log"
    local timeout=30
    local count=0
    
    while [ $count -lt $timeout ]; do
        if [ -f "$log_file" ]; then
            if grep -q "youtube-mcp-server" "$log_file" 2>/dev/null; then
                success "YouTube MCP Server registered successfully"
                add_status "MCP registration" "passed"
                
                # Show recent logs
                echo ""
                info "Recent MCP logs:"
                tail -20 "$log_file"
                return 0
            fi
        fi
        
        sleep 1
        ((count++))
        
        if [ $((count % 5)) -eq 0 ]; then
            info "Waiting for registration... ($count/$timeout)"
        fi
    done
    
    warning "MCP registration timeout - check logs manually"
    add_status "MCP registration" "failed"
    
    # Show available logs
    if [ -f "$log_file" ]; then
        echo ""
        info "Available MCP logs:"
        tail -50 "$log_file"
    fi
    
    return 4
}

# Rollback function
rollback() {
    if [ -n "$BACKUP_TGZ" ] && [ -f "$BACKUP_TGZ" ]; then
        warning "Rolling back to previous version..."
        
        if npm install -g "$BACKUP_TGZ"; then
            success "Rollback successful - restored v$PREV_VERSION"
            add_status "Rollback" "passed"
        else
            error "Rollback failed - manual intervention required"
            add_status "Rollback" "failed"
        fi
    else
        warning "No backup available for rollback"
        add_status "Rollback" "skipped"
    fi
}

# Print final summary
print_final_summary() {
    local exit_code=$1
    local duration=$2
    
    echo ""
    echo "========================================"
    log "🎯 FINAL EXECUTION REPORT" "$MAGENTA"
    echo "========================================"
    
    print_summary
    
    echo ""
    log "⏱️  Total execution time: $(format_duration $duration)" "$CYAN"
    
    if [ $exit_code -eq 0 ]; then
        if [ ${#FAILED[@]} -eq 0 ]; then
            success "🎉 All operations completed successfully!"
            echo ""
            info "Next steps:"
            echo "  • Claude Desktop should now have the YouTube MCP Server available"
            echo "  • Test with: 'Search for videos about TypeScript'"
            echo "  • Check logs: tail -f $(get_claude_logs_dir)/mcp.log"
        else
            warning "⚠️  Completed with some issues - check the summary above"
            echo ""
            info "Troubleshooting:"
            echo "  • Check the FAILED items above"
            echo "  • Review logs in: $(get_claude_logs_dir)"
            echo "  • Run individual tests: npm run test:api-health"
        fi
    else
        error "❌ Script failed with exit code $exit_code"
        echo ""
        info "Troubleshooting:"
        case $exit_code in
            2) echo "  • Build failed - check build logs and dependencies" ;;
            3) echo "  • Tests failed - check test output and API key" ;;
            4) echo "  • Claude restart failed - check Claude installation" ;;
            *) echo "  • General error - check console output" ;;
        esac
    fi
    
    echo ""
}

# Main orchestration function
main() {
    local phase="initialization"
    
    # Parse arguments
    parse_args "$@"
    
    # Check if simple mode is requested
    if [ "$SIMPLE_MODE" = true ]; then
        # Show simple banner
        echo ""
        log "🔄 YouTube MCP Server Simple Restart" "$MAGENTA"
        log "=====================================" "$MAGENTA"
        echo ""
        
        # Run simple restart workflow
        simple_restart || exit $?
        
        success "Simple restart workflow completed!"
        return 0
    fi
    
    # Show banner for full workflow
    echo ""
    log "🚀 YouTube MCP Server Enhanced Restart" "$MAGENTA"
    log "======================================" "$MAGENTA"
    echo ""
    
    # Validate environment
    info "Validating environment..."
    check_command "npm" || exit 1
    check_command "node" || exit 1
    
    # Phase 1: Backup
    phase="backup"
    info "Phase 1: Creating backup..."
    backup_current_install
    
    # Phase 2: Build and Install
    phase="build"
    info "Phase 2: Build and install..."
    build_and_install || {
        rollback
        exit 2
    }
    
    # Phase 3: Testing
    phase="testing"
    info "Phase 3: Testing server..."
    test_server || {
        rollback
        exit 3
    }
    
    # Phase 4: Claude Integration
    phase="claude"
    info "Phase 4: Claude Desktop integration..."
    restart_claude || {
        rollback
        exit 4
    }
    
    # Success
    phase="complete"
    success "All phases completed successfully!"
}

# Execute main function
main "$@"
