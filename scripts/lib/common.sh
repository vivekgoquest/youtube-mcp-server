#!/usr/bin/env bash

# Common utility library for YouTube MCP Server scripts
# Provides consistent logging, color coding, and status tracking

# ANSI color codes
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly CYAN='\033[0;36m'
readonly MAGENTA='\033[0;35m'
readonly NC='\033[0m' # No Color

# Status tracking arrays
declare -a PASSED=()
declare -a FAILED=()
declare -a SKIPPED=()
declare -a INFO=()

# Logging functions
log() {
    local message="$1"
    local color="${2:-$NC}"
    echo -e "${color}${message}${NC}"
}

error() {
    log "❌ $1" "$RED"
}

success() {
    log "✅ $1" "$GREEN"
}

warning() {
    log "⚠️  $1" "$YELLOW"
}

info() {
    log "ℹ️  $1" "$BLUE"
}

debug() {
    log "🔍 $1" "$CYAN"
}

# Status tracking functions
add_status() {
    local step_name="$1"
    local status_type="$2"
    
    case "$status_type" in
        "passed"|"PASS")
            PASSED+=("$step_name")
            ;;
        "failed"|"FAIL")
            FAILED+=("$step_name")
            ;;
        "skipped"|"SKIP")
            SKIPPED+=("$step_name")
            ;;
        "info"|"INFO")
            INFO+=("$step_name")
            ;;
        *)
            warning "Unknown status type: $status_type for step: $step_name"
            ;;
    esac
}

print_summary() {
    echo ""
    echo "====================================="
    log "📊 EXECUTION SUMMARY" "$MAGENTA"
    echo "====================================="
    
    if [ ${#PASSED[@]} -gt 0 ]; then
        log "✅ PASSED (${#PASSED[@]}):"
        for step in "${PASSED[@]}"; do
            echo "   - $step"
        done
    fi
    
    if [ ${#FAILED[@]} -gt 0 ]; then
        log "❌ FAILED (${#FAILED[@]}):"
        for step in "${FAILED[@]}"; do
            echo "   - $step"
        done
    fi
    
    if [ ${#SKIPPED[@]} -gt 0 ]; then
        log "⚠️  SKIPPED (${#SKIPPED[@]}):"
        for step in "${SKIPPED[@]}"; do
            echo "   - $step"
        done
    fi
    
    if [ ${#INFO[@]} -gt 0 ]; then
        log "ℹ️  INFO (${#INFO[@]}):"
        for step in "${INFO[@]}"; do
            echo "   - $step"
        done
    fi
    
    echo "====================================="
}

# Utility functions
check_command() {
    local command_name="$1"
    if ! command -v "$command_name" &> /dev/null; then
        error "Required command '$command_name' not found"
        return 1
    fi
    return 0
}

check_file() {
    local file_path="$1"
    if [ ! -f "$file_path" ]; then
        error "Required file '$file_path' not found"
        return 1
    fi
    return 0
}

check_directory() {
    local dir_path="$1"
    if [ ! -d "$dir_path" ]; then
        error "Required directory '$dir_path' not found"
        return 1
    fi
    return 0
}

cleanup_temp_files() {
    local temp_dir="${1:-/tmp}"
    debug "Cleaning up temporary files in $temp_dir"
    rm -rf "$temp_dir"/youtube-mcp-server-* 2>/dev/null || true
}

# Error handling utilities
handle_error() {
    local error_code=$?
    local line_number=$1
    local command_name=$2
    
    error "Script failed at line $line_number with exit code $error_code"
    error "Failed command: $command_name"
    
    # Add to failed status
    add_status "Script execution (line $line_number)" "failed"
}

# Validation utilities
validate_environment() {
    local required_vars=("$@")
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var:-}" ]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -gt 0 ]; then
        error "Missing required environment variables: ${missing_vars[*]}"
        return 1
    fi
    
    return 0
}

# Progress indicator
show_spinner() {
    local pid=$1
    local delay=0.1
    local spinstr='|/-\'
    
    while [ "$(ps a | awk '{print $1}' | grep $pid)" ]; do
        local temp=${spinstr#?}
        printf " [%c]  " "$spinstr"
        local spinstr=$temp${spinstr%"$temp"}
        sleep $delay
        printf "\b\b\b\b\b\b"
    done
    printf "    \b\b\b\b"
}

# Format time duration
format_duration() {
    local seconds=$1
    local minutes=$((seconds / 60))
    local remaining_seconds=$((seconds % 60))
    
    if [ $minutes -gt 0 ]; then
        echo "${minutes}m ${remaining_seconds}s"
    else
        echo "${seconds}s"
    fi
}

# Get current timestamp
get_timestamp() {
    date +"%Y-%m-%d %H:%M:%S"
}

# Check if running on macOS
is_macos() {
    [[ "$OSTYPE" == "darwin"* ]]
}

# Check if running on Linux
is_linux() {
    [[ "$OSTYPE" == "linux-gnu"* ]]
}

# Get Claude logs directory
get_claude_logs_dir() {
    if is_macos; then
        echo "$HOME/Library/Logs/Claude"
    elif is_linux; then
        echo "$HOME/.config/Claude/logs"
    else
        echo "$HOME/Claude/logs"
    fi
}

# Export functions for use in other scripts
export -f log error success warning info debug
export -f add_status print_summary
export -f check_command check_file check_directory
export -f cleanup_temp_files handle_error
export -f validate_environment show_spinner
export -f format_duration get_timestamp
export -f is_macos is_linux get_claude_logs_dir
