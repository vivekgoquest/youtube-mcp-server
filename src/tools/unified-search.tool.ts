import { ToolMetadata, ToolRunner } from "../interfaces/tool.js";
import type {
  YouTubeApiResponse,
  SearchResult,
  UnifiedSearchParams,
  ToolResponse,
} from "../types.js";
import {
  validateSearchQuery,
  validateMaxResults,
  validateDateRange,
  validateEnrichmentParts,
  buildSearchParams,
} from "../utils/search-validation.js";
import { performEnrichment } from "../utils/search-enrichment.js";
import { calculateSearchQuota } from "../utils/quota-calculator.js";
import { ErrorHandler } from "../utils/error-handler.js";
import {
  DEFAULT_VIDEO_PARTS,
  DEFAULT_CHANNEL_PARTS,
  DEFAULT_PLAYLIST_PARTS,
} from "../config/constants.js";

export const metadata = {
  name: "unified_search",
  description: `Search YouTube for videos, channels, or playlists with optional enrichment and advanced filtering.

This tool combines basic and advanced search capabilities:
- Basic search by query or channelId
- Filter by type (video, channel, playlist)
- Advanced filters for upload date, duration, and sorting
- Optional enrichment with additional details using customizable parts
- Pagination support

Use enrichParts to fetch additional details for results. Default parts are used if not specified.

Quota Usage: Base search costs 100 units, plus enrichment costs if requested.`,
  version: "1.0.0",
  quotaCost: 100,
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Search query (required if channelId not provided)",
      },
      channelId: {
        type: "string",
        description:
          "Channel ID to search within (required if query not provided)",
      },
      type: {
        type: "string",
        enum: ["video", "channel", "playlist"],
        description: "Type of resource to search for",
        default: "video",
      },
      maxResults: {
        type: "number",
        description: "Maximum number of results (1-50)",
        default: 10,
        minimum: 1,
        maximum: 50,
      },
      order: {
        type: "string",
        enum: ["date", "rating", "relevance", "title", "viewCount"],
        description: "Sort order for results",
        default: "relevance",
      },
      publishedAfter: {
        type: "string",
        description:
          "ISO 8601 date - only include results published after this date",
      },
      publishedBefore: {
        type: "string",
        description:
          "ISO 8601 date - only include results published before this date",
      },
      videoDuration: {
        type: "string",
        enum: ["any", "long", "medium", "short"],
        description: "Filter by video duration (only applies to video search)",
      },
      regionCode: {
        type: "string",
        description:
          "ISO 3166-1 alpha-2 country code for region-specific results",
      },
      safeSearch: {
        type: "string",
        enum: ["moderate", "none", "strict"],
        description: "Safe search filtering level",
        default: "moderate",
      },
      pageToken: {
        type: "string",
        description: "Token for pagination",
      },
      filters: {
        type: "object",
        description: "Advanced filtering options",
        properties: {
          duration: {
            type: "string",
            enum: ["any", "long", "medium", "short"],
            description: "Video duration filter",
          },
          uploadDate: {
            type: "string",
            enum: ["any", "hour", "today", "week", "month", "year"],
            description: "Upload date filter",
          },
          sortBy: {
            type: "string",
            enum: ["relevance", "upload_date", "view_count", "rating"],
            description: "Sort order (overrides order parameter)",
          },
        },
      },
      enrichParts: {
        type: "object",
        description: "Parts to fetch for enrichment by resource type",
        properties: {
          video: {
            type: "array",
            items: {
              type: "string",
              enum: [
                "snippet",
                "contentDetails",
                "statistics",
                "status",
                "localizations",
                "topicDetails",
              ],
            },
            description: "Parts to fetch for video enrichment",
          },
          channel: {
            type: "array",
            items: {
              type: "string",
              enum: [
                "snippet",
                "contentDetails",
                "statistics",
                "status",
                "brandingSettings",
                "localizations",
              ],
            },
            description: "Parts to fetch for channel enrichment",
          },
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
    oneOf: [{ required: ["query"] }, { required: ["channelId"] }],
  },
};

export default class UnifiedSearchTool
  implements ToolRunner<UnifiedSearchParams, YouTubeApiResponse<SearchResult>>
{
  static metadata = metadata;
  constructor(private client: any) {}

  async run(
    params: UnifiedSearchParams,
  ): Promise<ToolResponse<YouTubeApiResponse<SearchResult>>> {
    const startTime = Date.now();

    // Calculate estimated quota usage upfront
    const estimatedQuota = calculateSearchQuota(params);
    let quotaUsed = 100; // Base search cost

    try {
      // Validate parameters
      validateMaxResults(params.maxResults);
      validateDateRange(params.publishedAfter, params.publishedBefore);
      validateEnrichmentParts(params.enrichParts, params.type);

      // Build search parameters
      const searchParams = buildSearchParams(params);

      // Execute search
      const searchResults = await this.client.search(searchParams);

      // Perform enrichment if requested
      if (params.enrichParts && searchResults.items.length > 0) {
        const quotaTracker = { quotaUsed: 0 };
        const type = params.type || "video";

        // Use the consolidated enrichment function
        searchResults.items = await performEnrichment(
          this.client,
          searchResults.items,
          params.enrichParts,
          type,
          quotaTracker,
        );

        quotaUsed += quotaTracker.quotaUsed;
      }

      return {
        success: true,
        data: searchResults,
        metadata: {
          quotaUsed,
          estimatedQuota,
          requestTime: Date.now() - startTime,
          source: "unified_search",
        },
      };
    } catch (error: any) {
      return ErrorHandler.handleToolError(error, {
        quotaUsed,
        estimatedQuota,
        startTime,
        source: "unified_search",
        defaultMessage: "Search failed",
      });
    }
  }
}
