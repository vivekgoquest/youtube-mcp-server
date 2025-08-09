import type { ToolMetadata } from "../interfaces/tool.js";
import { Tool } from "../interfaces/tool.js";
import { YouTubeClient } from "../youtube-client.js";
import type { ToolResponse } from "../types.js";
import { ResponseFormatters } from "../utils/response-formatters.js";
import { DEFAULT_CHANNEL_PARTS } from "../config/constants.js";

interface GetChannelDetailsOptions {
  channelId: string;
  includeParts?: string[];
  includeBranding?: boolean;
  includeCompliance?: boolean;
  includeAll?: boolean;
  fields?: string;
}

export const metadata: ToolMetadata = {
  name: "get_channel_details",
  description:
    "Get detailed channel information including branding analysis (keywords, featured channels), topic categorization, compliance status, content ownership details, multilingual support, and privacy settings.",
  inputSchema: {
    type: "object",
    properties: {
      channelId: {
        type: "string",
        description: "YouTube channel ID",
      },
      includeParts: {
        type: "array",
        items: {
          type: "string",
          enum: [
            "snippet",
            "statistics",
            "contentDetails",
            "brandingSettings",
            "auditDetails",
            "contentOwnerDetails",
            "topicDetails",
            "localizations",
            "status",
          ],
        },
        description: "Parts of channel data to include",
        default: DEFAULT_CHANNEL_PARTS,
      },
      includeBranding: {
        type: "boolean",
        description:
          "Include brandingSettings for keywords and featured channels",
        default: false,
      },
      includeCompliance: {
        type: "boolean",
        description: "Include auditDetails for compliance status",
        default: false,
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
    required: ["channelId"],
  },
};

export default class GetChannelDetailsTool extends Tool<GetChannelDetailsOptions, string> {
  constructor(private client: YouTubeClient) {
    super();
  }

  async execute(options: GetChannelDetailsOptions): Promise<ToolResponse<string>> {
    if (!options.channelId) {
      return {
        success: false,
        error: "Channel ID parameter is required",
      };
    }

      // Handle part selection with new options
      let parts: string[] = [];

      if (options.includeAll) {
        parts = [
          "snippet",
          "statistics",
          "contentDetails",
          "brandingSettings",
          "auditDetails",
          "contentOwnerDetails",
          "topicDetails",
          "localizations",
          "status",
        ];
      } else {
        parts = options.includeParts || [
          "snippet",
          "statistics",
          "contentDetails",
          "brandingSettings",
          "topicDetails",
        ];

        // Add specific parts based on boolean flags
        if (options.includeBranding && !parts.includes("brandingSettings")) {
          parts.push("brandingSettings");
        }
        if (options.includeCompliance && !parts.includes("auditDetails")) {
          parts.push("auditDetails");
        }
      }

      const params: any = {
        part: parts.join(","),
        id: options.channelId,
      };

      // Add fields parameter if specified
      if (options.fields) {
        params.fields = options.fields;
      }

      const result = await this.client.getChannels(params);

      if (result.items.length === 0) {
        return {
          success: false,
          error: `Channel with ID '${options.channelId}' not found`,
        };
      }

      const channel = result.items[0];
      if (!channel) {
        return {
          success: false,
          error: `Channel with ID '${options.channelId}' not found`,
        };
      }

      // Format the channel details
      let output = ResponseFormatters.sectionHeader("📺", "Channel Details");
      output += "\n";

      if (channel.snippet) {
        if (channel.snippet.title) {
          output += ResponseFormatters.keyValue("Channel Name", channel.snippet.title);
        }
        if (channel.snippet.description) {
          output += ResponseFormatters.keyValue("Description", ResponseFormatters.truncateText(channel.snippet.description, 300));
        }
        if (channel.snippet.publishedAt) {
          output += ResponseFormatters.keyValue("Created", ResponseFormatters.formatDate(channel.snippet.publishedAt));
        }
        if (channel.snippet.country) {
          output += ResponseFormatters.keyValue("Country", channel.snippet.country);
        }
        output += "\n";
      }

      if (channel.statistics) {
        output += ResponseFormatters.sectionHeader("📊", "Statistics");
        if (channel.statistics.subscriberCount) {
          output += ResponseFormatters.bulletPoint("Subscribers", ResponseFormatters.formatNumber(channel.statistics.subscriberCount));
        }
        if (channel.statistics.viewCount) {
          output += ResponseFormatters.bulletPoint("Total Views", ResponseFormatters.formatNumber(channel.statistics.viewCount));
        }
        if (channel.statistics.videoCount) {
          output += ResponseFormatters.bulletPoint("Videos", ResponseFormatters.formatNumber(channel.statistics.videoCount));
        }
        output += "\n";
      }

      if (channel.contentDetails?.relatedPlaylists) {
        output += ResponseFormatters.sectionHeader("📋", "Playlists");
        const playlists = channel.contentDetails.relatedPlaylists;
        if (playlists.uploads) {
          output += ResponseFormatters.bulletPoint("Uploads Playlist", playlists.uploads);
        }
        output += "\n";
      }

      if (channel.brandingSettings) {
        if (channel.brandingSettings.channel?.keywords) {
          output += ResponseFormatters.sectionHeader("🏷️", "Channel Keywords");
          output += ResponseFormatters.keyValue("Keywords", channel.brandingSettings.channel.keywords);
          output += "\n";
        }
      }

      if (channel.topicDetails?.topicCategories) {
        output += ResponseFormatters.sectionHeader("📚", "Topic Categories");
        channel.topicDetails.topicCategories.forEach((topic: string) => {
          const topicName = topic.split("/").pop()?.replace(/_/g, " ");
          output += ResponseFormatters.bulletPoint("Topic", topicName || topic);
        });
        output += "\n";
      }

      output += ResponseFormatters.sectionHeader("🔗", "Links");
      if (channel.id) {
        output += ResponseFormatters.bulletPoint("Channel URL", ResponseFormatters.getYouTubeUrl("channel", channel.id));
      }
      if (channel.snippet?.customUrl) {
        output += ResponseFormatters.bulletPoint("Custom URL", `https://www.youtube.com/${channel.snippet.customUrl}`);
      }

      return {
        success: true,
        data: output,
      };
  }
}
