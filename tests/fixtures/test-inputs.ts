import { TEST_DATA, INVALID_TEST_INPUTS } from '../setup.js';

/**
 * Minimal quota-efficient test inputs for all YouTube MCP tools
 * Focused on single-item inputs, maxResults=1, enrichDetails=false to minimize quota usage
 */
export const TOOL_TEST_INPUTS = {
  // Basic Search Tools
  search_videos: {
    minimal: {
      query: 'test',
      maxResults: 1,
      enrichDetails: false
    },
    functional: {
      query: TEST_DATA.SEARCH_QUERY,
      maxResults: 1,
      enrichDetails: false,
      order: 'relevance' as const
    },
    invalid: {
      query: INVALID_TEST_INPUTS.emptyString,
      maxResults: INVALID_TEST_INPUTS.negativeNumber
    },
    error: {
      query: INVALID_TEST_INPUTS.nullValue,
      maxResults: INVALID_TEST_INPUTS.tooManyResults
    }
  },

  get_video_details: {
    minimal: {
      videoId: TEST_DATA.VIDEO_ID,
      includeParts: ['snippet'] as const
    },
    functional: {
      videoId: TEST_DATA.VIDEO_ID,
      includeParts: ['snippet', 'statistics'] as const
    },
    invalid: {
      videoId: INVALID_TEST_INPUTS.invalidVideoId,
      includeParts: ['snippet'] as const
    },
    error: {
      videoId: INVALID_TEST_INPUTS.emptyString,
      includeParts: INVALID_TEST_INPUTS.emptyArray as any
    }
  },

  search_channels: {
    minimal: {
      query: 'test',
      maxResults: 1,
      enrichDetails: false
    },
    functional: {
      query: 'youtube',
      maxResults: 1,
      enrichDetails: false,
      order: 'relevance' as const
    },
    invalid: {
      query: INVALID_TEST_INPUTS.emptyString,
      maxResults: INVALID_TEST_INPUTS.negativeNumber
    },
    error: {
      query: INVALID_TEST_INPUTS.nullValue,
      maxResults: INVALID_TEST_INPUTS.tooManyResults
    }
  },

  get_channel_details: {
    minimal: {
      channelId: TEST_DATA.CHANNEL_ID,
      includeParts: ['snippet'] as const
    },
    functional: {
      channelId: TEST_DATA.CHANNEL_ID,
      includeParts: ['snippet', 'statistics'] as const
    },
    invalid: {
      channelId: INVALID_TEST_INPUTS.invalidChannelId,
      includeParts: ['snippet'] as const
    },
    error: {
      channelId: INVALID_TEST_INPUTS.emptyString,
      includeParts: INVALID_TEST_INPUTS.emptyArray as any
    }
  },

  search_playlists: {
    minimal: {
      query: 'test',
      maxResults: 1,
      enrichDetails: false
    },
    functional: {
      query: 'music',
      maxResults: 1,
      enrichDetails: false,
      order: 'relevance' as const
    },
    invalid: {
      query: INVALID_TEST_INPUTS.emptyString,
      maxResults: INVALID_TEST_INPUTS.negativeNumber
    },
    error: {
      query: INVALID_TEST_INPUTS.nullValue,
      maxResults: INVALID_TEST_INPUTS.tooManyResults
    }
  },

  get_playlist_details: {
    minimal: {
      playlistId: TEST_DATA.PLAYLIST_ID,
      includeParts: ['snippet'] as const
    },
    functional: {
      playlistId: TEST_DATA.PLAYLIST_ID,
      includeParts: ['snippet', 'status'] as const
    },
    invalid: {
      playlistId: INVALID_TEST_INPUTS.invalidPlaylistId,
      includeParts: ['snippet'] as const
    },
    error: {
      playlistId: INVALID_TEST_INPUTS.emptyString,
      includeParts: INVALID_TEST_INPUTS.emptyArray as any
    }
  },

  get_trending_videos: {
    minimal: {
      maxResults: 1,
      enrichDetails: false
    },
    functional: {
      maxResults: 1,
      enrichDetails: false,
      regionCode: 'US',
      categoryId: '0'
    },
    invalid: {
      maxResults: INVALID_TEST_INPUTS.negativeNumber,
      regionCode: INVALID_TEST_INPUTS.invalidEnum
    },
    error: {
      maxResults: INVALID_TEST_INPUTS.tooManyResults,
      categoryId: INVALID_TEST_INPUTS.emptyString
    }
  },

  advanced_search: {
    minimal: {
      query: 'test',
      maxResults: 1,
      enrichDetails: false
    },
    functional: {
      query: TEST_DATA.SEARCH_QUERY,
      maxResults: 1,
      enrichDetails: false,
      publishedAfter: '2023-01-01T00:00:00Z',
      duration: 'medium' as const,
      order: 'relevance' as const
    },
    invalid: {
      query: INVALID_TEST_INPUTS.emptyString,
      maxResults: INVALID_TEST_INPUTS.negativeNumber,
      duration: INVALID_TEST_INPUTS.invalidEnum as any
    },
    error: {
      query: INVALID_TEST_INPUTS.nullValue,
      publishedAfter: 'invalid-date',
      maxResults: INVALID_TEST_INPUTS.tooManyResults
    }
  },

  // Analysis Tools
  analyze_channel_videos: {
    minimal: {
      channelId: TEST_DATA.CHANNEL_ID,
      maxVideos: 1,
      enrichDetails: false
    },
    functional: {
      channelId: TEST_DATA.CHANNEL_ID,
      maxVideos: 1,
      enrichDetails: false,
      sortBy: 'date' as const
    },
    invalid: {
      channelId: INVALID_TEST_INPUTS.invalidChannelId,
      maxVideos: INVALID_TEST_INPUTS.negativeNumber
    },
    error: {
      channelId: INVALID_TEST_INPUTS.emptyString,
      maxVideos: INVALID_TEST_INPUTS.tooManyResults
    }
  },

  analyze_competitor: {
    minimal: {
      targetChannelId: TEST_DATA.CHANNEL_ID,
      competitorChannelIds: [TEST_DATA.CHANNEL_ID],
      maxVideosPerChannel: 1,
      enrichDetails: false
    },
    functional: {
      targetChannelId: TEST_DATA.CHANNEL_ID,
      competitorChannelIds: [TEST_DATA.CHANNEL_ID],
      maxVideosPerChannel: 1,
      enrichDetails: false,
      analysisDepth: 'basic' as const
    },
    invalid: {
      targetChannelId: INVALID_TEST_INPUTS.invalidChannelId,
      competitorChannelIds: [INVALID_TEST_INPUTS.invalidChannelId],
      maxVideosPerChannel: INVALID_TEST_INPUTS.negativeNumber
    },
    error: {
      targetChannelId: INVALID_TEST_INPUTS.emptyString,
      competitorChannelIds: INVALID_TEST_INPUTS.emptyArray,
      maxVideosPerChannel: INVALID_TEST_INPUTS.tooManyResults
    }
  },

  analyze_keyword_opportunities: {
    minimal: {
      keywords: ['test'],
      maxResults: 1,
      enrichDetails: false
    },
    functional: {
      keywords: ['javascript', 'tutorial'],
      maxResults: 1,
      enrichDetails: false,
      competitionLevel: 'medium' as const
    },
    invalid: {
      keywords: INVALID_TEST_INPUTS.emptyArray,
      maxResults: INVALID_TEST_INPUTS.negativeNumber
    },
    error: {
      keywords: [INVALID_TEST_INPUTS.emptyString],
      maxResults: INVALID_TEST_INPUTS.tooManyResults
    }
  },

  analyze_keywords: {
    minimal: {
      keywords: ['test'],
      maxResults: 1,
      enrichDetails: false
    },
    functional: {
      keywords: ['javascript', 'programming'],
      maxResults: 1,
      enrichDetails: false,
      includeRelated: false
    },
    invalid: {
      keywords: INVALID_TEST_INPUTS.emptyArray,
      maxResults: INVALID_TEST_INPUTS.negativeNumber
    },
    error: {
      keywords: [INVALID_TEST_INPUTS.emptyString],
      maxResults: INVALID_TEST_INPUTS.tooManyResults
    }
  },

  analyze_viral_videos: {
    minimal: {
      query: 'test',
      maxResults: 1,
      enrichDetails: false
    },
    functional: {
      query: 'viral',
      maxResults: 1,
      enrichDetails: false,
      timeRange: 'week' as const,
      minViews: 100000
    },
    invalid: {
      query: INVALID_TEST_INPUTS.emptyString,
      maxResults: INVALID_TEST_INPUTS.negativeNumber,
      minViews: INVALID_TEST_INPUTS.negativeNumber
    },
    error: {
      query: INVALID_TEST_INPUTS.nullValue,
      maxResults: INVALID_TEST_INPUTS.tooManyResults,
      timeRange: INVALID_TEST_INPUTS.invalidEnum as any
    }
  },

  discover_channel_network: {
    minimal: {
      seedChannelId: TEST_DATA.CHANNEL_ID,
      maxChannels: 1,
      enrichDetails: false
    },
    functional: {
      seedChannelId: TEST_DATA.CHANNEL_ID,
      maxChannels: 1,
      enrichDetails: false,
      networkDepth: 1
    },
    invalid: {
      seedChannelId: INVALID_TEST_INPUTS.invalidChannelId,
      maxChannels: INVALID_TEST_INPUTS.negativeNumber
    },
    error: {
      seedChannelId: INVALID_TEST_INPUTS.emptyString,
      maxChannels: INVALID_TEST_INPUTS.tooManyResults
    }
  },

  // Keyword Extraction Tools
  extract_keywords_from_text: {
    minimal: {
      text: 'sample test text for keyword extraction',
      maxKeywords: 5
    },
    functional: {
      text: 'This is a comprehensive JavaScript programming tutorial for beginners',
      maxKeywords: 5,
      includeMetrics: false
    },
    invalid: {
      text: INVALID_TEST_INPUTS.emptyString,
      maxKeywords: INVALID_TEST_INPUTS.negativeNumber
    },
    error: {
      text: INVALID_TEST_INPUTS.nullValue,
      maxKeywords: INVALID_TEST_INPUTS.tooManyResults
    }
  },

  extract_keywords_from_videos: {
    minimal: {
      videoIds: [TEST_DATA.VIDEO_ID],
      maxKeywords: 5,
      enrichDetails: false
    },
    functional: {
      videoIds: [TEST_DATA.VIDEO_ID],
      maxKeywords: 5,
      enrichDetails: false,
      includeMetrics: false
    },
    invalid: {
      videoIds: [INVALID_TEST_INPUTS.invalidVideoId],
      maxKeywords: INVALID_TEST_INPUTS.negativeNumber
    },
    error: {
      videoIds: INVALID_TEST_INPUTS.emptyArray,
      maxKeywords: INVALID_TEST_INPUTS.tooManyResults
    }
  },

  extract_video_comments: {
    minimal: {
      videoId: TEST_DATA.VIDEO_ID,
      maxComments: 1,
      enrichDetails: false
    },
    functional: {
      videoId: TEST_DATA.VIDEO_ID,
      maxComments: 1,
      enrichDetails: false,
      order: 'time' as const
    },
    invalid: {
      videoId: INVALID_TEST_INPUTS.invalidVideoId,
      maxComments: INVALID_TEST_INPUTS.negativeNumber
    },
    error: {
      videoId: INVALID_TEST_INPUTS.emptyString,
      maxComments: INVALID_TEST_INPUTS.tooManyResults
    }
  },

  find_content_gaps: {
    minimal: {
      niche: 'test',
      competitorChannelIds: [TEST_DATA.CHANNEL_ID],
      maxResults: 1,
      enrichDetails: false
    },
    functional: {
      niche: 'programming tutorials',
      competitorChannelIds: [TEST_DATA.CHANNEL_ID],
      maxResults: 1,
      enrichDetails: false,
      analysisDepth: 'basic' as const
    },
    invalid: {
      niche: INVALID_TEST_INPUTS.emptyString,
      competitorChannelIds: [INVALID_TEST_INPUTS.invalidChannelId],
      maxResults: INVALID_TEST_INPUTS.negativeNumber
    },
    error: {
      niche: INVALID_TEST_INPUTS.nullValue,
      competitorChannelIds: INVALID_TEST_INPUTS.emptyArray,
      maxResults: INVALID_TEST_INPUTS.tooManyResults
    }
  },

  generate_keyword_cloud: {
    minimal: {
      keywords: ['test'],
      maxKeywords: 5
    },
    functional: {
      keywords: ['javascript', 'programming', 'tutorial'],
      maxKeywords: 5,
      includeMetrics: false
    },
    invalid: {
      keywords: INVALID_TEST_INPUTS.emptyArray,
      maxKeywords: INVALID_TEST_INPUTS.negativeNumber
    },
    error: {
      keywords: [INVALID_TEST_INPUTS.emptyString],
      maxKeywords: INVALID_TEST_INPUTS.tooManyResults
    }
  },

  keyword_research_workflow: {
    minimal: {
      seedKeywords: ['test'],
      targetAudience: 'general',
      maxResults: 1,
      enrichDetails: false
    },
    functional: {
      seedKeywords: ['javascript', 'tutorial'],
      targetAudience: 'developers',
      maxResults: 1,
      enrichDetails: false,
      competitionLevel: 'medium' as const
    },
    invalid: {
      seedKeywords: INVALID_TEST_INPUTS.emptyArray,
      targetAudience: INVALID_TEST_INPUTS.emptyString,
      maxResults: INVALID_TEST_INPUTS.negativeNumber
    },
    error: {
      seedKeywords: [INVALID_TEST_INPUTS.emptyString],
      targetAudience: INVALID_TEST_INPUTS.nullValue,
      maxResults: INVALID_TEST_INPUTS.tooManyResults
    }
  }
} as const;

// Quota usage estimates for each tool (in API quota units)
export const TOOL_QUOTA_ESTIMATES = {
  search_videos: 100,
  get_video_details: 1,
  search_channels: 100,
  get_channel_details: 1,
  search_playlists: 100,
  get_playlist_details: 1,
  get_trending_videos: 1,
  advanced_search: 100,
  analyze_channel_videos: 101, // channel details + videos
  analyze_competitor: 201, // multiple channels + videos
  analyze_keyword_opportunities: 100,
  analyze_keywords: 100,
  analyze_viral_videos: 100,
  discover_channel_network: 101,
  extract_keywords_from_text: 0, // no API calls
  extract_keywords_from_videos: 1,
  extract_video_comments: 1,
  find_content_gaps: 201, // competitor analysis + search
  generate_keyword_cloud: 0, // no API calls
  keyword_research_workflow: 300 // comprehensive workflow
} as const;

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

// Helper function to estimate quota usage for a test scenario
export const estimateQuotaUsage = (toolName: keyof typeof TOOL_QUOTA_ESTIMATES) => {
  return TOOL_QUOTA_ESTIMATES[toolName];
};