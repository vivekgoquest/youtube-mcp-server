import { ToolMetadata, ToolRunner } from '../interfaces/tool.js';
import { YouTubeClient } from '../youtube-client.js';
import { ToolResponse, SearchChannelsParams, YouTubeApiResponse, SearchResult } from '../types.js';

export const metadata: ToolMetadata = {
  name: 'search_channels',
  description: 'Search for YouTube channels with optional enrichment for full details. Channel enrichment provides subscriber counts, branding analysis, topic categorization, and compliance status.',
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
      },
      enrichDetails: {
        oneOf: [
          { type: 'boolean' },
          {
            type: 'object',
            properties: {
              parts: {
                type: 'array',
                items: {
                  type: 'string',
                  enum: ['snippet', 'statistics', 'contentDetails', 'brandingSettings', 'topicDetails', 'status', 'auditDetails', 'contentOwnerDetails', 'localizations']
                },
                default: ['snippet', 'statistics', 'contentDetails', 'brandingSettings', 'topicDetails']
              }
            }
          }
        ],
        description: 'Enrich search results with full channel details. Boolean or object with parts array.',
        default: false
      }
    },
    required: ['query']
  },
  quotaCost: 100
};

export default class SearchChannelsTool implements ToolRunner<SearchChannelsParams & { enrichDetails?: boolean | { parts: string[] } }, YouTubeApiResponse<SearchResult>> {
  constructor(private client: YouTubeClient) {}

  async run(params: SearchChannelsParams & { enrichDetails?: boolean | { parts: string[] } }): Promise<ToolResponse<YouTubeApiResponse<SearchResult>>> {
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
      
      // Perform enrichment if requested
      let enrichedResponse = response;
      let totalQuotaUsed = 100; // Base search quota
      
      if (params.enrichDetails && response.items && response.items.length > 0) {
        // Extract channel IDs from search results
        const channelIds = response.items
          .filter(item => item.id?.kind === 'youtube#channel' && item.id?.channelId)
          .map(item => item.id!.channelId!);
        
        if (channelIds.length > 0) {
          // Determine parts to fetch
          const parts = typeof params.enrichDetails === 'object' && params.enrichDetails.parts
            ? params.enrichDetails.parts
            : ['snippet', 'statistics', 'contentDetails', 'brandingSettings', 'topicDetails'];
          
          // Batch channel IDs (YouTube API allows up to 50 per request)
          const enrichedChannels: any[] = [];
          for (let i = 0; i < channelIds.length; i += 50) {
            const batch = channelIds.slice(i, i + 50);
            const channelDetails = await this.client.getChannels({
              part: parts.join(','),
              id: batch.join(',')
            });
            
            if (channelDetails.items) {
              enrichedChannels.push(...channelDetails.items);
            }
            
            // Add quota for each batch (1 unit per batch)
            totalQuotaUsed += 1;
          }
          
          // Merge enriched data back into search results
          enrichedResponse = {
            ...response,
            items: response.items.map(searchItem => {
              if (searchItem.id?.kind === 'youtube#channel' && searchItem.id?.channelId) {
                const enrichedChannel = enrichedChannels.find(c => c.id === searchItem.id!.channelId);
                if (enrichedChannel) {
                  return {
                    ...searchItem,
                    snippet: enrichedChannel.snippet || searchItem.snippet,
                    statistics: enrichedChannel.statistics,
                    contentDetails: enrichedChannel.contentDetails,
                    brandingSettings: enrichedChannel.brandingSettings,
                    topicDetails: enrichedChannel.topicDetails,
                    status: enrichedChannel.status,
                    auditDetails: enrichedChannel.auditDetails,
                    contentOwnerDetails: enrichedChannel.contentOwnerDetails,
                    localizations: enrichedChannel.localizations
                  };
                }
              }
              return searchItem;
            })
          };
        }
      }

      return {
        success: true,
        data: enrichedResponse,
        metadata: {
          quotaUsed: totalQuotaUsed,
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
