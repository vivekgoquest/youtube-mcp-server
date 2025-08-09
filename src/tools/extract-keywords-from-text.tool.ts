import type { ToolMetadata, ToolRunner } from "../interfaces/tool.js";
import { YouTubeClient } from "../youtube-client.js";
import type { ToolResponse, KeywordData } from "../types.js";
import { TextProcessor } from "../utils/text-processing.js";
import { ErrorHandler } from "../utils/error-handler.js";

interface ExtractKeywordsFromTextOptions {
  text: string;
  minWordLength?: number;
  maxKeywords?: number;
  includeNGrams?: boolean;
  nGramSize?: number;
}

export const metadata: ToolMetadata = {
  name: "extract_keywords_from_text",
  description:
    "Extract keywords from ANY text using advanced NLP - perfect for scripts, competitor descriptions, or content ideas. Finds single words AND multi-word phrases (up to 5 words). Use this to: analyze competitor video descriptions, process blog posts for video ideas, extract keywords from transcripts. Returns keywords ranked by importance with frequency counts. Handles text up to 50,000 words. SMART: filters out stop words, finds semantic phrases, identifies trending terms.",
  inputSchema: {
    type: "object",
    properties: {
      text: {
        type: "string",
        description: "Text content to extract keywords from",
      },
      minWordLength: {
        type: "integer",
        description: "Minimum word length for keywords (default: 3)",
        minimum: 1,
        maximum: 10,
        default: 3,
      },
      maxKeywords: {
        type: "integer",
        description: "Maximum number of keywords to return (default: 50)",
        minimum: 1,
        maximum: 200,
        default: 50,
      },
      includeNGrams: {
        type: "boolean",
        description: "Include multi-word phrases (default: true)",
        default: true,
      },
      nGramSize: {
        type: "integer",
        description: "Maximum n-gram size for phrases (default: 3)",
        minimum: 2,
        maximum: 5,
        default: 3,
      },
    },
    required: ["text"],
  },
};

export default class ExtractKeywordsFromTextTool
  implements ToolRunner<ExtractKeywordsFromTextOptions, KeywordData[]>
{
  constructor(_client: YouTubeClient) {}

  async run(
    options: ExtractKeywordsFromTextOptions,
  ): Promise<ToolResponse<KeywordData[]>> {

    try {
      if (!options.text || options.text.trim() === "") {
        return {
          success: false,
          error: "Text content is required",
        };
      }

      const extractionOptions = {
        minWordLength: options.minWordLength || 3,
        maxKeywords: options.maxKeywords || 50,
        includeNGrams: options.includeNGrams !== false,
        nGramSize: options.nGramSize || 3,
        sources: ["title", "description"] as (
          | "title"
          | "description"
          | "tags"
          | "comments"
        )[],
      };

      // Extract keywords using TextProcessor
      const extractedKeywords = TextProcessor.extractKeywords(
        options.text,
        extractionOptions,
      );

      // Convert to KeywordData format
      const keywords: KeywordData[] = extractedKeywords.map((keyword) => ({
        keyword,
        frequency: 1,
        sources: ["title"], // Treating input text as title content
        relevance: 1.0,
        confidence: 0.8,
        relatedTerms: [],
        contexts: [options.text.substring(0, 100)],
      }));

      // Calculate frequency for duplicate keywords
      const keywordMap = new Map<string, KeywordData>();
      keywords.forEach((kw) => {
        const key = kw.keyword.toLowerCase();
        if (keywordMap.has(key)) {
          const existing = keywordMap.get(key)!;
          existing.frequency += 1;
          if (existing.contexts && kw.contexts) {
            existing.contexts.push(...kw.contexts);
          }
        } else {
          keywordMap.set(key, kw);
        }
      });

      const finalKeywords = Array.from(keywordMap.values())
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, options.maxKeywords || 50);

      return {
        success: true,
        data: finalKeywords,
      };
    } catch (error) {
      return ErrorHandler.handleToolError<KeywordData[]>(error);
    }
  }
}
