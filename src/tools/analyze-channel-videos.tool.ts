import type { ToolMetadata } from "../interfaces/tool.js";
import { Tool } from "../interfaces/tool.js";
import { YouTubeClient } from "../youtube-client.js";
import type { ToolResponse } from "../types.js";
import { ResponseFormatters } from "../utils/response-formatters.js";
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


interface DurationRange {
  label: string;
  maxMinutes: number;
  sequence: number;
  avgMinutes: number;
}

const DURATION_RANGES: DurationRange[] = [
  { label: "0-1 min", maxMinutes: 1, sequence: 0, avgMinutes: 0.5 },
  { label: "1-10 min", maxMinutes: 10, sequence: 1, avgMinutes: 5 },
  { label: "10-30 min", maxMinutes: 30, sequence: 2, avgMinutes: 20 },
  { label: "30+ min", maxMinutes: Infinity, sequence: 3, avgMinutes: 40 },
];

export const metadata: ToolMetadata = {
  name: "analyze_channel_videos",
  description:
    "DEEP ANALYSIS of all videos from any channel - yours or competitors. Analyzes up to 1000 videos to uncover: best performing content types, optimal video lengths, upload time patterns, engagement rates by video type, and performance trends. Use AFTER get_channel_details to get comprehensive insights. Returns: top 10 videos ranked by views/engagement, average metrics, content categorization, and specific recommendations. NOTE: Video descriptions are excluded from this analysis to optimize response size - use get_video_details tool for complete metadata including descriptions. ESSENTIAL for understanding what content actually works. Results can be sorted by views, likes, comments, duration, viewsPerMonth, daysSinceUpload, or uploadDate (default).",
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

export default class AnalyzeChannelVideosTool extends Tool<ChannelAnalysisOptions, string> {
  constructor(private client: YouTubeClient) {
    super();
  }

  async execute(
    options: ChannelAnalysisOptions,
  ): Promise<ToolResponse<string>> {
    try {
      const maxVideos = options.maxVideos || 200;

      // Get channel's upload playlist
      const channelResponse = await this.client.getChannels({
        part: "contentDetails",
        id: options.channelId,
      });

      if (!channelResponse.items || channelResponse.items.length === 0) {
        throw new Error(`Channel ${options.channelId} not found`);
      }

      const firstItem = channelResponse.items[0];
      if (!firstItem) {
        throw new Error(`Channel ${options.channelId} not found`);
      }

      const contentDetails = firstItem.contentDetails;
      const uploadsPlaylistId = contentDetails?.relatedPlaylists?.uploads;
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

      // Create formatted output
      const formattedOutput = this.formatChannelAnalysis(limitedVideos, options);

      return {
        success: true,
        data: formattedOutput,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
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

  private safelyExtractStatistics(video: any): {
    viewCount: number;
    likeCount: number;
    commentCount: number;
  } {
    // Validate statistics object exists
    if (!video || typeof video !== 'object' || !video.statistics || typeof video.statistics !== 'object') {
      return {
        viewCount: 0,
        likeCount: 0,
        commentCount: 0
      };
    }

    // Validate and parse each field with explicit checks
    const viewCount = (video.statistics.viewCount !== undefined && video.statistics.viewCount !== null) 
      ? parseInt(String(video.statistics.viewCount), 10) || 0 
      : 0;
    
    const likeCount = (video.statistics.likeCount !== undefined && video.statistics.likeCount !== null)
      ? parseInt(String(video.statistics.likeCount), 10) || 0
      : 0;
    
    const commentCount = (video.statistics.commentCount !== undefined && video.statistics.commentCount !== null)
      ? parseInt(String(video.statistics.commentCount), 10) || 0
      : 0;

    return { viewCount, likeCount, commentCount };
  }

  private safelyExtractSnippet(video: any): {
    title: string;
    channelTitle: string;
    channelId: string;
    publishedAt: string;
    tags: string[];
  } {
    // Validate snippet object exists
    if (!video || typeof video !== 'object' || !video.snippet || typeof video.snippet !== 'object') {
      return {
        title: "",
        channelTitle: "",
        channelId: "",
        publishedAt: new Date().toISOString(),
        tags: []
      };
    }

    const snippet = video.snippet;
    
    return {
      title: (snippet.title !== undefined && snippet.title !== null) ? String(snippet.title) : "",
      channelTitle: (snippet.channelTitle !== undefined && snippet.channelTitle !== null) ? String(snippet.channelTitle) : "",
      channelId: (snippet.channelId !== undefined && snippet.channelId !== null) ? String(snippet.channelId) : "",
      publishedAt: (snippet.publishedAt !== undefined && snippet.publishedAt !== null) ? String(snippet.publishedAt) : new Date().toISOString(),
      tags: Array.isArray(snippet.tags) ? snippet.tags.map((tag: any) => String(tag)) : []
    };
  }

  private createVideoAnalysis(video: any): VideoAnalysis {
    // Validate video object
    if (!video || typeof video !== 'object' || !video.id) {
      throw new Error('Invalid video object: missing required video.id');
    }

    // Safely extract snippet data
    const snippetData = this.safelyExtractSnippet(video);
    
    // Safely extract statistics
    const stats = this.safelyExtractStatistics(video);
    
    // Calculate upload date and derived values
    const uploadDate = new Date(snippetData.publishedAt);
    const now = new Date();
    const daysSinceUpload = Math.floor(
      (now.getTime() - uploadDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    const monthsSinceUpload = Math.max(1, Math.floor(daysSinceUpload / 30));

    // Safely extract and parse duration
    let durationString = "PT0S";
    if (video.contentDetails && typeof video.contentDetails === 'object' && 
        video.contentDetails.duration !== undefined && video.contentDetails.duration !== null) {
      durationString = String(video.contentDetails.duration);
    }
    const duration = this.parseDuration(durationString);

    return {
      videoId: video.id,
      videoUrl: `https://www.youtube.com/watch?v=${video.id}`,
      title: snippetData.title,
      channelName: snippetData.channelTitle,
      channelId: snippetData.channelId,
      channelUrl: snippetData.channelId ? `https://www.youtube.com/channel/${snippetData.channelId}` : "",
      uploadDate: snippetData.publishedAt,
      views: stats.viewCount,
      likes: stats.likeCount,
      comments: stats.commentCount,
      duration,
      durationRange: this.getDurationRange(duration),
      durationRangeSequence: this.getDurationRangeSequence(duration),
      daysSinceUpload,
      monthsSinceUpload,
      viewsPerMonth: stats.viewCount / monthsSinceUpload,
      tags: snippetData.tags,
    };
  }

  private parseDuration(duration: string): number {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;

    const hours = match[1] ? parseInt(match[1]) : 0;
    const minutes = match[2] ? parseInt(match[2]) : 0;
    const seconds = match[3] ? parseInt(match[3]) : 0;

    return hours * 60 + minutes + seconds / 60;
  }

  private getDurationRange(duration: number): string {
    if (DURATION_RANGES.length === 0) return "Unknown";
    const range = DURATION_RANGES.find(r => duration <= r.maxMinutes);
    const defaultRange = DURATION_RANGES[DURATION_RANGES.length - 1];
    return range ? range.label : (defaultRange?.label || "Unknown");
  }

  private getDurationRangeSequence(duration: number): number {
    if (DURATION_RANGES.length === 0) return 0;
    const range = DURATION_RANGES.find(r => duration <= r.maxMinutes);
    const defaultRange = DURATION_RANGES[DURATION_RANGES.length - 1];
    return range ? range.sequence : (defaultRange?.sequence || 0);
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

  private formatChannelAnalysis(videos: VideoAnalysis[], options: ChannelAnalysisOptions): string {
    if (videos.length === 0) {
      return ResponseFormatters.sectionHeader("📊", "No videos found matching the specified criteria");
    }

    let output = ResponseFormatters.sectionHeader("📊", "Channel Videos Analysis");
    
    // Summary statistics
    const totalViews = videos.reduce((sum, v) => sum + v.views, 0);
    const totalLikes = videos.reduce((sum, v) => sum + v.likes, 0);
    const totalComments = videos.reduce((sum, v) => sum + v.comments, 0);
    const avgViews = Math.round(totalViews / videos.length);
    const avgLikes = Math.round(totalLikes / videos.length);
    const avgComments = Math.round(totalComments / videos.length);

    output += ResponseFormatters.keyValue("Total Videos Analyzed", videos.length.toString());
    output += ResponseFormatters.keyValue("Sort Order", options.sortBy || "uploadDate");
    if (options.videoDurationFilter && options.videoDurationFilter !== "any") {
      output += ResponseFormatters.keyValue("Duration Filter", options.videoDurationFilter);
    }
    output += "\n";

    output += ResponseFormatters.sectionHeader("📈", "Overall Statistics");
    output += ResponseFormatters.keyValue("Total Views", ResponseFormatters.formatViewCount(totalViews));
    output += ResponseFormatters.keyValue("Average Views", ResponseFormatters.formatViewCount(avgViews));
    output += ResponseFormatters.keyValue("Total Likes", ResponseFormatters.formatNumber(totalLikes));
    output += ResponseFormatters.keyValue("Average Likes", ResponseFormatters.formatNumber(avgLikes));
    output += ResponseFormatters.keyValue("Total Comments", ResponseFormatters.formatNumber(totalComments));
    output += ResponseFormatters.keyValue("Average Comments", ResponseFormatters.formatNumber(avgComments));
    output += "\n";

    // Duration distribution
    const durationCounts = this.calculateDurationDistribution(videos);
    if (durationCounts.size > 0) {
      output += ResponseFormatters.sectionHeader("⏱️", "Duration Distribution");
      durationCounts.forEach((count, range) => {
        const percentage = ((count / videos.length) * 100).toFixed(1);
        output += ResponseFormatters.keyValue(range, `${count} videos (${percentage}%)`);
      });
      output += "\n";
    }

    // Top performing videos (show top 10)
    output += ResponseFormatters.sectionHeader("🏆", "Top 10 Videos");
    const topVideos = videos.slice(0, 10);
    
    topVideos.forEach((video, index) => {
      output += ResponseFormatters.numberedItem(index + 1, `**${video.title}**`);
      output += ResponseFormatters.keyValue("Views", ResponseFormatters.formatViewCount(video.views), 3);
      output += ResponseFormatters.keyValue("Uploaded", new Date(video.uploadDate).toLocaleDateString(), 3);
      output += ResponseFormatters.keyValue("Duration", `${Math.round(video.duration)} min`, 3);
      output += ResponseFormatters.keyValue("Engagement", `${ResponseFormatters.formatNumber(video.likes)} likes, ${ResponseFormatters.formatNumber(video.comments)} comments`, 3);
      if (video.viewsPerMonth > 0) {
        output += ResponseFormatters.keyValue("Views/Month", ResponseFormatters.formatNumber(Math.round(video.viewsPerMonth)), 3);
      }
      output += ResponseFormatters.keyValue("URL", video.videoUrl, 3);
      output += "\n";
    });

    // Performance insights
    output += ResponseFormatters.sectionHeader("💡", "Performance Insights");
    const insights = this.generateInsights(videos);
    insights.forEach(insight => {
      output += ResponseFormatters.bulletPoint("", insight);
    });

    return output;
  }

  private calculateDurationDistribution(videos: VideoAnalysis[]): Map<string, number> {
    const distribution = new Map<string, number>();
    
    videos.forEach(video => {
      const range = video.durationRange;
      distribution.set(range, (distribution.get(range) || 0) + 1);
    });

    // Sort by duration sequence
    return new Map([...distribution.entries()].sort((a, b) => {
      const sequenceA = this.getDurationRangeSequence(this.parseDurationRangeToMinutes(a[0]));
      const sequenceB = this.getDurationRangeSequence(this.parseDurationRangeToMinutes(b[0]));
      return sequenceA - sequenceB;
    }));
  }

  private parseDurationRangeToMinutes(range: string): number {
    if (DURATION_RANGES.length === 0) return 0;
    const durationRange = DURATION_RANGES.find(r => r.label === range);
    const defaultRange = DURATION_RANGES[DURATION_RANGES.length - 1];
    return durationRange ? durationRange.avgMinutes : (defaultRange?.avgMinutes || 0);
  }

  private generateInsights(videos: VideoAnalysis[]): string[] {
    const insights: string[] = [];
    
    // Best performing duration range
    const durationPerformance = new Map<string, { views: number; count: number }>();
    videos.forEach(video => {
      const range = video.durationRange;
      const current = durationPerformance.get(range) || { views: 0, count: 0 };
      durationPerformance.set(range, {
        views: current.views + video.views,
        count: current.count + 1
      });
    });

    let bestDuration = "";
    let bestAvgViews = 0;
    durationPerformance.forEach((data, range) => {
      const avgViews = data.views / data.count;
      if (avgViews > bestAvgViews) {
        bestAvgViews = avgViews;
        bestDuration = range;
      }
    });

    if (bestDuration) {
      insights.push(`Videos in the ${bestDuration} range perform best with an average of ${ResponseFormatters.formatViewCount(Math.round(bestAvgViews))}`);
    }

    // Upload frequency insight
    if (videos.length >= 10) {
      const recentVideos = videos.filter(v => v.daysSinceUpload <= 30).length;
      const uploadFrequency = recentVideos > 0 ? `${recentVideos} videos in the last 30 days` : "No recent uploads";
      insights.push(`Upload frequency: ${uploadFrequency}`);
    }

    // Engagement rate
    const avgEngagementRate = videos.reduce((sum, v) => {
      const engagementRate = v.views > 0 ? ((v.likes + v.comments) / v.views) * 100 : 0;
      return sum + engagementRate;
    }, 0) / videos.length;
    
    insights.push(`Average engagement rate: ${avgEngagementRate.toFixed(2)}% (likes + comments / views)`);

    // Views trend
    const recentVideos = videos.filter(v => v.monthsSinceUpload <= 3);
    const olderVideos = videos.filter(v => v.monthsSinceUpload > 3);
    if (recentVideos.length > 0 && olderVideos.length > 0) {
      const recentAvgViews = recentVideos.reduce((sum, v) => sum + v.views, 0) / recentVideos.length;
      const olderAvgViews = olderVideos.reduce((sum, v) => sum + v.views, 0) / olderVideos.length;
      const trend = recentAvgViews > olderAvgViews ? "improving" : "declining";
      insights.push(`Channel performance trend: ${trend} (recent vs older videos)`);
    }

    return insights;
  }
}
