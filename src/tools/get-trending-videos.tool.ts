import { ToolMetadata, ToolRunner } from '../interfaces/tool.js';
import { YouTubeClient } from '../youtube-client.js';
import { ToolResponse, TrendingVideosParams, YouTubeApiResponse, Video } from '../types.js';

export const metadata: ToolMetadata = {
  name: 'get_trending_videos',
  description: 'Get trending/popular videos from YouTube.',
  inputSchema: {
    type: 'object',
    properties: {
      maxResults: {
        type: 'integer',
        description: 'Maximum number of results to return (1-50)',
        minimum: 1,
        maximum: 50,
        default: 25
      },
      regionCode: {
        type: 'string',
        description: 'Get trending videos for specific region (ISO 3166-1 alpha-2)',
        default: 'US'
      },
      videoCategoryId: {
        type: 'string',
        description: 'Filter by video category ID'
      }
    }
  },
  quotaCost: 1
};

export default class GetTrendingVideosTool implements ToolRunner<TrendingVideosParams, YouTubeApiResponse<Video>> {
  constructor(private client: YouTubeClient) {}

  async run(params: TrendingVideosParams): Promise<ToolResponse<YouTubeApiResponse<Video>>> {
    try {
      const videoParams = {
        part: 'snippet,statistics',
        chart: 'mostPopular' as const,
        maxResults: params.maxResults || 25,
        regionCode: params.regionCode || 'US',
        videoCategoryId: params.videoCategoryId,
        pageToken: params.pageToken
      };

      // Remove undefined values
      Object.keys(videoParams).forEach(key => {
        if (videoParams[key as keyof typeof videoParams] === undefined) {
          delete videoParams[key as keyof typeof videoParams];
        }
      });

      const response = await this.client.getVideos(videoParams);

      return {
        success: true,
        data: response,
        metadata: {
          quotaUsed: 1, // Videos.list costs 1 quota unit
          requestTime: 0,
          source: 'youtube-trending-videos'
        }
      };

    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to get trending videos',
        metadata: {
          quotaUsed: 1,
          requestTime: 0,
          source: 'youtube-trending-videos'
        }
      };
    }
  }
}