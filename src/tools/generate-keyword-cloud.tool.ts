import { ToolMetadata, ToolRunner } from "../interfaces/tool.js";
import { YouTubeClient } from "../youtube-client.js";
import { ToolResponse, KeywordCloudData, KeywordCluster } from "../types.js";
import { ErrorHandler } from "../utils/error-handler.js";

interface GenerateKeywordCloudOptions {
  keywords: string[];
  maxKeywords?: number;
  groupSimilar?: boolean;
  includeScores?: boolean;
}

export const metadata: ToolMetadata = {
  name: "generate_keyword_cloud",
  description:
    "Generate a keyword cloud visualization showing the most important terms in your niche with size based on frequency and relevance. Use this to visualize keyword patterns, identify dominant themes, and create a quick overview of topic importance. Returns grouped keywords with scores and relationships. Perfect for presentations, content planning visuals, and understanding the overall keyword landscape at a glance.",
  inputSchema: {
    type: "object",
    properties: {
      keywords: {
        type: "array",
        items: {
          type: "string",
        },
        description: "Array of keywords for the cloud",
      },
      maxKeywords: {
        type: "integer",
        description: "Maximum number of keywords in the cloud (default: 100)",
        minimum: 10,
        maximum: 200,
        default: 100,
      },
      groupSimilar: {
        type: "boolean",
        description: "Group similar keywords together (default: true)",
        default: true,
      },
      includeScores: {
        type: "boolean",
        description: "Include relevance scores (default: true)",
        default: true,
      },
    },
    required: ["keywords"],
  },
  quotaCost: 0,
};

