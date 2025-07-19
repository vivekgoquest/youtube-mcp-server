# Enhanced MCP Debugging Guide

## Overview
Comprehensive debugging guide for Model Context Protocol (MCP) servers with both **Cline** and **Claude Desktop**. This guide covers external application logs and internal MCP server logging mechanisms, providing developers with complete troubleshooting capabilities for connection issues, tool failures, API errors, and performance problems.

**Choose Your MCP Client:**
- **Cline (VS Code Extension)**: Follow the Cline-specific sections for debugging within VS Code
- **Claude Desktop**: Follow the Claude Desktop-specific sections for debugging the standalone application

> **Note**: Both clients can connect to the same MCP servers, but have different log locations and debugging approaches.

## Quick Start Debugging Checklist

When encountering MCP errors, follow this checklist:

### Universal Checks (Both Clients)
- [ ] **Check MCP server status** (`ps aux | grep mcp` or `lsof -i :3000`)
- [ ] **Verify environment variables** (API keys, server configuration)
- [ ] **Examine internal server logs** (debug.log in project directory)
- [ ] **Test MCP connectivity** (`npx mcp-inspector` if available)
- [ ] **Validate configuration files** (JSON syntax, server definitions)

### Cline-Specific Checks
- [ ] **Check recent Cline logs** (last 24 hours in tasks directory)
- [ ] **Verify VS Code extension status** (enabled/disabled)
- [ ] **Check Cline MCP settings** (cline_mcp_settings.json)

### Claude Desktop-Specific Checks
- [ ] **Check Claude Desktop logs** (platform-specific locations)
- [ ] **Verify Claude Desktop configuration** (claude_desktop_config.json)
- [ ] **Check developer settings** (developer_settings.json)
- [ ] **Restart Claude Desktop application** (if connection issues persist)

## 📂 Log Locations and Structure

### 1. External Application Logs

#### A. Cline (VS Code Extension) Logs

#### Primary Log Directory
```
/Users/[username]/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/
```

#### Directory Structure
```
globalStorage/saoudrizwan.claude-dev/
├── tasks/                    # Primary conversation logs (timestamped)
│   ├── 2025-01-07_16-30-45_task_abc123/
│   │   ├── api_conversation_history.json    # Complete API calls & responses
│   │   ├── ui_messages.json                 # User interface interactions
│   │   ├── context_history.json             # Context and state information
│   │   └── task_metadata.json               # Task creation metadata
│   └── [more timestamped directories...]
├── settings/                 # Configuration files
│   ├── cline_mcp_settings.json
│   └── other_settings.json
├── cache/                   # Cached data
├── checkpoints/             # Checkpoint data
├── puppeteer/              # Browser automation data
└── logs/                   # General application logs
```

#### B. Claude Desktop Application Logs

##### Log Directory by Platform

**macOS:**
```
~/Library/Logs/Claude/
~/Library/Application Support/Claude/logs/
```

**Windows:**
```
%USERPROFILE%\AppData\Roaming\Claude\logs\
%USERPROFILE%\AppData\Local\Claude\logs\
```

**Linux:**
```
~/.config/Claude/logs/
~/.local/share/Claude/logs/
```

##### Claude Desktop Log Structure
```
Claude/logs/
├── main.log                    # Main application logs
├── renderer.log                # UI process logs
├── mcp/                       # MCP-specific logs
│   ├── connections.log         # MCP connection logs
│   ├── servers.log            # MCP server communication
│   └── errors.log             # MCP error logs
├── network.log                # Network activity logs
├── performance.log            # Performance metrics
└── crash-reports/             # Crash dumps and reports
```

##### Configuration Files

**Claude Desktop Configuration:**
```
# macOS
~/Library/Application Support/Claude/claude_desktop_config.json

# Windows
%USERPROFILE%\AppData\Roaming\Claude\claude_desktop_config.json

# Linux
~/.config/Claude/claude_desktop_config.json
```

**Developer Settings:**
```
# macOS
~/Library/Application Support/Claude/developer_settings.json

# Windows
%USERPROFILE%\AppData\Roaming\Claude\developer_settings.json

# Linux
~/.config/Claude/developer_settings.json
```

##### Example Configuration
```json
{
  "mcpServers": {
    "youtube": {
      "command": "node",
      "args": ["youtube-mcp-server/dist/index.js"],
      "env": {
        "YOUTUBE_API_KEY": "your-api-key"
      }
    }
  },
  "logging": {
    "level": "debug",
    "enableMcpLogging": true,
    "logRetentionDays": 7
  }
}
```

### 2. Internal MCP Server Logs

#### Debug Log Configuration
The YouTube MCP server uses an `EnhancedDebugLogger` utility for comprehensive internal logging:

