import { ToolMetadata, ToolRunner } from '../interfaces/tool.js';
import { YouTubeClient } from '../youtube-client.js';
import { ToolResponse, Channel } from '../types.js';

interface GetChannelDetailsOptions {
  channelId: string;
  includeParts?: string[];
}

export const metadata: ToolMetadata = {
  name: 'get_channel_details',
  description: 'Get detailed information about a YouTube channel including statistics and content details.',
  inputSchema: {
    type: 'object',
    properties: {
      channelId: {
        type: 'string',
        description: 'YouTube channel ID'
      },
      includeParts: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['snippet', 'statistics', 'contentDetails']
        },
        description: 'Parts of channel data to include',
        default: ['snippet', 'statistics', 'contentDetails']
      }
    },
    required: ['channelId']
  },
  quotaCost: 1
};

export default class GetChannelDetailsTool implements ToolRunner<GetChannelDetailsOptions, Channel> {
  constructor(private client: YouTubeClient) {}

  async run(options: GetChannelDetailsOptions): Promise<ToolResponse<Channel>> {
    try {
      if (!options.channelId) {
        return {
          success: false,
          error: 'Channel ID parameter is required',
          metadata: {
            quotaUsed: 0,
            requestTime: 0,
            source: 'get-channel-details'
          }
        };
      }

      const parts = options.includeParts || ['snippet', 'statistics', 'contentDetails'];
      const result = await this.client.getChannels({
        part: parts.join(','),
        id: options.channelId
      });

      if (result.items.length === 0) {
        return {
          success: false,
          error: `Channel with ID '${options.channelId}' not found`,
          metadata: {
            quotaUsed: 1,
            requestTime: 0,
            source: 'get-channel-details'
          }
        };
      }

      const channel = result.items[0];
      
      return {
        success: true,
        data: channel,
        metadata: {
          quotaUsed: 1,
          requestTime: 0,
          source: 'get-channel-details'
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        metadata: {
          quotaUsed: 1,
          requestTime: 0,
          source: 'get-channel-details'
        }
      };
    }
  }
}