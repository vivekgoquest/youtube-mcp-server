import { ToolMetadata, ToolRunner } from '../interfaces/tool.js';
import { YouTubeClient } from '../youtube-client.js';
import { ToolResponse, KeywordAnalysisResult } from '../types.js';

interface KeywordResearchWorkflowOptions {
  seedKeywords: string[];
  niche?: string;
  maxVideosToAnalyze?: number;
  includeCompetitorAnalysis?: boolean;
  generateKeywordCloud?: boolean;
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
    competitionLevel: 'low' | 'medium' | 'high';
    nextSteps: string[];
  };
}

export const metadata: ToolMetadata = {
  name: 'keyword_research_workflow',
  description: 'Complete keyword research workflow: search videos, extract keywords, analyze opportunities, and generate insights.',
  inputSchema: {
    type: 'object',
    properties: {
      seedKeywords: {
        type: 'array',
        items: {
          type: 'string'
        },
        description: 'Initial seed keywords to start research'
      },
      niche: {
        type: 'string',
        description: 'Specific niche or industry focus'
      },
      maxVideosToAnalyze: {
        type: 'integer',
        description: 'Maximum number of videos to analyze (default: 50)',
        minimum: 10,
        maximum: 200,
        default: 50
      },
      includeCompetitorAnalysis: {
        type: 'boolean',
        description: 'Include competitor analysis (default: true)',
        default: true
      },
      generateKeywordCloud: {
        type: 'boolean',
        description: 'Generate keyword cloud visualization (default: true)',
        default: true
      }
    },
    required: ['seedKeywords']
  },
  quotaCost: 200
};

export default class KeywordResearchWorkflowTool implements ToolRunner<KeywordResearchWorkflowOptions, WorkflowResult> {
  constructor(private client: YouTubeClient) {}