**Default Log Locations** (in order of preference):
1. **Custom Directory**: `$DEBUG_LOG_DIR/debug.log` (if `DEBUG_LOG_DIR` env var set)
2. **Current Working Directory**: `./debug.log` (if writable)
3. **System Temp Directory**: `/tmp/youtube-mcp-debug.log` (macOS/Linux)
4. **User Home Directory**: `~/.youtube-mcp-debug.log` (fallback)

#### Environment Variables
```bash
# Enable/disable file logging (default: enabled)
DEBUG_FILE_LOGGING=true

# Custom log directory
DEBUG_LOG_DIR=/path/to/custom/logs

# Console output control
DEBUG_CONSOLE=true
NODE_ENV=development
```

#### Log Format
The debug logger outputs JSON-formatted entries with this structure:
```json
{
  "timestamp": "2025-01-07T16:31:02.123Z",
  "level": "INFO|DEBUG|WARN|ERROR",
  "operation": "START|API_CALL|ERROR|SUCCESS|END|MCP_REQUEST|MCP_RESPONSE",
  "tool": "search_videos|youtube_client|SYSTEM",
  "message": "Human-readable message",
  "data": { /* Additional context data */ },
  "metadata": {
    "executionId": "exec_1704649862123_abc123def",
    "requestTime": 1704649862123,
    "duration": 1250,
    "quotaUsed": 1,
    "errorCode": "API_ERROR"
  }
}
```

## 🔍 Debugging Commands and Techniques

### A. Cline (VS Code Extension) Log Analysis

#### Finding Recent MCP Errors
```bash
# Navigate to Cline logs directory
cd "/Users/$(whoami)/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev"

# Find most recent task directories
ls -la tasks/ | head -10

# Search for MCP-related errors in recent tasks
find tasks/ -name "*.json" -mtime -1 -exec grep -l "mcp\|server_name\|tool_name" {} \;

# Search for specific error patterns
grep -r "connection refused\|timeout\|server not found" tasks/

# Search for specific MCP server errors
grep -r "youtube.*error\|supabase.*error\|cloudflare.*error" tasks/
```

#### Analyzing Specific Task Logs
```bash
# Navigate to a specific task directory
cd "tasks/[timestamp_directory]"

# Pretty print API conversation history
cat api_conversation_history.json | jq '.'

# Search for MCP tool calls
cat api_conversation_history.json | jq '.[] | select(.content[]?.tool_calls? != null)'

# Find failed tool calls
cat api_conversation_history.json | jq '.[] | select(.content[]?.tool_calls[]?.error? != null)'

# Search for specific server errors
cat api_conversation_history.json | jq '.[] | select(.content | tostring | contains("youtube"))'
```

### B. Claude Desktop Log Analysis

#### Finding Claude Desktop Logs
```bash
# macOS
cd ~/Library/Logs/Claude/
ls -la

# Alternative macOS location
cd "~/Library/Application Support/Claude/logs/"
ls -la

# Windows (PowerShell)
cd "$env:USERPROFILE\AppData\Roaming\Claude\logs"
dir

# Linux
cd ~/.config/Claude/logs/
ls -la
```

#### Analyzing Claude Desktop MCP Logs
```bash
# Check MCP connection logs
cat mcp/connections.log | tail -50

# Search for MCP server errors
grep -i "error\|failed\|timeout" mcp/servers.log

# Find specific server issues
grep -i "youtube" mcp/servers.log mcp/errors.log

# Check recent MCP activity
tail -100 mcp/servers.log | grep -E "youtube|supabase|cloudflare"

# View main application errors
cat main.log | grep -i "mcp\|server\|connection"
```

#### Real-time Claude Desktop Log Monitoring
```bash
# Monitor MCP connections in real-time
tail -f mcp/connections.log

# Watch for server errors
tail -f mcp/errors.log

# Monitor all MCP activity
tail -f mcp/servers.log | grep -i "youtube"

# Watch main application log
tail -f main.log | grep -i "mcp"
```

#### Chrome DevTools Integration

Claude Desktop supports Chrome DevTools for advanced debugging:

1. **Enable Developer Mode:**
   ```json
   // developer_settings.json
   {
     "enableDevTools": true,
     "debugMode": true,
     "mcpDebugLevel": "verbose"
   }
   ```

2. **Open DevTools:**
   - Press `Cmd+Option+I` (macOS) or `Ctrl+Shift+I` (Windows/Linux)
   - Or go to Claude Desktop menu → View → Developer → Developer Tools

3. **Debug MCP in DevTools:**
   ```javascript
   // Console commands for MCP debugging
   
   // List active MCP servers
   window.electronAPI.getMcpServers()
   
   // Check MCP server status
   window.electronAPI.getMcpServerStatus('youtube')
   
   // View MCP logs
   window.electronAPI.getMcpLogs('youtube', 100)
   
   // Test MCP connection
   window.electronAPI.testMcpConnection('youtube')
   ```

