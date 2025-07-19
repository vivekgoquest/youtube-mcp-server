import { comprehensiveDebugMonitor, DebugReport, MonitoringConfig } from './comprehensive-debug-monitor.js';
import { debugLogger } from '../../src/utils/debug-logger.js';

/**
 * Debug Integration - Provides automated debugging hooks for the MCP server
 * 
 * This module provides:
 * 1. Automatic debugging after code changes/builds
 * 2. Monitoring integration with the main server
 * 3. Post-operation debugging triggers
 * 4. Integration with the server lifecycle
 */

export interface DebugIntegrationConfig {
  autoStartMonitoring: boolean;
  debugAfterBuild: boolean;
  debugAfterToolCall: boolean;
  debugAfterError: boolean;
  monitoringConfig?: Partial<MonitoringConfig>;
}

export class MCPDebugIntegration {
  private isInitialized: boolean = false;
  private config: DebugIntegrationConfig;
  private buildCount: number = 0;
  private toolCallCount: number = 0;
  
  constructor(config?: Partial<DebugIntegrationConfig>) {
    this.config = {
      autoStartMonitoring: true,
      debugAfterBuild: true,
      debugAfterToolCall: true,
      debugAfterError: true,
      ...config
    };
    
    debugLogger.info('DEBUG_INTEGRATION', 'Debug Integration initialized', {
      config: this.config
    });
  }
  
  /**
   * Initialize the debug integration system
   * Call this during server startup
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      debugLogger.warn('DEBUG_INTEGRATION', 'Debug integration already initialized');
      return;
    }
    
    try {
      // Validate configuration before initialization
      this.validateConfiguration();
      
      // Update comprehensive monitor configuration if provided
      if (this.config.monitoringConfig) {
        comprehensiveDebugMonitor.updateConfiguration(this.config.monitoringConfig);
      }
      
      // Start monitoring if configured with timeout protection
      if (this.config.autoStartMonitoring) {
        const monitoringPromise = comprehensiveDebugMonitor.startComprehensiveMonitoring();
        const timeoutPromise = this.createTimeoutPromise(10000); // 10 second timeout
        
        await Promise.race([monitoringPromise, timeoutPromise]);
        debugLogger.info('DEBUG_INTEGRATION', 'Automatic monitoring started');
      }
      
      // Set up process handlers
      this.setupProcessHandlers();
      
      this.isInitialized = true;
      
      debugLogger.info('DEBUG_INTEGRATION', 'Debug integration fully initialized', {
        monitoring: this.config.autoStartMonitoring,
        buildDebugging: this.config.debugAfterBuild,
        toolCallDebugging: this.config.debugAfterToolCall,
        errorDebugging: this.config.debugAfterError
      });
      
    } catch (error) {
      debugLogger.error('DEBUG_INTEGRATION', error, { operation: 'initialize' });
      // Don't re-throw to prevent server startup failures due to debug issues
      debugLogger.warn('DEBUG_INTEGRATION', 'Debug integration initialization failed, continuing without debugging');
    }
  }
  
  /**
   * Cleanup and stop all monitoring
   * Call this during server shutdown
   */
  public async cleanup(): Promise<void> {
    try {
      await comprehensiveDebugMonitor.stopMonitoring();
      this.isInitialized = false;
      
      debugLogger.info('DEBUG_INTEGRATION', 'Debug integration cleaned up');
    } catch (error) {
      debugLogger.error('DEBUG_INTEGRATION', error, { operation: 'cleanup' });
    }
  }
  
  /**
   * Trigger debugging after a build operation
   * Call this after npm run build, tsc compilation, etc.
   */
  public async debugAfterBuild(): Promise<DebugReport | null> {
    if (!this.config.debugAfterBuild || !this.isInitialized) {
      return null;
    }
    
    this.buildCount++;
    
    debugLogger.info('DEBUG_INTEGRATION', 'Triggering post-build debugging', {
      buildCount: this.buildCount
    });
    
    try {
      // Wait a moment for any build-related log entries to be written
      await this.delay(2000);
      
      // Run comprehensive health check which includes error scanning
      const report = await comprehensiveDebugMonitor.runComprehensiveHealthCheck();
      
      debugLogger.info('DEBUG_INTEGRATION', 'Post-build debugging completed', {
        buildCount: this.buildCount,
        debugSessionId: report.debugSessionId,
        errorType: report.errorType,
        recommendations: report.recommendations.length
      });
      
      return report;
      
    } catch (error) {
      debugLogger.error('DEBUG_INTEGRATION', error, { 
        operation: 'debug_after_build',
        buildCount: this.buildCount 
      });
      return null;
    }
  }
  
