import { ToolMetadata, ToolRunner } from "../interfaces/tool.js";
import { YouTubeClient } from "../youtube-client.js";
import { ToolResponse } from "../types.js";
import { ErrorHandler } from "../utils/error-handler.js";
import { YOUTUBE_API_BATCH_SIZE } from "../config/constants.js";

interface ChannelAnalysisOptions {
  channelId: string;
  maxVideos?: number;
  videoDurationFilter?: "any" | "short" | "medium" | "long";
  publishedAfter?: string;
  publishedBefore?: string;
  sortBy?:
    | "views"
    | "likes"
    | "comments"
    | "duration"
    | "viewsPerMonth"
    | "daysSinceUpload"
    | "uploadDate";
}

interface VideoAnalysis {
  videoId: string;
  videoUrl: string;
  title: string;
  channelName: string;
  channelId: string;
  channelUrl: string;
  uploadDate: string;
  views: number;
  likes: number;
  comments: number;
  duration: number;
  durationRange: string;
  durationRangeSequence: number;
  daysSinceUpload: number;
  monthsSinceUpload: number;
  viewsPerMonth: number;
  tags: string[];
}

interface BatchedVideoAnalysis {
  totalVideos: number;
  batchCount: number;
  batches: {
    batchNumber: number;
    videos: VideoAnalysis[];
  }[];
}

export const metadata: ToolMetadata = {
  name: "analyze_channel_videos",
  description:
    "DEEP ANALYSIS of all videos from any channel - yours or competitors. Analyzes up to 1000 videos to uncover: best performing content types, optimal video lengths, upload time patterns, engagement rates by video type, and performance trends. Use AFTER get_channel_details to get comprehensive insights. Returns: top 10 videos ranked by views/engagement, average metrics, content categorization, and specific recommendations. NOTE: Video descriptions are excluded from this analysis to optimize response size - use get_video_details tool for complete metadata including descriptions. ESSENTIAL for understanding what content actually works. Results can be sorted by views, likes, comments, duration, viewsPerMonth, daysSinceUpload, or uploadDate (default).",
  quotaCost: 2,
  inputSchema: {
    type: "object",
    properties: {
      channelId: {
        type: "string",
        description: "YouTube channel ID to analyze",
      },
      maxVideos: {
        type: "integer",
        description: "Maximum number of videos to analyze (default: 200)",
        minimum: 1,
        maximum: 1000,
        default: 200,
      },
      videoDurationFilter: {
        type: "string",
        enum: ["any", "short", "medium", "long"],
        description: "Filter videos by duration",
        default: "any",
      },
      publishedAfter: {
        type: "string",
        description: "Return videos published after this date (ISO 8601)",
      },
      publishedBefore: {
        type: "string",
        description: "Return videos published before this date (ISO 8601)",
      },
      sortBy: {
        type: "string",
        enum: [
          "views",
          "likes",
          "comments",
          "duration",
          "viewsPerMonth",
          "daysSinceUpload",
          "uploadDate",
        ],
        description:
          "Sort videos by specified field (default: uploadDate for newest first)",
        default: "uploadDate",
      },
    },
    required: ["channelId"],
  },
};

