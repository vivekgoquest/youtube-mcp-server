import { YouTubeClient } from "./youtube-client.js";
import { ToolRegistry } from "./registry/tool-registry.js";
import type { YouTubeClientConfig } from "./types.js";
import { ErrorHandler } from "./utils/error-handler.js";

// MCP Protocol Types
export interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface MCPServerInfo {
  name: string;
  version: string;
  description: string;
  author?: string;
  homepage?: string;
}

export interface MCPToolResult {
  success: boolean;
  content: Array<{
    type: "text";
    text: string;
  }>;
  error?: string | undefined;
}

export class YouTubeMCPServer {
  private client: YouTubeClient;
  private registry: ToolRegistry;
  private serverInfo: MCPServerInfo;

  constructor(config: YouTubeClientConfig) {
    this.client = new YouTubeClient(config);
    this.registry = new ToolRegistry();

    this.serverInfo = {
      name: "youtube-mcp-server",
      version: "1.1.0",
      description:
        "YouTube Data API v3 MCP Server for accessing YouTube content, analytics, and research tools",
      author: "YouTube MCP Server",
      homepage: "https://github.com/vivekgoquest/youtube-mcp-server",
    };
  }

  /**
   * Initialize the server and load all tools
   */
  async initialize(): Promise<void> {
    await this.registry.loadAllTools();
  }

  /**
   * Get server information
   */
  getServerInfo(): MCPServerInfo {
    return this.serverInfo;
  }

  /**
   * List all available tools
   */
  listTools(): MCPToolDefinition[] {
    const toolMetadata = this.registry.listTools();
    return toolMetadata.map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    }));
  }

  /**
   * Execute a tool with given arguments
   */
  async executeTool(toolName: string, args: any): Promise<MCPToolResult> {
    let result: MCPToolResult = {
      success: false,
      content: [{ type: "text", text: "Tool execution failed" }],
      error: "Unknown error",
    };

    try {
      // Use the registry to execute the tool
      const toolResult = await this.registry.executeTool(
        toolName,
        args,
        this.client,
      );

      if (toolResult.success && toolResult.data) {
        // Format the result - new tools return strings, legacy tools return objects
        const text = this.formatToolResult(toolName, toolResult.data);
        result = {
          success: true,
          content: [{ type: "text", text }],
        };
      } else {
        result = {
          success: false,
          content: [
            {
              type: "text",
              text: this.formatToolExecutionError(toolName, toolResult.error || "Unknown error"),
            },
          ],
          error: toolResult.error,
        };
      }

      return result;
    } catch (error: any) {
      const toolError = ErrorHandler.handleToolError(error, {
        source: "mcp-server",
        defaultMessage: "Tool execution failed",
      });

      result = {
        success: false,
        content: [
          {
            type: "text",
            text: this.formatToolExecutionError(toolName, toolError.error || "Unknown error"),
          },
        ],
        error: toolError.error,
      };

      // Trigger error-specific debugging
      try {
      } catch (debugError) {
        // Don't let debug failures break the main functionality
        ErrorHandler.handleSystemError(debugError, {
          component: "mcp-server",
          operation: "debug-hook",
          critical: false,
        });
      }

      return result;
    } finally {
      // End execution tracking
      try {
        // Trigger post-tool-call debugging
      } catch (debugError) {
        // Don't let debug failures break the main functionality
        ErrorHandler.handleSystemError(debugError, {
          component: "mcp-server",
          operation: "debug-hook",
          critical: false,
        });
      }
    }
  }

  /**
   * Format error message for tool execution failures
   */
  private formatToolExecutionError(toolName: string, error: string): string {
    return `Error executing tool '${toolName}': ${error}`;
  }

  private formatToolResult(_toolName: string, data: any): string {
    // Check if data is already a formatted string (new pattern)
    if (typeof data === "string") {
      return data;
    }

    // Legacy tools return objects - format as JSON
    if (!data) {
      return "No data returned from tool execution.";
    }

    if (typeof data === "object") {
      return "```json\n" + JSON.stringify(data, null, 2) + "\n```";
    }

    return String(data);
  }
}
