import { ToolMetadata, ToolRunner } from "../interfaces/tool.js";
import { YouTubeClient } from "../youtube-client.js";
import {
  ToolResponse,
  TrendingVideosParams,
  YouTubeApiResponse,
  Video,
} from "../types.js";
import { ErrorHandler } from "../utils/error-handler.js";
import { DEFAULT_VIDEO_PARTS } from "../config/constants.js";

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
  quotaCost: 1,
};

export default class GetTrendingVideosTool
  implements
    ToolRunner<
      TrendingVideosParams & {
        includeParts?: string[];
        includeExtended?: boolean;
        fields?: string;
      },
      YouTubeApiResponse<Video>
    >
{
  constructor(private client: YouTubeClient) {}

  async run(
    params: TrendingVideosParams & {
      includeParts?: string[];
      includeExtended?: boolean;
      fields?: string;
    },
  ): Promise<ToolResponse<YouTubeApiResponse<Video>>> {
    const startTime = Date.now();

    try {
      // Validate input parameters - handle null, undefined, or non-object inputs
      if (params === null || params === undefined) {
        return ErrorHandler.handleValidationError(
          "Input parameters are required",
          "get-trending-videos",
        );
      }

      if (typeof params !== "object" || Array.isArray(params)) {
        return ErrorHandler.handleValidationError(
          "Input parameters must be an object",
          "get-trending-videos",
        );
      }

      // Validate individual parameters
      if (params.maxResults !== undefined) {
        if (
          typeof params.maxResults !== "number" ||
          params.maxResults < 1 ||
          params.maxResults > 50
        ) {
          return ErrorHandler.handleValidationError(
            "maxResults must be a number between 1 and 50",
            "get-trending-videos",
          );
        }
      }

      if (
        params.regionCode !== undefined &&
        (typeof params.regionCode !== "string" ||
          params.regionCode.trim() === "")
      ) {
        return ErrorHandler.handleValidationError(
          "regionCode must be a non-empty string",
          "get-trending-videos",
        );
      }

      if (
        params.videoCategoryId !== undefined &&
        (typeof params.videoCategoryId !== "string" ||
          params.videoCategoryId.trim() === "")
      ) {
        return ErrorHandler.handleValidationError(
          "videoCategoryId must be a non-empty string",
          "get-trending-videos",
        );
      }

      if (
        params.includeParts !== undefined &&
        !Array.isArray(params.includeParts)
      ) {
        return ErrorHandler.handleValidationError(
          "includeParts must be an array",
          "get-trending-videos",
        );
      }

      if (
        params.includeExtended !== undefined &&
        typeof params.includeExtended !== "boolean"
      ) {
        return ErrorHandler.handleValidationError(
          "includeExtended must be a boolean",
          "get-trending-videos",
        );
      }

      if (
        params.fields !== undefined &&
        (typeof params.fields !== "string" || params.fields.trim() === "")
      ) {
        return ErrorHandler.handleValidationError(
          "fields must be a non-empty string",
          "get-trending-videos",
        );
      }

      // Handle part selection with new options
      let parts: string[];

      if (params.includeExtended) {
        parts = ["snippet", "statistics", "status", "topicDetails"];
      } else {
        parts = params.includeParts || ["snippet", "statistics"];
      }

      const videoParams: any = {
        part: parts.join(","),
        chart: "mostPopular" as const,
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

      return {
        success: true,
        data: response,
        metadata: {
          quotaUsed: 1, // Videos.list costs 1 quota unit
          requestTime: 0,
          source: "youtube-trending-videos",
        },
      };
    } catch (error: any) {
      return ErrorHandler.handleToolError(error, {
        quotaUsed: 1,
        startTime,
        source: "get-trending-videos",
        defaultMessage: "Failed to get trending videos",
      });
    }
  }
}
