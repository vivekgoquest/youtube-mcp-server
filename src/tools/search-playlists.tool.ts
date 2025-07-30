import { ToolMetadata, ToolRunner } from "../interfaces/tool.js";
import { YouTubeClient } from "../youtube-client.js";
import {
  ToolResponse,
  SearchPlaylistsParams,
  YouTubeApiResponse,
  SearchResult,
} from "../types.js";
import { ErrorHandler } from "../utils/error-handler.js";
import {
  DEFAULT_PLAYLIST_PARTS,
  YOUTUBE_API_BATCH_SIZE,
} from "../config/constants.js";
import { performEnrichment } from "../utils/search-enrichment.js";

export const metadata: ToolMetadata = {
  name: "search_playlists",
  description:
    "Search for YouTube playlists with optional enrichment for full details. Playlist enrichment provides video counts, privacy status, and multilingual metadata.",
  quotaCost: 100,
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Search query for playlists",
      },
      channelId: {
        type: "string",
        description: "Restrict search to specific channel ID",
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

export default class SearchPlaylistsTool
  implements
    ToolRunner<
      SearchPlaylistsParams & { enrichParts?: { playlist?: string[] } },
      YouTubeApiResponse<SearchResult>
    >
{
  constructor(private client: YouTubeClient) {}

  async run(
    params: SearchPlaylistsParams & { enrichParts?: { playlist?: string[] } },
  ): Promise<ToolResponse<YouTubeApiResponse<SearchResult>>> {
    const startTime = Date.now();
    try {
      if (!params.query && !params.channelId) {
        return ErrorHandler.handleValidationError(
          "Either query or channelId must be provided",
          "search-playlists",
        );
      }

      const searchParams = {
        part: "snippet",
        type: "playlist" as const,
        q: params.query,
        channelId: params.channelId,
        maxResults: params.maxResults || 25,
        order: params.order || "relevance",
        regionCode: params.regionCode,
        pageToken: params.pageToken,
      };

      // Remove undefined values
      Object.keys(searchParams).forEach((key) => {
        if (searchParams[key as keyof typeof searchParams] === undefined) {
          delete searchParams[key as keyof typeof searchParams];
        }
      });

      const response = await this.client.search(searchParams);

      // Perform enrichment if requested
      let enrichedResponse = response;
      let totalQuotaUsed = 100; // Base search quota

      if (params.enrichParts && response.items && response.items.length > 0) {
        const quotaTracker = { quotaUsed: 0 };

        // Use the consolidated enrichment function
        enrichedResponse = {
          ...response,
          items: await performEnrichment(
            this.client,
            response.items,
            params.enrichParts,
            "playlist",
            quotaTracker,
          ),
        };

        totalQuotaUsed += quotaTracker.quotaUsed;
      }

      return {
        success: true,
        data: enrichedResponse,
        metadata: {
          quotaUsed: totalQuotaUsed,
          requestTime: 0,
          source: "youtube-search-playlists",
        },
      };
    } catch (error) {
      return ErrorHandler.handleToolError<YouTubeApiResponse<SearchResult>>(
        error,
        {
          quotaUsed: 100,
          startTime,
          source: "youtube-search-playlists",
          defaultMessage: "Failed to search playlists",
        },
      );
    }
  }
}
