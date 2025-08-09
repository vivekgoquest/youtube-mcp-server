import { Tool } from "../interfaces/tool.js";
import type {
  UnifiedSearchParams,
  ToolResponse,
} from "../types.js";
import {
  validateMaxResults,
  validateDateRange,
  validateEnrichmentParts,
  buildSearchParams,
} from "../utils/search-validation.js";
import { performEnrichment } from "../utils/search-enrichment.js";
import { ResponseFormatters } from "../utils/response-formatters.js";

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

export default class UnifiedSearchTool extends Tool<UnifiedSearchParams, string> {
  static metadata = metadata;
  constructor(private client: any) {
    super();
  }

  protected async execute(
    params: UnifiedSearchParams,
  ): Promise<ToolResponse<string>> {
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
      const type = params.type || "video";

      // Use the consolidated enrichment function
      searchResults.items = await performEnrichment(
        this.client,
        searchResults.items,
        params.enrichParts,
        type,
      );
    }

    // Format the results
    const searchType = searchResults.items[0]?.id?.videoId
      ? "videos"
      : searchResults.items[0]?.id?.channelId
        ? "channels"
        : searchResults.items[0]?.id?.playlistId
          ? "playlists"
          : "results";
    
    const formattedResult = this.formatSearchResults(searchResults.items, searchType, params);

    return {
      success: true,
      data: formattedResult,
    };
  }

  private formatSearchResults(items: any[], type: string, params: UnifiedSearchParams): string {
    if (items.length === 0) {
      return ResponseFormatters.sectionHeader("🔍", `No ${type} found matching your search criteria.`);
    }

    let output = ResponseFormatters.sectionHeader("🔍", "Search Results");
    
    if (params.query) {
      output += ResponseFormatters.keyValue("Query", params.query);
    }
    if (params.channelId) {
      output += ResponseFormatters.keyValue("Channel Filter", params.channelId);
    }
    output += ResponseFormatters.keyValue("Type", type);
    output += ResponseFormatters.keyValue("Results", items.length.toString());
    if (params.regionCode) {
      output += ResponseFormatters.keyValue("Region", params.regionCode);
    }
    output += "\n";

    items.forEach((item, index) => {
      output += ResponseFormatters.numberedItem(index + 1, `**${item.snippet?.title || "Untitled"}**`);

      // Handle different result types appropriately
      if (type === "channels") {
        // For channel results, show subscriber count if available from enriched data
        if (item.statistics?.subscriberCount) {
          output += ResponseFormatters.keyValue("Subscribers", ResponseFormatters.formatNumber(item.statistics.subscriberCount), 3);
        }
        if (item.statistics?.videoCount) {
          output += ResponseFormatters.keyValue("Videos", ResponseFormatters.formatNumber(item.statistics.videoCount), 3);
        }
      } else {
        // For video/playlist results, show the channel that owns them
        if (item.snippet?.channelTitle) {
          output += ResponseFormatters.keyValue("Channel", item.snippet.channelTitle, 3);
        }
      }

      if (item.snippet?.publishedAt) {
        output += ResponseFormatters.keyValue("Published", ResponseFormatters.formatDate(item.snippet.publishedAt), 3);
      }

      // Video-specific enriched data
      if (item.id?.videoId) {
        if (item.statistics?.viewCount) {
          output += ResponseFormatters.keyValue("Views", ResponseFormatters.formatViewCount(item.statistics.viewCount), 3);
        }
        if (item.contentDetails?.duration) {
          output += ResponseFormatters.keyValue("Duration", ResponseFormatters.formatDuration(item.contentDetails.duration), 3);
        }
        output += ResponseFormatters.keyValue("URL", ResponseFormatters.getYouTubeUrl("video", item.id.videoId), 3);
      } else if (item.id?.channelId) {
        output += ResponseFormatters.keyValue("URL", ResponseFormatters.getYouTubeUrl("channel", item.id.channelId), 3);
      } else if (item.id?.playlistId) {
        if (item.contentDetails?.itemCount !== undefined) {
          output += ResponseFormatters.keyValue("Videos", item.contentDetails.itemCount.toString(), 3);
        }
        output += ResponseFormatters.keyValue("URL", ResponseFormatters.getYouTubeUrl("playlist", item.id.playlistId), 3);
      }

      if (item.snippet?.description) {
        output += ResponseFormatters.keyValue("Description", ResponseFormatters.truncateText(item.snippet.description, 150), 3);
      }

      output += "\n";
    });

    return output;
  }
}