### C. Internal MCP Server Log Analysis

#### Locating Debug Logs
```bash
# Check if debug log exists in current directory
ls -la debug.log

# Search for debug logs in common locations
find . -name "*debug*.log" -o -name "*youtube*debug*.log"
find /tmp -name "*youtube*debug*.log" 2>/dev/null
find ~ -name "*youtube*debug*.log" 2>/dev/null

# Check environment variable
echo $DEBUG_LOG_DIR
```

#### Analyzing Debug Logs
```bash
# View recent log entries
tail -100 debug.log | jq '.'

# Filter by log level
cat debug.log | jq 'select(.level == "ERROR")'

# Filter by operation type
cat debug.log | jq 'select(.operation == "API_CALL")'

# Filter by tool
cat debug.log | jq 'select(.tool == "search_videos")'

# Find execution traces
cat debug.log | jq 'select(.metadata.executionId == "exec_1704649862123_abc123def")'

# View quota usage
cat debug.log | jq 'select(.operation == "QUOTA") | .data'

# Performance analysis
cat debug.log | jq 'select(.operation == "PERFORMANCE") | .data'
```

#### Real-time Log Monitoring
```bash
# Follow logs in real-time
tail -f debug.log | jq '.'

# Monitor specific operations
tail -f debug.log | jq 'select(.operation == "ERROR" or .operation == "API_CALL")'

# Watch for specific tools
tail -f debug.log | jq 'select(.tool == "search_videos")'
```

### D. System-Level MCP Debugging
```bash
# Check if MCP servers are running
ps aux | grep -E "(youtube|supabase|cloudflare)" | grep -v grep

# Check ports in use
lsof -i :3000  # Common MCP server port
netstat -an | grep LISTEN | grep 3000

# Test MCP server connectivity (if available)
npx mcp-inspector
npx mcp-logs

# Claude Desktop specific process checks
# macOS
ps aux | grep -i "claude" | grep -v grep

# Windows (PowerShell)
Get-Process | Where-Object {$_.ProcessName -like "*Claude*"}

# Linux
ps aux | grep -i "claude" | grep -v grep
```

### E. Configuration Validation

#### Validating Claude Desktop Configuration
```bash
# Check configuration file syntax
# macOS
cat "~/Library/Application Support/Claude/claude_desktop_config.json" | jq '.'

# Windows (PowerShell)
Get-Content "$env:USERPROFILE\AppData\Roaming\Claude\claude_desktop_config.json" | jq .

# Linux
cat ~/.config/Claude/claude_desktop_config.json | jq '.'

# Validate MCP server definitions
cat claude_desktop_config.json | jq '.mcpServers'

# Check for common configuration issues
cat claude_desktop_config.json | jq '.mcpServers | to_entries[] | select(.value.command == null or .value.args == null)'
```

#### Testing MCP Server Configuration
```bash
# Test server command manually
node youtube-mcp-server/dist/index.js --test

# Check environment variables
echo $YOUTUBE_API_KEY

# Validate server binary exists
which node
ls -la youtube-mcp-server/dist/index.js
```

## 🚨 Common Error Patterns and Solutions

### 1. Connection Errors

#### A. Cline (VS Code Extension) Logs
```json
{
  "error": "Failed to connect to MCP server",
  "details": {
    "server_name": "youtube",
    "error_type": "connection_refused",
    "port": 3000
  }
}
```

#### B. Claude Desktop Logs
```json
{
  "timestamp": "2025-01-07T16:31:02.123Z",
  "level": "error",
  "component": "mcp-client",
  "message": "Failed to connect to MCP server 'youtube'",
  "error": {
    "code": "ECONNREFUSED",
    "message": "Connection refused",
    "server": "youtube",
    "command": "node youtube-mcp-server/dist/index.js",
    "pid": null
  }
}
```

#### C. Internal Server Logs
```json
{
  "timestamp": "2025-01-07T16:31:02.123Z",
  "level": "ERROR",
  "operation": "ERROR",
  "tool": "SYSTEM",
  "message": "Failed to initialize log file",
  "data": {
    "error": "EACCES: permission denied",
    "path": "/readonly/debug.log"
  }
}
```

**Solution Steps:**
1. Check if server process is running
2. Verify port availability
3. Check file permissions for log directories
4. Validate environment variables

### 2. API Authentication Errors

#### A. Cline (VS Code Extension) Logs
```json
{
  "error": "Authentication failed",
  "server": "youtube",
  "message": "Invalid API key or quota exceeded"
}
```

#### B. Claude Desktop Logs
```json
{
  "timestamp": "2025-01-07T16:31:02.123Z",
  "level": "error",
  "component": "mcp-server",
  "server": "youtube",
  "message": "YouTube API authentication failed",
  "error": {
    "code": "AUTHENTICATION_ERROR",
    "details": "API key invalid or quota exceeded",
    "httpStatus": 403,
    "quotaExceeded": true
  }
}
```

