#!/usr/bin/env bash

# Enhanced restart script for YouTube MCP Server
# Provides comprehensive workflow: build, validate, Claude integration, and rollback
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
LOG_FILE=""  # Will be set to the MCP server log file path

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
    --simple        Minimal restart workflow (no build, no validation, just restart)
    --help, -h      Show this help message

DESCRIPTION:
    This script provides a comprehensive workflow for restarting Claude Desktop
    with the YouTube MCP Server. It includes:
    
    1. Backup of current installation
    2. Optional build and install phase
    3. API health validation
    4. MCP inspector validation
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
    3   Validation failure
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
    
    # First, uninstall any existing global installation to ensure clean install
    info "Checking for existing global installation..."
    if npm list -g youtube-mcp-server &>/dev/null; then
        info "Removing existing global installation..."
        npm uninstall -g youtube-mcp-server || {
            warning "Failed to uninstall existing version, continuing anyway..."
        }
    fi
    
    # Install globally - prefer direct installation over .tgz for better reliability
    info "Installing globally..."
    
    # Method 1: Try direct installation from current directory
    if npm install -g . ; then
        success "Global installation successful (direct method)"
        add_status "Global install" "passed"
    else
        # Method 2: Fallback to .tgz file if direct install fails
        warning "Direct installation failed, trying package method..."
        local tgz_file=$(ls youtube-mcp-server-*.tgz 2>/dev/null | head -n 1)
        if [ -z "$tgz_file" ]; then
            error "No .tgz file found after npm pack"
            add_status "Global install" "failed"
            return 2
        fi
        
        if npm install -g "$tgz_file"; then
            success "Global installation successful (package method)"
            add_status "Global install" "passed"
        else
            error "Failed to install globally"
            add_status "Global install" "failed"
            return 2
        fi
    fi
    
    # Verify installation
    info "Verifying installation..."
    if command -v youtube-mcp-server >/dev/null 2>&1; then
        local installed_version=$(youtube-mcp-server --version 2>/dev/null || echo "unknown")
        success "Installation verified: $installed_version"
        add_status "Installation verification" "passed"
        
        # Additional verification: Check if unified-search tool exists in the build
        local unified_search_exists=false
        if [ -f "dist/tools/unified-search.tool.js" ]; then
            unified_search_exists=true
            info "✓ Verified unified-search tool is included in build"
        else
            warning "⚠️  unified-search tool not found in build - may be using old version"
        fi
        
        # Verify global installation location
        local global_path=$(npm root -g)/youtube-mcp-server
        if [ -d "$global_path" ]; then
            info "✓ Global installation path: $global_path"
        else
            warning "⚠️  Could not verify global installation path"
        fi
    else
        error "Installation verification failed"
        add_status "Installation verification" "failed"
        return 2
    fi
}



# Validate server functionality
validate_server() {
    begin_timing "server_validation"
    info "Starting server validation phase..."
    
    # Pass through timing environment variables
    export LOG_TIMING="${LOG_TIMING:-true}"
    export SLOW_THRESHOLD_MS="${SLOW_THRESHOLD_MS:-5000}"
    
    # Simple API key loading from .env.local only
    if [ -z "${YOUTUBE_API_KEY:-}" ]; then
        local env_file=".env.local"
        
        if [ -f "$env_file" ]; then
            # Source the .env.local file
            set -a
            source "$env_file"
            set +a
            
            if [ -n "${YOUTUBE_API_KEY:-}" ] && [ "${YOUTUBE_API_KEY:-}" != "YOUR_YOUTUBE_API_KEY_HERE" ]; then
                export YOUTUBE_API_KEY
                success "API key loaded from $env_file"
            else
                warning "Invalid API key in $env_file - skipping API health check"
            fi
        else
            warning "API key file not found: $env_file - skipping API health check"
            info "To enable API validation: cp .env.local.template .env.local"
        fi
    fi
    
    # Test API health if API key is available
    if [ -n "${YOUTUBE_API_KEY:-}" ]; then
        begin_timing "api_health_check"
        info "Checking API health..."
        if npm run check:api-health; then
            success "API health check passed"
            add_status "API health check" "passed"
        else
            warning "API health check failed (check API key and quota)"
            add_status "API health check" "failed"
        fi
        end_timing "api_health_check"
    else
        warning "YOUTUBE_API_KEY not set, skipping API health check"
        add_status "API health check" "skipped"
    fi
    
    # Check tool discovery
    begin_timing "tool_discovery_check"
    info "Checking tool discovery..."
    if npm run check:discovery; then
        success "Tool discovery check passed"
        add_status "Tool discovery" "passed"
    else
        error "Tool discovery check failed"
        add_status "Tool discovery" "failed"
        end_timing "tool_discovery_check"
        end_timing "server_validation"
        return 3
    fi
    end_timing "tool_discovery_check"
    
    info "Server validation completed"
    end_timing "server_validation"
}

