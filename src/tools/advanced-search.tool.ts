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
  enrichDetails?: boolean | { parts: string[] };
}

export const metadata: ToolMetadata = {
  name: 'advanced_search',
  description: 'POWER SEARCH with advanced filters and optional enrichment. Filter by: video duration (short/medium/long), upload date (last hour/day/week/month/year), sort order (relevance/date/views/rating). Use this when basic search isn\'t enough. PERFECT for: finding fresh content (uploadDate: "today"), high-performing videos (sortBy: "view_count"), or specific video lengths. Combine filters to laser-target your research. Returns video/channel/playlist results based on type parameter. Multi-resource enrichment provides complete statistics and metadata.',
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
                  type: 'string'
                },
                description: 'Parts to fetch for enrichment'
              }
            }
          }
        ],
        description: 'Enrich search results with full resource details. Boolean or object with parts array.',
        default: false
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
      
      // Perform enrichment if requested
      let enrichedResponse = response;
      let totalQuotaUsed = 100; // Base search quota
      
      if (params.enrichDetails && response.items && response.items.length > 0) {
        // Group results by resource type
        const videoIds: string[] = [];
        const channelIds: string[] = [];
        const playlistIds: string[] = [];
        
        response.items.forEach(item => {
          if (item.id?.kind === 'youtube#video' && item.id?.videoId) {
            videoIds.push(item.id.videoId);
          } else if (item.id?.kind === 'youtube#channel' && item.id?.channelId) {
            channelIds.push(item.id.channelId);
          } else if (item.id?.kind === 'youtube#playlist' && item.id?.playlistId) {
            playlistIds.push(item.id.playlistId);
          }
        });
        
        // Determine parts based on resource type or use provided parts
        const videoParts = typeof params.enrichDetails === 'object' && params.enrichDetails.parts
          ? params.enrichDetails.parts
          : ['snippet', 'statistics', 'contentDetails', 'status', 'topicDetails'];
        
        const channelParts = typeof params.enrichDetails === 'object' && params.enrichDetails.parts
          ? params.enrichDetails.parts
          : ['snippet', 'statistics', 'contentDetails', 'brandingSettings', 'topicDetails'];
        
        const playlistParts = typeof params.enrichDetails === 'object' && params.enrichDetails.parts
          ? params.enrichDetails.parts
          : ['snippet', 'contentDetails', 'status'];
        
        // Fetch enriched data for each resource type
        const enrichedVideos: any[] = [];
        const enrichedChannels: any[] = [];
        const enrichedPlaylists: any[] = [];
        
        // Enrich videos
        if (videoIds.length > 0) {
          for (let i = 0; i < videoIds.length; i += 50) {
            const batch = videoIds.slice(i, i + 50);
            const videoDetails = await this.client.getVideos({
              part: videoParts.join(','),
              id: batch.join(',')
            });
            
            if (videoDetails.items) {
              enrichedVideos.push(...videoDetails.items);
            }
            totalQuotaUsed += 1;
          }
        }
        
        // Enrich channels
        if (channelIds.length > 0) {
          for (let i = 0; i < channelIds.length; i += 50) {
            const batch = channelIds.slice(i, i + 50);
            const channelDetails = await this.client.getChannels({
              part: channelParts.join(','),
              id: batch.join(',')
            });
            
            if (channelDetails.items) {
              enrichedChannels.push(...channelDetails.items);
            }
            totalQuotaUsed += 1;
          }
        }
        
        // Enrich playlists
        if (playlistIds.length > 0) {
          for (let i = 0; i < playlistIds.length; i += 50) {
            const batch = playlistIds.slice(i, i + 50);
            const playlistDetails = await this.client.getPlaylists({
              part: playlistParts.join(','),
              id: batch.join(',')
            });
            
            if (playlistDetails.items) {
              enrichedPlaylists.push(...playlistDetails.items);
            }
            totalQuotaUsed += 1;
          }
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
                  ...enrichedVideo
                };
              }
            } else if (searchItem.id?.kind === 'youtube#channel' && searchItem.id?.channelId) {
              const enrichedChannel = enrichedChannels.find(c => c.id === searchItem.id!.channelId);
              if (enrichedChannel) {
                return {
                  ...searchItem,
                  ...enrichedChannel
                };
              }
            } else if (searchItem.id?.kind === 'youtube#playlist' && searchItem.id?.playlistId) {
              const enrichedPlaylist = enrichedPlaylists.find(p => p.id === searchItem.id!.playlistId);
              if (enrichedPlaylist) {
                return {
                  ...searchItem,
                  ...enrichedPlaylist
                };
              }
            }
            return searchItem;
          })
        };
      }

      return {
        success: true,
        data: enrichedResponse,
        metadata: {
          quotaUsed: totalQuotaUsed,
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
