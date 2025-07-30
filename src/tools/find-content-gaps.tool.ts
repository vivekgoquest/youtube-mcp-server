import { ToolMetadata, ToolRunner } from "../interfaces/tool.js";
import { YouTubeClient } from "../youtube-client.js";
import { ToolResponse } from "../types.js";
import { ErrorHandler } from "../utils/error-handler.js";

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
  quotaCost: 100,
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
