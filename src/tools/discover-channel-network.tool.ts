import { ToolMetadata, ToolRunner } from '../interfaces/tool.js';
import { YouTubeClient } from '../youtube-client.js';
import { ToolResponse } from '../types.js';

interface FeaturedChannelsOptions {
  seedChannelIds: string[];
  maxDepth?: number;
  maxChannelsPerLevel?: number;
  includeDetails?: boolean;
}

interface ChannelNetworkNode {
  channelId: string;
  channelName: string;
  channelUrl: string;
  subscriberCount: number;
  viewCount: number;
  videoCount: number;
  publishedAt: string;
  country?: string;
  description: string;
  featuredChannels: string[];
  depth: number;
}

export const metadata: ToolMetadata = {
  name: 'discover_channel_network',
  description: 'MAP the hidden network of connected channels in any niche. Recursively discovers featured/recommended channels up to 5 levels deep, revealing collaboration networks and niche communities. Use this to: find ALL players in your niche, identify collaboration opportunities, understand channel alliances. Start with 1-3 seed channels and watch it spider out. Returns visual network showing who features whom. POWERFUL for discovering channels you\'d never find through search alone.',
  inputSchema: {
    type: 'object',
    properties: {
      seedChannelIds: {
        type: 'array',
        items: {
          type: 'string'
        },
        description: 'Starting channel IDs for network discovery'
      },
      maxDepth: {
        type: 'integer',
        description: 'Maximum depth for recursive discovery (default: 3)',
        minimum: 1,
        maximum: 5,
        default: 3
      },
      maxChannelsPerLevel: {
        type: 'integer',
        description: 'Maximum channels to process per level (default: 10)',
        minimum: 1,
        maximum: 50,
        default: 10
      },
      includeDetails: {
        type: 'boolean',
        description: 'Include detailed channel information (default: true)',
        default: true
      }
    },
    required: ['seedChannelIds']
  },
  quotaCost: 2
};

export default class DiscoverChannelNetworkTool implements ToolRunner<FeaturedChannelsOptions, ChannelNetworkNode[]> {
  constructor(private client: YouTubeClient) {}

  async run(options: FeaturedChannelsOptions): Promise<ToolResponse<ChannelNetworkNode[]>> {
    try {
      const startTime = Date.now();
      const maxDepth = options.maxDepth || 3;
      const maxChannelsPerLevel = options.maxChannelsPerLevel || 10;
      const includeDetails = options.includeDetails !== false;
      
      const processedChannels = new Set<string>();
      const channelNetwork: ChannelNetworkNode[] = [];
      let currentLevel = [...options.seedChannelIds];
      let depth = 0;

      while (currentLevel.length > 0 && depth < maxDepth) {
        const nextLevel: string[] = [];
        const levelChannels = currentLevel.slice(0, maxChannelsPerLevel);

        for (const channelId of levelChannels) {
          if (processedChannels.has(channelId)) continue;
          processedChannels.add(channelId);

          // Get channel details if requested
          let channelDetails: any = {};
          if (includeDetails) {
            try {
              const detailsResponse = await this.client.getChannels({
                part: 'snippet,statistics',
                id: channelId
              });
              if (detailsResponse.items && detailsResponse.items.length > 0) {
                channelDetails = detailsResponse.items[0];
              }
            } catch (error) {
              // Channel details failed - continue without details
              if (process.env.DEBUG_CONSOLE === 'true') {
                console.error(`Failed to get details for channel ${channelId}:`, error);
              }
            }
          }

          // Get featured channels
          const featuredResult = await this.getFeaturedChannels(channelId);
          const featuredChannels = featuredResult.success ? featuredResult.data! : [];

          // Add new channels to next level
          for (const featuredId of featuredChannels) {
            if (!processedChannels.has(featuredId)) {
              nextLevel.push(featuredId);
            }
          }

          // Create network node
          const networkNode: ChannelNetworkNode = {
            channelId,
            channelName: channelDetails.snippet?.title || 'Unknown',
            channelUrl: `https://www.youtube.com/channel/${channelId}`,
            subscriberCount: parseInt(channelDetails.statistics?.subscriberCount || '0'),
            viewCount: parseInt(channelDetails.statistics?.viewCount || '0'),
            videoCount: parseInt(channelDetails.statistics?.videoCount || '0'),
            publishedAt: channelDetails.snippet?.publishedAt || '',
            country: channelDetails.snippet?.country,
            description: channelDetails.snippet?.description || '',
            featuredChannels,
            depth
          };

          channelNetwork.push(networkNode);
        }

        currentLevel = nextLevel;
        depth++;
      }

      return {
        success: true,
        data: channelNetwork,
        metadata: {
          quotaUsed: channelNetwork.length * 2, // Estimate: 1 for sections + 1 for details
          requestTime: Date.now() - startTime,
          source: 'youtube-channel-network'
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        metadata: {
          quotaUsed: 0,
          requestTime: 0,
          source: 'youtube-channel-network'
        }
      };
    }
  }

  private async getFeaturedChannels(channelId: string): Promise<ToolResponse<string[]>> {
    try {
      const startTime = Date.now();
      
      // Get channel sections to find featured channels
      const sectionsResponse = await this.client.makeRawRequest('/channelSections', {
        part: 'contentDetails',
        channelId: channelId
      });

      const featuredChannels: string[] = [];
      
      for (const item of sectionsResponse.items || []) {
        if (item.contentDetails?.channels) {
          featuredChannels.push(...item.contentDetails.channels);
        }
      }

      return {
        success: true,
        data: featuredChannels,
        metadata: {
          quotaUsed: 1,
          requestTime: Date.now() - startTime,
          source: 'youtube-featured-channels'
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        metadata: {
          quotaUsed: 1,
          requestTime: 0,
          source: 'youtube-featured-channels'
        }
      };
    }
  }
}