#### C. Internal Server Logs
```json
{
  "timestamp": "2025-01-07T16:31:02.123Z",
  "level": "ERROR",
  "operation": "API_CALL",
  "tool": "youtube_client",
  "message": "YouTube API Error: The request cannot be completed because you have exceeded your quota",
  "data": {
    "endpoint": "/search",
    "params": {"q": "test", "maxResults": 25}
  },
  "metadata": {
    "quotaUsed": 100,
    "errorCode": "quotaExceeded"
  }
}
```

**Solution Steps:**
1. Verify API key validity
2. Check quota usage and limits
3. Validate API key permissions
4. Monitor quota reset times

### 3. Tool Execution Errors

#### A. Cline (VS Code Extension) Logs
```json
{
  "tool_call": {
    "server_name": "youtube",
    "tool_name": "search_videos",
    "arguments": {
      "query": "",
      "maxResults": 100
    },
    "error": {
      "code": "invalid_argument",
      "message": "Query parameter cannot be empty"
    }
  }
}
```

#### B. Claude Desktop Logs
```json
{
  "timestamp": "2025-01-07T16:31:02.123Z",
  "level": "error",
  "component": "mcp-tool",
  "server": "youtube",
  "tool": "search_videos",
  "message": "Tool execution failed",
  "error": {
    "code": "INVALID_PARAMETERS",
    "message": "Query parameter cannot be empty",
    "field": "query",
    "value": "",
    "expected": "non-empty string"
  },
  "request": {
    "query": "",
    "maxResults": 100
  }
}
```

#### C. Internal Server Logs
```json
{
  "timestamp": "2025-01-07T16:31:02.123Z",
  "level": "ERROR",
  "operation": "VALIDATION",
  "tool": "search_videos",
  "message": "Validation failed: query",
  "data": {
    "field": "query",
    "value": "",
    "valid": false,
    "error": "Query parameter cannot be empty"
  },
  "metadata": {
    "executionId": "exec_1704649862123_abc123def"
  }
}
```

**Solution Steps:**
1. Validate tool parameters
2. Check parameter types and ranges
3. Verify required fields are provided
4. Review tool documentation

### 4. Performance Issues

#### A. Claude Desktop Performance Logs
```json
{
  "timestamp": "2025-01-07T16:31:02.123Z",
  "level": "warn",
  "component": "mcp-performance",
  "server": "youtube",
  "message": "Slow MCP server response",
  "performance": {
    "tool": "search_videos",
    "executionTime": 8500,
    "threshold": 5000,
    "apiCalls": 2,
    "networkLatency": 1200,
    "processingTime": 7300
  }
}
```

#### B. Internal Server Performance Logs
```json
{
  "timestamp": "2025-01-07T16:31:02.123Z",
  "level": "INFO",
  "operation": "PERFORMANCE",
  "tool": "search_videos",
  "message": "Performance metrics",
  "data": {
    "executionId": "exec_1704649862123_abc123def",
    "duration": 5000,
    "apiCalls": 3,
    "quotaUsed": 3,
    "success": true
  }
}
```

**Analysis Commands:**
```bash
# Find slow operations
cat debug.log | jq 'select(.operation == "PERFORMANCE" and .data.duration > 3000)'

# Monitor quota usage trends
cat debug.log | jq 'select(.operation == "QUOTA") | .data.total'

# Track API call patterns
cat debug.log | jq 'select(.operation == "API_CALL") | .data.endpoint' | sort | uniq -c
```

## 📊 Advanced Debugging Workflows

### 1. Complete Error Investigation Workflow

#### A. Cline (VS Code Extension) Investigation

```bash
#!/bin/bash
# Complete MCP debugging workflow

echo "=== MCP Debugging Workflow ==="

# Step 1: Check recent external logs
echo "1. Checking recent Cline logs..."
cd "/Users/$(whoami)/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev"
find tasks/ -name "*.json" -mtime -1 -exec grep -l "error" {} \; | head -5

# Step 2: Check internal server logs
echo "2. Checking internal server logs..."
cd - > /dev/null
if [ -f debug.log ]; then
    echo "Found debug.log in current directory"
    tail -20 debug.log | jq 'select(.level == "ERROR")'
else
    echo "No debug.log found in current directory"
fi

# Step 3: Check system status
echo "3. Checking system status..."
ps aux | grep -E "(youtube|mcp)" | grep -v grep
lsof -i :3000

# Step 4: Test connectivity
echo "4. Testing API connectivity..."
curl -s "https://www.googleapis.com/youtube/v3/videos?part=snippet&chart=mostPopular&maxResults=1&key=${YOUTUBE_API_KEY}" | jq '.error // "OK"'

echo "=== Investigation Complete ==="
```

