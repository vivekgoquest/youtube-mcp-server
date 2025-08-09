import type { ToolMetadata } from "../interfaces/tool.js";
import { Tool } from "../interfaces/tool.js";
import { YouTubeClient } from "../youtube-client.js";
import type { ToolResponse, SearchChannelsParams } from "../types.js";
import { ResponseFormatters } from "../utils/response-formatters.js";
import { performEnrichment } from "../utils/search-enrichment.js";

export const metadata: ToolMetadata = {
  name: "search_channels",
  description:
    "Search for YouTube channels with optional enrichment for full details. Channel enrichment provides subscriber counts, branding analysis, topic categorization, and compliance status.",
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

interface SearchChannelsOptions extends SearchChannelsParams {
  enrichParts?: { channel?: string[] | undefined } | undefined;
}

export default class SearchChannelsTool extends Tool<SearchChannelsOptions, string> {
  constructor(private client: YouTubeClient) {
    super();
  }

  async execute(params: SearchChannelsOptions): Promise<ToolResponse<string>> {
    if (!params.query || params.query.trim() === "") {
      return {
        success: false,
        error: "Query is required for channel search",
      };
    }

      const searchParams: any = {
        part: "snippet",
        type: "channel" as const,
        q: params.query,
        maxResults: params.maxResults || 25,
        order: params.order || "relevance",
      };

      // Only add optional properties if they have values
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
        const enrichPartsObj: any = {};
        if (params.enrichParts.channel) {
          enrichPartsObj.channel = params.enrichParts.channel;
        }
        
        // Use the consolidated enrichment function
        enrichedResponse = {
          ...response,
          items: await performEnrichment(
            this.client,
            response.items,
            enrichPartsObj,
            "channel",
          ),
        };
      }

      if (!enrichedResponse.items || enrichedResponse.items.length === 0) {
        return {
          success: false,
          error: `No channels found matching "${params.query}"`,
        };
      }

      // Format the channel search results
      let output = ResponseFormatters.sectionHeader("🔍", `Channel Search Results for "${params.query}"`);
      output += ResponseFormatters.keyValue("Results", enrichedResponse.items.length.toString());
      if (params.regionCode) {
        output += ResponseFormatters.keyValue("Region", params.regionCode);
      }
      output += "\n";

      enrichedResponse.items.forEach((item: any, index) => {
        output += ResponseFormatters.numberedItem(index + 1, `**${item.snippet?.channelTitle || item.snippet?.title || "Unknown Channel"}**`);
        
        if (item.snippet?.description) {
          output += ResponseFormatters.keyValue("Description", ResponseFormatters.truncateText(item.snippet.description, 150), 3);
        }
        
        // If enriched with statistics
        if (item.statistics) {
          const stats = [];
          if (item.statistics.subscriberCount) {
            stats.push(`${ResponseFormatters.formatNumber(item.statistics.subscriberCount)} subscribers`);
          }
          if (item.statistics.videoCount) {
            stats.push(`${ResponseFormatters.formatNumber(item.statistics.videoCount)} videos`);
          }
          if (item.statistics.viewCount) {
            stats.push(`${ResponseFormatters.formatViewCount(item.statistics.viewCount)}`);
          }
          if (stats.length > 0) {
            output += ResponseFormatters.keyValue("Stats", stats.join(" • "), 3);
          }
        }
        
        // If enriched with content details
        if (item.contentDetails?.relatedPlaylists?.uploads) {
          output += ResponseFormatters.keyValue("Uploads Playlist", item.contentDetails.relatedPlaylists.uploads, 3);
        }
        
        // If enriched with branding settings
        if (item.brandingSettings?.channel?.keywords) {
          output += ResponseFormatters.keyValue("Keywords", item.brandingSettings.channel.keywords, 3);
        }
        
        if (item.id?.channelId || item.snippet?.channelId) {
          const channelId = item.id?.channelId || item.snippet?.channelId;
          output += ResponseFormatters.keyValue("URL", ResponseFormatters.getYouTubeUrl("channel", channelId), 3);
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
