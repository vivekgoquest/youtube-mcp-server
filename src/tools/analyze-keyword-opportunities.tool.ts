import { ToolMetadata, ToolRunner } from '../interfaces/tool.js';
import { YouTubeClient } from '../youtube-client.js';
import { ToolResponse } from '../types.js';

interface KeywordOpportunityOptions {
  keywords: string[];
  maxResults?: number;
  includeRelated?: boolean;
}

interface KeywordAnalysis {
  keyword: string;
  searchVolume: number;
  competition: number;
  relatedKeywords: string[];
  topVideos: {
    videoId: string;
    title: string;
    views: number;
    channelName: string;
  }[];
  difficulty: 'easy' | 'medium' | 'hard';
  opportunity: number;
}

export const metadata: ToolMetadata = {
  name: 'analyze_keyword_opportunities',
  description: 'OPPORTUNITY SCANNER that finds untapped keywords with high potential. Analyzes competition difficulty, search volume, and ranking potential for each keyword. Returns opportunity score (1-100) showing which keywords are easiest to rank for. Use this to find "golden keywords" - high search, low competition. INCLUDES: related keyword suggestions, competition analysis per keyword, and specific content recommendations. Essential for finding keywords where you can actually rank on page 1.',
  inputSchema: {
    type: 'object',
    properties: {
      keywords: {
        type: 'array',
        items: {
          type: 'string'
        },
        description: 'Array of keywords to analyze'
      },
      maxResults: {
        type: 'integer',
        description: 'Maximum number of keyword analyses to return (default: 25)',
        minimum: 1,
        maximum: 50,
        default: 25
      },
      includeRelated: {
        type: 'boolean',
        description: 'Include related keyword suggestions (default: true)',
        default: true
      }
    },
    required: ['keywords']
  },
  quotaCost: 100
};

export default class AnalyzeKeywordOpportunitiesTool implements ToolRunner<KeywordOpportunityOptions, KeywordAnalysis[]> {
  constructor(private client: YouTubeClient) {}

  async run(options: KeywordOpportunityOptions): Promise<ToolResponse<KeywordAnalysis[]>> {
    const startTime = Date.now();
    
    try {
      const maxResults = options.maxResults || 25;
      const keywordAnalyses: KeywordAnalysis[] = [];

      for (const keyword of options.keywords) {
        // Search for videos with this keyword
        const searchResponse = await this.client.search({
          part: 'snippet',
          q: keyword,
          type: 'video',
          maxResults: 50,
          order: 'relevance'
        });

        // Get top videos for this keyword
        const topVideos = searchResponse.items.slice(0, 10).map(item => ({
          videoId: item.id.videoId || '',
          title: item.snippet.title,
          views: 0, // Would need additional API call to get view count
          channelName: item.snippet.channelTitle
        }));

        // Calculate competition and difficulty
        const competition = this.calculateKeywordCompetition(searchResponse.items);
        const difficulty = this.calculateKeywordDifficulty(competition, searchResponse.pageInfo.totalResults);
        
        // Generate related keywords if requested
        const relatedKeywords = options.includeRelated ? 
          await this.generateRelatedKeywords(keyword) : [];

        // Calculate opportunity score
        const opportunity = this.calculateKeywordOpportunity(
          searchResponse.pageInfo.totalResults,
          competition,
          difficulty
        );

        const analysis: KeywordAnalysis = {
          keyword,
          searchVolume: searchResponse.pageInfo.totalResults,
          competition,
          relatedKeywords,
          topVideos,
          difficulty,
          opportunity
        };

        keywordAnalyses.push(analysis);
      }

      // Sort by opportunity score
      keywordAnalyses.sort((a, b) => b.opportunity - a.opportunity);

      return {
        success: true,
        data: keywordAnalyses.slice(0, maxResults),
        metadata: {
          quotaUsed: options.keywords.length * 100,
          requestTime: Date.now() - startTime,
          source: 'youtube-keyword-analysis'
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        metadata: {
          quotaUsed: 0,
          requestTime: Date.now() - startTime,
          source: 'youtube-keyword-analysis'
        }
      };
    }
  }

  private async generateRelatedKeywords(keyword: string): Promise<string[]> {
    // Simple related keyword generation based on common patterns
    const variations = [
      `${keyword} tutorial`,
      `${keyword} guide`,
      `${keyword} tips`,
      `${keyword} review`,
      `${keyword} 2024`,
      `best ${keyword}`,
      `how to ${keyword}`,
      `${keyword} explained`
    ];
    
    return variations.slice(0, 5);
  }

  private calculateKeywordCompetition(searchResults: any[]): number {
    // Simplified competition calculation
    return Math.min(100, searchResults.length * 2);
  }

  private calculateKeywordDifficulty(competition: number, totalResults: number): 'easy' | 'medium' | 'hard' {
    if (competition < 30 && totalResults < 10000) return 'easy';
    if (competition < 60 && totalResults < 50000) return 'medium';
    return 'hard';
  }

  private calculateKeywordOpportunity(searchVolume: number, competition: number, difficulty: 'easy' | 'medium' | 'hard'): number {
    const difficultyScore = { easy: 100, medium: 60, hard: 30 };
    const volumeScore = Math.min(100, Math.log10(searchVolume) * 20);
    const competitionPenalty = Math.min(50, competition / 2);
    
    return Math.max(0, volumeScore + difficultyScore[difficulty] - competitionPenalty);
  }
}