  /**
   * Trigger debugging after a tool call
   * Call this after each MCP tool execution
   */
  public async debugAfterToolCall(toolName: string, success: boolean, executionTime?: number, executionId?: string): Promise<DebugReport | null> {
    if (!this.config.debugAfterToolCall || !this.isInitialized) {
      return null;
    }
    
    this.toolCallCount++;
    
    debugLogger.info('DEBUG_INTEGRATION', 'Triggering post-tool-call debugging', {
      toolName,
      success,
      executionTime,
      executionId,
      toolCallCount: this.toolCallCount
    });
    
    try {
      // Wait a moment for any tool-related log entries to be written
      await this.delay(1000);
      
      // If the tool call failed, scan for recent errors and debug them
      if (!success) {
        const report = await comprehensiveDebugMonitor.runComprehensiveHealthCheck();
        
        debugLogger.info('DEBUG_INTEGRATION', 'Post-tool-call debugging completed (after failure)', {
          toolName,
          executionId,
          toolCallCount: this.toolCallCount,
          debugSessionId: report.debugSessionId,
          recommendations: report.recommendations.length
        });
        
        return report;
      }
      
      // For successful calls, just log the execution
      debugLogger.debug('DEBUG_INTEGRATION', 'Tool call successful, no debugging needed', {
        toolName,
        executionTime,
        executionId,
        toolCallCount: this.toolCallCount
      });
      
      return null;
      
    } catch (error) {
      // Ensure debug failures don't break the main application
      debugLogger.error('DEBUG_INTEGRATION', error, { 
        operation: 'debug_after_tool_call',
        toolName,
        executionId,
        toolCallCount: this.toolCallCount 
      });
      // Always return null on debug errors to prevent cascading failures
      return null;
    }
  }
  
  /**
   * Trigger debugging after a specific error occurs
   * Call this when you detect an error that needs immediate debugging
   */
  public async debugAfterError(errorMessage: string, errorSource: 'server' | 'tool' | 'client' = 'server'): Promise<DebugReport | null> {
    if (!this.config.debugAfterError || !this.isInitialized) {
      return null;
    }
    
    debugLogger.info('DEBUG_INTEGRATION', 'Triggering error-specific debugging', {
      errorMessage,
      errorSource
    });
    
    try {
      // Create a correlated error from the provided information
      const correlatedError = {
        timestamp: new Date().toISOString(),
        source: errorSource === 'server' ? 'server_log' as const : 'cline_log' as const,
        level: 'ERROR',
        message: errorMessage
      };
      
      // Execute automated debugging for this specific error
      const report = await comprehensiveDebugMonitor.executeAutomatedDebugging(correlatedError);
      
      debugLogger.info('DEBUG_INTEGRATION', 'Error-specific debugging completed', {
        errorMessage,
        debugSessionId: report.debugSessionId,
        recommendations: report.recommendations.length
      });
      
      return report;
      
    } catch (error) {
      debugLogger.error('DEBUG_INTEGRATION', error, { 
        operation: 'debug_after_error',
        originalError: errorMessage 
      });
      return null;
    }
  }
  
  /**
   * Manually trigger comprehensive debugging
   * Use this for on-demand debugging sessions
   */
  public async manualDebug(): Promise<DebugReport> {
    debugLogger.info('DEBUG_INTEGRATION', 'Manual debugging session triggered');
    
    try {
      const report = await comprehensiveDebugMonitor.runComprehensiveHealthCheck();
      
      debugLogger.info('DEBUG_INTEGRATION', 'Manual debugging completed', {
        debugSessionId: report.debugSessionId,
        recommendations: report.recommendations.length
      });
      
      return report;
      
    } catch (error) {
      debugLogger.error('DEBUG_INTEGRATION', error, { operation: 'manual_debug' });
      throw error;
    }
  }
  
  /**
   * Get the current debug statistics
   */
  public getDebugStats(): {
    buildCount: number;
    toolCallCount: number;
    activeDebugSessions: number;
    isMonitoring: boolean;
  } {
    return {
      buildCount: this.buildCount,
      toolCallCount: this.toolCallCount,
      activeDebugSessions: comprehensiveDebugMonitor.getActiveDebugSessions().size,
      isMonitoring: this.isInitialized
    };
  }
  
  /**
   * Update the debug integration configuration
   */
  public updateConfig(newConfig: Partial<DebugIntegrationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (newConfig.monitoringConfig) {
      comprehensiveDebugMonitor.updateConfiguration(newConfig.monitoringConfig);
    }
    
    debugLogger.info('DEBUG_INTEGRATION', 'Configuration updated', { newConfig });
  }
  
