import { ToolMetadata, ToolRunner } from '../interfaces/tool.js';
import { YouTubeClient } from '../youtube-client.js';
import { ToolResponse, KeywordData, KeywordCluster } from '../types.js';

interface AnalyzeKeywordsOptions {
  keywords: string[];
  includeRelated?: boolean;
  includeCompetitionAnalysis?: boolean;
  maxResults?: number;
}

interface KeywordAnalysisResult {
  keywords: KeywordData[];
  clusters: KeywordCluster[];
  insights: {
    topKeywords: KeywordData[];
    emergingKeywords: KeywordData[];
    competitiveKeywords: KeywordData[];
    opportunityKeywords: KeywordData[];
  };
  recommendations: string[];
  competitionAnalysis?: {
    level: 'low' | 'medium' | 'high';
    topCompetitors: string[];
    gaps: string[];
  };
}

export const metadata: ToolMetadata = {
  name: 'analyze_keywords',
  description: 'Perform DEEP analysis on keywords to find winning opportunities. Evaluates search volume, competition difficulty, and generates related keywords. Use AFTER search_videos to analyze keywords from actual content. Returns: keyword scores (0-100), difficulty ratings, clusters of related terms, and specific recommendations. CRITICAL for: choosing video topics, optimizing titles/tags, finding low-competition keywords. Analyzes up to 100 keywords and identifies hidden opportunities.',
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
      includeRelated: {
        type: 'boolean',
        description: 'Include related keyword suggestions (default: true)',
        default: true
      },
      includeCompetitionAnalysis: {
        type: 'boolean',
        description: 'Include competition analysis (default: true)',
        default: true
      },
      maxResults: {
        type: 'integer',
        description: 'Maximum number of analyzed keywords to return (default: 50)',
        minimum: 1,
        maximum: 100,
        default: 50
      }
    },
    required: ['keywords']
  },
  quotaCost: 100
};

export default class AnalyzeKeywordsTool implements ToolRunner<AnalyzeKeywordsOptions, KeywordAnalysisResult> {
  constructor(private client: YouTubeClient) {}

