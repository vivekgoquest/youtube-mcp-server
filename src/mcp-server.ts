import { YouTubeClient } from './youtube-client.js';
import { ToolRegistry } from './registry/tool-registry.js';
import { ToolMetadata } from './interfaces/tool.js';
import {
  YouTubeClientConfig,
  ToolResponse
} from './types.js';
import { ErrorHandler } from './utils/error-handler.js';

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
      homepage: 'https://github.com/vivekgoquest/youtube-mcp-server'
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
      const toolError = ErrorHandler.handleToolError(error, {
        quotaUsed: 0,
        startTime,
        source: 'mcp-server',
        defaultMessage: 'Tool execution failed'
      });
      
      result = {
        success: false,
        content: [{
          type: 'text',
          text: `Error executing tool '${toolName}': ${toolError.error}`
        }],
        error: toolError.error,
        metadata: toolError.metadata
      };
      
      // Trigger error-specific debugging
      try {
      } catch (debugError) {
        // Don't let debug failures break the main functionality
        ErrorHandler.handleSystemError(debugError, {
          component: 'mcp-server',
          operation: 'debug-hook',
          critical: false
        });
      }
      
      return result;
      
    } finally {
      const executionTime = Date.now() - startTime;
      
      // End execution tracking
      try {
        
        // Trigger post-tool-call debugging
      } catch (debugError) {
        // Don't let debug failures break the main functionality
        ErrorHandler.handleSystemError(debugError, {
          component: 'mcp-server',
          operation: 'debug-hook',
          critical: false
        });
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
      case 'unified_search':
        if (data.items) {
          const searchType = data.items[0]?.id?.videoId ? 'videos' : 
                            data.items[0]?.id?.channelId ? 'channels' : 
                            data.items[0]?.id?.playlistId ? 'playlists' : 'results';
          return this.formatSearchResults(data.items, searchType);
        }
        break;
      
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
      
      case 'analyze_channel_videos':
        return this.formatChannelVideosAnalysis(data);
      
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
      result += `${index + 1}. **${item.snippet?.title || 'Untitled'}**\n`;
      
      // Handle different result types appropriately
      if (type === 'channels') {
        // For channel results, the title IS the channel name, so we don't need to repeat it
        // Instead, show subscriber count if available from enriched data
        if (item.statistics?.subscriberCount) {
          result += `   Subscribers: ${this.formatNumber(item.statistics.subscriberCount)}\n`;
        }
      } else {
        // For video/playlist results, show the channel that owns them
        result += `   Channel: ${item.snippet?.channelTitle || 'Unknown Channel'}\n`;
      }
      
      result += `   Published: ${item.snippet?.publishedAt ? new Date(item.snippet.publishedAt).toLocaleDateString() : 'Unknown'}\n`;
      
      if (item.id?.videoId) {
        result += `   Video ID: ${item.id.videoId}\n`;
        result += `   URL: https://www.youtube.com/watch?v=${item.id.videoId}\n`;
      } else if (item.id?.channelId) {
        result += `   Channel ID: ${item.id.channelId}\n`;
        result += `   URL: https://www.youtube.com/channel/${item.id.channelId}\n`;
      } else if (item.id?.playlistId) {
        result += `   Playlist ID: ${item.id.playlistId}\n`;
        result += `   URL: https://www.youtube.com/playlist?list=${item.id.playlistId}\n`;
      }
      
      if (item.snippet?.description) {
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
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
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

  private formatChannelVideosAnalysis(data: any): string {
    // Handle both legacy array format and new batched format
    if (Array.isArray(data)) {
      // Legacy format - convert to batched format
      const batchedData = {
        totalVideos: data.length,
        batchCount: Math.ceil(data.length / 50),
        batches: [] as any[]
      };
      for (let i = 0; i < data.length; i += 50) {
        batchedData.batches.push({
          batchNumber: Math.floor(i / 50) + 1,
          videos: data.slice(i, i + 50)
        });
      }
      data = batchedData;
    }

    if (!data || !data.batches || data.totalVideos === 0) {
      return 'No videos found for analysis.';
    }

    // Flatten all videos from batches for analysis
    const allVideos = data.batches.flatMap((batch: any) => batch.videos);

    let result = `📊 **Channel Video Analysis**\n`;
    result += `Analyzed ${data.totalVideos} videos (${data.batchCount} batch${data.batchCount > 1 ? 'es' : ''})\n\n`;

    // Note: Videos are already sorted by the tool based on user preference
    // Just take the first 10 for top performers (they're already in the right order)
    const top10Videos = allVideos.slice(0, 10);

    result += `**🏆 Top 10 Videos by Views:**\n`;
    top10Videos.forEach((video: any, index: number) => {
      const viewsFormatted = video.views >= 1000000 
        ? `${(video.views / 1000000).toFixed(1)}M` 
        : video.views >= 1000 
        ? `${(video.views / 1000).toFixed(0)}K` 
        : video.views.toString();
      
      result += `${index + 1}. ${video.title}\n`;
      result += `   ${viewsFormatted} views • ${video.duration.toFixed(1)} min • ${video.daysSinceUpload} days ago\n`;
    });

    // Calculate channel metrics
    const totalViews = allVideos.reduce((sum: number, v: any) => sum + v.views, 0);
    const avgViews = Math.round(totalViews / allVideos.length);
    const avgLikes = Math.round(allVideos.reduce((sum: number, v: any) => sum + v.likes, 0) / allVideos.length);
    const avgComments = Math.round(allVideos.reduce((sum: number, v: any) => sum + v.comments, 0) / allVideos.length);
    
    // Calculate engagement rate (likes + comments / views)
    const avgEngagement = allVideos.reduce((sum: number, v: any) => {
      const engagement = v.views > 0 ? ((v.likes + v.comments) / v.views) * 100 : 0;
      return sum + engagement;
    }, 0) / allVideos.length;

    // Duration analysis
    const durationCounts = allVideos.reduce((acc: Record<string, number>, v: any) => {
      acc[v.durationRange] = (acc[v.durationRange] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const mostCommonDuration = Object.entries(durationCounts)
      .sort(([,a], [,b]) => (b as number) - (a as number))[0];

    // Upload frequency - videos are already sorted, so we can check the last one
    const oldestVideo = allVideos[allVideos.length - 1];
    const daysCovered = oldestVideo ? oldestVideo.daysSinceUpload : 30;
    const uploadsPerMonth = Math.round((allVideos.length / daysCovered) * 30);

    result += `\n**📈 Channel Metrics:**\n`;
    result += `• Average views per video: ${avgViews.toLocaleString()}\n`;
    result += `• Average engagement rate: ${avgEngagement.toFixed(1)}%\n`;
    result += `• Average likes: ${avgLikes.toLocaleString()}\n`;
    result += `• Average comments: ${avgComments.toLocaleString()}\n`;
    result += `• Most common video length: ${mostCommonDuration[0]} (${Math.round((mostCommonDuration[1] as number) / allVideos.length * 100)}% of videos)\n`;
    result += `• Upload frequency: ~${uploadsPerMonth} videos/month\n`;

    // Performance trends
    const recentVideos = allVideos.filter((v: any) => v.daysSinceUpload <= 30);
    const olderVideos = allVideos.filter((v: any) => v.daysSinceUpload > 30);
    
    if (recentVideos.length > 0 && olderVideos.length > 0) {
      const recentAvgViews = Math.round(recentVideos.reduce((sum: number, v: any) => sum + v.viewsPerMonth, 0) / recentVideos.length);
      const olderAvgViews = Math.round(olderVideos.reduce((sum: number, v: any) => sum + v.viewsPerMonth, 0) / olderVideos.length);
      const trend = ((recentAvgViews - olderAvgViews) / olderAvgViews) * 100;
      
      result += `\n**📊 Performance Trend:**\n`;
      result += `Recent videos (last 30 days) are performing ${trend > 0 ? '📈' : '📉'} ${Math.abs(trend).toFixed(0)}% ${trend > 0 ? 'better' : 'worse'} than older content\n`;
    }

    // Include batch information
    result += `\n**📦 Batch Information:**\n`;
    result += `• Total batches: ${data.batchCount}\n`;
    result += `• Videos per batch: 50 (last batch: ${data.batches[data.batches.length - 1].videos.length})\n`;
    
    // Include full batched data in compact format
    result += `\n**🔍 Full Video Data (Batched):**\n`;
    result += JSON.stringify(data);

    return result;
  }
}