#### B. Claude Desktop Investigation

```bash
#!/bin/bash
# Claude Desktop MCP debugging workflow

echo "=== Claude Desktop MCP Debugging Workflow ==="

# Step 1: Check Claude Desktop logs
echo "1. Checking Claude Desktop logs..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    LOG_DIR="$HOME/Library/Logs/Claude"
elif [[ "$OSTYPE" == "msys" ]]; then
    LOG_DIR="$USERPROFILE/AppData/Roaming/Claude/logs"
else
    LOG_DIR="$HOME/.config/Claude/logs"
fi

if [ -d "$LOG_DIR" ]; then
    echo "Found Claude Desktop logs in: $LOG_DIR"
    tail -20 "$LOG_DIR/mcp/errors.log" 2>/dev/null || echo "No MCP error logs found"
else
    echo "No Claude Desktop logs found"
fi

# Step 2: Check configuration
echo "2. Checking Claude Desktop configuration..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    CONFIG_FILE="$HOME/Library/Application Support/Claude/claude_desktop_config.json"
elif [[ "$OSTYPE" == "msys" ]]; then
    CONFIG_FILE="$USERPROFILE/AppData/Roaming/Claude/claude_desktop_config.json"
else
    CONFIG_FILE="$HOME/.config/Claude/claude_desktop_config.json"
fi

if [ -f "$CONFIG_FILE" ]; then
    echo "Configuration file found: $CONFIG_FILE"
    cat "$CONFIG_FILE" | jq '.mcpServers' 2>/dev/null || echo "Invalid JSON configuration"
else
    echo "No configuration file found"
fi

# Step 3: Check internal server logs
echo "3. Checking internal server logs..."
if [ -f debug.log ]; then
    echo "Found debug.log in current directory"
    tail -20 debug.log | jq 'select(.level == "ERROR")'
else
    echo "No debug.log found in current directory"
fi

# Step 4: Test server process
echo "4. Testing server process..."
ps aux | grep -E "(youtube|mcp)" | grep -v grep

# Step 5: Test API connectivity
echo "5. Testing API connectivity..."
if [ -n "$YOUTUBE_API_KEY" ]; then
    curl -s "https://www.googleapis.com/youtube/v3/videos?part=snippet&chart=mostPopular&maxResults=1&key=${YOUTUBE_API_KEY}" | jq '.error // "OK"'
else
    echo "YOUTUBE_API_KEY not set"
fi

echo "=== Claude Desktop Investigation Complete ==="
```

### 2. Performance Analysis Workflow

```bash
#!/bin/bash
# Performance analysis for MCP server

echo "=== Performance Analysis ==="

# Analyze execution times
echo "1. Execution Time Analysis:"
cat debug.log | jq -r 'select(.operation == "PERFORMANCE") | "\(.data.duration)ms \(.tool)"' | sort -n

# Quota usage analysis
echo "2. Quota Usage Analysis:"
cat debug.log | jq -r 'select(.operation == "QUOTA") | "\(.timestamp) \(.data.total)"' | tail -10

# API call frequency
echo "3. API Call Frequency:"
cat debug.log | jq -r 'select(.operation == "API_CALL") | .data.endpoint' | sort | uniq -c | sort -nr

# Error rate analysis
echo "4. Error Rate Analysis:"
total_calls=$(cat debug.log | jq -r 'select(.operation == "API_CALL")' | wc -l)
error_calls=$(cat debug.log | jq -r 'select(.operation == "ERROR")' | wc -l)
echo "Total API calls: $total_calls"
echo "Error calls: $error_calls"
echo "Error rate: $(echo "scale=2; $error_calls * 100 / $total_calls" | bc)%"

echo "=== Analysis Complete ==="
```

### 3. Quota Monitoring Workflow

```bash
#!/bin/bash
# Monitor API quota usage

echo "=== Quota Monitoring ==="

# Current quota usage
echo "1. Current Quota Usage:"
cat debug.log | jq -r 'select(.operation == "QUOTA") | .data' | tail -1

# Quota usage over time
echo "2. Quota Usage Timeline:"
cat debug.log | jq -r 'select(.operation == "QUOTA") | "\(.timestamp) \(.data.total)"' | tail -20

# Quota usage by tool
echo "3. Quota Usage by Tool:"
cat debug.log | jq -r 'select(.metadata.quotaUsed) | "\(.tool) \(.metadata.quotaUsed)"' | awk '{sum[$1]+=$2} END {for (tool in sum) print tool, sum[tool]}' | sort -k2 -nr

# Quota reset tracking
echo "4. Quota Reset Information:"
cat debug.log | jq -r 'select(.message | contains("reset")) | "\(.timestamp) \(.message)"'

echo "=== Monitoring Complete ==="
```

## 📋 Troubleshooting Matrix

### Quick Reference for Both Clients

