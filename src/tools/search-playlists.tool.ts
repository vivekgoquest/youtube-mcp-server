import { ToolMetadata, ToolRunner } from '../interfaces/tool.js';
import { YouTubeClient } from '../youtube-client.js';
import { ToolResponse, SearchPlaylistsParams, YouTubeApiResponse, SearchResult } from '../types.js';

export const metadata: ToolMetadata = {
  name: 'search_playlists',
  description: 'Search for YouTube playlists with optional enrichment for full details. Playlist enrichment provides video counts, privacy status, and multilingual metadata.',
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
                  enum: ['snippet', 'contentDetails', 'status', 'player', 'localizations']
                },
                default: ['snippet', 'contentDetails', 'status', 'localizations']
              }
            }
          }
        ],
        description: 'Enrich search results with full playlist details. Boolean or object with parts array.',
        default: false
      }
    }
  },
  quotaCost: 100
};

export default class SearchPlaylistsTool implements ToolRunner<SearchPlaylistsParams & { enrichDetails?: boolean | { parts: string[] } }, YouTubeApiResponse<SearchResult>> {
  constructor(private client: YouTubeClient) {}

  async run(params: SearchPlaylistsParams & { enrichDetails?: boolean | { parts: string[] } }): Promise<ToolResponse<YouTubeApiResponse<SearchResult>>> {
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
      
      // Perform enrichment if requested
      let enrichedResponse = response;
      let totalQuotaUsed = 100; // Base search quota
      
      if (params.enrichDetails && response.items && response.items.length > 0) {
        // Extract playlist IDs from search results
        const playlistIds = response.items
          .filter(item => item.id?.kind === 'youtube#playlist' && item.id?.playlistId)
          .map(item => item.id!.playlistId!);
        
        if (playlistIds.length > 0) {
          // Determine parts to fetch
          const parts = typeof params.enrichDetails === 'object' && params.enrichDetails.parts
            ? params.enrichDetails.parts
            : ['snippet', 'contentDetails', 'status', 'localizations'];
          
          // Batch playlist IDs (YouTube API allows up to 50 per request)
          const enrichedPlaylists: any[] = [];
          for (let i = 0; i < playlistIds.length; i += 50) {
            const batch = playlistIds.slice(i, i + 50);
            const playlistDetails = await this.client.getPlaylists({
              part: parts.join(','),
              id: batch.join(',')
            });
            
            if (playlistDetails.items) {
              enrichedPlaylists.push(...playlistDetails.items);
            }
            
            // Add quota for each batch (1 unit per batch)
            totalQuotaUsed += 1;
          }
          
          // Merge enriched data back into search results
          enrichedResponse = {
            ...response,
            items: response.items.map(searchItem => {
              if (searchItem.id?.kind === 'youtube#playlist' && searchItem.id?.playlistId) {
                const enrichedPlaylist = enrichedPlaylists.find(p => p.id === searchItem.id!.playlistId);
                if (enrichedPlaylist) {
                  return {
                    ...searchItem,
                    snippet: enrichedPlaylist.snippet || searchItem.snippet,
                    contentDetails: enrichedPlaylist.contentDetails,
                    status: enrichedPlaylist.status,
                    player: enrichedPlaylist.player,
                    localizations: enrichedPlaylist.localizations
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
