/**
 * MCP Server Automated Debugging System
 * 
 * A comprehensive, consolidated debugging solution for MCP servers
 * providing systematic error detection, correlation, and automated troubleshooting.
 * 
 * ## Key Features:
 * - Continuous error monitoring (server & Cline logs)
 * - Post-build automated debugging
 * - Post-tool-call debugging
 * - MCP Inspector integration
 * - Automated debug guide execution
 * - Real-time recommendations
 * 
 * ## Usage:
 * ```typescript
 * import { debugHooks } from './debug/index.js';
 * 
 * // Initialize in your server
 * await debugHooks.initialize();
 * 
 * // Add to tool execution
 * await debugHooks.afterToolCall(toolName, success, executionTime);
 * 
 * // Add to build process
 * await debugHooks.afterBuild();
 * ```
 */

// Core debugging functionality
export { 
  ComprehensiveMCPDebugMonitor, 
  comprehensiveDebugMonitor,
  DebugReport,
  CorrelatedError,
  InspectorResults,
  SystemCheckResults,
  DebugGuideExecutionResults,
  MonitoringConfig
} from './core/comprehensive-debug-monitor.js';

export {
  MCPDebugIntegration,
  debugIntegration,
  debugHooks,
  DebugIntegrationConfig
} from './core/debug-integration.js';

// Integration examples
export {
  EnhancedMCPServer,
  runPostBuildDebugging,
  runManualDebugging
} from './integration/server-integration.js';

// Import the instances for default export
import { debugHooks, debugIntegration } from './core/debug-integration.js';
import { comprehensiveDebugMonitor } from './core/comprehensive-debug-monitor.js';

// Default export for easy use
export default {
  // Quick access to most commonly used functions
  initialize: debugHooks.initialize,
  afterBuild: debugHooks.afterBuild,
  afterToolCall: debugHooks.afterToolCall,
  afterError: debugHooks.afterError,
  manual: debugHooks.manual,
  cleanup: debugHooks.cleanup,
  
  // Access to core components
  monitor: comprehensiveDebugMonitor,
  integration: debugIntegration,
  hooks: debugHooks
};
