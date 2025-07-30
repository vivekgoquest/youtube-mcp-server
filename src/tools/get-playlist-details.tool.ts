import { ToolMetadata, ToolRunner } from "../interfaces/tool.js";
import { YouTubeClient } from "../youtube-client.js";
import { ToolResponse, Playlist } from "../types.js";
import { ErrorHandler } from "../utils/error-handler.js";
import { DEFAULT_PLAYLIST_PARTS } from "../config/constants.js";

interface GetPlaylistDetailsOptions {
  playlistId: string;
  includeParts?: string[];
  includeAll?: boolean;
  fields?: string;
}

export const metadata: ToolMetadata = {
  name: "get_playlist_details",
  description:
    "Get comprehensive playlist information including privacy status for access control analysis, embed code generation for integration, and multilingual support for international content.",
  inputSchema: {
    type: "object",
    properties: {
      playlistId: {
        type: "string",
        description: "YouTube playlist ID",
      },
      includeParts: {
        type: "array",
        items: {
          type: "string",
          enum: [
            "snippet",
            "contentDetails",
            "status",
            "player",
            "localizations",
          ],
        },
        description: "Parts of playlist data to include",
        default: DEFAULT_PLAYLIST_PARTS,
      },
      includeAll: {
        type: "boolean",
        description: "Request all available parts",
        default: false,
      },
      fields: {
        type: "string",
        description: "Optional field filter for response",
      },
    },
    required: ["playlistId"],
  },
  quotaCost: 1,
};

export default class GetPlaylistDetailsTool
  implements ToolRunner<GetPlaylistDetailsOptions, Playlist>
{
  constructor(private client: YouTubeClient) {}

  async run(
    options: GetPlaylistDetailsOptions,
  ): Promise<ToolResponse<Playlist>> {
    const startTime = Date.now();
    try {
      if (!options.playlistId) {
        return {
          success: false,
          error: "Playlist ID parameter is required",
          metadata: {
            quotaUsed: 0,
            requestTime: 0,
            source: "get-playlist-details",
          },
        };
      }

      // Handle part selection with new options
      let parts: string[];

      if (options.includeAll) {
        parts = [
          "snippet",
          "contentDetails",
          "status",
          "player",
          "localizations",
        ];
      } else {
        parts = options.includeParts || ["snippet", "contentDetails", "status"];
      }

      const params: any = {
        part: parts.join(","),
        id: options.playlistId,
      };

      // Add fields parameter if specified
      if (options.fields) {
        params.fields = options.fields;
      }

      const result = await this.client.getPlaylists(params);

      if (result.items.length === 0) {
        return {
          success: false,
          error: `Playlist with ID '${options.playlistId}' not found`,
          metadata: {
            quotaUsed: 1,
            requestTime: 0,
            source: "get-playlist-details",
          },
        };
      }

      const playlist = result.items[0];

      return {
        success: true,
        data: playlist,
        metadata: {
          quotaUsed: 1,
          requestTime: 0,
          source: "get-playlist-details",
        },
      };
    } catch (error) {
      return ErrorHandler.handleToolError<Playlist>(error, {
        quotaUsed: 1,
        startTime,
        source: "get-playlist-details",
      });
    }
  }
}
