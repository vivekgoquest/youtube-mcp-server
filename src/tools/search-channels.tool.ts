import { ToolMetadata, ToolRunner } from '../interfaces/tool.js';
import { YouTubeClient } from '../youtube-client.js';
import { ToolResponse, SearchChannelsParams, YouTubeApiResponse, SearchResult } from '../types.js';

export const metadata: ToolMetadata = {
  name: 'search_channels',
  description: 'Find YouTube channels by name/keyword to identify competitors or collaboration partners. Returns channel IDs needed for analyze_competitor and get_channel_details. Use this FIRST when researching competitors - search by niche keywords to discover who dominates your space. Returns up to 50 channels with subscriber counts visible in search results. TIP: Sort by viewCount to find channels with highest total views (often better than subscriber count).',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search query for channels'
      },
      maxResults: {
        type: 'integer',
        description: 'Maximum number of results to return (1-50)',
        minimum: 1,
        maximum: 50,
        default: 25
      },
      order: {
        type: 'string',
        enum: ['date', 'relevance', 'title', 'videoCount', 'viewCount'],
        description: 'Order of results',
        default: 'relevance'
      },
      regionCode: {
        type: 'string',
        description: 'Return results for specific region (ISO 3166-1 alpha-2)'
      }
    },
    required: ['query']
  },
  quotaCost: 100
};

export default class SearchChannelsTool implements ToolRunner<SearchChannelsParams, YouTubeApiResponse<SearchResult>> {
  constructor(private client: YouTubeClient) {}

  async run(params: SearchChannelsParams): Promise<ToolResponse<YouTubeApiResponse<SearchResult>>> {
    try {
      if (!params.query || params.query.trim() === '') {
        return {
          success: false,
          error: 'Query is required for channel search'
        };
      }

      const searchParams = {
        part: 'snippet',
        type: 'channel' as const,
        q: params.query,
        maxResults: params.maxResults || 25,
        order: params.order || 'relevance',
        regionCode: params.regionCode,
        pageToken: params.pageToken
      };

      // Remove undefined values
      Object.keys(searchParams).forEach(key => {
        if (searchParams[key as keyof typeof searchParams] === undefined) {
          delete searchParams[key as keyof typeof searchParams];
        }
      });

      const response = await this.client.search(searchParams);

      return {
        success: true,
        data: response,
        metadata: {
          quotaUsed: 100,
          requestTime: 0,
          source: 'youtube-search-channels'
        }
      };

    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to search channels',
        metadata: {
          quotaUsed: 100,
          requestTime: 0,
          source: 'youtube-search-channels'
        }
      };
    }
  }
}