  async run(options: KeywordResearchWorkflowOptions): Promise<ToolResponse<WorkflowResult>> {
    const startTime = Date.now();
    let totalQuotaUsed = 0;
    
    try {
      if (!options.seedKeywords || options.seedKeywords.length === 0) {
        return {
          success: false,
          error: 'Seed keywords array is required and cannot be empty',
          metadata: {
            quotaUsed: 0,
            requestTime: Date.now() - startTime,
            source: 'keyword-research-workflow'
          }
        };
      }

      // Step 1: Analyze seed keywords
      const seedAnalysis = await this.analyzeSeedKeywords(options.seedKeywords);
      totalQuotaUsed += 100; // Estimated quota for seed analysis

      // Step 2: Find and analyze videos for each seed keyword
      const videoAnalysis = await this.analyzeVideosForKeywords(
        options.seedKeywords, 
        options.maxVideosToAnalyze || 50
      );
      totalQuotaUsed += 50; // Estimated quota for video analysis

      // Step 3: Competitor analysis (if requested)
      let competitorAnalysis;
      if (options.includeCompetitorAnalysis) {
        competitorAnalysis = await this.performCompetitorAnalysis(options.seedKeywords);
        totalQuotaUsed += 50; // Estimated quota for competitor analysis
      }

      // Step 4: Generate keyword cloud (if requested)
      let keywordCloud;
      if (options.generateKeywordCloud) {
        const allKeywords = this.extractAllKeywords(seedAnalysis, videoAnalysis);
        keywordCloud = await this.generateKeywordCloud(allKeywords);
        // No additional quota for cloud generation
      }

      // Step 5: Generate recommendations and summary
      const recommendations = this.generateRecommendations(
        seedAnalysis, 
        videoAnalysis, 
        competitorAnalysis
      );
      
      const summary = this.generateSummary(
        seedAnalysis, 
        videoAnalysis, 
        competitorAnalysis
      );

      const result: WorkflowResult = {
        seedAnalysis,
        videoAnalysis,
        competitorAnalysis,
        keywordCloud,
        recommendations,
        summary
      };

      return {
        success: true,
        data: result,
        metadata: {
          quotaUsed: totalQuotaUsed,
          requestTime: Date.now() - startTime,
          source: 'keyword-research-workflow'
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        metadata: {
          quotaUsed: totalQuotaUsed,
          requestTime: Date.now() - startTime,
          source: 'keyword-research-workflow'
        }
      };
    }
  }

  private async analyzeSeedKeywords(seedKeywords: string[]): Promise<any> {
    const analysis = {
      keywords: [] as any[],
      totalSearchVolume: 0,
      averageCompetition: 0,
      opportunities: [] as string[]
    };

    for (const keyword of seedKeywords) {
      // Search for videos with this keyword
      const searchResponse = await this.client.search({
        part: 'snippet',
        q: keyword,
        type: 'video',
        maxResults: 25,
        order: 'relevance'
      });

      const keywordData = {
        keyword,
        searchVolume: searchResponse.pageInfo.totalResults,
        resultCount: searchResponse.items.length,
        competition: this.calculateCompetition(searchResponse.items.length, searchResponse.pageInfo.totalResults),
        topVideos: searchResponse.items.slice(0, 5).map(item => ({
          title: item.snippet.title,
          channelTitle: item.snippet.channelTitle,
          publishedAt: item.snippet.publishedAt
        }))
      };

      analysis.keywords.push(keywordData);
      analysis.totalSearchVolume += keywordData.searchVolume;
      
      // Identify opportunities (high search volume, low competition)
      if (keywordData.searchVolume > 1000 && keywordData.competition < 50) {
        analysis.opportunities.push(keyword);
      }
    }

    analysis.averageCompetition = analysis.keywords.reduce((sum, k) => sum + k.competition, 0) / analysis.keywords.length;

    return analysis;
  }

  private async analyzeVideosForKeywords(seedKeywords: string[], maxVideos: number): Promise<any> {
    const videoAnalysis = {
      totalVideosAnalyzed: 0,
      extractedKeywords: [] as any[],
      commonThemes: [] as string[],
      performanceInsights: [] as any[]
    };

    for (const keyword of seedKeywords) {
      // Get top videos for this keyword
      const searchResponse = await this.client.search({
        part: 'snippet',
        q: keyword,
        type: 'video',
        maxResults: Math.min(maxVideos / seedKeywords.length, 25),
        order: 'viewCount'
      });

      videoAnalysis.totalVideosAnalyzed += searchResponse.items.length;

      // Extract keywords from video titles and descriptions
      const extractedKeywords = this.extractKeywordsFromVideos(searchResponse.items);
      videoAnalysis.extractedKeywords.push(...extractedKeywords);

      // Analyze themes
      const themes = this.extractThemes(searchResponse.items);
      videoAnalysis.commonThemes.push(...themes);
    }

    // Deduplicate and rank keywords
    videoAnalysis.extractedKeywords = this.rankAndDeduplicateKeywords(videoAnalysis.extractedKeywords);
    videoAnalysis.commonThemes = [...new Set(videoAnalysis.commonThemes)];

    return videoAnalysis;
  }

  private async performCompetitorAnalysis(seedKeywords: string[]): Promise<any> {
    const competitorAnalysis = {
      topChannels: [] as Array<{channel: string, frequency: number}>,
      competitionLevel: 'medium' as 'low' | 'medium' | 'high',
      marketGaps: [] as any[],
      recommendations: [] as string[]
    };

    // Find top channels for seed keywords
    const channelFrequency: Record<string, number> = {};
    
    for (const keyword of seedKeywords) {
      const searchResponse = await this.client.search({
        part: 'snippet',
        q: keyword,
        type: 'video',
        maxResults: 10,
        order: 'viewCount'
      });

      searchResponse.items.forEach(item => {
        const channelTitle = item.snippet.channelTitle;
        channelFrequency[channelTitle] = (channelFrequency[channelTitle] || 0) + 1;
      });
    }

    // Rank top channels
    competitorAnalysis.topChannels = Object.entries(channelFrequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([channel, frequency]) => ({ channel, frequency }));

    // Determine competition level
    const totalCompetitors = Object.keys(channelFrequency).length;
    if (totalCompetitors < 20) competitorAnalysis.competitionLevel = 'low';
    else if (totalCompetitors > 50) competitorAnalysis.competitionLevel = 'high';

    return competitorAnalysis;
  }

  private async generateKeywordCloud(keywords: string[]): Promise<any> {
    // Generate frequency distribution
    const frequency: Record<string, number> = {};
    keywords.forEach(keyword => {
      frequency[keyword] = (frequency[keyword] || 0) + 1;
    });

    // Create cloud data
    return {
      keywords: Object.entries(frequency)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 100)
        .map(([keyword, freq]) => ({
          text: keyword,
          weight: freq,
          frequency: freq
        })),
      totalKeywords: keywords.length,
      uniqueKeywords: Object.keys(frequency).length
    };
  }

