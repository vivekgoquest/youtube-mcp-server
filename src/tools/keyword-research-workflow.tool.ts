import {
  ToolMetadata,
  ToolRunner,
  ChainableToolRunner,
} from "../interfaces/tool.js";
import { YouTubeClient } from "../youtube-client.js";
import { ToolRegistry } from "../registry/tool-registry.js";
import { ToolResponse, KeywordAnalysisResult } from "../types.js";
import { ErrorHandler } from "../utils/error-handler.js";

interface KeywordResearchWorkflowOptions {
  seedKeywords: string[];
  niche?: string;
  maxVideosToAnalyze?: number;
  includeCompetitorAnalysis?: boolean;
  generateKeywordCloud?: boolean;
  useEnrichedData?: boolean;
  includeTopicAnalysis?: boolean;
  // Advanced filtering options
  filters?: {
    duration?: "any" | "long" | "medium" | "short";
    uploadDate?: "any" | "hour" | "today" | "week" | "month" | "year";
    regionCode?: string;
    publishedAfter?: string;
    publishedBefore?: string;
  };
  searchOrder?: "date" | "rating" | "relevance" | "title" | "viewCount";
}

interface WorkflowResult {
  seedAnalysis: any;
  videoAnalysis: any;
  competitorAnalysis?: any;
  keywordCloud?: any;
  recommendations: string[];
  summary: {
    totalKeywordsFound: number;
    topOpportunities: string[];
    competitionLevel: "low" | "medium" | "high";
    nextSteps: string[];
  };
}

export const metadata: ToolMetadata = {
  name: "keyword_research_workflow",
  description:
    "COMPLETE keyword research workflow in ONE COMMAND. Automatically: 1) Searches top videos for your keywords, 2) Extracts ALL keywords from those videos, 3) Analyzes competition and opportunity scores, 4) Finds content gaps, 5) Generates keyword cloud visualization. Use this POWER TOOL when starting keyword research from scratch. Returns EVERYTHING you need: winning keywords, content ideas, competitor insights, and actionable recommendations. Saves hours of manual analysis.",
  quotaCost: 200,
  inputSchema: {
    type: "object",
    properties: {
      seedKeywords: {
        type: "array",
        items: {
          type: "string",
        },
        description: "Initial seed keywords to start research",
      },
      niche: {
        type: "string",
        description: "Specific niche or industry focus",
      },
      maxVideosToAnalyze: {
        type: "integer",
        description: "Maximum number of videos to analyze (default: 50)",
        minimum: 10,
        maximum: 200,
        default: 50,
      },
      includeCompetitorAnalysis: {
        type: "boolean",
        description: "Include competitor analysis (default: true)",
        default: true,
      },
      generateKeywordCloud: {
        type: "boolean",
        description: "Generate keyword cloud visualization (default: true)",
        default: true,
      },
      useEnrichedData: {
        type: "boolean",
        description:
          "Enable fetching full video and channel statistics for more accurate analysis (default: false)",
        default: false,
      },
      includeTopicAnalysis: {
        type: "boolean",
        description:
          "Leverage topicDetails for semantic keyword clustering (default: true)",
        default: true,
      },
      filters: {
        type: "object",
        description: "Advanced filtering options for video search",
        properties: {
          duration: {
            type: "string",
            enum: ["any", "long", "medium", "short"],
            description: "Filter by video duration",
          },
          uploadDate: {
            type: "string",
            enum: ["any", "hour", "today", "week", "month", "year"],
            description: "Filter by upload date",
          },
          regionCode: {
            type: "string",
            description:
              "ISO 3166-1 alpha-2 country code for region-specific results",
          },
          publishedAfter: {
            type: "string",
            description:
              "ISO 8601 date - only include results published after this date",
          },
          publishedBefore: {
            type: "string",
            description:
              "ISO 8601 date - only include results published before this date",
          },
        },
      },
      searchOrder: {
        type: "string",
        enum: ["date", "rating", "relevance", "title", "viewCount"],
        description: "Sort order for search results (default: relevance)",
        default: "relevance",
      },
    },
    required: ["seedKeywords"],
  },
  requiresRegistry: true, // This tool needs registry for chaining
};

