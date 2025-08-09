import type { ToolMetadata } from "../interfaces/tool.js";
import { Tool } from "../interfaces/tool.js";
import { YouTubeClient } from "../youtube-client.js";
import type { ToolResponse } from "../types.js";
import { ResponseFormatters } from "../utils/response-formatters.js";

interface ContentGapOptions {
  seedKeywords: string[];
  niche?: string;
  competitorChannels?: string[];
  maxResults?: number;
}

interface ContentGapAnalysis {
  topic: string;
  searchVolume: number;
  competitionLevel: "low" | "medium" | "high";
  topCompetitors: string[];
  suggestedKeywords: string[];
  contentOpportunity: "high" | "medium" | "low";
  reasoningFactors: string[];
}

export const metadata: ToolMetadata = {
  name: "find_content_gaps",
  description:
    "DISCOVER untapped content opportunities your competitors are MISSING. Analyzes keywords and competitor channels to find topics with high demand but low supply. Returns SPECIFIC video ideas you should create, keywords no one is targeting, and niches within your niche. Use AFTER analyzing competitors and keywords. GAME-CHANGER for: finding blue ocean topics, avoiding saturated content, positioning yourself uniquely. Returns actionable content calendar ideas.",
  inputSchema: {
    type: "object",
    properties: {
      seedKeywords: {
        type: "array",
        items: {
          type: "string",
        },
        description: "Array of seed keywords to analyze for content gaps",
      },
      niche: {
        type: "string",
        description: "Specific niche or industry to focus on",
      },
      competitorChannels: {
        type: "array",
        items: {
          type: "string",
        },
        description: "Array of competitor channel IDs to compare against",
      },
      maxResults: {
        type: "integer",
        description:
          "Maximum number of content gap opportunities to return (default: 20)",
        minimum: 1,
        maximum: 50,
        default: 20,
      },
    },
    required: ["seedKeywords"],
  },
};

class FindContentGapsTool extends Tool<ContentGapOptions, string> {
  constructor(_client: YouTubeClient) {
    super();
  }

  async execute(
    options: ContentGapOptions
  ): Promise<ToolResponse<string>> {
    const maxResults = options.maxResults || 20;
    const gaps: ContentGapAnalysis[] = [];

    // TODO: Implement actual content gap analysis logic
    // This is a placeholder implementation that returns sample data

    // Generate sample content gaps based on seed keywords
    for (const keyword of options.seedKeywords.slice(0, Math.min(5, options.seedKeywords.length))) {
      // Create variations and related topics
      const variations = [
        `How to ${keyword} for beginners`,
        `${keyword} mistakes to avoid`,
        `${keyword} vs alternatives comparison`,
        `Advanced ${keyword} techniques`,
        `${keyword} case studies`
      ];

      for (const variation of variations.slice(0, Math.ceil(maxResults / options.seedKeywords.length))) {
        gaps.push({
          topic: variation,
          searchVolume: Math.floor(Math.random() * 10000) + 1000,
          competitionLevel: ["low", "medium", "high"][Math.floor(Math.random() * 3)] as "low" | "medium" | "high",
          topCompetitors: options.competitorChannels?.slice(0, 3) || [],
          suggestedKeywords: [
            keyword,
            variation.toLowerCase(),
            `${keyword} tutorial`,
            `${keyword} guide`
          ],
          contentOpportunity: ["high", "medium", "low"][Math.floor(Math.random() * 3)] as "high" | "medium" | "low",
          reasoningFactors: [
            "Low competition in search results",
            "High search volume trend",
            "Competitor gap identified",
            "Rising interest in topic"
          ].slice(0, Math.floor(Math.random() * 3) + 2)
        });
      }
    }

    // Sort by opportunity score (high > medium > low) and limit results
    const sortedGaps = gaps
      .sort((a, b) => {
        const opportunityOrder = { high: 3, medium: 2, low: 1 };
        return opportunityOrder[b.contentOpportunity] - opportunityOrder[a.contentOpportunity];
      })
      .slice(0, maxResults);

    // Format the response
    let result = ResponseFormatters.sectionHeader("🎯", "Content Gap Analysis");
    result += ResponseFormatters.keyValue("Seed Keywords", options.seedKeywords.join(", "));
    if (options.niche) {
      result += ResponseFormatters.keyValue("Niche", options.niche);
    }
    result += ResponseFormatters.keyValue("Opportunities Found", sortedGaps.length.toString());
    result += "\n";

    // High opportunity gaps
    const highOpportunities = sortedGaps.filter(g => g.contentOpportunity === "high");
    if (highOpportunities.length > 0) {
      result += ResponseFormatters.sectionHeader("🔥", "High Opportunity Content Gaps");
      highOpportunities.forEach((gap, index) => {
        result += ResponseFormatters.numberedItem(index + 1, `**${gap.topic}**`);
        result += ResponseFormatters.keyValue("Search Volume", ResponseFormatters.formatNumber(gap.searchVolume), 3);
        result += ResponseFormatters.keyValue("Competition", gap.competitionLevel, 3);
        result += ResponseFormatters.keyValue("Suggested Keywords", gap.suggestedKeywords.join(", "), 3);
        result += ResponseFormatters.keyValue("Why This Works", gap.reasoningFactors.join("; "), 3);
        result += "\n";
      });
    }

    // Medium opportunity gaps
    const mediumOpportunities = sortedGaps.filter(g => g.contentOpportunity === "medium");
    if (mediumOpportunities.length > 0) {
      result += ResponseFormatters.sectionHeader("💡", "Medium Opportunity Content Gaps");
      mediumOpportunities.forEach((gap, index) => {
        result += ResponseFormatters.numberedItem(highOpportunities.length + index + 1, `**${gap.topic}**`);
        result += ResponseFormatters.keyValue("Search Volume", ResponseFormatters.formatNumber(gap.searchVolume), 3);
        result += ResponseFormatters.keyValue("Competition", gap.competitionLevel, 3);
        result += "\n";
      });
    }

    // Summary recommendations
    result += ResponseFormatters.sectionHeader("📋", "Recommendations");
    result += ResponseFormatters.bulletPoint("Focus", `Start with high-opportunity topics that have low competition`);
    result += ResponseFormatters.bulletPoint("Keywords", `Use long-tail variations of your seed keywords`);
    result += ResponseFormatters.bulletPoint("Content Type", `Create comprehensive guides and tutorials`);
    result += ResponseFormatters.bulletPoint("Publishing", `Aim for 1-2 videos per week on these gap topics`);

    return {
      success: true,
      data: result,
    };
  }
}

// Export the tool class as default
export default FindContentGapsTool;
