import { ToolMetadata, ToolRunner } from '../interfaces/tool.js';
import { YouTubeClient } from '../youtube-client.js';
import { ToolResponse, TrendingVideosParams, YouTubeApiResponse, Video } from '../types.js';

export const metadata: ToolMetadata = {
  name: 'get_trending_videos',
  description: 'Get trending videos with configurable detail level - from basic metrics to comprehensive analysis including privacy status, topic categorization, and technical details. See what\'s going viral in real-time, filtered by category and region. Returns up to 50 trending videos with configurable detail depth.',
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
      },
      includeParts: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['snippet', 'statistics', 'contentDetails', 'status', 'topicDetails', 'recordingDetails', 'liveStreamingDetails', 'player', 'localizations', 'fileDetails', 'processingDetails', 'suggestions']
        },
        description: 'Parts of video data to include',
        default: ['snippet', 'statistics']
      },
      includeExtended: {
        type: 'boolean',
        description: 'Include commonly useful additional parts (status, topicDetails)',
        default: false
      },
      fields: {
        type: 'string',
        description: 'Optional field filter for response'
      }
    }
  },
  quotaCost: 1
};

export default class GetTrendingVideosTool implements ToolRunner<TrendingVideosParams & { includeParts?: string[]; includeExtended?: boolean; fields?: string }, YouTubeApiResponse<Video>> {
  constructor(private client: YouTubeClient) {}

  async run(params: TrendingVideosParams & { includeParts?: string[]; includeExtended?: boolean; fields?: string }): Promise<ToolResponse<YouTubeApiResponse<Video>>> {
    try {
      // Handle part selection with new options
      let parts: string[];
      
      if (params.includeExtended) {
        parts = ['snippet', 'statistics', 'status', 'topicDetails'];
      } else {
        parts = params.includeParts || ['snippet', 'statistics'];
      }
      
      const videoParams: any = {
        part: parts.join(','),
        chart: 'mostPopular' as const,
        maxResults: params.maxResults || 25,
        regionCode: params.regionCode || 'US',
        videoCategoryId: params.videoCategoryId,
        pageToken: params.pageToken
      };
      
      // Add fields parameter if specified
      if (params.fields) {
        videoParams.fields = params.fields;
      }

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
