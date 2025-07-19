/**
 * Example integration of automated debugging into the main MCP server
 * 
 * This file demonstrates how to integrate the comprehensive debug monitoring
 * system into your existing MCP server to achieve the iterative debugging
 * workflow you requested.
 */

import { debugHooks } from '../core/debug-integration.js';
import { debugLogger } from '../../src/utils/debug-logger.js';

/**
 * Enhanced MCP Server with integrated automated debugging
 * 
 * This example shows how to modify your existing server to include:
 * 1. Automatic monitoring startup
 * 2. Post-build debugging
 * 3. Post-tool-call debugging
 * 4. Error-triggered debugging
 */

export class EnhancedMCPServer {
  
  constructor() {
    // Initialize your existing server here
    // this.server = new MCPServer(...);
  }
  
  /**
   * Enhanced server startup with debug integration
   */
  async start(): Promise<void> {
    try {
      // 1. Initialize debug monitoring FIRST
      console.log('🔧 Initializing comprehensive debug monitoring...');
      await debugHooks.initialize({
        autoStartMonitoring: true,
        debugAfterBuild: true,
        debugAfterToolCall: true,
        debugAfterError: true,
        monitoringConfig: {
          enableContinuousMonitoring: true,
          monitoringInterval: 30, // Check every 30 seconds
          errorCorrelationWindow: 5, // Correlate errors within 5 seconds
          inspectorEnabled: true,
          autoExecuteDebugGuide: true,
          maxDebugSessions: 10
        }
      });
      
      // 2. Start your existing MCP server
      console.log('🚀 Starting MCP server...');
      // await this.server.start();
      
      // 3. Run initial health check
      console.log('🩺 Running initial health check...');
      const initialReport = await debugHooks.manual();
      
      if (initialReport.recommendations.length > 0) {
        console.log('⚠️  Initial health check found issues:');
        initialReport.recommendations.forEach((rec, i) => {
          console.log(`   ${i + 1}. ${rec}`);
        });
      } else {
        console.log('✅ Server started successfully with no issues detected');
      }
      
      console.log('🎯 Automated debugging is now active!');
      
    } catch (error) {
      console.error('❌ Failed to start server with debug integration:', error);
      await debugHooks.cleanup();
      throw error;
    }
  }
  
  /**
   * Enhanced server shutdown with debug cleanup
   */
  async stop(): Promise<void> {
    try {
      console.log('🛑 Stopping server and debug monitoring...');
      
      // 1. Stop your existing server
      // await this.server.stop();
      
      // 2. Cleanup debug monitoring
      await debugHooks.cleanup();
      
      console.log('✅ Server stopped cleanly');
      
    } catch (error) {
      console.error('❌ Error during server shutdown:', error);
    }
  }
  
  /**
   * Enhanced tool execution with integrated debugging
   */
  async executeTool(toolName: string, params: any): Promise<any> {
    const startTime = Date.now();
    let success = false;
    let result: any;
    
    try {
      debugLogger.info('TOOL_EXECUTION', `Executing tool: ${toolName}`, { params });
      
      // Execute your existing tool logic here
      // result = await this.server.executeTool(toolName, params);
      
      success = true;
      debugLogger.info('TOOL_EXECUTION', `Tool executed successfully: ${toolName}`, { 
        executionTime: Date.now() - startTime 
      });
      
      return result;
      
    } catch (error) {
      success = false;
      debugLogger.error('TOOL_EXECUTION', error, { toolName, params });
      
      // Trigger immediate error debugging
      const errorMessage = error instanceof Error ? error.message : String(error);
      await debugHooks.afterError(
        `Tool execution failed: ${toolName} - ${errorMessage}`,
        'tool'
      );
      
      throw error;
      
    } finally {
      // Trigger post-tool-call debugging
      const executionTime = Date.now() - startTime;
      await debugHooks.afterToolCall(toolName, success, executionTime);
    }
  }
}