export default class GenerateKeywordCloudTool
  implements ToolRunner<GenerateKeywordCloudOptions, KeywordCloudData>
{
  constructor(private client: YouTubeClient) {}

  async run(
    options: GenerateKeywordCloudOptions,
  ): Promise<ToolResponse<KeywordCloudData>> {
    const startTime = Date.now();

    try {
      if (!options.keywords || options.keywords.length === 0) {
        return {
          success: false,
          error: "Keywords array is required and cannot be empty",
          metadata: {
            quotaUsed: 0,
            requestTime: Date.now() - startTime,
            source: "keyword-cloud-generation",
          },
        };
      }

      // Process keywords and calculate weights
      const processedKeywords = this.processKeywordsForCloud(
        options.keywords,
        options,
      );

      // Generate clusters if grouping is enabled
      const clusters = options.groupSimilar
        ? this.generateClusters(processedKeywords)
        : [];

      // Create keyword cloud data
      const cloudData: KeywordCloudData = {
        keywords: processedKeywords.slice(0, options.maxKeywords || 100),
        clusters,
        metadata: {
          totalKeywords: processedKeywords.length,
          totalSources: 1, // Single input source
          generatedAt: new Date().toISOString(),
          sourceTypes: ["manual"],
          processingTime: Date.now() - startTime,
        },
      };

      return {
        success: true,
        data: cloudData,
        metadata: {
          quotaUsed: 0, // No API calls for cloud generation
          requestTime: Date.now() - startTime,
          source: "keyword-cloud-generation",
        },
      };
    } catch (error) {
      return ErrorHandler.handleToolError<KeywordCloudData>(error, {
        quotaUsed: 0,
        startTime,
        source: "keyword-cloud-generation",
      });
    }
  }

  private processKeywordsForCloud(
    keywords: string[],
    options: GenerateKeywordCloudOptions,
  ): Array<{
    text: string;
    weight: number;
    frequency: number;
    opportunityScore: number;
    cluster?: string;
    sources: string[];
  }> {
    // Count frequency of each keyword
    const keywordFreq: Record<string, number> = {};
    keywords.forEach((keyword) => {
      const normalized = keyword.toLowerCase().trim();
      keywordFreq[normalized] = (keywordFreq[normalized] || 0) + 1;
    });

    // Convert to cloud format
    return Object.entries(keywordFreq)
      .map(([keyword, frequency]) => {
        // Calculate weight based on frequency (normalize to 0-100)
        const maxFreq = Math.max(...Object.values(keywordFreq));
        const weight = (frequency / maxFreq) * 100;

        // Calculate opportunity score (simplified)
        const opportunityScore = this.calculateOpportunityScore(
          keyword,
          frequency,
        );

        return {
          text: keyword,
          weight,
          frequency,
          opportunityScore,
          sources: ["manual"],
        };
      })
      .sort((a, b) => b.weight - a.weight);
  }

  private calculateOpportunityScore(
    keyword: string,
    frequency: number,
  ): number {
    // Simple scoring based on keyword characteristics
    let score = frequency * 10; // Base score from frequency

    // Bonus for longer, more specific keywords
    if (keyword.split(" ").length > 1) score += 20;
    if (keyword.split(" ").length > 2) score += 10;

    // Penalty for very common words
    const commonWords = [
      "the",
      "and",
      "or",
      "but",
      "in",
      "on",
      "at",
      "to",
      "for",
      "of",
      "with",
      "by",
    ];
    if (commonWords.some((word) => keyword.includes(word))) score -= 15;

    return Math.min(100, Math.max(0, score));
  }

  private generateClusters(
    keywords: Array<{
      text: string;
      weight: number;
      frequency: number;
      opportunityScore: number;
      sources: string[];
    }>,
  ): KeywordCluster[] {
    const clusters: KeywordCluster[] = [];
    const processed = new Set<string>();

    keywords.forEach((keyword, index) => {
      if (processed.has(keyword.text)) return;

      // Find similar keywords
      const relatedKeywords = keywords.filter(
        (k) =>
          !processed.has(k.text) &&
          this.areKeywordsSimilar(keyword.text, k.text),
      );

      if (relatedKeywords.length > 1) {
        const cluster: KeywordCluster = {
          clusterId: `cluster_${index}`,
          mainKeyword: keyword.text,
          relatedKeywords: relatedKeywords.map((k) => ({
            keyword: k.text,
            frequency: k.frequency,
            sources: k.sources.filter((s) =>
              ["title", "description", "tags", "comments"].includes(s),
            ) as ("title" | "description" | "tags" | "comments")[],
            relevance: k.weight / 100,
            confidence: 0.8,
          })),
          theme: this.extractTheme(relatedKeywords.map((k) => k.text)),
          totalFrequency: relatedKeywords.reduce(
            (sum, k) => sum + k.frequency,
            0,
          ),
          opportunityScore:
            relatedKeywords.reduce((sum, k) => sum + k.opportunityScore, 0) /
            relatedKeywords.length,
          color: this.generateClusterColor(index),
        };

        clusters.push(cluster);
        relatedKeywords.forEach((k) => processed.add(k.text));

        // Add cluster reference to keywords
        relatedKeywords.forEach((k) => {
          (k as any).cluster = cluster.clusterId;
        });
      }
    });

    return clusters;
  }

  private areKeywordsSimilar(keyword1: string, keyword2: string): boolean {
    // Check for shared words
    const words1 = keyword1
      .toLowerCase()
      .split(" ")
      .filter((w) => w.length > 2);
    const words2 = keyword2
      .toLowerCase()
      .split(" ")
      .filter((w) => w.length > 2);

    const commonWords = words1.filter((word) => words2.includes(word));
    return commonWords.length > 0;
  }

  private extractTheme(keywords: string[]): string {
    // Find most common word across keywords
    const words = keywords
      .flatMap((k) => k.split(" "))
      .filter((w) => w.length > 2);
    const wordCount = words.reduce(
      (acc, word) => {
        acc[word] = (acc[word] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const mostCommon = Object.entries(wordCount).sort(
      ([, a], [, b]) => b - a,
    )[0];

    return mostCommon ? mostCommon[0] : "General";
  }

  private generateClusterColor(index: number): string {
    // Generate colors for clusters
    const colors = [
      "#FF6B6B",
      "#4ECDC4",
      "#45B7D1",
      "#96CEB4",
      "#FFEAA7",
      "#DDA0DD",
      "#98D8C8",
      "#F7DC6F",
      "#BB8FCE",
      "#85C1E9",
    ];
    return colors[index % colors.length];
  }
}
