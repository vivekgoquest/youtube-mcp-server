import { ToolMetadata, ToolRunner } from '../interfaces/tool.js';
import { YouTubeClient } from '../youtube-client.js';
import { ToolResponse, SearchVideosParams, YouTubeApiResponse, SearchResult } from '../types.js';

export const metadata: ToolMetadata = {
  name: 'search_videos',
  description: 'Search for YouTube videos with various filters including query, duration, upload date, and more.',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search query for videos'
      },
      channelId: {
        type: 'string',
        description: 'Restrict search to specific channel ID'
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
        enum: ['date', 'rating', 'relevance', 'title', 'viewCount'],
        description: 'Order of results',
        default: 'relevance'
      },
      publishedAfter: {
        type: 'string',
        description: 'Return videos published after this date (ISO 8601)'
      },
      publishedBefore: {
        type: 'string',
        description: 'Return videos published before this date (ISO 8601)'
      },
      videoDuration: {
        type: 'string',
        enum: ['any', 'long', 'medium', 'short'],
        description: 'Filter by video duration',
        default: 'any'
      },
      regionCode: {
        type: 'string',
        description: 'Return results for specific region (ISO 3166-1 alpha-2)'
      }
    }
  },
  quotaCost: 100
};

export default class SearchVideosTool implements ToolRunner<SearchVideosParams, YouTubeApiResponse<SearchResult>> {
  constructor(private client: YouTubeClient) {}

  async run(params: SearchVideosParams): Promise<ToolResponse<YouTubeApiResponse<SearchResult>>> {
    try {
      // Debug: Log received parameters
      if (process.env.DEBUG_CONSOLE === 'true') {
        console.error('SearchVideosTool received params:', JSON.stringify(params, null, 2));
      }
      
      // Validate parameters
      if (!params.query && !params.channelId) {
        return {
          success: false,
          error: 'Either query or channelId must be provided'
        };
      }

      if (params.query && params.query.trim() === '') {
        return {
          success: false,
          error: 'Query cannot be empty'
        };
      }

      // Build search parameters
      const searchParams = {
        part: 'snippet',
        type: 'video' as const,
        q: params.query,
        channelId: params.channelId,
        maxResults: params.maxResults || 25,
        order: params.order || 'relevance',
        publishedAfter: params.publishedAfter,
        publishedBefore: params.publishedBefore,
        videoDuration: params.videoDuration,
        regionCode: params.regionCode,
        safeSearch: params.safeSearch || 'moderate',
        pageToken: params.pageToken
      };

      // Remove undefined values
      Object.keys(searchParams).forEach(key => {
        if (searchParams[key as keyof typeof searchParams] === undefined) {
          delete searchParams[key as keyof typeof searchParams];
        }
      });

      const response = await this.client.search(searchParams);
      
      // Debug: Log response
      if (process.env.DEBUG_CONSOLE === 'true') {
        console.error('YouTube API response:', JSON.stringify(response, null, 2));
      }

      return {
        success: true,
        data: response,
        metadata: {
          quotaUsed: 100, // Search operation costs 100 quota units
          requestTime: 0,
          source: 'youtube-search-videos'
        }
      };

    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to search videos',
        metadata: {
          quotaUsed: 100,
          requestTime: 0,
          source: 'youtube-search-videos'
        }
      };
    }
  }
}