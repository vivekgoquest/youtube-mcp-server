import { MCPPromptMessage } from "../../types.js";

/**
 * Prompt template for finding top channels in a specific niche
 * Example: Finding Turkish drama channels dubbed in Arabic
 */
export function findNicheChannelsPrompt(
  args: Record<string, any>,
): MCPPromptMessage[] {
  const { niche, topCount = 20, minViews = 0, minSubscribers = 0 } = args;

  const prompt = `I need to find the top ${topCount} YouTube channels that specialize in: ${niche}

Follow this systematic discovery approach:

## Phase 1: Initial Discovery (English Search)

1. **Broad English search:**
   Use unified_search with:
   - query: "${niche}"
   - type: "channel"
   - maxResults: 50
   
   Also search for common variations and related terms.

2. **Extract initial keywords:**
   From the discovered channels, use get_channel_details with includeBranding=true to get channel keywords.
   Note any non-English terms that appear frequently.

## Phase 2: Channel Validation

3. **Validate each discovered channel:**
   For each channel found, use get_channel_details with:
   - includeParts: ["snippet", "statistics", "brandingSettings", "topicDetails"]
   
   Filter channels based on:
   - Content relevance to "${niche}"
   - Active channels (recent uploads)
   - Channel size and engagement

4. **Deep content analysis:**
   For validated channels, use analyze_channel_videos with:
   - maxVideos: 30
   
   Look for:
   - Content patterns that match the niche
   - Upload consistency
   - Video performance metrics

## Phase 3: Keyword-Based Expansion

5. **Extract niche-specific keywords:**
   Use extract_keywords_from_videos on top videos from validated channels.
   Look for:
   - Native language terms
   - Show/series names
   - Genre-specific terminology

6. **Search with discovered keywords:**
   Use unified_search with the discovered native keywords and terms.
   This often reveals channels not found in English searches.

## Phase 4: Network Discovery

7. **Explore channel networks:**
   Use discover_channel_network with the top validated channels to find:
   - Related channels in the same niche
   - Channels that cross-promote
   - Hidden gems in the network

## Phase 5: Comprehensive Analysis

8. **Gather detailed metrics for all discovered channels:**
   Compile:
   - Total channel views
   - Subscriber counts
   - Upload frequency
   - Average views per video
   - Content focus and specialization

## Phase 6: Filtering and Ranking

9. **Apply user criteria:**
   - Filter channels with total views < ${minViews}
   - Filter channels with subscribers < ${minSubscribers}
   - Remove duplicate or secondary channels
   - Verify content matches "${niche}" criteria

10. **Rank by composite score considering:**
    - Relevance to niche
    - Channel size and reach
    - Content quality and consistency
    - Engagement metrics
    - Growth trajectory

## Final Output Format:

Provide the top ${topCount} channels as a numbered list with:

**[Rank]. [Channel Name]**
- Channel ID: [id]
- Subscribers: [count]
- Total Views: [count]
- Videos: [count]
- Specialization: [specific content focus]
- Notable Content: [top shows/series]
- Upload Schedule: [frequency]
- Channel URL: [link]
- Why Selected: [brief reason for inclusion]

After the list, provide:
- Summary of the "${niche}" landscape on YouTube
- Key players and market leaders
- Emerging channels to watch
- Content gaps in the niche`;

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