  async run(options: AnalyzeKeywordsOptions): Promise<ToolResponse<KeywordAnalysisResult>> {
    const startTime = Date.now();
    
    try {
      if (!options.keywords || options.keywords.length === 0) {
        return {
          success: false,
          error: 'Keywords array is required and cannot be empty',
          metadata: {
            quotaUsed: 0,
            requestTime: Date.now() - startTime,
            source: 'keyword-analysis'
          }
        };
      }

      const keywordData: KeywordData[] = [];
      let quotaUsed = 0;

      // Analyze each keyword
      for (const keyword of options.keywords) {
        // Search for videos with this keyword to gather data
        const searchResponse = await this.client.search({
          part: 'snippet',
          q: keyword,
          type: 'video',
          maxResults: 50,
          order: 'relevance'
        });

        quotaUsed += 100; // Search quota cost

        // Calculate keyword metrics
        const frequency = searchResponse.items.length;
        const relevance = this.calculateKeywordRelevance(keyword, searchResponse.items);
        const confidence = this.calculateKeywordConfidence(searchResponse.pageInfo.totalResults, frequency);
        
        // Generate related keywords if requested
        const relatedTerms = options.includeRelated ? 
          this.generateRelatedKeywords(keyword) : [];

        const keywordItem: KeywordData = {
          keyword,
          frequency,
          sources: ['title'],
          relevance,
          confidence,
          relatedTerms,
          contexts: searchResponse.items.slice(0, 5).map(item => item.snippet.title),
          searchVolume: searchResponse.pageInfo.totalResults,
          competition: this.calculateCompetition(frequency, searchResponse.pageInfo.totalResults),
          difficulty: this.calculateDifficulty(frequency, searchResponse.pageInfo.totalResults)
        };

        keywordData.push(keywordItem);
      }

      // Generate clusters
      const clusters = this.generateKeywordClusters(keywordData);

      // Generate insights
      const insights = this.generateKeywordInsights(keywordData);

      // Competition analysis
      const competitionAnalysis = options.includeCompetitionAnalysis ? 
        await this.performCompetitionAnalysis(keywordData) : undefined;

      // Generate recommendations
      const recommendations = this.generateRecommendations(keywordData, insights);

      const result: KeywordAnalysisResult = {
        keywords: keywordData.slice(0, options.maxResults || 50),
        clusters,
        insights,
        recommendations,
        competitionAnalysis
      };

      return {
        success: true,
        data: result,
        metadata: {
          quotaUsed,
          requestTime: Date.now() - startTime,
          source: 'keyword-analysis'
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        metadata: {
          quotaUsed: 0,
          requestTime: Date.now() - startTime,
          source: 'keyword-analysis'
        }
      };
    }
  }

  private calculateKeywordRelevance(keyword: string, searchResults: any[]): number {
    // Calculate relevance based on how many results contain the keyword in title
    const titleMatches = searchResults.filter(item => 
      item.snippet.title.toLowerCase().includes(keyword.toLowerCase())
    ).length;
    
    return Math.min(1, titleMatches / Math.max(1, searchResults.length));
  }

  private calculateKeywordConfidence(totalResults: number, frequency: number): number {
    // Higher confidence for keywords with good search volume but manageable competition
    if (totalResults > 10000 && frequency < 100) return 0.9;
    if (totalResults > 1000 && frequency < 50) return 0.7;
    if (totalResults > 100) return 0.5;
    return 0.3;
  }

  private calculateCompetition(frequency: number, totalResults: number): number {
    // Scale competition from 0-100
    return Math.min(100, (frequency / Math.max(1, totalResults)) * 10000);
  }

  private calculateDifficulty(frequency: number, totalResults: number): 'Low' | 'Medium' | 'High' {
    const competition = this.calculateCompetition(frequency, totalResults);
    if (competition < 30) return 'Low';
    if (competition < 70) return 'Medium';
    return 'High';
  }

  private generateRelatedKeywords(keyword: string): string[] {
    // Simple related keyword generation
    return [
      `${keyword} tutorial`,
      `${keyword} guide`,
      `best ${keyword}`,
      `${keyword} review`,
      `how to ${keyword}`
    ];
  }

  private generateKeywordClusters(keywords: KeywordData[]): KeywordCluster[] {
    // Simple clustering based on keyword similarity
    const clusters: KeywordCluster[] = [];
    const processed = new Set<string>();

    keywords.forEach((keyword, index) => {
      if (processed.has(keyword.keyword)) return;

      const relatedKeywords = keywords.filter(k => 
        !processed.has(k.keyword) && 
        this.areKeywordsSimilar(keyword.keyword, k.keyword)
      );

      if (relatedKeywords.length > 0) {
        const cluster: KeywordCluster = {
          clusterId: `cluster_${index}`,
          mainKeyword: keyword.keyword,
          relatedKeywords,
          theme: this.extractTheme(relatedKeywords),
          totalFrequency: relatedKeywords.reduce((sum, k) => sum + k.frequency, 0),
          opportunityScore: this.calculateOpportunityScore(relatedKeywords)
        };

        clusters.push(cluster);
        relatedKeywords.forEach(k => processed.add(k.keyword));
      }
    });

    return clusters;
  }

  private areKeywordsSimilar(keyword1: string, keyword2: string): boolean {
    // Simple similarity check based on shared words
    const words1 = keyword1.toLowerCase().split(' ');
    const words2 = keyword2.toLowerCase().split(' ');
    const commonWords = words1.filter(word => words2.includes(word));
    return commonWords.length > 0;
  }

  private extractTheme(keywords: KeywordData[]): string {
    // Extract common theme from keywords
    const words = keywords.flatMap(k => k.keyword.split(' '));
    const wordCount = words.reduce((acc, word) => {
      acc[word] = (acc[word] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(wordCount)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'General';
  }

  private calculateOpportunityScore(keywords: KeywordData[]): number {
    // Calculate opportunity based on search volume vs competition
    const avgSearchVolume = keywords.reduce((sum, k) => sum + (k.searchVolume || 0), 0) / keywords.length;
    const avgCompetition = keywords.reduce((sum, k) => sum + (k.competition || 0), 0) / keywords.length;
    
    return Math.max(0, Math.min(100, avgSearchVolume / 1000 - avgCompetition));
  }

  private generateKeywordInsights(keywords: KeywordData[]): {
    topKeywords: KeywordData[];
    emergingKeywords: KeywordData[];
    competitiveKeywords: KeywordData[];
    opportunityKeywords: KeywordData[];
  } {
    const sorted = [...keywords].sort((a, b) => b.frequency - a.frequency);
    
    return {
      topKeywords: sorted.slice(0, 10),
      emergingKeywords: keywords.filter(k => (k.searchVolume || 0) > 1000 && (k.competition || 0) < 50).slice(0, 10),
      competitiveKeywords: keywords.filter(k => (k.competition || 0) > 70).slice(0, 10),
      opportunityKeywords: keywords.filter(k => 
        (k.searchVolume || 0) > 500 && 
        (k.competition || 0) < 30 &&
        k.difficulty === 'Low'
      ).slice(0, 10)
    };
  }

  private async performCompetitionAnalysis(keywords: KeywordData[]): Promise<{
    level: 'low' | 'medium' | 'high';
    topCompetitors: string[];
    gaps: string[];
  }> {
    const avgCompetition = keywords.reduce((sum, k) => sum + (k.competition || 0), 0) / keywords.length;
    
    let level: 'low' | 'medium' | 'high' = 'medium';
    if (avgCompetition < 30) level = 'low';
    else if (avgCompetition > 70) level = 'high';

    return {
      level,
      topCompetitors: ['Competitor Analysis requires additional data'],
      gaps: keywords.filter(k => (k.competition || 0) < 20).map(k => k.keyword)
    };
  }

  private generateRecommendations(keywords: KeywordData[], insights: any): string[] {
    const recommendations: string[] = [];
    
    if (insights.opportunityKeywords.length > 0) {
      recommendations.push(`Focus on ${insights.opportunityKeywords.length} low-competition keywords with good search volume`);
    }
    
    if (insights.emergingKeywords.length > 0) {
      recommendations.push(`Consider targeting ${insights.emergingKeywords.length} emerging keywords for future content`);
    }
    
    recommendations.push('Analyze competitor content for the top competitive keywords');
    recommendations.push('Create content clusters around the identified keyword themes');
    
    return recommendations;
  }
}