| Error Type | Cline Log Location | Claude Desktop Log | Internal Server Log | Common Causes | Solution |
|------------|-------------------|-------------------|-------------------|---------------|----------|
| Connection Refused | `api_conversation_history.json` → `"connection_refused"` | `mcp/errors.log` → `"ECONNREFUSED"` | `"operation": "ERROR"` + `"connection"` | Server not running, port blocked | Check process, verify port |
| Authentication Failed | `api_conversation_history.json` → `"authentication failed"` | `mcp/servers.log` → `"AUTHENTICATION_ERROR"` | `"operation": "ERROR"` + `"API_CALL"` | Invalid API key, quota exceeded | Verify key, check quota |
| Tool Parameter Error | `api_conversation_history.json` → `"invalid_argument"` | `mcp/servers.log` → `"INVALID_PARAMETERS"` | `"operation": "VALIDATION"` + `"valid": false` | Missing/invalid parameters | Validate tool inputs |
| Quota Exceeded | `api_conversation_history.json` → `"quota exceeded"` | `mcp/servers.log` → `"quotaExceeded"` | `"operation": "QUOTA"` + high usage | API limits reached | Monitor usage, optimize calls |
| Timeout | `api_conversation_history.json` → `"timeout"` | `mcp/errors.log` → `"TIMEOUT"` | `"operation": "ERROR"` + `"timeout"` | Network issues, slow API | Increase timeout, check network |
| File Permission | Not visible in external logs | `main.log` → `"permission denied"` | `"operation": "ERROR"` + `"EACCES"` | Read-only filesystem | Fix permissions, change log location |
| Performance Issues | Not typically logged | `performance.log` → slow response | `"operation": "PERFORMANCE"` + high duration | Heavy API usage, network latency | Optimize requests, cache results |

### Client-Specific Debugging Decision Matrix

| Scenario | Use Cline Debugging | Use Claude Desktop Debugging |
|----------|-------------------|-----------------------------|
| VS Code Extension Issues | ✓ Primary choice | ✗ Not applicable |
| Standalone App Issues | ✗ Not applicable | ✓ Primary choice |
| MCP Server Issues | ✓ Can use both | ✓ Can use both |
| Chrome DevTools needed | ✗ Not available | ✓ Available |
| Real-time log monitoring | ✓ Available | ✓ Available with better tooling |
| Configuration validation | ✓ Basic | ✓ Advanced with JSON validation |

## 🔧 Configuration and Environment Setup

### Environment Variables
```bash
# YouTube MCP Server Configuration (Universal)
export YOUTUBE_API_KEY="your-youtube-api-key"
export DEBUG_FILE_LOGGING=true
export DEBUG_LOG_DIR="/path/to/logs"
export DEBUG_CONSOLE=true
export NODE_ENV=development

# Cline MCP Configuration
export CLINE_MCP_SERVER_URL="http://localhost:3000"
export CLINE_MCP_TIMEOUT=30000

# Claude Desktop Configuration
export CLAUDE_DESKTOP_MCP_TIMEOUT=30000
export CLAUDE_DESKTOP_LOG_LEVEL=debug
```

### A. Cline Configuration

#### Cline MCP Settings
```json
// cline_mcp_settings.json
{
  "mcpServers": {
    "youtube": {
      "command": "node",
      "args": ["youtube-mcp-server/dist/index.js"],
      "env": {
        "YOUTUBE_API_KEY": "your-api-key"
      }
    }
  },
  "timeout": 30000,
  "retryAttempts": 3
}
```

### B. Claude Desktop Configuration

#### Primary Configuration File
```json
// claude_desktop_config.json
{
  "mcpServers": {
    "youtube": {
      "command": "node",
      "args": ["youtube-mcp-server/dist/index.js"],
      "env": {
        "YOUTUBE_API_KEY": "your-api-key",
        "DEBUG_FILE_LOGGING": "true",
        "DEBUG_CONSOLE": "true"
      }
    },
    "supabase": {
      "command": "npx",
      "args": ["-y", "@supabase/mcp-server"],
      "env": {
        "SUPABASE_URL": "your-supabase-url",
        "SUPABASE_ANON_KEY": "your-anon-key"
      }
    }
  },
  "logging": {
    "level": "debug",
    "enableMcpLogging": true,
    "enableNetworkLogging": true,
    "logRetentionDays": 7
  },
  "performance": {
    "timeoutMs": 30000,
    "maxConcurrentRequests": 10,
    "enableMetrics": true
  }
}
```

#### Developer Settings
```json
// developer_settings.json
{
  "enableDevTools": true,
  "debugMode": true,
  "mcpDebugLevel": "verbose",
  "enableConsoleLogging": true,
  "enablePerformanceMonitoring": true,
  "logNetworkRequests": true
}
```

### C. Configuration Validation Scripts

