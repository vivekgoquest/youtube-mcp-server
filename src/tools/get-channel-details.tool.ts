import { ToolMetadata, ToolRunner } from '../interfaces/tool.js';
import { YouTubeClient } from '../youtube-client.js';
import { ToolResponse, Channel } from '../types.js';

interface GetChannelDetailsOptions {
  channelId: string;
  includeParts?: string[];
  includeBranding?: boolean;
  includeCompliance?: boolean;
  includeAll?: boolean;
  fields?: string;
}

export const metadata: ToolMetadata = {
  name: 'get_channel_details',
  description: 'Get detailed channel information including branding analysis (keywords, featured channels), topic categorization, compliance status, content ownership details, multilingual support, and privacy settings.',
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
          enum: ['snippet', 'statistics', 'contentDetails', 'brandingSettings', 'auditDetails', 'contentOwnerDetails', 'topicDetails', 'localizations', 'status']
        },
        description: 'Parts of channel data to include',
        default: ['snippet', 'statistics', 'contentDetails', 'brandingSettings', 'topicDetails']
      },
      includeBranding: {
        type: 'boolean',
        description: 'Include brandingSettings for keywords and featured channels',
        default: false
      },
      includeCompliance: {
        type: 'boolean',
        description: 'Include auditDetails for compliance status',
        default: false
      },
      includeAll: {
        type: 'boolean',
        description: 'Request all available parts',
        default: false
      },
      fields: {
        type: 'string',
        description: 'Optional field filter for response'
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

      // Handle part selection with new options
      let parts: string[] = [];
      
      if (options.includeAll) {
        parts = ['snippet', 'statistics', 'contentDetails', 'brandingSettings', 'auditDetails', 'contentOwnerDetails', 'topicDetails', 'localizations', 'status'];
      } else {
        parts = options.includeParts || ['snippet', 'statistics', 'contentDetails', 'brandingSettings', 'topicDetails'];
        
        // Add specific parts based on boolean flags
        if (options.includeBranding && !parts.includes('brandingSettings')) {
          parts.push('brandingSettings');
        }
        if (options.includeCompliance && !parts.includes('auditDetails')) {
          parts.push('auditDetails');
        }
      }
      
      const params: any = {
        part: parts.join(','),
        id: options.channelId
      };
      
      // Add fields parameter if specified
      if (options.fields) {
        params.fields = options.fields;
      }
      
      const result = await this.client.getChannels(params);

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
