import { YouTubeClient } from './youtube-client.js';
import { ToolRegistry } from './registry/tool-registry.js';
import { ToolMetadata } from './interfaces/tool.js';
import {
  YouTubeClientConfig,
  ToolResponse
} from './types.js';

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
    type: 'text';
    text: string;
  }>;
  error?: string;
  metadata?: {
    quotaUsed: number;
    requestTime: number;
    source?: string;
  };
}

export class YouTubeMCPServer {
  private client: YouTubeClient;
  private registry: ToolRegistry;
  private serverInfo: MCPServerInfo;

  constructor(config: YouTubeClientConfig) {
    this.client = new YouTubeClient(config);
    this.registry = new ToolRegistry();
    
    this.serverInfo = {
      name: 'youtube-mcp-server',
      version: '1.1.0',
      description: 'YouTube Data API v3 MCP Server for accessing YouTube content, analytics, and research tools',
      author: 'YouTube MCP Server',
      homepage: 'https://github.com/youtube-mcp-server'
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
    return toolMetadata.map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema
    }));
  }

  /**
   * Execute a tool with given arguments
   */
  async executeTool(toolName: string, args: any): Promise<MCPToolResult> {
    const startTime = Date.now();
    let success = false;
    let result: MCPToolResult = {
      success: false,
      content: [{ type: 'text', text: 'Tool execution failed' }],
      error: 'Unknown error'
    };
    
    try {
      // Use the registry to execute the tool
      const toolResult = await this.registry.executeTool(toolName, args, this.client);
      
      if (toolResult.success && toolResult.data) {
        // Format the result based on tool type
        const text = this.formatToolResult(toolName, toolResult.data);
        result = {
          success: true,
          content: [{ type: 'text', text }],
          metadata: toolResult.metadata
        };
      } else {
        result = {
          success: false,
          content: [{
            type: 'text',
            text: `Error executing tool '${toolName}': ${toolResult.error || 'Unknown error'}`
          }],
          error: toolResult.error,
          metadata: toolResult.metadata
        };
      }
      
      success = result.success;
      return result;
      
    } catch (error: any) {
      success = false;
      result = {
        success: false,
        content: [{
          type: 'text',
          text: `Error executing tool '${toolName}': ${error.message}`
        }],
        error: error.message
      };
      
      // Trigger error-specific debugging
      try {
      } catch (debugError) {
        // Don't let debug failures break the main functionality
        console.error('Debug hook error (non-critical):', debugError);
      }
      
      return result;
      
    } finally {
      const executionTime = Date.now() - startTime;
      
      // End execution tracking
      try {
        
        // Trigger post-tool-call debugging
      } catch (debugError) {
        // Don't let debug failures break the main functionality
        console.error('Debug hook error (non-critical):', debugError);
      }
    }
  }

  private formatToolResult(toolName: string, data: any): string {
    // Format results based on tool type and data structure
    if (!data) {
      return 'No data returned from tool execution.';
    }

    // Handle different tool types
    switch (toolName) {
      case 'search_videos':
      case 'search_channels':
      case 'search_playlists':
        if (data.items) {
          return this.formatSearchResults(data.items, toolName.split('_')[1]);
        }
        break;
      
      case 'get_trending_videos':
        if (data.items) {
          return this.formatTrendingVideos(data.items, 'US');
        }
        break;
      
      case 'get_video_details':
        return this.formatVideoDetails(data);
      
      case 'get_channel_details':
        return this.formatChannelDetails(data);
      
      case 'get_playlist_details':
        return this.formatPlaylistDetails(data);
      
      case 'advanced_search':
        if (data.items) {
          return this.formatSearchResults(data.items, 'results');
        }
        break;
      
      default:
        // For other tools, return JSON formatted output
        if (typeof data === 'object') {
          return '```json\n' + JSON.stringify(data, null, 2) + '\n```';
        }
        return String(data);
    }

    return 'Tool executed successfully but returned no formatted output.';
  }


  private formatSearchResults(items: any[], type: string): string {
    if (items.length === 0) {
      return `No ${type} found matching your search criteria.`;
    }

    let result = `Found ${items.length} ${type}:\n\n`;
    
    items.forEach((item, index) => {
      result += `${index + 1}. **${item.snippet.title}**\n`;
      result += `   Channel: ${item.snippet.channelTitle}\n`;
      result += `   Published: ${new Date(item.snippet.publishedAt).toLocaleDateString()}\n`;
      
      if (item.id.videoId) {
        result += `   Video ID: ${item.id.videoId}\n`;
        result += `   URL: https://www.youtube.com/watch?v=${item.id.videoId}\n`;
      } else if (item.id.channelId) {
        result += `   Channel ID: ${item.id.channelId}\n`;
        result += `   URL: https://www.youtube.com/channel/${item.id.channelId}\n`;
      } else if (item.id.playlistId) {
        result += `   Playlist ID: ${item.id.playlistId}\n`;
        result += `   URL: https://www.youtube.com/playlist?list=${item.id.playlistId}\n`;
      }
      
      if (item.snippet.description) {
        const desc = item.snippet.description.substring(0, 150);
        result += `   Description: ${desc}${item.snippet.description.length > 150 ? '...' : ''}\n`;
      }
      
      result += '\n';
    });

    return result;
  }

  private formatTrendingVideos(videos: any[], regionCode: string): string {
    if (videos.length === 0) {
      return `No trending videos found for region ${regionCode}.`;
    }

    let result = `🔥 Top ${videos.length} trending videos in ${regionCode}:\n\n`;
    
    videos.forEach((video, index) => {
      result += `${index + 1}. **${video.snippet?.title}**\n`;
      result += `   Channel: ${video.snippet?.channelTitle}\n`;
      result += `   Views: ${this.formatNumber(video.statistics?.viewCount)}\n`;
      result += `   Published: ${new Date(video.snippet?.publishedAt).toLocaleDateString()}\n`;
      result += `   Video ID: ${video.id}\n`;
      result += `   URL: https://www.youtube.com/watch?v=${video.id}\n\n`;
    });

    return result;
  }

  private formatVideoDetails(video: any): string {
    let result = `📹 **Video Details**\n\n`;
    
    if (video.snippet) {
      result += `**Title:** ${video.snippet.title}\n`;
      result += `**Channel:** ${video.snippet.channelTitle}\n`;
      result += `**Published:** ${new Date(video.snippet.publishedAt).toLocaleDateString()}\n`;
      result += `**Description:** ${video.snippet.description?.substring(0, 300)}${video.snippet.description?.length > 300 ? '...' : ''}\n\n`;
    }
    
    if (video.statistics) {
      result += `**📊 Statistics:**\n`;
      result += `• Views: ${this.formatNumber(video.statistics.viewCount)}\n`;
      if (video.statistics.likeCount) {
        result += `• Likes: ${this.formatNumber(video.statistics.likeCount)}\n`;
      }
      if (video.statistics.commentCount) {
        result += `• Comments: ${this.formatNumber(video.statistics.commentCount)}\n`;
      }
      result += '\n';
    }
    
    if (video.contentDetails) {
      result += `**⏱️ Content Details:**\n`;
      result += `• Duration: ${this.formatDuration(video.contentDetails.duration)}\n`;
      result += `• Definition: ${video.contentDetails.definition.toUpperCase()}\n`;
      result += '\n';
    }
    
    result += `**🔗 Links:**\n`;
    result += `• Video URL: https://www.youtube.com/watch?v=${video.id}\n`;
    result += `• Channel URL: https://www.youtube.com/channel/${video.snippet?.channelId}\n`;

    return result;
  }

  private formatChannelDetails(channel: any): string {
    let result = `📺 **Channel Details**\n\n`;
    
    if (channel.snippet) {
      result += `**Name:** ${channel.snippet.title}\n`;
      result += `**Description:** ${channel.snippet.description?.substring(0, 300)}${channel.snippet.description?.length > 300 ? '...' : ''}\n`;
      result += `**Created:** ${new Date(channel.snippet.publishedAt).toLocaleDateString()}\n`;
      if (channel.snippet.country) {
        result += `**Country:** ${channel.snippet.country}\n`;
      }
      result += '\n';
    }
    
    if (channel.statistics) {
      result += `**📊 Statistics:**\n`;
      result += `• Subscribers: ${this.formatNumber(channel.statistics.subscriberCount)}\n`;
      result += `• Total Views: ${this.formatNumber(channel.statistics.viewCount)}\n`;
      result += `• Videos: ${this.formatNumber(channel.statistics.videoCount)}\n`;
      result += '\n';
    }
    
    result += `**🔗 Links:**\n`;
    result += `• Channel URL: https://www.youtube.com/channel/${channel.id}\n`;
    if (channel.snippet?.customUrl) {
      result += `• Custom URL: https://www.youtube.com/${channel.snippet.customUrl}\n`;
    }

    return result;
  }

  private formatPlaylistDetails(playlist: any): string {
    let result = `📑 **Playlist Details**\n\n`;
    
    if (playlist.snippet) {
      result += `**Title:** ${playlist.snippet.title}\n`;
      result += `**Channel:** ${playlist.snippet.channelTitle}\n`;
      result += `**Created:** ${new Date(playlist.snippet.publishedAt).toLocaleDateString()}\n`;
      result += `**Description:** ${playlist.snippet.description?.substring(0, 300)}${playlist.snippet.description?.length > 300 ? '...' : ''}\n\n`;
    }
    
    if (playlist.contentDetails) {
      result += `**📊 Content:**\n`;
      result += `• Video Count: ${playlist.contentDetails.itemCount}\n`;
      result += '\n';
    }
    
    result += `**🔗 Links:**\n`;
    result += `• Playlist URL: https://www.youtube.com/playlist?list=${playlist.id}\n`;
    result += `• Channel URL: https://www.youtube.com/channel/${playlist.snippet?.channelId}\n`;

    return result;
  }

  private formatNumber(num: string | number): string {
    if (!num) return '0';
    const number = typeof num === 'string' ? parseInt(num) : num;
    return number.toLocaleString();
  }

  private formatDuration(duration: string): string {
    // Parse ISO 8601 duration (PT4M13S -> 4:13)
    const match = duration.match(/PT(?:(\\d+)H)?(?:(\\d+)M)?(?:(\\d+)S)?/);
    if (!match) return duration;
    
    const hours = parseInt(match[1]) || 0;
    const minutes = parseInt(match[2]) || 0;
    const seconds = parseInt(match[3]) || 0;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
  }
}
