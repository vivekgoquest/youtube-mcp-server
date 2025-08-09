import type { ToolMetadata, ToolRunner } from "../interfaces/tool.js";
import { YouTubeClient } from "../youtube-client.js";
import type { ToolResponse } from "../types.js";
import { ErrorHandler } from "../utils/error-handler.js";
import {
  YOUTUBE_API_BATCH_SIZE,
  DEFAULT_CHANNEL_PARTS,
} from "../config/constants.js";

interface CompetitorAnalysisOptions {
  channelId: string;
  maxVideos?: number;
  analyzeComments?: boolean;
  timeframe?: "week" | "month" | "quarter" | "year";
  includeParts?: string[];
  includeNetworkAnalysis?: boolean;
}

interface CompetitorAnalysis {
  channelId: string;
  channelName: string;
  subscriberCount: number;
  videoCount: number;
  averageViews: number;
  uploadFrequency: string;
  topPerformingVideos: any[];
  contentThemes: string[];
  uploadPattern: {
    daysOfWeek: Record<string, number>;
    timesOfDay: Record<string, number>;
  };
  engagementMetrics: {
    averageLikes: number;
    averageComments: number;
    engagementRate: number;
  };
  brandingAnalysis?: {
    channelKeywords: string[];
    featuredChannels: any[];
    defaultLanguage?: string;
    country?: string;
  };
  topicCategories?: string[];
  commentInsights?: {
    engagementPatterns: any;
    audienceSentiment: any;
    volumeTrends: any;
  };
  networkConnections?: {
    featuredChannels: any[];
    collaborations: any[];
  };
  complianceStatus?: {
    communityGuidelinesGoodStanding?: boolean;
    copyrightStrikesGoodStanding?: boolean;
  };
}

export const metadata: ToolMetadata = {
  name: "analyze_competitor",
  description:
    "DEEP DIVE into any competitor channel to uncover their winning strategies. Analyzes upload patterns, best performing videos, content themes, and engagement metrics. Use this to COPY what works and avoid what doesn't. Returns: upload schedule patterns, top 10 performing videos, content categories they dominate, average views/engagement, and specific gaps you can exploit. Input channel ID from search_channels. Essential for competitive intelligence.",
  inputSchema: {
    type: "object",
    properties: {
      channelId: {
        type: "string",
        description: "Competitor channel ID to analyze",
      },
      maxVideos: {
        type: "integer",
        description: "Maximum number of videos to analyze (default: 100)",
        minimum: 1,
        maximum: 500,
        default: 100,
      },
      analyzeComments: {
        type: "boolean",
        description:
          "Include comment analysis for engagement insights (default: false)",
        default: false,
      },
      timeframe: {
        type: "string",
        enum: ["week", "month", "quarter", "year"],
        description: "Timeframe for analysis",
        default: "month",
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
            "topicDetails",
            "localizations",
            "status",
          ],
        },
        description: "Channel parts to include in analysis",
        default: DEFAULT_CHANNEL_PARTS,
      },
      includeNetworkAnalysis: {
        type: "boolean",
        description:
          "Analyze featured channels and collaborations (default: true)",
        default: true,
      },
    },
    required: ["channelId"],
  },
};

