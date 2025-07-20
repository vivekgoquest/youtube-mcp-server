import { ToolMetadata, ToolRunner } from '../interfaces/tool.js';
import { YouTubeClient } from '../youtube-client.js';
import { ToolResponse, SearchVideosParams, YouTubeApiResponse, SearchResult } from '../types.js';

export const metadata: ToolMetadata = {
  name: 'search_videos',
  description: 'Search for YouTube videos with optional enrichment for full details. Search enrichment adds ~1 quota unit per result but provides complete video statistics, content details, and metadata. START HERE when researching any topic on YouTube.',
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
                  enum: ['snippet', 'statistics', 'contentDetails', 'status', 'topicDetails', 'recordingDetails', 'liveStreamingDetails', 'player', 'localizations', 'fileDetails', 'processingDetails', 'suggestions']
                },
                default: ['snippet', 'statistics', 'contentDetails', 'status', 'topicDetails']
              }
            }
          }
        ],
        description: 'Enrich search results with full video details. Boolean or object with parts array.',
        default: false
      }
    }
  },
  quotaCost: 100
};

export default class SearchVideosTool implements ToolRunner<SearchVideosParams & { enrichDetails?: boolean | { parts: string[] } }, YouTubeApiResponse<SearchResult>> {
  constructor(private client: YouTubeClient) {}

  async run(params: SearchVideosParams & { enrichDetails?: boolean | { parts: string[] } }): Promise<ToolResponse<YouTubeApiResponse<SearchResult>>> {
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
      
      // Perform enrichment if requested
      let enrichedResponse = response;
      let totalQuotaUsed = 100; // Base search quota
      
      if (params.enrichDetails && response.items && response.items.length > 0) {
        // Extract video IDs from search results
        const videoIds = response.items
          .filter(item => item.id?.kind === 'youtube#video' && item.id?.videoId)
          .map(item => item.id!.videoId!);
        
        if (videoIds.length > 0) {
          // Determine parts to fetch
          const parts = typeof params.enrichDetails === 'object' && params.enrichDetails.parts
            ? params.enrichDetails.parts
            : ['snippet', 'statistics', 'contentDetails', 'status', 'topicDetails'];
          
          // Batch video IDs (YouTube API allows up to 50 per request)
          const enrichedVideos: any[] = [];
          for (let i = 0; i < videoIds.length; i += 50) {
            const batch = videoIds.slice(i, i + 50);
            const videoDetails = await this.client.getVideos({
              part: parts.join(','),
              id: batch.join(',')
            });
            
            if (videoDetails.items) {
              enrichedVideos.push(...videoDetails.items);
            }
            
            // Add quota for each batch (1 unit per batch)
            totalQuotaUsed += 1;
          }
          
          // Merge enriched data back into search results
          enrichedResponse = {
            ...response,
            items: response.items.map(searchItem => {
              if (searchItem.id?.kind === 'youtube#video' && searchItem.id?.videoId) {
                const enrichedVideo = enrichedVideos.find(v => v.id === searchItem.id!.videoId);
                if (enrichedVideo) {
                  return {
                    ...searchItem,
                    snippet: enrichedVideo.snippet || searchItem.snippet,
                    statistics: enrichedVideo.statistics,
                    contentDetails: enrichedVideo.contentDetails,
                    status: enrichedVideo.status,
                    topicDetails: enrichedVideo.topicDetails,
                    recordingDetails: enrichedVideo.recordingDetails,
                    liveStreamingDetails: enrichedVideo.liveStreamingDetails,
                    player: enrichedVideo.player,
                    localizations: enrichedVideo.localizations,
                    fileDetails: enrichedVideo.fileDetails,
                    processingDetails: enrichedVideo.processingDetails,
                    suggestions: enrichedVideo.suggestions
                  };
                }
              }
              return searchItem;
            })
          };
        }
      }
      
      // Debug: Log response
      if (process.env.DEBUG_CONSOLE === 'true') {
        console.error('YouTube API response:', JSON.stringify(enrichedResponse, null, 2));
      }

      return {
        success: true,
        data: enrichedResponse,
        metadata: {
          quotaUsed: totalQuotaUsed,
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
