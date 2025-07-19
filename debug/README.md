# MCP Server Automated Debugging System

A comprehensive, consolidated debugging solution for MCP servers providing systematic error detection, correlation, and automated troubleshooting.

## 🎯 Problem Solved

This system addresses the fundamental issue of **systematic debugging for MCP servers** by providing:

✅ **Robust systematic debugging** after every build, tool call, and error
✅ **Dual log monitoring** - both server logs and Cline MCP logs  
✅ **Automatic MCP refresh integration** - works with Cline's 5-10 second refresh cycle
✅ **Tightly defined debugging flow** - structured, repeatable debugging sessions
✅ **Error correlation** - links related errors within time windows
✅ **Actionable recommendations** - specific next steps for each error type

## 🚀 Quick Start

### 1. Integration (2 minutes)

```typescript
// In your main server file
import { debugHooks } from './debug/index.js';

class YourMCPServer {
  async start() {
    // Add at the beginning of your start method
    await debugHooks.initialize({
      autoStartMonitoring: true,
      debugAfterBuild: true,
      debugAfterToolCall: true,
      debugAfterError: true
    });
    
    // Your existing server code...
    
    // Add initial health check
    const report = await debugHooks.manual();
    if (report.recommendations.length > 0) {
      console.log('⚠️ Initial issues detected:', report.recommendations);
    }
  }
  
  async executeTool(toolName: string, params: any) {
    let success = false;
    const startTime = Date.now();
    
    try {
      const result = await this.actuallyExecuteTool(toolName, params);
      success = true;
      return result;
    } catch (error) {
      await debugHooks.afterError(`Tool ${toolName} failed: ${error.message}`, 'tool');
      throw error;
    } finally {
      await debugHooks.afterToolCall(toolName, success, Date.now() - startTime);
    }
  }
}
```

### 2. Update package.json

```json
{
  "scripts": {
    "build": "tsc && npm run debug:post-build",
    "debug:post-build": "node dist/debug/integration/server-integration.js post-build",
    "debug:manual": "node dist/debug/integration/server-integration.js manual-debug"
  }
}
```

### 3. Test the System

```bash
# Build with automatic debugging
npm run build

# Run manual debugging session
npm run debug:manual
```

## 🔍 Systematic Debugging Flow

### After Every Build
1. ✅ Code compiles successfully
2. 🔍 **Automatic post-build debugging triggered**
3. 📊 Scans server logs for recent errors
4. 📋 Scans Cline logs for tool call errors
5. 🔬 Runs MCP Inspector protocol validation
6. 🛠️ Executes automated troubleshooting workflows
7. 📝 Generates specific, actionable recommendations

### After Every Tool Call
1. ✅ Tool executes (success or failure)
2. 🔍 **Automatic post-tool-call debugging triggered**
3. 📊 If failed, scans for correlated errors in both log sources
4. 🛠️ Executes error-specific troubleshooting workflows
5. 📝 Logs recommendations for immediate action

### Continuous Background Monitoring
1. 🔍 **Scans every 30 seconds** for new errors
2. 📊 Monitors both server logs and Cline MCP logs
3. 🔗 Correlates errors within 5-second time windows
4. 🚨 Triggers automated debugging for new error patterns
5. 📈 Maintains debugging session history and statistics

## 📋 Example Debug Report

```
🚨 [AUTO-DEBUG] Automated Debugging Report
📍 Session: debug_session_1704848400000_abc123xyz
🔍 Error Type: connection_error
📊 Correlated Errors: 3 (across server + Cline logs)
⏱️ Execution Time: 2.5s
🎯 Recommendations: 5

📋 Specific Recommendations:
   1. Check if MCP server process is running on expected port
   2. Verify port 3000 is not blocked by firewall
   3. Restart MCP server if process has stopped
   4. Check server startup logs for initialization errors
   5. Verify network connectivity and DNS resolution

🔍 System Status Checks:
   ✅ Process Status: Running (PID 12345)
   ❌ Port Availability: Port 3000 in use by different process
   ⚠️  API Connectivity: Connection timeout after 5s
   ✅ Log Files: Server logs accessible, last entry 2s ago

🔬 MCP Inspector Results:
   ❌ Connection Test: Failed to connect to MCP server
   ⚠️  Protocol Validation: Cannot validate - server unreachable
   ❌ Tool Validation: 0/7 tools accessible

✅ Full diagnosis and correlation analysis logged to debug.log
```