  private extractAllKeywords(seedAnalysis: any, videoAnalysis: any): string[] {
    const allKeywords: string[] = [];
    
    // Add seed keywords
    allKeywords.push(...seedAnalysis.keywords.map((k: any) => k.keyword));
    
    // Add extracted keywords from videos
    allKeywords.push(...videoAnalysis.extractedKeywords.map((k: any) => k.keyword));
    
    return allKeywords;
  }

  private extractKeywordsFromVideos(videos: any[]): any[] {
    const keywords: any[] = [];
    
    videos.forEach(video => {
      // Extract from title
      const titleWords = video.snippet.title.toLowerCase()
        .split(/\s+/)
        .filter((word: string) => word.length > 3);
      
      titleWords.forEach((word: string) => {
        keywords.push({ keyword: word, source: 'title' });
      });
    });

    return keywords;
  }

  private extractThemes(videos: any[]): string[] {
    const themes: string[] = [];
    
    videos.forEach(video => {
      const title = video.snippet.title.toLowerCase();
      
      // Simple theme extraction based on common patterns
      if (title.includes('tutorial')) themes.push('tutorial');
      if (title.includes('review')) themes.push('review');
      if (title.includes('how to')) themes.push('how-to');
      if (title.includes('guide')) themes.push('guide');
      if (title.includes('tips')) themes.push('tips');
    });

    return themes;
  }

  private rankAndDeduplicateKeywords(keywords: any[]): any[] {
    const frequency: Record<string, number> = {};
    
    keywords.forEach(k => {
      frequency[k.keyword] = (frequency[k.keyword] || 0) + 1;
    });

    return Object.entries(frequency)
      .map(([keyword, freq]) => ({ keyword, frequency: freq }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 50);
  }

  private calculateCompetition(resultCount: number, totalResults: number): number {
    return Math.min(100, (resultCount / Math.max(1, totalResults)) * 10000);
  }

  private generateRecommendations(seedAnalysis: any, videoAnalysis: any, competitorAnalysis?: any): string[] {
    const recommendations: string[] = [];
    
    recommendations.push(`Focus on ${seedAnalysis.opportunities.length} identified low-competition opportunities`);
    recommendations.push(`Analyze ${videoAnalysis.totalVideosAnalyzed} videos to understand content patterns`);
    
    if (competitorAnalysis) {
      recommendations.push(`Study top ${competitorAnalysis.topChannels.length} competitor channels`);
      recommendations.push(`Competition level is ${competitorAnalysis.competitionLevel} - adjust strategy accordingly`);
    }
    
    recommendations.push('Create content around common themes identified in the analysis');
    recommendations.push('Monitor keyword performance and adjust strategy based on results');
    
    return recommendations;
  }

  private generateSummary(seedAnalysis: any, videoAnalysis: any, competitorAnalysis?: any): any {
    return {
      totalKeywordsFound: videoAnalysis.extractedKeywords.length,
      topOpportunities: seedAnalysis.opportunities.slice(0, 5),
      competitionLevel: competitorAnalysis?.competitionLevel || 'medium',
      nextSteps: [
        'Create content for top opportunity keywords',
        'Monitor competitor strategies',
        'Track keyword rankings',
        'Expand research based on findings'
      ]
    };
  }
}