import { YouTubeClient } from '../src/youtube-client.js';

// Test environment setup
// Verify YouTube API key is available for real API testing
if (!process.env.YOUTUBE_API_KEY) {
  throw new Error(
    'YOUTUBE_API_KEY environment variable is required for running tests.\n' +
    'Please set your YouTube API key: export YOUTUBE_API_KEY="your-api-key"'
  );
}

// Global YouTube Client Singleton for interface compliance tests
// Always use real YouTube client - no mocking
export const REAL_CLIENT = new YouTubeClient({ apiKey: process.env.YOUTUBE_API_KEY });

// Helper function to add delays between API calls to respect rate limits
export const apiDelay = (ms: number = 100) => new Promise(resolve => setTimeout(resolve, ms));

// Specialized delay functions for different test scenarios
export const interfaceTestDelay = () => apiDelay(200);
export const batchTestDelay = () => apiDelay(300);

// Quota Budget Tracking
let quotaUsedInTests = 0;
export const QUOTA_BUDGET_LIMIT = parseInt(process.env.MAX_QUOTA_FOR_COMPLIANCE_TESTS || '500');

export const trackQuotaUsage = (amount: number) => {
  quotaUsedInTests += amount;
  console.log(`Quota used: ${amount} (Total: ${quotaUsedInTests}/${QUOTA_BUDGET_LIMIT})`);
};

export const resetQuotaTracking = () => {
  quotaUsedInTests = 0;
};

export const checkQuotaBudget = (plannedUsage: number): boolean => {
  return (quotaUsedInTests + plannedUsage) <= QUOTA_BUDGET_LIMIT;
};

export const getQuotaUsed = () => quotaUsedInTests;

// Environment Configuration
export const isComplianceTestMode = () => {
  return process.env.COMPLIANCE_TEST_MODE === 'true' || process.env.COMPLIANCE_TEST_MODE === 'minimal';
};

export const getComplianceTestMode = () => {
  return process.env.COMPLIANCE_TEST_MODE || 'full';
};

// Test data - using stable, well-known YouTube content
export const TEST_DATA = {
  // Rick Roll video - stable and well-known
  VIDEO_ID: 'dQw4w9WgXcQ',
  // YouTube's official channel
  CHANNEL_ID: 'UC_x5XG1OV2P6uZZ5FSM9Ttw',
  // A popular public playlist (YouTube's own)
  PLAYLIST_ID: 'PL4cUxeGkcC9gcy9lrvMJ75z9maRw4byYp',
  // Search terms that should return stable results
  SEARCH_QUERY: 'JavaScript tutorial',
  // Stable channel handle
  CHANNEL_HANDLE: '@YouTube'
} as const;

// Minimal test inputs for quota-efficient testing
export const MINIMAL_TEST_INPUTS = {
  search: {
    query: 'test',
    maxResults: 1,
    enrichDetails: false
  },
  video: {
    videoId: TEST_DATA.VIDEO_ID,
    includeParts: ['snippet'] as const
  },
  channel: {
    channelId: TEST_DATA.CHANNEL_ID,
    includeParts: ['snippet'] as const
  },
  playlist: {
    playlistId: TEST_DATA.PLAYLIST_ID,
    includeParts: ['snippet'] as const
  },
  keywords: {
    keywords: ['test'],
    maxResults: 1
  },
  text: {
    text: 'sample test text for keyword extraction',
    maxKeywords: 5
  }
} as const;

// Invalid test inputs for error testing
export const INVALID_TEST_INPUTS = {
  emptyString: '',
  nullValue: null,
  undefinedValue: undefined,
  invalidVideoId: 'invalid-video-id-12345',
  invalidChannelId: 'invalid-channel-id-12345',
  invalidPlaylistId: 'invalid-playlist-id-12345',
  negativeNumber: -1,
  zeroResults: 0,
  tooManyResults: 1000,
  emptyArray: [],
  invalidEnum: 'invalid-enum-value'
} as const;

// Batch test inputs for tools that accept multiple IDs
export const BATCH_TEST_INPUTS = {
  videoIds: [TEST_DATA.VIDEO_ID],
  channelIds: [TEST_DATA.CHANNEL_ID],
  keywords: ['javascript', 'tutorial'],
  maxItems: 2
} as const;