## 📁 Directory Structure

```
debug/
├── README.md                    # This overview (you are here)
├── index.ts                     # Main entry point - import from here
├── core/                        # Core debugging engine
│   ├── comprehensive-debug-monitor.ts  # 1000+ line monitoring engine
│   └── debug-integration.ts     # Integration hooks and orchestration
├── integration/                 # Integration helpers and examples
│   └── server-integration.ts    # Server integration examples + CLI
├── docs/                        # Complete documentation
│   └── SETUP_GUIDE.md          # Detailed setup instructions
└── examples/                    # Configuration examples
    └── package-scripts.json    # npm scripts for integration
```

## 🛠️ Features

### Comprehensive Log Monitoring
- **Server Logs**: Monitors your MCP server's log files for runtime errors
- **Cline MCP Logs**: Monitors Cline's MCP debugging logs for tool call errors
- **Error Correlation**: Links related errors occurring within configurable time windows
- **Pattern Recognition**: Identifies recurring error patterns and root causes

### Automated Troubleshooting
- **Error-Specific Workflows**: Different debugging procedures for different error types
- **MCP Inspector Integration**: Automated protocol validation and tool testing
- **System Health Checks**: Process status, port availability, API connectivity
- **Debug Guide Execution**: Runs specific troubleshooting commands based on error context

### Intelligent Recommendations
- **Actionable Steps**: Specific commands and actions to resolve detected issues
- **Priority Ordering**: Recommendations ordered by likelihood to resolve the issue
- **Context-Aware**: Recommendations tailored to the specific error type and system state
- **Historical Learning**: Tracks which recommendations have been effective

### Integration-Friendly
- **Non-Intrusive**: Fails gracefully, won't break your existing server
- **Configurable**: Enable/disable specific debugging features as needed
- **Performance-Optimized**: Minimal impact on server performance
- **TypeScript Support**: Full type safety and IDE intellisense

## 🔧 Configuration Options

```typescript
await debugHooks.initialize({
  autoStartMonitoring: true,        // Start background monitoring
  debugAfterBuild: true,           // Debug after successful builds
  debugAfterToolCall: true,        // Debug after MCP tool calls
  debugAfterError: true,           // Debug when specific errors detected
  
  monitoringConfig: {
    enableContinuousMonitoring: true,
    monitoringInterval: 30,        // Check logs every 30 seconds
    errorCorrelationWindow: 5,     // Correlate errors within 5 seconds
    inspectorEnabled: true,        // Use MCP Inspector for validation
    autoExecuteDebugGuide: true,   // Run automated troubleshooting
    maxDebugSessions: 10          // Keep history of last 10 sessions
  }
});
```

## 📖 Documentation

- **[SETUP_GUIDE.md](docs/SETUP_GUIDE.md)** - Complete setup instructions with code examples
- **[package-scripts.json](examples/package-scripts.json)** - npm script examples for integration

## 🎯 Next Steps

1. **Read the Setup Guide**: See `docs/SETUP_GUIDE.md` for detailed integration instructions
2. **Update Your Server**: Add the debug hooks to your MCP server startup and tool execution
3. **Update package.json**: Add the debugging scripts from `examples/package-scripts.json`
4. **Test the System**: Run `npm run build` and `npm run debug:manual` to verify everything works
5. **Monitor Results**: Watch the automatic debugging reports after builds and tool calls

This system provides exactly what you requested: **a robust, systematic debugging workflow that automatically checks logs, correlates errors, and provides actionable recommendations after every build, tool call, and detected error.**

The debugging system works seamlessly with Cline's automatic MCP refresh cycle and provides the tightly defined debugging flow you needed for reliable MCP server development and troubleshooting.