#### Validate Claude Desktop Configuration
```bash
#!/bin/bash
# Claude Desktop configuration validator

echo "=== Claude Desktop Configuration Validation ==="

# Determine config file location
if [[ "$OSTYPE" == "darwin"* ]]; then
    CONFIG_FILE="$HOME/Library/Application Support/Claude/claude_desktop_config.json"
elif [[ "$OSTYPE" == "msys" ]]; then
    CONFIG_FILE="$USERPROFILE/AppData/Roaming/Claude/claude_desktop_config.json"
else
    CONFIG_FILE="$HOME/.config/Claude/claude_desktop_config.json"
fi

echo "1. Checking configuration file: $CONFIG_FILE"
if [ -f "$CONFIG_FILE" ]; then
    echo "✓ Configuration file exists"
    
    # Validate JSON syntax
    if cat "$CONFIG_FILE" | jq '.' >/dev/null 2>&1; then
        echo "✓ Valid JSON syntax"
    else
        echo "✗ Invalid JSON syntax"
        exit 1
    fi
    
    # Check MCP servers
    servers=$(cat "$CONFIG_FILE" | jq -r '.mcpServers | keys[]' 2>/dev/null)
    if [ -n "$servers" ]; then
        echo "✓ MCP servers configured: $servers"
    else
        echo "✗ No MCP servers configured"
    fi
    
    # Validate each server
    for server in $servers; do
        echo "2. Validating server: $server"
        
        command=$(cat "$CONFIG_FILE" | jq -r ".mcpServers.${server}.command" 2>/dev/null)
        if [ "$command" != "null" ] && [ -n "$command" ]; then
            echo "  ✓ Command specified: $command"
        else
            echo "  ✗ No command specified"
        fi
        
        args=$(cat "$CONFIG_FILE" | jq -r ".mcpServers.${server}.args[]" 2>/dev/null)
        if [ -n "$args" ]; then
            echo "  ✓ Arguments specified"
        else
            echo "  ✗ No arguments specified"
        fi
    done
else
    echo "✗ Configuration file not found"
fi

echo "=== Validation Complete ==="
```

### D. Internal Server Logging Configuration
```javascript
// Custom logging configuration for MCP server
const debugLogger = new EnhancedDebugLogger();

// Check if file logging is enabled
console.log('File logging enabled:', debugLogger.isFileLoggingEnabled());
console.log('Log file path:', debugLogger.getLogFilePath());

// Retry file logging if needed
if (!debugLogger.isFileLoggingEnabled()) {
  debugLogger.retryFileLogging();
}

// Enable console output for debugging
debugLogger.enableConsoleOutput(true);
```

## 🎯 Best Practices

### 1. Preventive Monitoring
```bash
# Create monitoring script
cat > ~/bin/mcp-health-check.sh << 'EOF'
#!/bin/bash
LOGS_DIR="/Users/$(whoami)/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev"
echo "=== MCP Health Check ==="
echo "Recent errors in Cline logs:"
find "$LOGS_DIR/tasks" -name "*.json" -mtime -1 -exec grep -l "error" {} \; | wc -l

echo "Internal server log status:"
if [ -f debug.log ]; then
    errors=$(cat debug.log | jq -r 'select(.level == "ERROR")' | wc -l)
    echo "Error count: $errors"
else
    echo "No debug.log found"
fi

echo "System status:"
ps aux | grep -E "(youtube|mcp)" | grep -v grep | wc -l
echo "=== Health Check Complete ==="
EOF

chmod +x ~/bin/mcp-health-check.sh
```

### 2. Log Rotation and Cleanup
```bash
# Log rotation script
cat > ~/bin/mcp-log-rotate.sh << 'EOF'
#!/bin/bash
# Rotate debug logs when they exceed 10MB
if [ -f debug.log ] && [ $(stat -c%s debug.log) -gt 10485760 ]; then
    mv debug.log debug.log.$(date +%Y%m%d_%H%M%S)
    echo "Log rotated: debug.log"
fi

# Clean old Cline logs (older than 30 days)
LOGS_DIR="/Users/$(whoami)/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev"
find "$LOGS_DIR/tasks" -type d -mtime +30 -exec rm -rf {} \;
echo "Old Cline logs cleaned"
EOF

chmod +x ~/bin/mcp-log-rotate.sh
```

### 3. Error Alerting
```bash
# Error alerting script
cat > ~/bin/mcp-error-alert.sh << 'EOF'
#!/bin/bash
# Check for critical errors and alert
if [ -f debug.log ]; then
    critical_errors=$(cat debug.log | jq -r 'select(.level == "ERROR" and .timestamp > (now - 3600))' | wc -l)
    if [ $critical_errors -gt 5 ]; then
        echo "ALERT: $critical_errors critical errors in the last hour"
        # Add notification logic here (email, slack, etc.)
    fi
fi
EOF

chmod +x ~/bin/mcp-error-alert.sh
```