# Simple restart function (minimal workflow)
simple_restart() {
    info "🔄 Starting simple restart workflow..."
    
    local logs_dir
    logs_dir=$(get_claude_logs_dir)
    
    # Delete existing MCP logs
    info "🗑️  Deleting existing MCP logs..."
    if [ -d "$logs_dir" ]; then
        if ! rm -f "$logs_dir"/mcp-server-*.log; then
            error "❌ Failed to delete MCP server log files in: $logs_dir"
            add_status "Log cleanup" "failed"
            return 1
        fi
        success "✅ Deleted existing MCP server log files"
        add_status "Log cleanup" "passed"
    else
        info "📁 Creating logs directory..."
        if ! mkdir -p "$logs_dir"; then
            error "❌ Failed to create logs directory: $logs_dir"
            add_status "Log cleanup" "failed"
            return 1
        fi
        add_status "Log cleanup" "passed"
    fi
    
    # Kill Claude Desktop processes more thoroughly
    info "🔴 Stopping Claude Desktop..."
    local claude_stopped=false
    
    # First try graceful shutdown
    if pkill -f "/Applications/Claude.app" 2>/dev/null; then
        claude_stopped=true
        info "Sent termination signal to Claude Desktop"
    fi
    
    # Give it time to shut down gracefully
    sleep 3
    
    # Force kill if still running
    if pgrep -f "/Applications/Claude.app" >/dev/null 2>&1; then
        pkill -9 -f "/Applications/Claude.app" 2>/dev/null
        info "Force killed Claude Desktop processes"
        claude_stopped=true
    fi
    
    if [ "$claude_stopped" = true ]; then
        success "Claude Desktop stopped"
        add_status "Claude stop" "passed"
    else
        info "Claude Desktop was not running"
        add_status "Claude stop" "skipped"
    fi
    
    # Wait for processes to fully terminate
    sleep 2
    
    # Verify Claude is not running
    if pgrep -f "/Applications/Claude.app" >/dev/null 2>&1; then
        warning "Claude Desktop processes still running, continuing anyway..."
    else
        info "Verified Claude Desktop is fully stopped"
    fi
    
    # Start Claude Desktop
    info "🟢 Starting Claude Desktop..."
    if open -a "Claude" 2>/dev/null; then
        success "Claude Desktop launch command sent"
        add_status "Claude start" "passed"
    else
        error "Failed to start Claude Desktop"
        add_status "Claude start" "failed"
        return 4
    fi
    
    # Wait for Claude to initialize and verify it's running
    info "⏳ Waiting for Claude Desktop to initialize..."
    local timeout=30
    local count=0
    local claude_running=false
    
    while [ $count -lt $timeout ]; do
        if pgrep -f "/Applications/Claude.app" >/dev/null 2>&1; then
            claude_running=true
            break
        fi
        sleep 1
        ((count++))
        
        if [ $((count % 5)) -eq 0 ]; then
            info "Waiting for Claude to start... ($count/$timeout)"
        fi
    done
    
    if [ "$claude_running" = true ]; then
        success "✅ Claude Desktop is running"
    else
        error "❌ Claude Desktop failed to start within $timeout seconds"
        add_status "Claude verification" "failed"
        return 4
    fi
    
    # Wait a bit more for MCP initialization
    info "⏳ Waiting for MCP subsystem to initialize..."
    sleep 5
    
    # Display MCP logs
    info "📋 Checking for MCP logs..."
    local log_file="$logs_dir/mcp-server-youtube-mcp.log"
    
    # Check if log file exists and has content
    if [ -f "$log_file" ] && [ -s "$log_file" ]; then
        info "📄 Found MCP log file with content"
        echo "====================================="
        info "Recent MCP logs:"
        tail -20 "$log_file"
        echo "====================================="
        
        # Check for YouTube MCP Server registration
        if grep -q "youtube-mcp-server" "$log_file" 2>/dev/null; then
            success "✅ YouTube MCP Server found in logs"
            add_status "MCP registration" "passed"
        else
            warning "⚠️  YouTube MCP Server not found in logs yet"
            add_status "MCP registration" "pending"
        fi
    else
        warning "⚠️  MCP log file not found or empty: $log_file"
        info "This might indicate:"
        echo "  • Claude Desktop is still initializing"
        echo "  • MCP configuration issue"
        echo "  • YouTube MCP Server not installed globally"
        add_status "MCP registration" "pending"
    fi
    
    echo ""
    success "Simple restart completed!"
    info "💡 Log monitoring commands:"
    echo "  • Watch logs: tail -f $log_file"
    echo "  • Check processes: ps aux | grep Claude"
    echo "  • Verify install: youtube-mcp-server --version"
    
    return 0
}

