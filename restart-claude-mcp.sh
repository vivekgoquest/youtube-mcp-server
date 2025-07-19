#!/bin/bash

# Script to restart Claude Desktop and check MCP logs
# This script will:
# 1. Delete existing MCP logs
# 2. Kill Claude Desktop
# 3. Restart Claude Desktop
# 4. Wait for it to initialize
# 5. Read and display fresh MCP logs

echo "🔄 Restarting Claude Desktop for MCP testing..."

# Delete existing MCP logs
echo "🗑️  Deleting existing MCP logs..."
LOGS_DIR="$HOME/Library/Logs/Claude"
if [ -d "$LOGS_DIR" ]; then
    rm -f "$LOGS_DIR"/*.log
    echo "✅ Deleted all existing log files"
else
    echo "📁 Creating logs directory..."
    mkdir -p "$LOGS_DIR"
fi

# Kill Claude Desktop if running
echo "🔴 Stopping Claude Desktop..."
pkill -f "Claude" || echo "Claude Desktop not running"

# Wait a moment
sleep 2

# Start Claude Desktop
echo "🟢 Starting Claude Desktop..."
open -a "Claude"

# Wait for Claude to initialize
echo "⏳ Waiting for Claude Desktop to initialize..."
sleep 5

# Display MCP logs
echo "📋 Displaying fresh MCP logs..."
echo "====================================="
LOG_FILE="$LOGS_DIR/mcp.log"

# Create log file if it doesn't exist
touch "$LOG_FILE"

# Display recent logs with tail
echo "Recent MCP logs:"
tail -50 "$LOG_FILE"

# Continuous monitoring option
echo ""
echo "🔍 Log monitoring started. Press Ctrl+C to stop monitoring."
echo "====================================="
tail -f "$LOG_FILE"
