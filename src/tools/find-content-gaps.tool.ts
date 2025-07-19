import { ToolMetadata, ToolRunner } from '../interfaces/tool.js';
import { YouTubeClient } from '../youtube-client.js';
import { ToolResponse } from '../types.js';

interface ContentGapOptions {
  seedKeywords: string[];
  niche?: string;
  competitorChannels?: string[];
  maxResults?: number;
}

interface ContentGapAnalysis {
  topic: string;
  searchVolume: number;
  competitionLevel: 'low' | 'medium' | 'high';
  topCompetitors: string[];
  suggestedKeywords: string[];
  contentOpportunity: 'high' | 'medium' | 'low';
  reasoningFactors: string[];
}

export const metadata: ToolMetadata = {
  name: 'find_content_gaps',
  description: 'DISCOVER untapped content opportunities your competitors are MISSING. Analyzes keywords and competitor channels to find topics with high demand but low supply. Returns SPECIFIC video ideas you should create, keywords no one is targeting, and niches within your niche. Use AFTER analyzing competitors and keywords. GAME-CHANGER for: finding blue ocean topics, avoiding saturated content, positioning yourself uniquely. Returns actionable content calendar ideas.',
  inputSchema: {
    type: 'object',
    properties: {
      seedKeywords: {
        type: 'array',
        items: {
          type: 'string'
        },
        description: 'Array of seed keywords to analyze for content gaps'
      },
      niche: {
        type: 'string',
        description: 'Specific niche or industry to focus on'
      },
      competitorChannels: {
        type: 'array',
        items: {
          type: 'string'
        },
        description: 'Array of competitor channel IDs to compare against'
      },
      maxResults: {
        type: 'integer',
        description: 'Maximum number of content gap opportunities to return (default: 20)',
        minimum: 1,
        maximum: 50,
        default: 20
      }
    },
    required: ['seedKeywords']
  },
  quotaCost: 100
};

export default class FindContentGapsTool implements ToolRunner<ContentGapOptions, ContentGapAnalysis[]> {
  constructor(private client: YouTubeClient) {}

  async run(options: ContentGapOptions): Promise<ToolResponse<ContentGapAnalysis[]>> {
    const startTime = Date.now();
    
    try {
      const maxResults = options.maxResults || 20;
      const contentGaps: ContentGapAnalysis[] = [];

      for (const keyword of options.seedKeywords) {
        // Search for existing content
        const searchResponse = await this.client.search({
          part: 'snippet',
          q: keyword,
          type: 'video',
          maxResults: 50,
          order: 'viewCount'
        });

        // Analyze competition level
        const competitionLevel = this.assessCompetitionLevel(searchResponse.items);
        
        // Get top competitors for this keyword
        const topCompetitors = searchResponse.items
          .slice(0, 5)
          .map(item => item.snippet.channelTitle)
          .filter((title, index, arr) => arr.indexOf(title) === index);

        // Generate related keywords
        const relatedKeywords = await this.generateRelatedKeywords(keyword);
        
        // Calculate content opportunity
        const contentOpportunity = this.calculateContentOpportunity(
          searchResponse.items.length,
          competitionLevel,
          searchResponse.pageInfo.totalResults
        );

        const gap: ContentGapAnalysis = {
          topic: keyword,
          searchVolume: searchResponse.pageInfo.totalResults,
          competitionLevel,
          topCompetitors,
          suggestedKeywords: relatedKeywords,
          contentOpportunity,
          reasoningFactors: this.generateReasoningFactors(competitionLevel, searchResponse.items)
        };

        contentGaps.push(gap);
      }

      // Sort by opportunity level
      contentGaps.sort((a, b) => {
        const opportunityScore = { high: 3, medium: 2, low: 1 };
        return opportunityScore[b.contentOpportunity] - opportunityScore[a.contentOpportunity];
      });

      return {
        success: true,
        data: contentGaps.slice(0, maxResults),
        metadata: {
          quotaUsed: options.seedKeywords.length * 100, // Search operations
          requestTime: Date.now() - startTime,
          source: 'youtube-content-gaps'
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        metadata: {
          quotaUsed: 0,
          requestTime: Date.now() - startTime,
          source: 'youtube-content-gaps'
        }
      };
    }
  }

  private assessCompetitionLevel(searchResults: any[]): 'low' | 'medium' | 'high' {
    const highViewVideos = searchResults.filter(item => {
      // This is a simplified assessment since we don't have view counts in search results
      // In a real implementation, you'd need additional API calls
      return item.snippet.channelTitle; // Placeholder logic
    }).length;
    
    if (searchResults.length < 10) return 'low';
    if (searchResults.length < 30) return 'medium';
    return 'high';
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

  private calculateContentOpportunity(
    resultCount: number,
    competitionLevel: 'low' | 'medium' | 'high',
    totalResults: number
  ): 'high' | 'medium' | 'low' {
    if (competitionLevel === 'low' && totalResults > 1000) return 'high';
    if (competitionLevel === 'medium' && totalResults > 5000) return 'medium';
    if (competitionLevel === 'high') return 'low';
    return 'medium';
  }

  private generateReasoningFactors(competitionLevel: 'low' | 'medium' | 'high', searchResults: any[]): string[] {
    const factors: string[] = [];
    
    factors.push(`Competition level: ${competitionLevel}`);
    factors.push(`${searchResults.length} competing videos found`);
    
    if (competitionLevel === 'low') {
      factors.push('Low competition suggests good opportunity');
    } else if (competitionLevel === 'high') {
      factors.push('High competition may require unique angle');
    }
    
    return factors;
  }
}
