import { ToolMetadata, ToolRunner } from '../interfaces/tool.js';
import { YouTubeClient } from '../youtube-client.js';
import { ToolResponse, SearchPlaylistsParams, YouTubeApiResponse, SearchResult } from '../types.js';

export const metadata: ToolMetadata = {
  name: 'search_playlists',
  description: 'Search for curated playlists to discover content organization patterns and find comprehensive topic coverage. Returns playlist IDs for deeper analysis. Use this to: find how experts organize content series, discover all videos on niche topics, understand content progression strategies. Can filter by specific channel to see their content structure. Returns up to 50 playlists with video counts. TIP: Popular playlists often indicate in-demand content series you should create.',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search query for playlists'
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
        enum: ['date', 'relevance', 'title', 'videoCount', 'viewCount'],
        description: 'Order of results',
        default: 'relevance'
      },
      regionCode: {
        type: 'string',
        description: 'Return results for specific region (ISO 3166-1 alpha-2)'
      }
    }
  },
  quotaCost: 100
};

export default class SearchPlaylistsTool implements ToolRunner<SearchPlaylistsParams, YouTubeApiResponse<SearchResult>> {
  constructor(private client: YouTubeClient) {}

  async run(params: SearchPlaylistsParams): Promise<ToolResponse<YouTubeApiResponse<SearchResult>>> {
    try {
      if (!params.query && !params.channelId) {
        return {
          success: false,
          error: 'Either query or channelId must be provided'
        };
      }

      const searchParams = {
        part: 'snippet',
        type: 'playlist' as const,
        q: params.query,
        channelId: params.channelId,
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
          source: 'youtube-search-playlists'
        }
      };

    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to search playlists',
        metadata: {
          quotaUsed: 100,
          requestTime: 0,
          source: 'youtube-search-playlists'
        }
      };
    }
  }
}
