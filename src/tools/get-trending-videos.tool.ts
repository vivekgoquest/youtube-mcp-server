import type { ToolMetadata } from "../interfaces/tool.js";
import { Tool } from "../interfaces/tool.js";
import { YouTubeClient } from "../youtube-client.js";
import type { ToolResponse, TrendingVideosParams } from "../types.js";
import { ResponseFormatters } from "../utils/response-formatters.js";

export const metadata: ToolMetadata = {
  name: "get_trending_videos",
  description:
    "Get trending videos with configurable detail level - from basic metrics to comprehensive analysis including privacy status, topic categorization, and technical details. See what's going viral in real-time, filtered by category and region. Returns up to 50 trending videos with configurable detail depth.",
  inputSchema: {
    type: "object",
    properties: {
      maxResults: {
        type: "integer",
        description: "Maximum number of results to return (1-50)",
        minimum: 1,
        maximum: 50,
        default: 25,
      },
      regionCode: {
        type: "string",
        description:
          "Get trending videos for specific region (ISO 3166-1 alpha-2)",
        default: "US",
      },
      videoCategoryId: {
        type: "string",
        description: "Filter by video category ID",
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
        default: ["snippet", "statistics"],
      },
      includeExtended: {
        type: "boolean",
        description:
          "Include commonly useful additional parts (status, topicDetails)",
        default: false,
      },
      fields: {
        type: "string",
        description: "Optional field filter for response",
      },
    },
  },
};

interface GetTrendingVideosOptions extends TrendingVideosParams {
  includeParts?: string[];
  includeExtended?: boolean;
  fields?: string;
}

export default class GetTrendingVideosTool extends Tool<GetTrendingVideosOptions, string> {
  constructor(private client: YouTubeClient) {
    super();
  }

  async execute(params: GetTrendingVideosOptions): Promise<ToolResponse<string>> {

      // Handle part selection with new options
      let parts: string[];

      if (params.includeExtended) {
        parts = ["snippet", "statistics", "status", "topicDetails"];
      } else {
        parts = params.includeParts || ["snippet", "statistics"];
      }

      const videoParams: any = {
        part: parts.join(","),
        chart: "mostPopular",
        maxResults: params.maxResults || 25,
        regionCode: params.regionCode || "US",
        videoCategoryId: params.videoCategoryId,
        pageToken: params.pageToken,
      };

      // Add fields parameter if specified
      if (params.fields) {
        videoParams.fields = params.fields;
      }

      // Remove undefined values
      Object.keys(videoParams).forEach((key) => {
        if (videoParams[key as keyof typeof videoParams] === undefined) {
          delete videoParams[key as keyof typeof videoParams];
        }
      });

      const response = await this.client.getVideos(videoParams);

      if (!response.items || response.items.length === 0) {
        return {
          success: false,
          error: "No trending videos found for the specified criteria"
        };
      }

      // Format the trending videos list
      let output = ResponseFormatters.sectionHeader("🔥", `Trending Videos in ${params.regionCode || "US"}`);
      if (params.videoCategoryId) {
        output += ResponseFormatters.keyValue("Category ID", params.videoCategoryId);
      }
      output += ResponseFormatters.keyValue("Results", response.items.length.toString());
      output += "\n";

      response.items.forEach((video, index) => {
        output += ResponseFormatters.numberedItem(index + 1, `**${video.snippet?.title || "Untitled"}**`);
        
        if (video.snippet?.channelTitle) {
          output += ResponseFormatters.keyValue("Channel", video.snippet.channelTitle, 3);
        }
        
        if (video.statistics) {
          const stats = [];
          if (video.statistics.viewCount) {
            stats.push(`${ResponseFormatters.formatNumber(video.statistics.viewCount)} views`);
          }
          if (video.statistics.likeCount) {
            stats.push(`${ResponseFormatters.formatNumber(video.statistics.likeCount)} likes`);
          }
          if (stats.length > 0) {
            output += ResponseFormatters.keyValue("Stats", stats.join(" • "), 3);
          }
        }
        
        if (video.contentDetails?.duration) {
          output += ResponseFormatters.keyValue("Duration", ResponseFormatters.formatDuration(video.contentDetails.duration), 3);
        }
        
        if (video.id) {
          output += ResponseFormatters.keyValue("URL", ResponseFormatters.getYouTubeUrl("video", video.id), 3);
        }
        
        output += "\n";
      });

      // Add pagination info if available
      if (response.nextPageToken) {
        output += ResponseFormatters.sectionHeader("📄", "Pagination");
        output += ResponseFormatters.keyValue("Next Page Token", response.nextPageToken);
        output += ResponseFormatters.keyValue("Total Results", response.pageInfo?.totalResults?.toString() || "Unknown");
      }

      return {
        success: true,
        data: output,
      };
  }
}
