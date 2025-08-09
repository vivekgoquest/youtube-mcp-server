import type { ToolMetadata } from "../interfaces/tool.js";
import { Tool } from "../interfaces/tool.js";
import { YouTubeClient } from "../youtube-client.js";
import type { ToolResponse, SearchPlaylistsParams } from "../types.js";
import { ResponseFormatters } from "../utils/response-formatters.js";
import { performEnrichment } from "../utils/search-enrichment.js";

export const metadata: ToolMetadata = {
  name: "search_playlists",
  description:
    "Search for YouTube playlists with optional enrichment for full details. Playlist enrichment provides video counts, privacy status, and multilingual metadata.",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Search query for playlists (required if channelId not provided)",
      },
      channelId: {
        type: "string",
        description: "Restrict search to a channel ID (required if query not provided)",
      },
      maxResults: {
        type: "integer",
        description: "Maximum number of results to return (1-50)",
        minimum: 1,
        maximum: 50,
        default: 25,
      },
      order: {
        type: "string",
        enum: ["date", "relevance", "title", "videoCount", "viewCount"],
        description: "Order of results",
        default: "relevance",
      },
      regionCode: {
        type: "string",
        description: "Return results for specific region (ISO 3166-1 alpha-2)",
      },
      enrichParts: {
        type: "object",
        description: "Parts to fetch for enrichment by resource type",
        properties: {
          playlist: {
            type: "array",
            items: {
              type: "string",
              enum: ["snippet", "contentDetails", "status", "localizations"],
            },
            description: "Parts to fetch for playlist enrichment",
          },
        },
      },
    },
  },
};

interface SearchPlaylistsOptions extends SearchPlaylistsParams {
  enrichParts?: { playlist?: string[] | undefined } | undefined;
}

export default class SearchPlaylistsTool extends Tool<SearchPlaylistsOptions, string> {
  constructor(private client: YouTubeClient) {
    super();
  }

  async execute(params: SearchPlaylistsOptions): Promise<ToolResponse<string>> {
    const trimmedQuery = params.query?.trim();
    const trimmedChannelId = params.channelId?.trim();
    
    if (!trimmedQuery && !trimmedChannelId) {
      return {
        success: false,
        error: "Either query or channelId must be provided (non-empty)",
      };
    }

      const searchParams: any = {
        part: "snippet",
        type: "playlist" as const,
        maxResults: params.maxResults || 25,
        order: params.order || "relevance",
      };

      // Only add optional properties if they have values
      if (trimmedQuery) {
        searchParams.q = trimmedQuery;
      }
      if (trimmedChannelId) {
        searchParams.channelId = trimmedChannelId;
      }
      if (params.regionCode) {
        searchParams.regionCode = params.regionCode;
      }
      if (params.pageToken) {
        searchParams.pageToken = params.pageToken;
      }

      const response = await this.client.search(searchParams);

      // Perform enrichment if requested
      let enrichedResponse = response;

      if (params.enrichParts && response.items && response.items.length > 0) {
        // Build enrichParts object only with defined values
        const enrichPartsObj: { playlist?: string[] } = {};
        if (params.enrichParts.playlist) {
          enrichPartsObj.playlist = params.enrichParts.playlist;
        }
        // Use the consolidated enrichment function
        enrichedResponse = {
          ...response,
          items: await performEnrichment(
            this.client,
            response.items,
            enrichPartsObj,
            "playlist",
          ),
        };
      }

      if (!enrichedResponse.items || enrichedResponse.items.length === 0) {
        const searchContext = trimmedQuery 
          ? `matching "${trimmedQuery}"`
          : `for channel ${trimmedChannelId}`;
        return {
          success: false,
          error: `No playlists found ${searchContext}`,
        };
      }

      // Format the playlist search results
      let output = ResponseFormatters.sectionHeader("🎵", `Playlist Search Results`);
      
      if (trimmedQuery) {
        output += ResponseFormatters.keyValue("Query", trimmedQuery);
      }
      if (trimmedChannelId) {
        output += ResponseFormatters.keyValue("Channel ID", trimmedChannelId);
      }
      output += ResponseFormatters.keyValue("Results", enrichedResponse.items.length.toString());
      if (params.regionCode) {
        output += ResponseFormatters.keyValue("Region", params.regionCode);
      }
      output += "\n";

      enrichedResponse.items.forEach((item: any, index) => {
        output += ResponseFormatters.numberedItem(index + 1, `**${item.snippet?.title || "Unknown Playlist"}**`);
        
        if (item.snippet?.channelTitle) {
          output += ResponseFormatters.keyValue("Channel", item.snippet.channelTitle, 3);
        }
        
        if (item.snippet?.publishedAt) {
          output += ResponseFormatters.keyValue("Created", ResponseFormatters.formatDate(item.snippet.publishedAt), 3);
        }
        
        if (item.snippet?.description) {
          output += ResponseFormatters.keyValue("Description", ResponseFormatters.truncateText(item.snippet.description, 150), 3);
        }
        
        // If enriched with content details
        if (item.contentDetails?.itemCount !== undefined) {
          output += ResponseFormatters.keyValue("Videos", item.contentDetails.itemCount.toString(), 3);
        }
        
        // If enriched with status
        if (item.status?.privacyStatus) {
          output += ResponseFormatters.keyValue("Privacy", item.status.privacyStatus, 3);
        }
        
        if (item.id?.playlistId) {
          output += ResponseFormatters.keyValue("URL", ResponseFormatters.getYouTubeUrl("playlist", item.id.playlistId), 3);
        }
        
        output += "\n";
      });

      // Add pagination info if available
      if (enrichedResponse.nextPageToken) {
        output += ResponseFormatters.sectionHeader("📄", "Pagination");
        output += ResponseFormatters.keyValue("Next Page Token", enrichedResponse.nextPageToken);
        output += ResponseFormatters.keyValue("Total Results", enrichedResponse.pageInfo?.totalResults?.toString() || "Unknown");
      }

      return {
        success: true,
        data: output,
      };
  }
}