/**
 * Build integration script
 * Run this after every build to trigger debugging
 */
export async function runPostBuildDebugging(): Promise<void> {
  console.log('🔨 Post-build debugging initiated...');
  
  try {
    // Ensure debug integration is initialized
    await debugHooks.initialize();
    
    // Trigger post-build debugging
    const report = await debugHooks.afterBuild();
    
    if (report) {
      console.log(`\n📋 Build Debugging Report:`);
      console.log(`   Session: ${report.debugSessionId}`);
      console.log(`   Error Type: ${report.errorType}`);
      console.log(`   Recommendations: ${report.recommendations.length}`);
      
      if (report.recommendations.length > 0) {
        console.log('\n🎯 Recommendations:');
        report.recommendations.forEach((rec, i) => {
          console.log(`   ${i + 1}. ${rec}`);
        });
      }
      
      // Check system status
      const systemChecks = report.systemChecks;
      console.log(`\n🔍 System Status:`);
      console.log(`   Process: ${systemChecks.processStatus}`);
      console.log(`   Port: ${systemChecks.portAvailability}`);
      console.log(`   API: ${systemChecks.apiConnectivity}`);
      console.log(`   Logs: ${systemChecks.logFileStatus}`);
      
      if (report.inspectorResults) {
        console.log(`\n🔬 Inspector Results:`);
        console.log(`   Connection: ${report.inspectorResults.connectionTest}`);
        console.log(`   Protocol: ${report.inspectorResults.protocolValidation}`);
        console.log(`   Tools: ${report.inspectorResults.toolValidation}`);
      }
    } else {
      console.log('✅ No issues detected during build');
    }
    
  } catch (error) {
    console.error('❌ Post-build debugging failed:', error);
  }
}

/**
 * Manual debugging command
 * Use this for on-demand debugging
 */
export async function runManualDebugging(): Promise<void> {
  console.log('🔍 Manual debugging session initiated...');
  
  try {
    await debugHooks.initialize();
    const report = await debugHooks.manual();
    
    console.log(`\n📋 Manual Debugging Report:`);
    console.log(`   Session: ${report.debugSessionId}`);
    console.log(`   Execution Time: ${report.totalExecutionTime}ms`);
    console.log(`   Correlated Errors: ${report.correlatedErrors.length}`);
    console.log(`   Recommendations: ${report.recommendations.length}`);
    
    if (report.recommendations.length > 0) {
      console.log('\n🎯 Current Recommendations:');
      report.recommendations.forEach((rec, i) => {
        console.log(`   ${i + 1}. ${rec}`);
      });
    }
    
    // Show debug guide execution results
    const guide = report.debugGuideExecution;
    console.log(`\n🛠️ Debug Guide Execution:`);
    console.log(`   Commands Executed: ${guide.commandsExecuted}`);
    console.log(`   Success Rate: ${guide.commandsExecuted > 0 ? (guide.successfulCommands / guide.commandsExecuted * 100).toFixed(1) + '%' : '0%'}`);
    console.log(`   Workflows Completed: ${guide.completedWorkflows.join(', ')}`);
    
  } catch (error) {
    console.error('❌ Manual debugging failed:', error);
  }
}

// Example CLI commands for integration
// Check if this file is being run directly by looking for command line args
if (process.argv.length > 2 && process.argv[1].includes('server-integration')) {
  const command = process.argv[2];
  
  switch (command) {
    case 'post-build':
      runPostBuildDebugging().then(() => process.exit(0));
      break;
    case 'manual-debug':
      runManualDebugging().then(() => process.exit(0));
      break;
    case 'start-server':
      const server = new EnhancedMCPServer();
      server.start().catch(console.error);
      break;
    default:
      console.log('Usage:');
      console.log('  npm run debug:post-build   - Run debugging after build');
      console.log('  npm run debug:manual       - Run manual debugging session');
      console.log('  npm run debug:start        - Start server with debug integration');
  }
}
