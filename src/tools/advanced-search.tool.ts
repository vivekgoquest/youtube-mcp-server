import { ToolMetadata, ToolRunner } from '../interfaces/tool.js';
import { YouTubeClient } from '../youtube-client.js';
import { ToolResponse, YouTubeApiResponse, SearchResult } from '../types.js';

interface AdvancedSearchParams {
  query: string;
  type?: 'video' | 'channel' | 'playlist';
  filters?: {
    duration?: 'any' | 'long' | 'medium' | 'short';
    uploadDate?: 'any' | 'hour' | 'today' | 'week' | 'month' | 'year';
    sortBy?: 'relevance' | 'upload_date' | 'view_count' | 'rating';
    features?: ('hd' | 'subtitles' | 'creative_commons' | 'live')[];
  };
  maxResults?: number;
}

export const metadata: ToolMetadata = {
  name: 'advanced_search',
  description: 'Perform advanced search with complex filters and criteria.',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search query'
      },
      type: {
        type: 'string',
        enum: ['video', 'channel', 'playlist'],
        description: 'Type of content to search',
        default: 'video'
      },
      filters: {
        type: 'object',
        properties: {
          duration: {
            type: 'string',
            enum: ['any', 'long', 'medium', 'short'],
            description: 'Video duration filter'
          },
          uploadDate: {
            type: 'string',
            enum: ['any', 'hour', 'today', 'week', 'month', 'year'],
            description: 'Upload date filter'
          },
          sortBy: {
            type: 'string',
            enum: ['relevance', 'upload_date', 'view_count', 'rating'],
            description: 'Sort order'
          }
        }
      },
      maxResults: {
        type: 'integer',
        description: 'Maximum number of results to return (1-50)',
        minimum: 1,
        maximum: 50,
        default: 25
      }
    },
    required: ['query']
  },
  quotaCost: 100
};

export default class AdvancedSearchTool implements ToolRunner<AdvancedSearchParams, YouTubeApiResponse<SearchResult>> {
  constructor(private client: YouTubeClient) {}

  async run(params: AdvancedSearchParams): Promise<ToolResponse<YouTubeApiResponse<SearchResult>>> {
    try {
      if (!params.query || params.query.trim() === '') {
        return {
          success: false,
          error: 'Query is required for advanced search'
        };
      }

      // Map upload date to publishedAfter
      let publishedAfter: string | undefined;
      if (params.filters?.uploadDate) {
        const now = new Date();
        switch (params.filters.uploadDate) {
          case 'hour':
            publishedAfter = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
            break;
          case 'today':
            publishedAfter = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
            break;
          case 'week':
            publishedAfter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
            break;
          case 'month':
            publishedAfter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
            break;
          case 'year':
            publishedAfter = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString();
            break;
        }
      }

      // Map sortBy to order
      let order: 'date' | 'rating' | 'relevance' | 'title' | 'videoCount' | 'viewCount' = 'relevance';
      if (params.filters?.sortBy) {
        switch (params.filters.sortBy) {
          case 'upload_date':
            order = 'date';
            break;
          case 'view_count':
            order = 'viewCount';
            break;
          case 'rating':
            order = 'rating';
            break;
          default:
            order = 'relevance';
        }
      }

      const searchParams = {
        part: 'snippet',
        type: params.type || 'video',
        q: params.query,
        maxResults: params.maxResults || 25,
        order,
        publishedAfter,
        videoDuration: params.filters?.duration
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
          source: 'youtube-advanced-search'
        }
      };

    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to perform advanced search',
        metadata: {
          quotaUsed: 100,
          requestTime: 0,
          source: 'youtube-advanced-search'
        }
      };
    }
  }
}