## 📚 Quick Reference Commands

### Essential One-Liners

#### For Cline Users
```bash
# Most recent Cline logs
cd "/Users/$(whoami)/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/tasks" && ls -la | head -5

# Find MCP errors in last 24 hours
find . -name "*.json" -mtime -1 -exec grep -l -i "mcp.*error" {} \;

# Check recent Cline API calls
cat api_conversation_history.json | jq '.[] | select(.content[]?.tool_calls? != null)' | tail -5
```

#### For Claude Desktop Users
```bash
# Check Claude Desktop MCP logs (macOS)
tail -20 ~/Library/Logs/Claude/mcp/errors.log

# Monitor Claude Desktop MCP activity
tail -f ~/Library/Logs/Claude/mcp/servers.log | grep -i "youtube"

# Validate Claude Desktop configuration
cat "~/Library/Application Support/Claude/claude_desktop_config.json" | jq '.mcpServers'

# Check Claude Desktop process
ps aux | grep -i "claude" | grep -v grep
```

#### Universal Commands
```bash
# Check internal server status
tail -10 debug.log | jq 'select(.level == "ERROR")'

# Monitor quota usage
cat debug.log | jq -r 'select(.operation == "QUOTA") | .data.total' | tail -1

# Check API connectivity
curl -s "https://www.googleapis.com/youtube/v3/videos?part=snippet&chart=mostPopular&maxResults=1&key=${YOUTUBE_API_KEY}" | jq '.error // "Connected"'

# Check MCP server processes
ps aux | grep -E "(youtube|mcp)" | grep -v grep
```

### Emergency Debug Commands

#### Cline Emergency Debug
```bash
# Emergency debugging - run all checks
echo "=== CLINE EMERGENCY DEBUG ==="
ps aux | grep mcp | grep -v grep
lsof -i :3000
tail -20 debug.log | jq 'select(.level == "ERROR")'
find "/Users/$(whoami)/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/tasks" -name "*.json" -mtime -1 -exec grep -l "error" {} \; | head -3
echo "=== DEBUG COMPLETE ==="
```

#### Claude Desktop Emergency Debug
```bash
# Claude Desktop emergency debugging
echo "=== CLAUDE DESKTOP EMERGENCY DEBUG ==="
ps aux | grep -i "claude" | grep -v grep
lsof -i :3000
if [[ "$OSTYPE" == "darwin"* ]]; then
    tail -20 ~/Library/Logs/Claude/mcp/errors.log
    cat "~/Library/Application Support/Claude/claude_desktop_config.json" | jq '.mcpServers'
fi
tail -20 debug.log | jq 'select(.level == "ERROR")' 2>/dev/null || echo "No internal logs found"
echo "=== DEBUG COMPLETE ==="
```

## 🔍 Common Issues and Solutions

### Issue: "Debug log not found"
**Solution:**
```bash
# Check environment variables
echo $DEBUG_LOG_DIR
echo $DEBUG_FILE_LOGGING

# Find existing logs
find . -name "*debug*.log" -o -name "*youtube*.log"
find /tmp -name "*youtube*debug*.log" 2>/dev/null

# Test write permissions
touch test.log && rm test.log && echo "Write permissions OK"
```

### Issue: "High quota usage"
**Solution:**
```bash
# Analyze quota usage patterns
cat debug.log | jq -r 'select(.operation == "API_CALL") | .data.endpoint' | sort | uniq -c | sort -nr

# Find expensive operations
cat debug.log | jq 'select(.metadata.quotaUsed > 1) | {tool, endpoint: .data.endpoint, quota: .metadata.quotaUsed}'

# Monitor quota reset
cat debug.log | jq -r 'select(.message | contains("reset"))'
```

### Issue: "Slow response times"
**Solution:**
```bash
# Analyze performance metrics
cat debug.log | jq 'select(.operation == "PERFORMANCE" and .data.duration > 2000) | {tool, duration: .data.duration, apiCalls: .data.apiCalls}'

# Check for timeout patterns
cat debug.log | jq 'select(.message | contains("timeout"))'
```

---

**Last Updated**: January 2025  
**Version**: 2.0 (Enhanced)  
**Maintainer**: YouTube MCP Development Team

**Key Enhancements in v2.0:**
- Added comprehensive internal server logging documentation
- Included EnhancedDebugLogger utility coverage
- Added advanced debugging workflows and automation scripts
- Provided troubleshooting matrix for quick problem resolution
- Enhanced with performance monitoring and quota tracking
- Added preventive monitoring and alerting capabilities
- **NEW:** Complete Claude Desktop MCP debugging support
- **NEW:** Cross-platform log locations and configuration
- **NEW:** Chrome DevTools integration for Claude Desktop
- **NEW:** Client-specific debugging decision matrix