import { ToolMetadata, ToolRunner } from "../interfaces/tool.js";
import { YouTubeClient } from "../youtube-client.js";
import { ToolResponse, Video } from "../types.js";
import { ErrorHandler } from "../utils/error-handler.js";
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
  quotaCost: 1,
};

export default class GetVideoDetailsTool
  implements ToolRunner<GetVideoDetailsOptions, Video>
{
  constructor(private client: YouTubeClient) {}

  async run(options: GetVideoDetailsOptions): Promise<ToolResponse<Video>> {
    const startTime = Date.now();

    try {
      if (!options.videoId) {
        return ErrorHandler.handleValidationError(
          "Video ID parameter is required",
          "get-video-details",
        );
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

      const result = await this.client.getVideos(params);

      if (result.items.length === 0) {
        return ErrorHandler.handleToolError(
          new Error(`Video with ID '${options.videoId}' not found`),
          {
            quotaUsed: 1,
            startTime,
            source: "get-video-details",
            defaultMessage: "Video not found",
          },
        );
      }

      const video = result.items[0];

      return {
        success: true,
        data: video,
        metadata: {
          quotaUsed: 1,
          requestTime: 0,
          source: "get-video-details",
        },
      };
    } catch (error: any) {
      return ErrorHandler.handleToolError(error, {
        quotaUsed: 1,
        startTime,
        source: "get-video-details",
      });
    }
  }
}