export default class AnalyzeCompetitorTool
  implements ToolRunner<CompetitorAnalysisOptions, CompetitorAnalysis>
{
  constructor(private client: YouTubeClient) {}

  async run(
    options: CompetitorAnalysisOptions,
  ): Promise<ToolResponse<CompetitorAnalysis>> {
    try {
      const maxVideos = options.maxVideos || 100;

      // Get channel details with configurable parts
      const parts = options.includeParts || [
        "snippet",
        "statistics",
        "contentDetails",
        "brandingSettings",
        "topicDetails",
      ];
      const channelResponse = await this.client.getChannels({
        part: parts.join(","),
        id: options.channelId,
      });

      if (channelResponse.items.length === 0) {
        throw new Error(`Channel ${options.channelId} not found`);
      }

      const channel = channelResponse.items[0];
      if (!channel) {
        throw new Error(`Channel ${options.channelId} not found`);
      }
      
      const uploadsPlaylistId =
        channel.contentDetails?.relatedPlaylists?.uploads;

      if (!uploadsPlaylistId) {
        throw new Error("No uploads playlist found");
      }

      // Get recent videos
      const videoIds = await this.getAllPlaylistVideoIds(
        uploadsPlaylistId,
        maxVideos,
      );
      const videos = await this.getVideosInBatches(videoIds);

      // Analyze upload patterns
      const uploadPattern = this.analyzeUploadPattern(videos);

      // Calculate metrics
      const totalViews = videos.reduce(
        (sum, v) => sum + parseInt(v.statistics?.viewCount || "0"),
        0,
      );
      const totalLikes = videos.reduce(
        (sum, v) => sum + parseInt(v.statistics?.likeCount || "0"),
        0,
      );
      const totalComments = videos.reduce(
        (sum, v) => sum + parseInt(v.statistics?.commentCount || "0"),
        0,
      );

      const averageViews = totalViews / videos.length;
      const averageLikes = totalLikes / videos.length;
      const averageComments = totalComments / videos.length;
      const engagementRate = (totalLikes + totalComments) / totalViews;

      // Get top performing videos
      const topPerformingVideos = videos
        .sort(
          (a, b) =>
            parseInt(b.statistics?.viewCount || "0") -
            parseInt(a.statistics?.viewCount || "0"),
        )
        .slice(0, 10)
        .map((v) => ({
          videoId: v.id,
          title: v.snippet?.title,
          views: parseInt(v.statistics?.viewCount || "0"),
          publishedAt: v.snippet?.publishedAt,
        }));

      // Extract content themes from titles and tags
      const contentThemes = this.extractContentThemes(videos);

      // Calculate upload frequency
      const uploadFrequency = this.calculateUploadFrequency(videos);

      const analysis: CompetitorAnalysis = {
        channelId: options.channelId,
        channelName: channel?.snippet?.title || "",
        subscriberCount: parseInt(channel?.statistics?.subscriberCount || "0"),
        videoCount: parseInt(channel?.statistics?.videoCount || "0"),
        averageViews,
        uploadFrequency,
        topPerformingVideos,
        contentThemes,
        uploadPattern,
        engagementMetrics: {
          averageLikes,
          averageComments,
          engagementRate,
        },
      };

      // Add branding analysis if brandingSettings included
      if (channel?.brandingSettings) {
        analysis.brandingAnalysis = this.analyzeBrandingStrategy(
          channel.brandingSettings,
        );
      }

      // Add topic categories if topicDetails included
      if (channel?.topicDetails) {
        analysis.topicCategories = this.categorizeChannelTopics(
          channel.topicDetails,
        );
      }

      // Add network analysis if requested
      const channelSettings = channel?.brandingSettings?.channel as any;
      if (
        options.includeNetworkAnalysis !== false &&
        channelSettings?.featuredChannelsUrls
      ) {
        analysis.networkConnections = await this.mapChannelNetwork(
          channelSettings.featuredChannelsUrls,
          channel,
        );
      }

      // Add comment insights if requested
      if (options.analyzeComments && topPerformingVideos.length > 0) {
        analysis.commentInsights = await this.analyzeAudienceEngagement(
          topPerformingVideos.slice(0, 5).map((v) => v.videoId),
          this.client,
        );
      }

      // Add compliance status if auditDetails included
      if (channel?.auditDetails) {
        analysis.complianceStatus = this.assessComplianceRisk(
          channel.auditDetails,
        );
      }

      return {
        success: true,
        data: analysis,
      };
    } catch (error) {
      return ErrorHandler.handleToolError<CompetitorAnalysis>(error, {
        source: "youtube-competitor-analysis",
      });
    }
  }

  private async getAllPlaylistVideoIds(
    playlistId: string,
    maxResults: number,
  ): Promise<string[]> {
    const videoIds: string[] = [];
    let pageToken: string | undefined;

    do {
      const response = await this.client.makeRawRequest("/playlistItems", {
        part: "contentDetails",
        playlistId,
        maxResults: Math.min(50, maxResults - videoIds.length),
        pageToken,
      });

      for (const item of response.items || []) {
        if (item.contentDetails?.videoId) {
          videoIds.push(item.contentDetails.videoId);
        }
      }

      pageToken = response.nextPageToken;
    } while (pageToken && videoIds.length < maxResults);

    return videoIds;
  }

  private async getVideosInBatches(videoIds: string[]): Promise<any[]> {
    const videos: any[] = [];
    const batchSize = YOUTUBE_API_BATCH_SIZE;

    for (let i = 0; i < videoIds.length; i += batchSize) {
      const batch = videoIds.slice(i, i + batchSize);
      const response = await this.client.getVideos({
        part: "snippet,statistics,contentDetails",
        id: batch.join(","),
      });
      videos.push(...response.items);
    }

    return videos;
  }

  private analyzeUploadPattern(videos: any[]): {
    daysOfWeek: Record<string, number>;
    timesOfDay: Record<string, number>;
  } {
    const daysOfWeek: Record<string, number> = {};
    const timesOfDay: Record<string, number> = {};

    const dayNames = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];

    for (const video of videos) {
      const publishedAt = new Date(video.snippet?.publishedAt || "");
      const dayIndex = publishedAt.getDay();
      const dayName = dayNames[dayIndex] || "Unknown";
      const hour = publishedAt.getHours();

      daysOfWeek[dayName] = (daysOfWeek[dayName] || 0) + 1;
      timesOfDay[`${hour}:00`] = (timesOfDay[`${hour}:00`] || 0) + 1;
    }

    return { daysOfWeek, timesOfDay };
  }

  private extractContentThemes(videos: any[]): string[] {
    const themes = new Map<string, number>();

    for (const video of videos) {
      const title = video.snippet?.title?.toLowerCase() || "";
      const tags = video.snippet?.tags || [];

      // Extract themes from tags
      for (const tag of tags) {
        const normalizedTag = tag.toLowerCase().trim();
        if (normalizedTag.length > 2) {
          themes.set(normalizedTag, (themes.get(normalizedTag) || 0) + 1);
        }
      }

      // Extract themes from common words in titles
      const words = title
        .split(/\s+/)
        .filter((word: string) => word.length > 3);
      for (const word of words) {
        themes.set(word, (themes.get(word) || 0) + 1);
      }
    }

    return Array.from(themes.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([theme]) => theme);
  }

  private calculateUploadFrequency(videos: any[]): string {
    if (videos.length < 2) return "Insufficient data";

    const dates = videos
      .map((v) => new Date(v.snippet?.publishedAt || ""))
      .sort((a, b) => b.getTime() - a.getTime());

    const firstDate = dates[0];
    const lastDate = dates[dates.length - 1];
    
    if (!firstDate || !lastDate) return "Insufficient data";
    
    const daysBetween =
      (firstDate.getTime() - lastDate.getTime()) /
      (1000 * 60 * 60 * 24);
    const averageDaysBetween = daysBetween / (videos.length - 1);

    if (averageDaysBetween < 1) return "Multiple times per day";
    if (averageDaysBetween < 2) return "Daily";
    if (averageDaysBetween < 4) return "2-3 times per week";
    if (averageDaysBetween < 8) return "Weekly";
    if (averageDaysBetween < 15) return "Bi-weekly";
    if (averageDaysBetween < 32) return "Monthly";
    return "Irregular";
  }

  private analyzeBrandingStrategy(brandingSettings: any): any {
    const channelSection = brandingSettings.channel || {};
    const keywords = channelSection.keywords
      ? channelSection.keywords.split(/\s+/).filter((k: string) => k.length > 0)
      : [];

    return {
      channelKeywords: keywords,
      featuredChannels: channelSection.featuredChannelsUrls || [],
      defaultLanguage: channelSection.defaultLanguage,
      country: channelSection.country,
    };
  }

  private categorizeChannelTopics(topicDetails: any): string[] {
    if (!topicDetails?.topicCategories) return [];

    return topicDetails.topicCategories.map((url: string) => {
      // Extract topic name from Wikipedia URL
      const parts = url.split("/");
      const lastPart = parts[parts.length - 1];
      if (!lastPart) return "";
      const topicName = lastPart.replace(/_/g, " ");
      return topicName;
    });
  }

  private async mapChannelNetwork(
    featuredChannelUrls: string[],
    _channel: any,
  ): Promise<any> {
    const featuredChannels = featuredChannelUrls.map((url) => ({
      url,
      channelId: this.extractChannelIdFromUrl(url),
    }));

    return {
      featuredChannels,
      collaborations: [], // This could be expanded to analyze video descriptions for mentions
    };
  }

  private extractChannelIdFromUrl(url: string): string | null {
    // Extract channel ID from various YouTube URL formats
    const patterns = [/channel\/(UC[\w-]+)/, /user\/([\w-]+)/, /@([\w-]+)/];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) return match[1];
    }
    return null;
  }

  private async analyzeAudienceEngagement(
    videoIds: string[],
    client: YouTubeClient,
  ): Promise<any> {
    const engagementData = {
      totalComments: 0,
      averageResponseTime: 0,
      topCommenters: new Map<string, number>(),
      sentimentBreakdown: { positive: 0, neutral: 0, negative: 0 },
    };

    for (const videoId of videoIds) {
      const commentsResponse = await client.makeRawRequest("/commentThreads", {
        part: "snippet",
        videoId,
        maxResults: 100,
        order: "relevance",
      });

      engagementData.totalComments +=
        commentsResponse.pageInfo?.totalResults || 0;

      // Basic sentiment analysis based on likes
      commentsResponse.items?.forEach((item: any) => {
        const likeCount =
          item.snippet?.topLevelComment?.snippet?.likeCount || 0;
        if (likeCount > 10) engagementData.sentimentBreakdown.positive++;
        else if (likeCount > 5) engagementData.sentimentBreakdown.neutral++;
        else engagementData.sentimentBreakdown.negative++;

        // Track top commenters
        const authorName =
          item.snippet?.topLevelComment?.snippet?.authorDisplayName;
        if (authorName) {
          engagementData.topCommenters.set(
            authorName,
            (engagementData.topCommenters.get(authorName) || 0) + 1,
          );
        }
      });
    }

    return {
      engagementPatterns: {
        totalComments: engagementData.totalComments,
        commentsPerVideo: engagementData.totalComments / videoIds.length,
      },
      audienceSentiment: engagementData.sentimentBreakdown,
      volumeTrends: Array.from(engagementData.topCommenters.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, count]) => ({ commenter: name, commentCount: count })),
    };
  }

  private assessComplianceRisk(auditDetails: any): any {
    // Default to true when status is undefined, assuming good standing unless explicitly flagged
    // This follows the principle of "innocent until proven guilty" for compliance status
    const communityGuidelinesGoodStanding = 
      auditDetails.communityGuidelinesGoodStanding !== undefined 
        ? auditDetails.communityGuidelinesGoodStanding 
        : true;
    
    const copyrightStrikesGoodStanding = 
      auditDetails.copyrightStrikesGoodStanding !== undefined 
        ? auditDetails.copyrightStrikesGoodStanding 
        : true;

    return {
      communityGuidelinesGoodStanding,
      copyrightStrikesGoodStanding,
    };
  }
}