export default class AnalyzeChannelVideosTool
  implements ToolRunner<ChannelAnalysisOptions, BatchedVideoAnalysis>
{
  constructor(private client: YouTubeClient) {}

  async run(
    options: ChannelAnalysisOptions,
  ): Promise<ToolResponse<BatchedVideoAnalysis>> {
    try {
      const startTime = Date.now();
      const maxVideos = options.maxVideos || 200;

      // Get channel's upload playlist
      const channelResponse = await this.client.getChannels({
        part: "contentDetails",
        id: options.channelId,
      });

      if (channelResponse.items.length === 0) {
        throw new Error(`Channel ${options.channelId} not found`);
      }

      const uploadsPlaylistId =
        channelResponse.items[0].contentDetails?.relatedPlaylists?.uploads;
      if (!uploadsPlaylistId) {
        throw new Error(
          `No uploads playlist found for channel ${options.channelId}`,
        );
      }

      // Get all video IDs from the uploads playlist
      const videoIds = await this.getAllPlaylistVideoIds(uploadsPlaylistId);

      // Get detailed video information in batches
      const videoAnalyses: VideoAnalysis[] = [];
      const batchSize = YOUTUBE_API_BATCH_SIZE; // YouTube API limit

      for (let i = 0; i < videoIds.length; i += batchSize) {
        const batch = videoIds.slice(i, i + batchSize);
        const videosResponse = await this.client.getVideos({
          part: "snippet,statistics,contentDetails",
          id: batch.join(","),
        });

        for (const video of videosResponse.items) {
          const analysis = this.createVideoAnalysis(video);

          // Apply filters
          if (this.shouldIncludeVideo(analysis, options)) {
            videoAnalyses.push(analysis);
          }
        }
      }

      // Sort the videos according to the specified field
      const sortedVideos = this.sortVideoAnalyses(
        videoAnalyses,
        options.sortBy,
      );

      // Apply maxVideos limit after sorting
      const limitedVideos = sortedVideos.slice(0, maxVideos);

      // Create batched response
      const batchedResponse = this.createBatchedResponse(limitedVideos);

      // Calculate actual quota used
      const playlistRequests = Math.ceil(videoIds.length / 50); // getAllPlaylistVideoIds pagination
      const videoRequests = Math.ceil(videoIds.length / batchSize); // getVideos batch requests
      const channelRequest = 1; // Initial channel request
      const totalQuotaUsed = playlistRequests + videoRequests + channelRequest;

      return {
        success: true,
        data: batchedResponse,
        metadata: {
          quotaUsed: totalQuotaUsed,
          requestTime: Date.now() - startTime,
          source: "youtube-channel-analysis",
        },
      };
    } catch (error) {
      return ErrorHandler.handleToolError<BatchedVideoAnalysis>(error, {
        quotaUsed: 1,
        startTime: 0, // startTime was declared in try block, so we use 0
        source: "youtube-channel-analysis",
      });
    }
  }

  private async getAllPlaylistVideoIds(playlistId: string): Promise<string[]> {
    const videoIds: string[] = [];
    let pageToken: string | undefined;

    do {
      const response = await this.client.makeRawRequest("/playlistItems", {
        part: "contentDetails",
        playlistId,
        maxResults: 50,
        pageToken,
      });

      for (const item of response.items || []) {
        if (item.contentDetails?.videoId) {
          videoIds.push(item.contentDetails.videoId);
        }
      }

      pageToken = response.nextPageToken;
    } while (pageToken);

    return videoIds;
  }

  private createVideoAnalysis(video: any): VideoAnalysis {
    const uploadDate = new Date(video.snippet?.publishedAt || "");
    const now = new Date();
    const daysSinceUpload = Math.floor(
      (now.getTime() - uploadDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    const monthsSinceUpload = Math.max(1, Math.floor(daysSinceUpload / 30));

    const duration = this.parseDuration(
      video.contentDetails?.duration || "PT0S",
    );
    const views = parseInt(video.statistics?.viewCount || "0");

    return {
      videoId: video.id,
      videoUrl: `https://www.youtube.com/watch?v=${video.id}`,
      title: video.snippet?.title || "",
      channelName: video.snippet?.channelTitle || "",
      channelId: video.snippet?.channelId || "",
      channelUrl: `https://www.youtube.com/channel/${video.snippet?.channelId}`,
      uploadDate: uploadDate.toLocaleDateString(),
      views,
      likes: parseInt(video.statistics?.likeCount || "0"),
      comments: parseInt(video.statistics?.commentCount || "0"),
      duration,
      durationRange: this.getDurationRange(duration),
      durationRangeSequence: this.getDurationRangeSequence(duration),
      daysSinceUpload,
      monthsSinceUpload,
      viewsPerMonth: views / monthsSinceUpload,
      tags: video.snippet?.tags || [],
    };
  }

  private parseDuration(duration: string): number {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;

    const hours = parseInt(match[1]) || 0;
    const minutes = parseInt(match[2]) || 0;
    const seconds = parseInt(match[3]) || 0;

    return hours * 60 + minutes + seconds / 60;
  }

  private getDurationRange(duration: number): string {
    if (duration <= 1) return "0-1 min";
    if (duration <= 10) return "1-10 min";
    if (duration <= 30) return "10-30 min";
    return "30+ min";
  }

  private getDurationRangeSequence(duration: number): number {
    if (duration <= 1) return 0;
    if (duration <= 10) return 1;
    if (duration <= 30) return 2;
    return 3;
  }

  private shouldIncludeVideo(
    video: VideoAnalysis,
    options: ChannelAnalysisOptions,
  ): boolean {
    // Apply duration filter
    if (options.videoDurationFilter && options.videoDurationFilter !== "any") {
      const duration = video.duration;
      switch (options.videoDurationFilter) {
        case "short":
          if (duration > 4) return false;
          break;
        case "medium":
          if (duration <= 4 || duration > 20) return false;
          break;
        case "long":
          if (duration <= 20) return false;
          break;
      }
    }

    // Apply date filters
    if (options.publishedAfter) {
      const videoDate = new Date(video.uploadDate);
      const afterDate = new Date(options.publishedAfter);
      if (videoDate < afterDate) return false;
    }

    if (options.publishedBefore) {
      const videoDate = new Date(video.uploadDate);
      const beforeDate = new Date(options.publishedBefore);
      if (videoDate > beforeDate) return false;
    }

    return true;
  }

  private sortVideoAnalyses(
    videos: VideoAnalysis[],
    sortBy: string = "uploadDate",
  ): VideoAnalysis[] {
    return videos.sort((a, b) => {
      // Handle edge cases where values might be missing or zero
      const getNumericValue = (video: VideoAnalysis, field: string): number => {
        const value = video[field as keyof VideoAnalysis];
        return typeof value === "number" ? value : 0;
      };

      switch (sortBy) {
        case "views":
          return getNumericValue(b, "views") - getNumericValue(a, "views");

        case "likes":
          return getNumericValue(b, "likes") - getNumericValue(a, "likes");

        case "comments":
          return (
            getNumericValue(b, "comments") - getNumericValue(a, "comments")
          );

        case "duration":
          return (
            getNumericValue(b, "duration") - getNumericValue(a, "duration")
          );

        case "viewsPerMonth":
          return (
            getNumericValue(b, "viewsPerMonth") -
            getNumericValue(a, "viewsPerMonth")
          );

        case "daysSinceUpload":
          // For days since upload, lower is more recent, so sort ascending
          return (
            getNumericValue(a, "daysSinceUpload") -
            getNumericValue(b, "daysSinceUpload")
          );

        case "uploadDate":
        default:
          // For uploadDate, parse dates and sort newest first
          const dateA = new Date(a.uploadDate);
          const dateB = new Date(b.uploadDate);
          // Handle invalid dates by treating them as very old
          const timeA = dateA.getTime() || 0;
          const timeB = dateB.getTime() || 0;
          return timeB - timeA; // Newest first
      }
    });
  }

  private createBatchedResponse(videos: VideoAnalysis[]): BatchedVideoAnalysis {
    const batchSize = 50;
    const batches = [];

    // Create batches of 50 videos each
    for (let i = 0; i < videos.length; i += batchSize) {
      batches.push({
        batchNumber: Math.floor(i / batchSize) + 1,
        videos: videos.slice(i, i + batchSize),
      });
    }

    return {
      totalVideos: videos.length,
      batchCount: batches.length,
      batches,
    };
  }
}
