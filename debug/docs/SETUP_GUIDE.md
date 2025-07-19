# Automated Debugging System Setup Guide

This guide will help you integrate the comprehensive automated debugging system into your MCP server to achieve the systematic debugging workflow you requested.

## Overview

The automated debugging system provides:

1. **Continuous Error Monitoring** - Scans both server logs and Cline logs every 30 seconds
2. **Post-Build Debugging** - Automatically runs comprehensive checks after every build
3. **Post-Tool-Call Debugging** - Triggers debugging after each MCP tool execution
4. **Error-Triggered Debugging** - Immediately debugs when specific errors are detected
5. **MCP Inspector Integration** - Uses MCP Inspector for protocol validation
6. **Automated Debug Guide Execution** - Runs specific troubleshooting workflows based on error types

## Quick Setup

### 1. Update Your Main Server File

```typescript
// In your main server file (e.g., src/index.ts or src/mcp-server.ts)
import { debugHooks } from './debug/core/debug-integration.js';

class YourMCPServer {
  async start() {
    // Add this at the very beginning of your start method
    await debugHooks.initialize({
      autoStartMonitoring: true,
      debugAfterBuild: true,
      debugAfterToolCall: true,
      debugAfterError: true
    });
    
    // Your existing server startup code...
    
    // Add initial health check
    const report = await debugHooks.manual();
    if (report.recommendations.length > 0) {
      console.log('⚠️ Initial health check found issues:', report.recommendations);
    }
  }
  
  async stop() {
    // Add this to your cleanup
    await debugHooks.cleanup();
    // Your existing cleanup code...
  }
  
  async executeTool(toolName: string, params: any) {
    let success = false;
    const startTime = Date.now();
    
    try {
      // Your existing tool execution code...
      const result = await this.actuallyExecuteTool(toolName, params);
      success = true;
      return result;
    } catch (error) {
      // Trigger immediate error debugging
      await debugHooks.afterError(`Tool ${toolName} failed: ${error.message}`, 'tool');
      throw error;
    } finally {
      // Always trigger post-tool-call debugging
      await debugHooks.afterToolCall(toolName, success, Date.now() - startTime);
    }
  }
}
```

### 2. Update Your package.json Scripts

```json
{
  "scripts": {
    "build": "tsc && npm run debug:post-build",
    "debug:post-build": "node dist/debug/integration/server-integration.js post-build",
    "debug:manual": "node dist/debug/integration/server-integration.js manual-debug"
  }
}
```

### 3. Build and Test

```bash
# Build with automatic post-build debugging
npm run build

# Run manual debugging session
npm run debug:manual
```

## Debugging Workflow

The system implements this systematic debugging flow:

### After Every Build
1. ✅ Code compiled successfully
2. 🔍 **Post-build debugging triggered automatically**
3. 📊 Scans server logs for recent errors
4. 📋 Scans Cline logs for tool errors  
5. 🔬 Runs MCP Inspector validation
6. 🛠️ Executes debug guide workflows
7. 📝 Generates actionable recommendations

### After Every Tool Call  
1. ✅ Tool executed (success/failure)
2. 🔍 **Post-tool-call debugging triggered**
3. 📊 If failed, scans for correlated errors
4. 🛠️ Executes error-specific troubleshooting
5. 📝 Logs recommendations

### Continuous Monitoring (Every 30 seconds)
1. 🔍 **Automatic error scanning**
2. 📊 Checks both server and Cline logs
3. 🔗 Correlates errors within 5-second windows
4. 🚨 Triggers automated debugging for new errors
5. 📈 Tracks debugging session statistics

## Configuration Options

```typescript
await debugHooks.initialize({
  autoStartMonitoring: true,        // Start monitoring on init
  debugAfterBuild: true,           // Debug after builds
  debugAfterToolCall: true,        // Debug after tool calls  
  debugAfterError: true,           // Debug after specific errors
  monitoringConfig: {
    enableContinuousMonitoring: true,
    monitoringInterval: 30,        // Check every 30 seconds
    errorCorrelationWindow: 5,     // 5-second correlation window
    inspectorEnabled: true,        // Use MCP Inspector
    autoExecuteDebugGuide: true,   // Run debug workflows
    maxDebugSessions: 10          // Keep last 10 debug sessions
  }
});
```

## Debug Report Example

```
🚨 [AUTO-DEBUG] Automated Debugging Report
📍 Session: debug_session_1704848400000_abc123xyz
🔍 Error Type: connection_error
📊 Correlated Errors: 3
⏱️ Execution Time: 2.5s
🎯 Recommendations: 5

📋 Recommendations:
   1. Check if MCP server process is running
   2. Verify port 3000 is not blocked by firewall
   3. Restart MCP server if process is stopped
   4. Verify network connectivity and firewall settings
   5. Check server startup logs

✅ Full diagnosis logged to debug.log
```

The system is designed to be non-intrusive and fail gracefully, so your server will continue working even if debugging encounters issues.
