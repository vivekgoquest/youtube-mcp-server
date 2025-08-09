import type { PromptTemplate, MCPPromptMessage } from "../types.js";
import { findNicheChannelsPrompt } from "./templates/find-niche-channels.js";

/**
 * Registry of all available prompt templates
 */
export const PROMPT_TEMPLATES: Record<string, PromptTemplate> = {
  "find-niche-channels": {
    name: "find-niche-channels",
    description:
      "Find top YouTube channels in a specific niche using iterative search and validation",
    arguments: [
      {
        name: "niche",
        description:
          'The specific niche to search for (e.g., "Turkish dramas dubbed in Arabic")',
        required: true,
      },
      {
        name: "topCount",
        description: "Number of top channels to return",
        required: false,
        default: 20,
      },
      {
        name: "minViews",
        description: "Minimum total channel views required",
        required: false,
        default: 0,
      },
      {
        name: "minSubscribers",
        description: "Minimum subscriber count required",
        required: false,
        default: 0,
      },
    ],
  },
  "channel-growth-analysis": {
    name: "channel-growth-analysis",
    description:
      "Analyze a YouTube channel for growth opportunities and content strategy",
    arguments: [
      {
        name: "channelId",
        description: "The YouTube channel ID to analyze",
        required: true,
      },
      {
        name: "depth",
        description: "Analysis depth: quick, standard, or comprehensive",
        required: false,
        default: "standard",
      },
    ],
  },
  "keyword-research-workflow": {
    name: "keyword-research-workflow",
    description: "Complete keyword research workflow from seed keywords",
    arguments: [
      {
        name: "seedKeywords",
        description: "Initial keywords to start research (comma-separated)",
        required: true,
      },
      {
        name: "niche",
        description: "Specific niche or industry focus",
        required: false,
      },
      {
        name: "maxVideosToAnalyze",
        description: "Maximum number of videos to analyze",
        required: false,
        default: 50,
      },
    ],
  },
  "competitor-comparison": {
    name: "competitor-comparison",
    description: "Compare multiple channels to identify competitive advantages",
    arguments: [
      {
        name: "channelIds",
        description: "Comma-separated list of channel IDs to compare",
        required: true,
      },
      {
        name: "focusAreas",
        description: "Areas to focus on: content, keywords, engagement, or all",
        required: false,
        default: "all",
      },
    ],
  },
};

/**
 * List all available prompts
 */
export function listPrompts(): PromptTemplate[] {
  return Object.values(PROMPT_TEMPLATES);
}

/**
 * Expand a prompt template with provided arguments
 */
export function expandPrompt(
  promptName: string,
  args: Record<string, any>,
): MCPPromptMessage[] | undefined {
  const template = PROMPT_TEMPLATES[promptName];
  if (!template) {
    return undefined;
  }

  // Get the prompt expansion function based on the template name
  switch (promptName) {
    case "find-niche-channels":
      return findNicheChannelsPrompt(args);

    case "channel-growth-analysis":
      return channelGrowthAnalysisPrompt(args);

    case "keyword-research-workflow":
      return keywordResearchPrompt(args);

    case "competitor-comparison":
      return competitorComparisonPrompt(args);

    default:
      return undefined;
  }
}

/**
 * Channel growth analysis prompt
 */
function channelGrowthAnalysisPrompt(
  args: Record<string, any>,
): MCPPromptMessage[] {
  const { channelId, depth = "standard" } = args;

  let prompt = `Analyze YouTube channel ${channelId} for growth opportunities:\n\n`;

  if (depth === "quick") {
    prompt += `1. Use get_channel_details to get basic statistics
2. Use analyze_channel_videos with maxVideos=50
3. Identify top 3 growth opportunities
4. Provide 5 actionable recommendations`;
  } else if (depth === "comprehensive") {
    prompt += `1. Use get_channel_details with all parts for complete channel profile
2. Use analyze_channel_videos with maxVideos=200 to understand content patterns
3. Use extract_keywords_from_videos on top 20 videos to identify keyword strategy
4. Use analyze_viral_videos to understand what makes videos go viral in this niche
5. Use discover_channel_network to find collaboration opportunities
6. Use find_content_gaps to identify untapped content areas
7. Create a detailed growth strategy with:
   - Content calendar recommendations
   - Keyword optimization strategy
   - Collaboration suggestions
   - Upload schedule optimization
   - Thumbnail and title patterns that work`;
  } else {
    // standard
    prompt += `1. Use get_channel_details to understand current channel status
2. Use analyze_channel_videos with maxVideos=100
3. Use extract_keywords_from_videos on top 10 videos
4. Use find_content_gaps for content opportunities
5. Provide growth strategy with specific recommendations`;
  }

  return [
    {
      role: "user",
      content: {
        type: "text",
        text: prompt,
      },
    },
  ];
}

/**
 * Keyword research workflow prompt
 */
function keywordResearchPrompt(args: Record<string, any>): MCPPromptMessage[] {
  const { seedKeywords, niche, maxVideosToAnalyze = 50 } = args;

  const prompt = `Perform comprehensive keyword research starting with: ${seedKeywords}
${niche ? `\nNiche focus: ${niche}` : ""}

1. Use unified_search to find top ${maxVideosToAnalyze} videos for these keywords
2. Use extract_keywords_from_videos to extract all keywords from the videos
3. Use analyze_keywords on the extracted keywords for opportunity analysis
4. Use find_content_gaps to identify untapped keyword opportunities
5. Use generate_keyword_cloud to visualize the keyword landscape
6. Provide a summary with:
   - Top 20 high-opportunity keywords
   - Content ideas for each keyword
   - Competition analysis
   - Recommended title formulas`;

  return [
    {
      role: "user",
      content: {
        type: "text",
        text: prompt,
      },
    },
  ];
}

/**
 * Competitor comparison prompt
 */
function competitorComparisonPrompt(
  args: Record<string, any>,
): MCPPromptMessage[] {
  const { channelIds, focusAreas = "all" } = args;
  const channels = channelIds.split(",").map((id: string) => id.trim());

  let prompt = `Compare these YouTube channels: ${channels.join(", ")}\n\n`;

  if (focusAreas === "all" || focusAreas.includes("content")) {
    prompt += `## Content Analysis:
- Use get_channel_details for each channel
- Use analyze_channel_videos with maxVideos=50 for each
- Compare upload frequency, video length, and content types\n\n`;
  }

  if (focusAreas === "all" || focusAreas.includes("keywords")) {
    prompt += `## Keyword Strategy:
- Use extract_keywords_from_videos on top 20 videos from each channel
- Use analyze_keywords to compare keyword strategies
- Identify unique keywords each channel targets\n\n`;
  }

  if (focusAreas === "all" || focusAreas.includes("engagement")) {
    prompt += `## Engagement Analysis:
- Compare view counts, like ratios, and comment rates
- Use analyze_viral_videos to see what works for each
- Identify engagement patterns\n\n`;
  }

  prompt += `Provide a comparison table and recommendations for competitive advantage.`;

  return [
    {
      role: "user",
      content: {
        type: "text",
        text: prompt,
      },
    },
  ];
}
