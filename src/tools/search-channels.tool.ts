import { ToolMetadata, ToolRunner } from "../interfaces/tool.js";
import { YouTubeClient } from "../youtube-client.js";
import {
  ToolResponse,
  SearchChannelsParams,
  YouTubeApiResponse,
  SearchResult,
} from "../types.js";
import { ErrorHandler } from "../utils/error-handler.js";
import {
  DEFAULT_CHANNEL_PARTS,
  YOUTUBE_API_BATCH_SIZE,
} from "../config/constants.js";
import { performEnrichment } from "../utils/search-enrichment.js";

export const metadata: ToolMetadata = {
  name: "search_channels",
  description:
    "Search for YouTube channels with optional enrichment for full details. Channel enrichment provides subscriber counts, branding analysis, topic categorization, and compliance status.",
  quotaCost: 100,
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Search query for channels",
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
        },
      },
    },
    required: ["query"],
  },
};

export default class SearchChannelsTool
  implements
    ToolRunner<
      SearchChannelsParams & { enrichParts?: { channel?: string[] } },
      YouTubeApiResponse<SearchResult>
    >
{
  constructor(private client: YouTubeClient) {}

  async run(
    params: SearchChannelsParams & { enrichParts?: { channel?: string[] } },
  ): Promise<ToolResponse<YouTubeApiResponse<SearchResult>>> {
    const startTime = Date.now();
    try {
      if (!params.query || params.query.trim() === "") {
        return {
          success: false,
          error: "Query is required for channel search",
        };
      }

      const searchParams = {
        part: "snippet",
        type: "channel" as const,
        q: params.query,
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
            "channel",
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
          source: "youtube-search-channels",
        },
      };
    } catch (error) {
      return ErrorHandler.handleToolError<YouTubeApiResponse<SearchResult>>(
        error,
        {
          quotaUsed: 100,
          startTime,
          source: "youtube-search-channels",
          defaultMessage: "Failed to search channels",
        },
      );
    }
  }
}