  /**
   * Check if monitoring is active
   */
  public isMonitoring(): boolean {
    return this.isInitialized;
  }
  
  /**
   * Get the current status of the debug integration system
   */
  public getStatus(): {
    isInitialized: boolean;
    isMonitoring: boolean;
    config: DebugIntegrationConfig;
    stats: {
      buildCount: number;
      toolCallCount: number;
      activeDebugSessions: number;
    };
  } {
    return {
      isInitialized: this.isInitialized,
      isMonitoring: this.isInitialized,
      config: { ...this.config },
      stats: {
        buildCount: this.buildCount,
        toolCallCount: this.toolCallCount,
        activeDebugSessions: comprehensiveDebugMonitor.getActiveDebugSessions().size
      }
    };
  }
  
  /**
   * Get all active debug sessions
   */
  public getActiveDebugSessions(): Map<string, DebugReport> {
    return comprehensiveDebugMonitor.getActiveDebugSessions();
  }
  
  /**
   * Test MCP tools with the inspector
   */
  public async testToolWithInspector(toolName: string, params: any): Promise<boolean> {
    return await comprehensiveDebugMonitor.testToolWithInspector(toolName, params);
  }
  
  /**
   * Validate the entire server with MCP Inspector
   */
  public async validateServerWithInspector() {
    return await comprehensiveDebugMonitor.validateServerWithInspector();
  }
  
  /**
   * Setup process handlers for graceful shutdown
   */
  private setupProcessHandlers(): void {
    const cleanup = async () => {
      debugLogger.info('DEBUG_INTEGRATION', 'Process termination detected, cleaning up debug integration');
      await this.cleanup();
      process.exit(0);
    };
    
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    process.on('beforeExit', cleanup);
  }
  
  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Create a timeout promise for race conditions
   */
  private createTimeoutPromise(ms: number): Promise<null> {
    return new Promise(resolve => {
      setTimeout(() => resolve(null), ms);
    });
  }
  
  /**
   * Validate the debug integration configuration
   */
  private validateConfiguration(): void {
    if (typeof this.config.autoStartMonitoring !== 'boolean') {
      debugLogger.warn('DEBUG_INTEGRATION', 'Invalid autoStartMonitoring config, using default');
      this.config.autoStartMonitoring = true;
    }
    
    if (typeof this.config.debugAfterBuild !== 'boolean') {
      debugLogger.warn('DEBUG_INTEGRATION', 'Invalid debugAfterBuild config, using default');
      this.config.debugAfterBuild = true;
    }
    
    if (typeof this.config.debugAfterToolCall !== 'boolean') {
      debugLogger.warn('DEBUG_INTEGRATION', 'Invalid debugAfterToolCall config, using default');
      this.config.debugAfterToolCall = true;
    }
    
    if (typeof this.config.debugAfterError !== 'boolean') {
      debugLogger.warn('DEBUG_INTEGRATION', 'Invalid debugAfterError config, using default');
      this.config.debugAfterError = true;
    }
    
    debugLogger.debug('DEBUG_INTEGRATION', 'Configuration validated', { config: this.config });
  }
}

// Export singleton instance for easy use
export const debugIntegration = new MCPDebugIntegration();

// Export hook functions for easy integration
export const debugHooks = {
  /**
   * Initialize debugging - call during server startup
   */
  async initialize(config?: Partial<DebugIntegrationConfig>): Promise<void> {
    if (config) {
      debugIntegration.updateConfig(config);
    }
    await debugIntegration.initialize();
  },
  
  /**
   * Debug after build - call after npm run build
   */
  async afterBuild(): Promise<DebugReport | null> {
    return await debugIntegration.debugAfterBuild();
  },
  
  /**
   * Debug after tool call - call after each MCP tool execution
   */
  async afterToolCall(toolName: string, success: boolean, executionTime?: number, executionId?: string): Promise<DebugReport | null> {
    return await debugIntegration.debugAfterToolCall(toolName, success, executionTime, executionId);
  },
  
  /**
   * Debug after error - call when specific errors are detected
   */
  async afterError(errorMessage: string, errorSource?: 'server' | 'tool' | 'client'): Promise<DebugReport | null> {
    return await debugIntegration.debugAfterError(errorMessage, errorSource);
  },
  
  /**
   * Manual debug - call for on-demand debugging
   */
  async manual(): Promise<DebugReport> {
    return await debugIntegration.manualDebug();
  },
  
  /**
   * Cleanup - call during server shutdown
   */
  async cleanup(): Promise<void> {
    await debugIntegration.cleanup();
  },
  
  /**
   * Get status - check debug integration status
   */
  getStatus() {
    return debugIntegration.getStatus();
  }
};
