// Test environment setup
beforeAll(() => {
  // Ensure YouTube API key is available for testing
  if (!process.env.YOUTUBE_API_KEY) {
    throw new Error('YOUTUBE_API_KEY environment variable is required for testing with real API calls');
  }
  
  // Set up test timeout for real API calls
  jest.setTimeout(10000);
});

// Helper function to add delays between API calls to respect rate limits
export const apiDelay = (ms: number = 100) => new Promise(resolve => setTimeout(resolve, ms));

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