export default class KeywordResearchWorkflowTool
  implements ChainableToolRunner<KeywordResearchWorkflowOptions, WorkflowResult>
{
  constructor(
    private client: YouTubeClient,
    private registry: ToolRegistry,
  ) {}

  async run(
    options: KeywordResearchWorkflowOptions,
  ): Promise<ToolResponse<WorkflowResult>> {
    const startTime = Date.now();
    let totalQuotaUsed = 0;

    try {
      if (!options.seedKeywords || options.seedKeywords.length === 0) {
        return {
          success: false,
          error: "Seed keywords array is required and cannot be empty",
          metadata: {
            quotaUsed: 0,
            requestTime: Date.now() - startTime,
            source: "keyword-research-workflow",
          },
        };
      }

      // Step 1: Analyze seed keywords
      const seedAnalysis = await this.analyzeSeedKeywords(
        options.seedKeywords,
        options.useEnrichedData || false,
        options.includeTopicAnalysis !== false,
        options.filters,
        options.searchOrder,
      );
      totalQuotaUsed += 100; // Estimated quota for seed analysis

      // Step 2: Find and analyze videos for each seed keyword
      const videoAnalysis = await this.analyzeVideosForKeywords(
        options.seedKeywords,
        options.maxVideosToAnalyze || 50,
        options.filters,
        options.searchOrder,
      );
      totalQuotaUsed += 50; // Estimated quota for video analysis

      // Step 3: Competitor analysis (if requested)
      let competitorAnalysis;
      if (options.includeCompetitorAnalysis) {
        competitorAnalysis = await this.performCompetitorAnalysis(
          options.seedKeywords,
          options.filters,
          options.searchOrder,
        );
        totalQuotaUsed += 50; // Estimated quota for competitor analysis
      }

      // Step 4: Generate keyword cloud (if requested)
      let keywordCloud;
      if (options.generateKeywordCloud) {
        const allKeywords = this.extractAllKeywords(
          seedAnalysis,
          videoAnalysis,
        );
        keywordCloud = await this.generateKeywordCloud(allKeywords);
        // No additional quota for cloud generation
      }

      // Step 5: Generate recommendations and summary
      const recommendations = this.generateRecommendations(
        seedAnalysis,
        videoAnalysis,
        competitorAnalysis,
      );

      const summary = this.generateSummary(
        seedAnalysis,
        videoAnalysis,
        competitorAnalysis,
      );

      const result: WorkflowResult = {
        seedAnalysis,
        videoAnalysis,
        competitorAnalysis,
        keywordCloud,
        recommendations,
        summary,
      };

      return {
        success: true,
        data: result,
        metadata: {
          quotaUsed: 200, // Fixed quota cost as declared in metadata
          requestTime: Date.now() - startTime,
          source: "keyword-research-workflow",
        },
      };
    } catch (error) {
      return ErrorHandler.handleToolError<WorkflowResult>(error, {
        quotaUsed: 200, // Fixed quota cost as declared in metadata
        startTime,
        source: "keyword-research-workflow",
      });
    }
  }

  private async analyzeSeedKeywords(
    seedKeywords: string[],
    useEnrichedData: boolean,
    includeTopicAnalysis: boolean,
    filters?: any,
    searchOrder?: string,
  ): Promise<any> {
    const analysis = {
      keywords: [] as any[],
      totalSearchVolume: 0,
      averageCompetition: 0,
      opportunities: [] as string[],
      channelIds: new Set<string>(),
    };

    for (const keyword of seedKeywords) {
      // Use unified_search tool with enrichParts structure
      const searchParams: any = {
        query: keyword,
        maxResults: 25,
        order: searchOrder || "relevance",
        type: "video",
      };

      // Add enrichParts if enriched data is requested
      if (useEnrichedData) {
        searchParams.enrichParts = {
          video: includeTopicAnalysis
            ? [
                "snippet",
                "statistics",
                "contentDetails",
                "status",
                "topicDetails",
              ]
            : ["snippet", "statistics", "contentDetails"],
        };
      }

      // Add advanced filters if provided
      if (filters) {
        if (filters.duration) searchParams.videoDuration = filters.duration;
        if (filters.uploadDate) {
          searchParams.filters = { uploadDate: filters.uploadDate };
        }
        if (filters.regionCode) searchParams.regionCode = filters.regionCode;
        if (filters.publishedAfter)
          searchParams.publishedAfter = filters.publishedAfter;
        if (filters.publishedBefore)
          searchParams.publishedBefore = filters.publishedBefore;
      }

      const searchResult = await this.registry.executeTool(
        "unified_search",
        searchParams,
        this.client,
      );

      if (!searchResult.success || !searchResult.data) {
        console.warn(`Failed to search for keyword: ${keyword}`);
        continue;
      }

      const searchData = searchResult.data as any;
      const items = searchData.items || [];
      const totalResults = searchData.pageInfo?.totalResults || 0;

      // Collect channel IDs for later analysis
      items.forEach((item: any) => {
        if (item.snippet?.channelId) {
          analysis.channelIds.add(item.snippet.channelId);
        }
      });

      // Process enriched or non-enriched videos
      const enrichedVideos = items.slice(0, 5);

      const keywordData = {
        keyword,
        searchVolume: totalResults,
        resultCount: items.length,
        competition: this.calculateCompetition(items.length, totalResults),
        topVideos: enrichedVideos.map((item: any) => {
          // When using enrichParts, the unified_search tool returns fully enriched items
          const isEnriched = useEnrichedData && item.statistics !== undefined;
          const videoId = item.id?.videoId || item.id;

          return {
            title: item.snippet?.title,
            channelTitle: item.snippet?.channelTitle,
            channelId: item.snippet?.channelId,
            publishedAt: item.snippet?.publishedAt,
            videoId,
            // Include enriched data if available
            ...(isEnriched && {
              viewCount: parseInt(item.statistics?.viewCount || "0"),
              likeCount: parseInt(item.statistics?.likeCount || "0"),
              commentCount: parseInt(item.statistics?.commentCount || "0"),
              duration: item.contentDetails?.duration,
              tags: item.snippet?.tags || [],
              topicCategories: item.topicDetails?.topicCategories || [],
              privacyStatus: item.status?.privacyStatus,
            }),
          };
        }),
      };

      analysis.keywords.push(keywordData);
      analysis.totalSearchVolume += keywordData.searchVolume;

      // Identify opportunities (high search volume, low competition)
      if (keywordData.searchVolume > 1000 && keywordData.competition < 50) {
        analysis.opportunities.push(keyword);
      }
    }

    analysis.averageCompetition =
      analysis.keywords.length > 0
        ? analysis.keywords.reduce((sum, k) => sum + k.competition, 0) /
          analysis.keywords.length
        : 0;

    return analysis;
  }

  private async analyzeVideosForKeywords(
    seedKeywords: string[],
    maxVideos: number,
    filters?: any,
    searchOrder?: string,
  ): Promise<any> {
    const videoAnalysis = {
      totalVideosAnalyzed: 0,
      extractedKeywords: [] as any[],
      commonThemes: [] as string[],
      performanceInsights: [] as any[],
      videoIds: [] as string[],
    };

    for (const keyword of seedKeywords) {
      // Use unified_search tool with video type specified
      const searchParams: any = {
        query: keyword,
        type: "video",
        maxResults: Math.min(maxVideos / seedKeywords.length, 25),
        order: searchOrder || "viewCount",
        // Add enrichParts to get video details for better keyword extraction
        enrichParts: {
          video: ["snippet", "statistics"],
        },
      };

      // Add advanced filters if provided
      if (filters) {
        if (filters.duration) searchParams.videoDuration = filters.duration;
        if (filters.uploadDate) {
          searchParams.filters = { uploadDate: filters.uploadDate };
        }
        if (filters.regionCode) searchParams.regionCode = filters.regionCode;
        if (filters.publishedAfter)
          searchParams.publishedAfter = filters.publishedAfter;
        if (filters.publishedBefore)
          searchParams.publishedBefore = filters.publishedBefore;
      }

      const searchResult = await this.registry.executeTool(
        "unified_search",
        searchParams,
        this.client,
      );

      if (!searchResult.success || !searchResult.data) {
        console.warn(`Failed to search videos for keyword: ${keyword}`);
        continue;
      }

      const searchData = searchResult.data as any;
      const items = searchData.items || [];

      videoAnalysis.totalVideosAnalyzed += items.length;

      // Collect video IDs for keyword extraction
      const videoIds = items
        .filter((item: any) => item.id?.videoId || item.id)
        .map((item: any) => item.id?.videoId || item.id);

      videoAnalysis.videoIds.push(...videoIds);

      // Extract keywords from video titles and descriptions using extract_keywords_from_videos tool
      if (videoIds.length > 0) {
        const keywordExtractionResult = await this.registry.executeTool(
          "extract_keywords_from_videos",
          {
            videoIds: videoIds.slice(0, 10), // Limit to 10 videos per keyword to manage quota
            maxKeywords: 50,
          },
          this.client,
        );

        if (keywordExtractionResult.success && keywordExtractionResult.data) {
          const extractedData = keywordExtractionResult.data as any;
          if (extractedData.keywords) {
            videoAnalysis.extractedKeywords.push(...extractedData.keywords);
          }
        }
      }

      // Analyze themes from titles
      const themes = this.extractThemes(items);
      videoAnalysis.commonThemes.push(...themes);
    }

    // Deduplicate and rank keywords
    videoAnalysis.extractedKeywords = this.rankAndDeduplicateKeywords(
      videoAnalysis.extractedKeywords,
    );
    videoAnalysis.commonThemes = [...new Set(videoAnalysis.commonThemes)];

    return videoAnalysis;
  }

  private async performCompetitorAnalysis(
    seedKeywords: string[],
    filters?: any,
    searchOrder?: string,
  ): Promise<any> {
    const competitorAnalysis = {
      topChannels: [] as Array<{ channel: string; frequency: number }>,
      competitionLevel: "medium" as "low" | "medium" | "high",
      marketGaps: [] as any[],
      recommendations: [] as string[],
    };

    // Find top channels for seed keywords
    const channelFrequency: Record<string, number> = {};

    for (const keyword of seedKeywords) {
      // Use unified_search tool instead of direct client call
      const searchParams: any = {
        query: keyword,
        type: "video",
        maxResults: 10,
        order: searchOrder || "viewCount",
        enrichParts: {
          video: ["snippet"],
        },
      };

      // Add advanced filters if provided
      if (filters) {
        if (filters.duration) searchParams.videoDuration = filters.duration;
        if (filters.uploadDate) {
          searchParams.filters = { uploadDate: filters.uploadDate };
        }
        if (filters.regionCode) searchParams.regionCode = filters.regionCode;
        if (filters.publishedAfter)
          searchParams.publishedAfter = filters.publishedAfter;
        if (filters.publishedBefore)
          searchParams.publishedBefore = filters.publishedBefore;
      }

      const searchResult = await this.registry.executeTool(
        "unified_search",
        searchParams,
        this.client,
      );

      if (!searchResult.success || !searchResult.data) {
        console.warn(`Failed to search for competitor analysis: ${keyword}`);
        continue;
      }

      const searchData = searchResult.data as any;
      searchData.items?.forEach((item: any) => {
        const channelTitle = item.snippet?.channelTitle;
        if (channelTitle) {
          channelFrequency[channelTitle] =
            (channelFrequency[channelTitle] || 0) + 1;
        }
      });
    }

    // Rank top channels
    competitorAnalysis.topChannels = Object.entries(channelFrequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([channel, frequency]) => ({ channel, frequency }));

    // Determine competition level
    const totalCompetitors = Object.keys(channelFrequency).length;
    if (totalCompetitors < 20) competitorAnalysis.competitionLevel = "low";
    else if (totalCompetitors > 50)
      competitorAnalysis.competitionLevel = "high";

    return competitorAnalysis;
  }

  private async generateKeywordCloud(keywords: string[]): Promise<any> {
    // Generate frequency distribution
    const frequency: Record<string, number> = {};
    keywords.forEach((keyword) => {
      frequency[keyword] = (frequency[keyword] || 0) + 1;
    });

    // Create cloud data
    return {
      keywords: Object.entries(frequency)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 100)
        .map(([keyword, freq]) => ({
          text: keyword,
          weight: freq,
          frequency: freq,
        })),
      totalKeywords: keywords.length,
      uniqueKeywords: Object.keys(frequency).length,
    };
  }

  private extractAllKeywords(seedAnalysis: any, videoAnalysis: any): string[] {
    const allKeywords: string[] = [];

    // Add seed keywords
    allKeywords.push(...seedAnalysis.keywords.map((k: any) => k.keyword));

    // Add extracted keywords from videos
    allKeywords.push(
      ...videoAnalysis.extractedKeywords.map((k: any) => k.keyword),
    );

    return allKeywords;
  }

  private extractKeywordsFromVideos(videos: any[]): any[] {
    const keywords: any[] = [];

    videos.forEach((video) => {
      // Extract from title
      const titleWords = video.snippet.title
        .toLowerCase()
        .split(/\s+/)
        .filter((word: string) => word.length > 3);

      titleWords.forEach((word: string) => {
        keywords.push({ keyword: word, source: "title" });
      });
    });

    return keywords;
  }

  private extractThemes(videos: any[]): string[] {
    const themes: string[] = [];

    videos.forEach((video) => {
      const title = video.snippet.title.toLowerCase();

      // Simple theme extraction based on common patterns
      if (title.includes("tutorial")) themes.push("tutorial");
      if (title.includes("review")) themes.push("review");
      if (title.includes("how to")) themes.push("how-to");
      if (title.includes("guide")) themes.push("guide");
      if (title.includes("tips")) themes.push("tips");
    });

    return themes;
  }

  private rankAndDeduplicateKeywords(keywords: any[]): any[] {
    const frequency: Record<string, number> = {};

    keywords.forEach((k) => {
      frequency[k.keyword] = (frequency[k.keyword] || 0) + 1;
    });

    return Object.entries(frequency)
      .map(([keyword, freq]) => ({ keyword, frequency: freq }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 50);
  }

  private calculateCompetition(
    resultCount: number,
    totalResults: number,
  ): number {
    return Math.min(100, (resultCount / Math.max(1, totalResults)) * 10000);
  }

  private generateRecommendations(
    seedAnalysis: any,
    videoAnalysis: any,
    competitorAnalysis?: any,
  ): string[] {
    const recommendations: string[] = [];

    recommendations.push(
      `Focus on ${seedAnalysis.opportunities.length} identified low-competition opportunities`,
    );
    recommendations.push(
      `Analyze ${videoAnalysis.totalVideosAnalyzed} videos to understand content patterns`,
    );

    if (competitorAnalysis) {
      recommendations.push(
        `Study top ${competitorAnalysis.topChannels.length} competitor channels`,
      );
      recommendations.push(
        `Competition level is ${competitorAnalysis.competitionLevel} - adjust strategy accordingly`,
      );
    }

    recommendations.push(
      "Create content around common themes identified in the analysis",
    );
    recommendations.push(
      "Monitor keyword performance and adjust strategy based on results",
    );

    return recommendations;
  }

  private generateSummary(
    seedAnalysis: any,
    videoAnalysis: any,
    competitorAnalysis?: any,
  ): any {
    return {
      totalKeywordsFound: videoAnalysis.extractedKeywords.length,
      topOpportunities: seedAnalysis.opportunities.slice(0, 5),
      competitionLevel: competitorAnalysis?.competitionLevel || "medium",
      nextSteps: [
        "Create content for top opportunity keywords",
        "Monitor competitor strategies",
        "Track keyword rankings",
        "Expand research based on findings",
      ],
    };
  }
}
