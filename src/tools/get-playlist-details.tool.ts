import type { ToolMetadata } from "../interfaces/tool.js";
import { Tool } from "../interfaces/tool.js";
import { YouTubeClient } from "../youtube-client.js";
import type { ToolResponse } from "../types.js";
import { ResponseFormatters } from "../utils/response-formatters.js";
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
};

export default class GetPlaylistDetailsTool extends Tool<GetPlaylistDetailsOptions, string> {
  constructor(private client: YouTubeClient) {
    super();
  }

  async execute(options: GetPlaylistDetailsOptions): Promise<ToolResponse<string>> {
    if (!options.playlistId) {
      return {
        success: false,
        error: "Playlist ID parameter is required",
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
        };
      }

      const playlist = result.items[0];
      if (!playlist) {
        return {
          success: false,
          error: `Playlist with ID '${options.playlistId}' not found`,
        };
      }

      // Format the playlist details
      let output = ResponseFormatters.sectionHeader("📋", "Playlist Details");
      output += "\n";

      if (playlist.snippet) {
        if (playlist.snippet.title) {
          output += ResponseFormatters.keyValue("Title", playlist.snippet.title);
        }
        if (playlist.snippet.channelTitle) {
          output += ResponseFormatters.keyValue("Channel", playlist.snippet.channelTitle);
        }
        if (playlist.snippet.publishedAt) {
          output += ResponseFormatters.keyValue("Created", ResponseFormatters.formatDate(playlist.snippet.publishedAt));
        }
        if (playlist.snippet.description) {
          output += ResponseFormatters.keyValue("Description", ResponseFormatters.truncateText(playlist.snippet.description, 300));
        }
        output += "\n";
      }

      if (playlist.contentDetails) {
        output += ResponseFormatters.sectionHeader("📊", "Content Details");
        if (playlist.contentDetails.itemCount !== undefined) {
          output += ResponseFormatters.bulletPoint("Total Videos", playlist.contentDetails.itemCount.toString());
        }
        output += "\n";
      }

      if (playlist.status) {
        output += ResponseFormatters.sectionHeader("🔒", "Status");
        if (playlist.status.privacyStatus) {
          output += ResponseFormatters.bulletPoint("Privacy Status", playlist.status.privacyStatus);
        }
        output += "\n";
      }

      if (playlist.player?.embedHtml) {
        output += ResponseFormatters.sectionHeader("🎬", "Embed Player");
        output += ResponseFormatters.keyValue("Embed Available", "Yes");
        output += "\n";
      }

      if (playlist.localizations && Object.keys(playlist.localizations).length > 0) {
        output += ResponseFormatters.sectionHeader("🌐", "Localizations");
        Object.entries(playlist.localizations).forEach(([lang, localization]) => {
          output += ResponseFormatters.bulletPoint(lang.toUpperCase(), localization.title);
        });
        output += "\n";
      }

      output += ResponseFormatters.sectionHeader("🔗", "Links");
      if (playlist.id) {
        output += ResponseFormatters.bulletPoint("Playlist URL", ResponseFormatters.getYouTubeUrl("playlist", playlist.id));
      }
      if (playlist.snippet?.channelId) {
        output += ResponseFormatters.bulletPoint("Channel URL", ResponseFormatters.getYouTubeUrl("channel", playlist.snippet.channelId));
      }

      return {
        success: true,
        data: output,
      };
  }
}
