#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { YouTubeMCPServer } from './mcp-server.js';

/**
 * YouTube MCP Server
 * 
 * This server provides access to YouTube Data API v3 through the Model Context Protocol.
 * It offers tools for searching videos, channels, playlists, getting detailed information,
 * and supports complex workflows for content analysis and discovery.
 */

class YouTubeMCPServerHandler {
  private youtubeServer: YouTubeMCPServer;
  private mcpServer: Server;

  constructor() {
    // Initialize YouTube API client
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      throw new Error(
        'YOUTUBE_API_KEY environment variable is required. ' +
        'Get your API key from: https://console.developers.google.com/'
      );
    }

    this.youtubeServer = new YouTubeMCPServer({ apiKey });
    
    // Initialize MCP Server
    this.mcpServer = new Server(
      {
        name: 'youtube-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers() {
    // Handle tool listing
    this.mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools = this.youtubeServer.listTools();
      
      return {
        tools: tools.map(tool => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
        })),
      };
    });

    // Handle tool execution
    this.mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      // Debug logging
      if (process.env.DEBUG_CONSOLE === 'true') {
        console.error('Tool call request:', name, 'with args:', JSON.stringify(args, null, 2));
      }

      try {
        const result = await this.youtubeServer.executeTool(name, args || {});

        if (result.success) {
          return {
            content: result.content,
            isError: false,
          };
        } else {
          return {
            content: [
              {
                type: 'text',
                text: `Error: ${result.error}`,
              },
            ],
            isError: true,
          };
        }
      } catch (error) {
        throw new McpError(
          ErrorCode.InternalError,
          `Failed to execute tool ${name}: ${error}`
        );
      }
    });
  }

  async start() {
    // Initialize the YouTube server and load all tools
    await this.youtubeServer.initialize();

    // Connect to transport (stdio for MCP)
    const transport = new StdioServerTransport();
    await this.mcpServer.connect(transport);
    
    // Only output debug messages if DEBUG_CONSOLE is enabled
    if (process.env.DEBUG_CONSOLE === 'true') {
      console.error('YouTube MCP Server started successfully');
      console.error(`Available tools: ${this.youtubeServer.listTools().length}`);
      console.error('Listening for MCP requests...');
    }
  }
}

// Error handling (debug cleanup temporarily disabled)
process.on('SIGINT', async () => {
  if (process.env.DEBUG_CONSOLE === 'true') {
    console.error('Shutting down YouTube MCP Server...');
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  if (process.env.DEBUG_CONSOLE === 'true') {
    console.error('Shutting down YouTube MCP Server...');
  }
  process.exit(0);
});

// Start the server
async function main() {
  try {
    const server = new YouTubeMCPServerHandler();
    await server.start();
  } catch (error) {
    console.error('Failed to start YouTube MCP Server:', error);
    process.exit(1);
  }
}

// Check if this file is being run directly (more reliable method)
import { fileURLToPath } from 'url';
import { resolve } from 'path';

const currentFile = fileURLToPath(import.meta.url);
const runFile = resolve(process.argv[1]);

// Only start if this is the main file being executed
if (currentFile === runFile || process.argv[1].endsWith('index.js')) {
  main().catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

export { YouTubeMCPServerHandler };
