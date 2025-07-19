import { ToolMetadata, ToolRunner } from '../interfaces/tool.js';
import { YouTubeClient } from '../youtube-client.js';
import { ToolResponse, Video } from '../types.js';

interface GetVideoDetailsOptions {
  videoId: string;
  includeParts?: string[];
}

export const metadata: ToolMetadata = {
  name: 'get_video_details',
  description: 'Get detailed information about a specific YouTube video including statistics, content details, and snippet information.',
  inputSchema: {
    type: 'object',
    properties: {
      videoId: {
        type: 'string',
        description: 'YouTube video ID'
      },
      includeParts: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['snippet', 'statistics', 'contentDetails']
        },
        description: 'Parts of video data to include',
        default: ['snippet', 'statistics', 'contentDetails']
      }
    },
    required: ['videoId']
  },
  quotaCost: 1
};

export default class GetVideoDetailsTool implements ToolRunner<GetVideoDetailsOptions, Video> {
  constructor(private client: YouTubeClient) {}

  async run(options: GetVideoDetailsOptions): Promise<ToolResponse<Video>> {
    try {
      if (!options.videoId) {
        return {
          success: false,
          error: 'Video ID parameter is required',
          metadata: {
            quotaUsed: 0,
            requestTime: 0,
            source: 'get-video-details'
          }
        };
      }

      const parts = options.includeParts || ['snippet', 'statistics', 'contentDetails'];
      const result = await this.client.getVideos({
        part: parts.join(','),
        id: options.videoId
      });

      if (result.items.length === 0) {
        return {
          success: false,
          error: `Video with ID '${options.videoId}' not found`,
          metadata: {
            quotaUsed: 1,
            requestTime: 0,
            source: 'get-video-details'
          }
        };
      }

      const video = result.items[0];
      
      return {
        success: true,
        data: video,
        metadata: {
          quotaUsed: 1,
          requestTime: 0,
          source: 'get-video-details'
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        metadata: {
          quotaUsed: 1,
          requestTime: 0,
          source: 'get-video-details'
        }
      };
    }
  }
}