# Restart Claude Desktop
restart_claude() {
    info "Starting Claude Desktop restart phase..."
    
    local logs_dir
    logs_dir=$(get_claude_logs_dir)
    
    # Delete existing MCP logs
    info "Cleaning up existing Claude MCP logs..."
    if [ -d "$logs_dir" ]; then
        if ! rm -f "$logs_dir"/mcp-server-*.log 2>/dev/null; then
            error "Failed to delete MCP server log files in: $logs_dir"
            add_status "Claude restart" "failed"
            return 1
        fi
        success "Deleted existing MCP server log files"
    else
        if ! mkdir -p "$logs_dir"; then
            error "Failed to create logs directory: $logs_dir"
            add_status "Claude restart" "failed"
            return 1
        fi
        info "Created logs directory: $logs_dir"
    fi
    
    # Kill Claude Desktop processes thoroughly
    info "Stopping Claude Desktop..."
    local claude_stopped=false
    
    # First try graceful shutdown
    if pkill -f "/Applications/Claude.app" 2>/dev/null; then
        claude_stopped=true
        info "Sent termination signal to Claude Desktop"
    fi
    
    # Give it time to shut down gracefully
    sleep 3
    
    # Force kill if still running
    if pgrep -f "/Applications/Claude.app" >/dev/null 2>&1; then
        pkill -9 -f "/Applications/Claude.app" 2>/dev/null
        info "Force killed Claude Desktop processes"
        claude_stopped=true
    fi
    
    if [ "$claude_stopped" = true ]; then
        success "Claude Desktop stopped"
        sleep 2
    else
        info "Claude Desktop was not running"
    fi
    
    # Verify Claude is not running
    if pgrep -f "/Applications/Claude.app" >/dev/null 2>&1; then
        warning "Claude Desktop processes still running, continuing anyway..."
    else
        info "Verified Claude Desktop is fully stopped"
    fi
    
    # Start Claude Desktop
    info "Starting Claude Desktop..."
    if open -a "Claude" 2>/dev/null; then
        success "Claude Desktop launch command sent"
        add_status "Claude restart" "passed"
    else
        error "Failed to start Claude Desktop"
        add_status "Claude restart" "failed"
        return 4
    fi
    
    # Wait for Claude to start and verify it's running
    info "Waiting for Claude Desktop to start..."
    local timeout=30
    local count=0
    local claude_running=false
    
    while [ $count -lt $timeout ]; do
        if pgrep -f "/Applications/Claude.app" >/dev/null 2>&1; then
            claude_running=true
            break
        fi
        sleep 1
        ((count++))
        
        if [ $((count % 10)) -eq 0 ]; then
            info "Waiting for Claude to start... ($count/$timeout)"
        fi
    done
    
    if [ "$claude_running" = false ]; then
        error "Claude Desktop failed to start within $timeout seconds"
        add_status "Claude verification" "failed"
        return 4
    fi
    
    success "Claude Desktop is running"
    
    # Wait for MCP initialization
    info "Waiting for MCP subsystem to initialize..."
    sleep 8
    
    # Monitor MCP logs
    info "Monitoring MCP registration..."
    local log_file="$logs_dir/mcp-server-youtube-mcp.log"
    local timeout=45
    local count=0
    
    while [ $count -lt $timeout ]; do
        if [ -f "$log_file" ] && [ -s "$log_file" ]; then
            if grep -q "youtube-mcp-server" "$log_file" 2>/dev/null; then
                success "YouTube MCP Server registered successfully"
                add_status "MCP registration" "passed"
                
                # Show recent logs
                echo ""
                info "Recent MCP logs:"
                echo "====================================="
                tail -15 "$log_file"
                echo "====================================="
                return 0
            fi
        fi
        
        sleep 1
        ((count++))
        
        if [ $((count % 5)) -eq 0 ]; then
            info "Waiting for MCP registration... ($count/$timeout)"
        fi
    done
    
    warning "MCP registration timeout - checking logs..."
    add_status "MCP registration" "failed"
    
    # Show diagnostic information
    echo ""
    info "Diagnostic information:"
    echo "  • Log file: $log_file"
    echo "  • Log exists: $([ -f "$log_file" ] && echo "yes" || echo "no")"
    echo "  • Log size: $([ -f "$log_file" ] && wc -l < "$log_file" | tr -d ' ' || echo "0") lines"
    
    # Show available logs
    if [ -f "$log_file" ] && [ -s "$log_file" ]; then
        echo ""
        info "Available MCP logs:"
        echo "====================================="
        tail -20 "$log_file"
        echo "====================================="
    else
        echo ""
        warning "No MCP logs found. Possible issues:"
        echo "  • YouTube MCP Server not installed globally"
        echo "  • MCP configuration missing or incorrect"
        echo "  • Claude Desktop MCP subsystem disabled"
        
        # Check if server is installed
        if command -v youtube-mcp-server >/dev/null 2>&1; then
            info "✅ YouTube MCP Server is installed globally"
        else
            error "❌ YouTube MCP Server not found in PATH"
        fi
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
            echo "  • Check logs: tail -f ${LOG_FILE:-$(get_claude_logs_dir)/mcp-server-youtube-mcp.log}"
        else
            warning "⚠️  Completed with some issues - check the summary above"
            echo ""
            info "Troubleshooting:"
            echo "  • Check the FAILED items above"
            echo "  • Review logs in: $(get_claude_logs_dir)"
            echo "  • Run individual checks: npm run check:api-health"
        fi
    else
        error "❌ Script failed with exit code $exit_code"
        echo ""
        info "Troubleshooting:"
        case $exit_code in
            2) echo "  • Build failed - check build logs and dependencies" ;;
            3) echo "  • Validation failed - check output and API key" ;;
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
    
    # Set log file path
    LOG_FILE="$(get_claude_logs_dir)/mcp-server-youtube-mcp.log"
    
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
    
    # Phase 3: Validation
    phase="validation"
    info "Phase 3: Validating server..."
    validate_server || {
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
