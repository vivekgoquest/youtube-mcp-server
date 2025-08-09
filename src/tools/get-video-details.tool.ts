import type { ToolMetadata } from "../interfaces/tool.js";
import { Tool } from "../interfaces/tool.js";
import { YouTubeClient } from "../youtube-client.js";
import type { ToolResponse } from "../types.js";
import { ResponseFormatters } from "../utils/response-formatters.js";
import { DEFAULT_VIDEO_PARTS } from "../config/constants.js";

interface GetVideoDetailsOptions {
  videoId: string;
  includeParts?: string[];
  includeAll?: boolean;
  includeExtended?: boolean;
  fields?: string;
}

export const metadata: ToolMetadata = {
  name: "get_video_details",
  description:
    "Get comprehensive video information including privacy status, topic categorization, geo/temporal recording data, live streaming details, embed codes, multilingual support, technical file details, and processing diagnostics.",
  inputSchema: {
    type: "object",
    properties: {
      videoId: {
        type: "string",
        description: "YouTube video ID",
      },
      includeParts: {
        type: "array",
        items: {
          type: "string",
          enum: [
            "snippet",
            "statistics",
            "contentDetails",
            "status",
            "topicDetails",
            "recordingDetails",
            "liveStreamingDetails",
            "player",
            "localizations",
            "fileDetails",
            "processingDetails",
            "suggestions",
          ],
        },
        description: "Parts of video data to include",
        default: DEFAULT_VIDEO_PARTS,
      },
      includeAll: {
        type: "boolean",
        description: "Request all available parts",
        default: false,
      },
      includeExtended: {
        type: "boolean",
        description:
          "Request commonly useful additional parts (status, topicDetails, recordingDetails, player)",
        default: false,
      },
      fields: {
        type: "string",
        description: "Optional field filter for fine-grained response control",
      },
    },
    required: ["videoId"],
  },
};

export default class GetVideoDetailsTool extends Tool<GetVideoDetailsOptions, string> {
  constructor(private client: YouTubeClient) {
    super();
  }

  async execute(options: GetVideoDetailsOptions): Promise<ToolResponse<string>> {
    if (!options.videoId) {
      return {
        success: false,
        error: "Video ID parameter is required"
      };
    }

      // Handle part selection with new options
      let parts: string[];

      if (options.includeAll) {
        parts = [
          "snippet",
          "statistics",
          "contentDetails",
          "status",
          "topicDetails",
          "recordingDetails",
          "liveStreamingDetails",
          "player",
          "localizations",
          "fileDetails",
          "processingDetails",
          "suggestions",
        ];
      } else if (options.includeExtended) {
        parts = [
          "snippet",
          "statistics",
          "contentDetails",
          "status",
          "topicDetails",
          "recordingDetails",
          "player",
        ];
      } else {
        parts = options.includeParts || [
          "snippet",
          "statistics",
          "contentDetails",
          "status",
          "topicDetails",
        ];
      }

      const params: any = {
        part: parts.join(","),
        id: options.videoId,
      };

      // Add fields parameter if specified
      if (options.fields) {
        params.fields = options.fields;
      }

      let result;
      try {
        result = await this.client.getVideos(params);
      } catch (error) {
        return {
          success: false,
          error: `Failed to fetch video details: ${error instanceof Error ? error.message : 'Unknown error occurred'}`
        };
      }

      if (!result || !Array.isArray(result.items)) {
        return {
          success: false,
          error: "Unexpected response structure from YouTube API"
        };
      }

      if (result.items.length === 0) {
        return {
          success: false,
          error: `Video with ID '${options.videoId}' not found`
        };
      }

      const video = result.items[0];
      if (!video) {
        return {
          success: false,
          error: `Video with ID '${options.videoId}' not found`,
        };
      }

      // Format the video details
      let output = ResponseFormatters.sectionHeader("🎬", "Video Details");
      output += "\n";

      if (video.snippet) {
        if (video.snippet.title) {
          output += ResponseFormatters.keyValue("Title", video.snippet.title);
        }
        if (video.snippet.channelTitle) {
          output += ResponseFormatters.keyValue("Channel", video.snippet.channelTitle);
        }
        if (video.snippet.publishedAt) {
          output += ResponseFormatters.keyValue("Published", ResponseFormatters.formatDate(video.snippet.publishedAt));
        }
        if (video.snippet.description) {
          output += ResponseFormatters.keyValue("Description", ResponseFormatters.truncateText(video.snippet.description, 300));
        }
        output += "\n";
      }

      if (video.statistics) {
        output += ResponseFormatters.sectionHeader("📊", "Statistics");
        if (video.statistics.viewCount) {
          output += ResponseFormatters.bulletPoint("Views", ResponseFormatters.formatNumber(video.statistics.viewCount));
        }
        if (video.statistics.likeCount) {
          output += ResponseFormatters.bulletPoint("Likes", ResponseFormatters.formatNumber(video.statistics.likeCount));
        }
        if (video.statistics.commentCount) {
          output += ResponseFormatters.bulletPoint("Comments", ResponseFormatters.formatNumber(video.statistics.commentCount));
        }
        output += "\n";
      }

      if (video.contentDetails) {
        output += ResponseFormatters.sectionHeader("⏱️", "Content Details");
        if (video.contentDetails.duration) {
          output += ResponseFormatters.bulletPoint("Duration", ResponseFormatters.formatDuration(video.contentDetails.duration));
        }
        if (video.contentDetails.definition) {
          output += ResponseFormatters.bulletPoint("Definition", video.contentDetails.definition.toUpperCase());
        }
        output += "\n";
      }

      if (video.status) {
        output += ResponseFormatters.sectionHeader("🔒", "Status");
        if (video.status.privacyStatus) {
          output += ResponseFormatters.bulletPoint("Privacy Status", video.status.privacyStatus);
        }
        if (video.status.license) {
          output += ResponseFormatters.bulletPoint("License", video.status.license);
        }
        if (video.status.embeddable !== undefined) {
          output += ResponseFormatters.bulletPoint("Embeddable", video.status.embeddable ? "Yes" : "No");
        }
        output += "\n";
      }

      if (video.topicDetails?.topicCategories) {
        output += ResponseFormatters.sectionHeader("🏷️", "Topic Categories");
        video.topicDetails.topicCategories.forEach((topic: string) => {
          const topicName = topic.split("/").pop()?.replace(/_/g, " ");
          output += ResponseFormatters.bulletPoint("Topic", topicName || topic);
        });
        output += "\n";
      }

      output += ResponseFormatters.sectionHeader("🔗", "Links");
      if (video.id) {
        output += ResponseFormatters.bulletPoint("Video URL", ResponseFormatters.getYouTubeUrl("video", video.id));
      }
      if (video.snippet?.channelId) {
        output += ResponseFormatters.bulletPoint("Channel URL", ResponseFormatters.getYouTubeUrl("channel", video.snippet.channelId));
      }

      return {
        success: true,
        data: output,
      };
  }
}
