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

# Timing instrumentation global variables
declare -a TIMING_DATA_KEYS=()
SLOW_THRESHOLD_SECONDS=10
VERY_SLOW_THRESHOLD_SECONDS=30

# Reset all timing data
reset_timing() {
    # Iterate over existing timing keys to unset variables
    for section_name in "${TIMING_DATA_KEYS[@]}"; do
        if [ -n "$section_name" ]; then
            # Unset start time variable
            local start_var="TIMING_${section_name}_start"
            unset "$start_var"
            
            # Unset duration variable
            local duration_var="TIMING_${section_name}_duration"
            unset "$duration_var"
        fi
    done
    
    # Clear the keys array
    TIMING_DATA_KEYS=()
    
    if [ "${LOG_TIMING:-true}" = "true" ]; then
        debug "Timing data has been reset"
    fi
}

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

# Format time duration with color coding
format_duration() {
    local seconds=$1
    local color_duration=""
    local minutes=$((seconds / 60))
    local remaining_seconds=$((seconds % 60))
    
    local formatted_time
    if [ $minutes -gt 0 ]; then
        formatted_time="${minutes}m ${remaining_seconds}s"
    else
        formatted_time="${seconds}s"
    fi
    
    # Add color coding based on duration
    if [ $seconds -lt 5 ]; then
        color_duration="${GREEN}${formatted_time}${NC}"
    elif [ $seconds -lt 30 ]; then
        color_duration="${YELLOW}${formatted_time}${NC}"
    else
        color_duration="${RED}${formatted_time}${NC}"
    fi
    
    echo -e "$color_duration"
}

# Begin timing for a named section (bash 3.x compatible)
begin_timing() {
    local section_name="$1"
    if [ -z "$section_name" ]; then
        error "begin_timing: section name is required"
        return 1
    fi
    
    # Store timing data using simple variables (bash 3.x compatible)
    eval "TIMING_${section_name}_start=$(date +%s)"
    
    # Add to keys array for summary
    local already_exists=0
    # Check if array is not empty before iterating
    if [ ${#TIMING_DATA_KEYS[@]} -gt 0 ]; then
        for key in "${TIMING_DATA_KEYS[@]}"; do
            if [[ "$key" == "$section_name" ]]; then
                already_exists=1
                break
            fi
        done
    fi
    if [ $already_exists -eq 0 ]; then
        TIMING_DATA_KEYS+=("$section_name")
    fi
    
    # Enable detailed timing if LOG_TIMING is set
    if [ "${LOG_TIMING:-true}" = "true" ]; then
        debug "Started timing section: $section_name"
    fi
}

# End timing for a named section (bash 3.x compatible)
end_timing() {
    local section_name="$1"
    if [ -z "$section_name" ]; then
        error "end_timing: section name is required"
        return 1
    fi
    
    local start_var="TIMING_${section_name}_start"
    local start_time
    eval "start_time=\$$start_var"
    
    if [ -z "$start_time" ]; then
        warning "end_timing: no start time found for section $section_name"
        add_status "$section_name" "failed"
        return 1
    fi
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    # Store the final duration
    eval "TIMING_${section_name}_duration=$duration"
    
    # Log with color coding based on duration
    if [ "${LOG_TIMING:-true}" = "true" ]; then
        if [ $duration -gt $VERY_SLOW_THRESHOLD_SECONDS ]; then
            error "VERY SLOW: Section $section_name took $(format_duration $duration)"
        elif [ $duration -gt $SLOW_THRESHOLD_SECONDS ]; then
            warning "SLOW: Section $section_name took $(format_duration $duration)"
        else
            info "Section $section_name completed in $(format_duration $duration)"
        fi
    fi
}

# Get duration for a completed section (bash 3.x compatible)
get_section_duration() {
    local section_name="$1"
    if [ -z "$section_name" ]; then
        error "get_section_duration: section name is required"
        return 1
    fi
    
    local duration_var="TIMING_${section_name}_duration"
    local duration
    eval "duration=\$$duration_var"
    
    # Return empty string and non-zero exit code if duration not found
    if [ -z "$duration" ]; then
        return 1
    fi
    
    echo "$duration"
}

# Log timing summary for all sections
log_timing_summary() {
    if [ ${#TIMING_DATA_KEYS[@]} -eq 0 ]; then
        info "No timing data available"
        return 0
    fi
    
    echo ""
    log "⏱️  TIMING SUMMARY" "$MAGENTA"
    echo "======================================"
    
    local total_time=0
    local slow_sections=""
    
    # Iterate through all recorded sections
    for section_name in "${TIMING_DATA_KEYS[@]}"; do
        if [ -n "$section_name" ]; then
            local duration_var="TIMING_${section_name}_duration"
            local duration
            eval "duration=\$$duration_var"
            
            if [ -n "$duration" ] && [ "$duration" -gt 0 ]; then
                # Add to total time
                total_time=$((total_time + duration))
                
                # Format and display
                local formatted_duration=$(format_duration $duration)
                echo -e "  $section_name: $formatted_duration"
                
                # Track slow sections
                if [ $duration -gt $SLOW_THRESHOLD_SECONDS ]; then
                    slow_sections="$slow_sections $section_name"
                fi
            fi
        fi
    done
    
    echo "======================================"
    log "📊 Total Time: $(format_duration $total_time)" "$CYAN"
    
    # Highlight slow sections
    if [ -n "$slow_sections" ]; then
        echo ""
        warning "⚠️  Slow sections (>${SLOW_THRESHOLD_SECONDS}s):"
        for slow_section in $slow_sections; do
            local duration_var="TIMING_${slow_section}_duration"
            local duration
            eval "duration=\$$duration_var"
            echo "    - $slow_section ($(format_duration $duration))"
        done
    fi
    
    echo ""
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
export -f begin_timing end_timing get_section_duration log_timing_summary reset_timing
