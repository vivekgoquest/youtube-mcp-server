import { ToolMetadata, ToolRunner } from '../interfaces/tool.js';
import { YouTubeClient } from '../youtube-client.js';
import { ToolResponse, Playlist } from '../types.js';

interface GetPlaylistDetailsOptions {
  playlistId: string;
  includeParts?: string[];
}

export const metadata: ToolMetadata = {
  name: 'get_playlist_details',
  description: 'Get detailed information about a YouTube playlist.',
  inputSchema: {
    type: 'object',
    properties: {
      playlistId: {
        type: 'string',
        description: 'YouTube playlist ID'
      },
      includeParts: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['snippet', 'contentDetails']
        },
        description: 'Parts of playlist data to include',
        default: ['snippet', 'contentDetails']
      }
    },
    required: ['playlistId']
  },
  quotaCost: 1
};

export default class GetPlaylistDetailsTool implements ToolRunner<GetPlaylistDetailsOptions, Playlist> {
  constructor(private client: YouTubeClient) {}

  async run(options: GetPlaylistDetailsOptions): Promise<ToolResponse<Playlist>> {
    try {
      if (!options.playlistId) {
        return {
          success: false,
          error: 'Playlist ID parameter is required',
          metadata: {
            quotaUsed: 0,
            requestTime: 0,
            source: 'get-playlist-details'
          }
        };
      }

      const parts = options.includeParts || ['snippet', 'contentDetails'];
      const result = await this.client.getPlaylists({
        part: parts.join(','),
        id: options.playlistId
      });

      if (result.items.length === 0) {
        return {
          success: false,
          error: `Playlist with ID '${options.playlistId}' not found`,
          metadata: {
            quotaUsed: 1,
            requestTime: 0,
            source: 'get-playlist-details'
          }
        };
      }

      const playlist = result.items[0];
      
      return {
        success: true,
        data: playlist,
        metadata: {
          quotaUsed: 1,
          requestTime: 0,
          source: 'get-playlist-details'
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        metadata: {
          quotaUsed: 1,
          requestTime: 0,
          source: 'get-playlist-details'
        }
      };
    }
  }
}