import { TEST_DATA, INVALID_TEST_INPUTS } from "../../src/config/test-data.js";

/**
 * Minimal quota-efficient test inputs for all YouTube MCP tools
 * Focused on single-item inputs, maxResults=1, enrichDetails=false to minimize quota usage
 */
export const TOOL_TEST_INPUTS = {
  // Basic Search Tools
  unified_search: {
    minimal: {
      query: "test",
      maxResults: 1,
    },
    functional: {
      query: TEST_DATA.SEARCH_QUERY,
      maxResults: 1,
      type: "video" as const,
      order: "relevance" as const,
      enrichParts: {
        video: ["snippet", "statistics"],
      },
    },
    // Test search within channel
    channelSearch: {
      channelId: TEST_DATA.CHANNEL_ID,
      maxResults: 1,
      type: "video" as const,
    },
    // Test with date filters
    dateFiltered: {
      query: "tutorial",
      maxResults: 1,
      type: "video" as const,
      publishedAfter: "2024-01-01T00:00:00Z",
      publishedBefore: "2024-12-31T23:59:59Z",
    },
    // Test with advanced filters
    advancedFilters: {
      query: "programming",
      maxResults: 1,
      type: "video" as const,
      videoDuration: "medium" as const,
      filters: {
        duration: "medium" as const,
        uploadDate: "month" as const,
        sortBy: "view_count" as const,
      },
    },
    // Test channel search with enrichment
    channelEnriched: {
      query: "tech",
      maxResults: 1,
      type: "channel" as const,
      enrichParts: {
        channel: ["snippet", "statistics", "brandingSettings"],
      },
    },
    // Test playlist search with enrichment
    playlistEnriched: {
      query: "music",
      maxResults: 1,
      type: "playlist" as const,
      order: "date" as const,
      enrichParts: {
        playlist: ["snippet", "contentDetails"],
      },
    },
    // Test with region and safe search
    regionFiltered: {
      query: "news",
      maxResults: 1,
      type: "video" as const,
      regionCode: "US",
      safeSearch: "strict" as const,
    },
    // Test pagination
    withPagination: {
      query: "tutorial",
      maxResults: 5,
      pageToken: "CAUQAA",
    },
    // Test minimal enrichment (empty arrays should use defaults)
    defaultEnrichment: {
      query: "test",
      maxResults: 1,
      type: "video" as const,
      enrichParts: {
        video: [],
      },
    },
    invalid: {
      query: INVALID_TEST_INPUTS.emptyString,
      maxResults: INVALID_TEST_INPUTS.negativeNumber,
    },
    error: {
      query: INVALID_TEST_INPUTS.nullValue,
      maxResults: INVALID_TEST_INPUTS.tooManyResults,
    },
    // Test missing both query and channelId
    missingRequired: {
      maxResults: 1,
      type: "video" as const,
    },
  },

  get_video_details: {
    minimal: {
      videoId: TEST_DATA.VIDEO_ID,
      includeParts: ["snippet"] as const,
    },
    functional: {
      videoId: TEST_DATA.VIDEO_ID,
      includeParts: ["snippet", "statistics"] as const,
    },
    invalid: {
      videoId: INVALID_TEST_INPUTS.invalidVideoId,
      includeParts: ["snippet"] as const,
    },
    error: {
      videoId: INVALID_TEST_INPUTS.emptyString,
      includeParts: INVALID_TEST_INPUTS.emptyArray as any,
    },
  },

  search_channels: {
    minimal: {
      query: "test",
      maxResults: 1,
    },
    functional: {
      query: "youtube",
      maxResults: 1,
      order: "relevance" as const,
      enrichParts: {
        channel: ["snippet", "statistics"],
      },
    },
    invalid: {
      query: INVALID_TEST_INPUTS.emptyString,
      maxResults: INVALID_TEST_INPUTS.negativeNumber,
    },
    error: {
      query: INVALID_TEST_INPUTS.nullValue,
      maxResults: INVALID_TEST_INPUTS.tooManyResults,
    },
  },

  get_channel_details: {
    minimal: {
      channelId: TEST_DATA.CHANNEL_ID,
      includeParts: ["snippet"] as const,
    },
    functional: {
      channelId: TEST_DATA.CHANNEL_ID,
      includeParts: ["snippet", "statistics"] as const,
    },
    invalid: {
      channelId: INVALID_TEST_INPUTS.invalidChannelId,
      includeParts: ["snippet"] as const,
    },
    error: {
      channelId: INVALID_TEST_INPUTS.emptyString,
      includeParts: INVALID_TEST_INPUTS.emptyArray as any,
    },
  },

  search_playlists: {
    minimal: {
      query: "test",
      maxResults: 1,
    },
    functional: {
      query: "music",
      maxResults: 1,
      order: "relevance" as const,
      enrichParts: {
        playlist: ["snippet", "contentDetails"],
      },
    },
    invalid: {
      query: INVALID_TEST_INPUTS.emptyString,
      maxResults: INVALID_TEST_INPUTS.negativeNumber,
    },
    error: {
      query: INVALID_TEST_INPUTS.nullValue,
      maxResults: INVALID_TEST_INPUTS.tooManyResults,
    },
  },

  get_playlist_details: {
    minimal: {
      playlistId: TEST_DATA.PLAYLIST_ID,
      includeParts: ["snippet"] as const,
    },
    functional: {
      playlistId: TEST_DATA.PLAYLIST_ID,
      includeParts: ["snippet", "status"] as const,
    },
    invalid: {
      playlistId: INVALID_TEST_INPUTS.invalidPlaylistId,
      includeParts: ["snippet"] as const,
    },
    error: {
      playlistId: INVALID_TEST_INPUTS.emptyString,
      includeParts: INVALID_TEST_INPUTS.emptyArray as any,
    },
  },

  get_trending_videos: {
    minimal: {
      maxResults: 1,
    },
    functional: {
      maxResults: 1,
      regionCode: "US",
      categoryId: "0",
      enrichParts: {
        video: ["snippet", "statistics"],
      },
    },
    invalid: {
      maxResults: INVALID_TEST_INPUTS.negativeNumber,
      regionCode: INVALID_TEST_INPUTS.invalidEnum,
    },
    error: {
      maxResults: INVALID_TEST_INPUTS.tooManyResults,
      categoryId: INVALID_TEST_INPUTS.emptyString,
    },
  },

  // Analysis Tools
  analyze_channel_videos: {
    minimal: {
      channelId: TEST_DATA.CHANNEL_ID,
      maxVideos: 1,
    },
    functional: {
      channelId: TEST_DATA.CHANNEL_ID,
      maxVideos: 1,
      sortBy: "uploadDate" as const,
      enrichParts: {
        video: ["snippet", "statistics"],
        channel: ["snippet"],
      },
    },
    invalid: {
      channelId: INVALID_TEST_INPUTS.invalidChannelId,
      maxVideos: INVALID_TEST_INPUTS.negativeNumber,
    },
    error: {
      channelId: INVALID_TEST_INPUTS.emptyString,
      maxVideos: INVALID_TEST_INPUTS.tooManyResults,
    },
  },

  analyze_competitor: {
    minimal: {
      channelId: TEST_DATA.CHANNEL_ID,
      maxVideos: 1,
    },
    functional: {
      channelId: TEST_DATA.CHANNEL_ID,
      maxVideos: 10,
      analyzeComments: false,
      timeframe: "month" as const,
      includeNetworkAnalysis: true,
    },
    invalid: {
      channelId: INVALID_TEST_INPUTS.invalidChannelId,
      maxVideos: INVALID_TEST_INPUTS.negativeNumber,
    },
    error: {
      channelId: INVALID_TEST_INPUTS.emptyString,
      maxVideos: INVALID_TEST_INPUTS.tooManyResults,
    },
  },

  analyze_keyword_opportunities: {
    minimal: {
      keywords: ["test"],
      maxResults: 1,
    },
    functional: {
      keywords: ["javascript", "tutorial"],
      maxResults: 1,
      competitionLevel: "medium" as const,
      enrichParts: {
        video: ["snippet", "statistics"],
      },
    },
    invalid: {
      keywords: INVALID_TEST_INPUTS.emptyArray,
      maxResults: INVALID_TEST_INPUTS.negativeNumber,
    },
    error: {
      keywords: [INVALID_TEST_INPUTS.emptyString],
      maxResults: INVALID_TEST_INPUTS.tooManyResults,
    },
  },

  analyze_keywords: {
    minimal: {
      keywords: ["test"],
      maxResults: 1,
    },
    functional: {
      keywords: ["javascript", "programming"],
      maxResults: 1,
      includeRelated: false,
      enrichParts: {
        video: ["snippet", "statistics"],
      },
    },
    invalid: {
      keywords: INVALID_TEST_INPUTS.emptyArray,
      maxResults: INVALID_TEST_INPUTS.negativeNumber,
    },
    error: {
      keywords: [INVALID_TEST_INPUTS.emptyString],
      maxResults: INVALID_TEST_INPUTS.tooManyResults,
    },
  },

  analyze_viral_videos: {
    minimal: {
      query: "test",
      maxResults: 1,
    },
    functional: {
      query: "viral",
      maxResults: 1,
      timeRange: "week" as const,
      minViews: 100000,
      enrichParts: {
        video: ["snippet", "statistics"],
        channel: ["snippet"],
      },
    },
    invalid: {
      query: INVALID_TEST_INPUTS.emptyString,
      maxResults: INVALID_TEST_INPUTS.negativeNumber,
      minViews: INVALID_TEST_INPUTS.negativeNumber,
    },
    error: {
      query: INVALID_TEST_INPUTS.nullValue,
      maxResults: INVALID_TEST_INPUTS.tooManyResults,
      timeRange: INVALID_TEST_INPUTS.invalidEnum as any,
    },
  },

  discover_channel_network: {
    minimal: {
      seedChannelId: TEST_DATA.CHANNEL_ID,
      maxChannels: 1,
    },
    functional: {
      seedChannelId: TEST_DATA.CHANNEL_ID,
      maxChannels: 1,
      networkDepth: 1,
      enrichParts: {
        channel: ["snippet", "statistics"],
      },
    },
    invalid: {
      seedChannelId: INVALID_TEST_INPUTS.invalidChannelId,
      maxChannels: INVALID_TEST_INPUTS.negativeNumber,
    },
    error: {
      seedChannelId: INVALID_TEST_INPUTS.emptyString,
      maxChannels: INVALID_TEST_INPUTS.tooManyResults,
    },
  },

  // Keyword Extraction Tools
  extract_keywords_from_text: {
    minimal: {
      text: "sample test text for keyword extraction",
      maxKeywords: 5,
    },
    functional: {
      text: "This is a comprehensive JavaScript programming tutorial for beginners",
      maxKeywords: 5,
      includeMetrics: false,
    },
    invalid: {
      text: INVALID_TEST_INPUTS.emptyString,
      maxKeywords: INVALID_TEST_INPUTS.negativeNumber,
    },
    error: {
      text: INVALID_TEST_INPUTS.nullValue,
      maxKeywords: INVALID_TEST_INPUTS.tooManyResults,
    },
  },

  extract_keywords_from_videos: {
    minimal: {
      videoIds: [TEST_DATA.VIDEO_ID],
      maxKeywords: 5,
    },
    functional: {
      videoIds: [TEST_DATA.VIDEO_ID],
      maxKeywords: 5,
      includeMetrics: false,
      enrichParts: {
        video: ["snippet"],
      },
    },
    invalid: {
      videoIds: [INVALID_TEST_INPUTS.invalidVideoId],
      maxKeywords: INVALID_TEST_INPUTS.negativeNumber,
    },
    error: {
      videoIds: INVALID_TEST_INPUTS.emptyArray,
      maxKeywords: INVALID_TEST_INPUTS.tooManyResults,
    },
  },

  extract_video_comments: {
    minimal: {
      videoId: TEST_DATA.VIDEO_ID,
      maxComments: 1,
    },
    functional: {
      videoId: TEST_DATA.VIDEO_ID,
      maxComments: 1,
      order: "time" as const,
      enrichParts: {
        video: ["snippet"],
        comment: ["snippet"],
      },
    },
    invalid: {
      videoId: INVALID_TEST_INPUTS.invalidVideoId,
      maxComments: INVALID_TEST_INPUTS.negativeNumber,
    },
    error: {
      videoId: INVALID_TEST_INPUTS.emptyString,
      maxComments: INVALID_TEST_INPUTS.tooManyResults,
    },
  },

  find_content_gaps: {
    minimal: {
      niche: "test",
      competitorChannelIds: [TEST_DATA.CHANNEL_ID],
      maxResults: 1,
    },
    functional: {
      niche: "programming tutorials",
      competitorChannelIds: [TEST_DATA.CHANNEL_ID],
      maxResults: 1,
      analysisDepth: "basic" as const,
      enrichParts: {
        video: ["snippet", "statistics"],
        channel: ["snippet"],
      },
    },
    invalid: {
      niche: INVALID_TEST_INPUTS.emptyString,
      competitorChannelIds: [INVALID_TEST_INPUTS.invalidChannelId],
      maxResults: INVALID_TEST_INPUTS.negativeNumber,
    },
    error: {
      niche: INVALID_TEST_INPUTS.nullValue,
      competitorChannelIds: INVALID_TEST_INPUTS.emptyArray,
      maxResults: INVALID_TEST_INPUTS.tooManyResults,
    },
  },

  generate_keyword_cloud: {
    minimal: {
      keywords: ["test"],
      maxKeywords: 5,
    },
    functional: {
      keywords: ["javascript", "programming", "tutorial"],
      maxKeywords: 5,
      includeMetrics: false,
    },
    invalid: {
      keywords: INVALID_TEST_INPUTS.emptyArray,
      maxKeywords: INVALID_TEST_INPUTS.negativeNumber,
    },
    error: {
      keywords: [INVALID_TEST_INPUTS.emptyString],
      maxKeywords: INVALID_TEST_INPUTS.tooManyResults,
    },
  },

  keyword_research_workflow: {
    minimal: {
      seedKeywords: ["test"],
      targetAudience: "general",
      maxResults: 1,
    },
    functional: {
      seedKeywords: ["javascript", "tutorial"],
      targetAudience: "developers",
      maxResults: 1,
      competitionLevel: "medium" as const,
      enrichParts: {
        video: ["snippet", "statistics"],
      },
    },
    invalid: {
      seedKeywords: INVALID_TEST_INPUTS.emptyArray,
      targetAudience: INVALID_TEST_INPUTS.emptyString,
      maxResults: INVALID_TEST_INPUTS.negativeNumber,
    },
    error: {
      seedKeywords: [INVALID_TEST_INPUTS.emptyString],
      targetAudience: INVALID_TEST_INPUTS.nullValue,
      maxResults: INVALID_TEST_INPUTS.tooManyResults,
    },
  },
} as const;

// Quota costs are now stored directly in tool metadata
// See the 'quotaCost' field in each tool's metadata (src/tools/*.tool.ts)

// Helper function to get minimal input for any tool
export const getMinimalInput = (toolName: keyof typeof TOOL_TEST_INPUTS) => {
  return TOOL_TEST_INPUTS[toolName].minimal;
};

// Helper function to get functional input for any tool
export const getFunctionalInput = (toolName: keyof typeof TOOL_TEST_INPUTS) => {
  return TOOL_TEST_INPUTS[toolName].functional;
};

// Helper function to get invalid input for any tool
export const getInvalidInput = (toolName: keyof typeof TOOL_TEST_INPUTS) => {
  return TOOL_TEST_INPUTS[toolName].invalid;
};

// Helper function to get error input for any tool
export const getErrorInput = (toolName: keyof typeof TOOL_TEST_INPUTS) => {
  return TOOL_TEST_INPUTS[toolName].error;
};
