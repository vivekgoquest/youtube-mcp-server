import { YouTubeMCPServer } from '../src/mcp-server.js';
import { TEST_DATA, apiDelay } from './setup.js';

describe('YouTubeMCPServer', () => {
  let server: YouTubeMCPServer;

  beforeEach(() => {
    server = new YouTubeMCPServer({
      apiKey: process.env.YOUTUBE_API_KEY!
    });
  });

  afterEach(async () => {
    await apiDelay(200);
  });

  describe('Server Initialization', () => {
    test('should initialize with correct server info', () => {
      const info = server.getServerInfo();
      
      expect(info.name).toBe('youtube-mcp-server');
      expect(info.version).toBeDefined();
      expect(info.description).toContain('YouTube Data API');
    });

    test('should list available tools', () => {
      const tools = server.listTools();
      
      expect(tools.length).toBeGreaterThan(0);
      expect(tools.some(tool => tool.name === 'search_videos')).toBe(true);
      expect(tools.some(tool => tool.name === 'search_channels')).toBe(true);
      expect(tools.some(tool => tool.name === 'search_playlists')).toBe(true);
      expect(tools.some(tool => tool.name === 'get_trending_videos')).toBe(true);
      expect(tools.some(tool => tool.name === 'get_video_details')).toBe(true);
      expect(tools.some(tool => tool.name === 'get_channel_details')).toBe(true);
    });

    test('should provide tool schemas with proper input validation', () => {
      const tools = server.listTools();
      const searchVideosTool = tools.find(tool => tool.name === 'search_videos');
      
      expect(searchVideosTool).toBeDefined();
      expect(searchVideosTool?.inputSchema).toBeDefined();
      expect(searchVideosTool?.inputSchema.properties).toBeDefined();
      expect(searchVideosTool?.inputSchema.properties.query).toBeDefined();
      expect(searchVideosTool?.inputSchema.properties.maxResults).toBeDefined();
    });
  });

  describe('Tool Execution', () => {
    test('should execute search_videos tool successfully', async () => {
      const result = await server.executeTool('search_videos', {
        query: TEST_DATA.SEARCH_QUERY,
        maxResults: 5
      });

      expect(result.success).toBe(true);
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Found');
      expect(result.content[0].text).toContain('videos');
    });

    test('should execute get_video_details tool successfully', async () => {
      const result = await server.executeTool('get_video_details', {
        videoId: TEST_DATA.VIDEO_ID
      });

      expect(result.success).toBe(true);
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Title:');
      expect(result.content[0].text).toContain('Views:');
    });

    test('should execute get_trending_videos tool successfully', async () => {
      const result = await server.executeTool('get_trending_videos', {
        maxResults: 5,
        regionCode: 'US'
      });

      expect(result.success).toBe(true);
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('trending');
    });

    test('should handle invalid tool names gracefully', async () => {
      const result = await server.executeTool('invalid_tool', {});

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Unknown tool');
    });

    test('should validate tool arguments', async () => {
      const result = await server.executeTool('search_videos', {
        // Missing required query parameter
        maxResults: 5
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Workflow Support', () => {
    test('should support complex workflow: search -> get details', async () => {
      // Step 1: Search for videos
      const searchResult = await server.executeTool('search_videos', {
        query: 'JavaScript tutorial',
        maxResults: 3
      });

      expect(searchResult.success).toBe(true);
      
      // Extract video ID from search results (this would be done by the MCP client)
      // For testing, we'll use our known test video ID
      
      // Step 2: Get detailed information about the first video
      const detailsResult = await server.executeTool('get_video_details', {
        videoId: TEST_DATA.VIDEO_ID
      });

      expect(detailsResult.success).toBe(true);
      expect(detailsResult.content[0].text).toContain('Title:');
    });

    test('should support channel exploration workflow', async () => {
      // Step 1: Search for channels
      const channelSearchResult = await server.executeTool('search_channels', {
        query: 'programming',
        maxResults: 3
      });

      expect(channelSearchResult.success).toBe(true);

      // Step 2: Get channel details (using known channel)
      const channelDetailsResult = await server.executeTool('get_channel_details', {
        channelId: TEST_DATA.CHANNEL_ID
      });

      expect(channelDetailsResult.success).toBe(true);
      expect(channelDetailsResult.content[0].text).toContain('**Name:**');
    });
  });

  describe('Response Formatting', () => {
    test('should format search results in a user-friendly way', async () => {
      const result = await server.executeTool('search_videos', {
        query: TEST_DATA.SEARCH_QUERY,
        maxResults: 3
      });

      expect(result.success).toBe(true);
      const text = result.content[0].text;
      
      // Should include structured information
      expect(text).toContain('**');
      expect(text).toContain('Channel:');
      expect(text).toContain('Published:');
      expect(text).toContain('Video ID:');
    });

    test('should include metadata in responses', async () => {
      const result = await server.executeTool('search_videos', {
        query: TEST_DATA.SEARCH_QUERY,
        maxResults: 5
      });

      expect(result.success).toBe(true);
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.quotaUsed).toBeGreaterThan(0);
      expect(result.metadata?.requestTime).toBeGreaterThan(0);
    });
  });

  describe('Error Handling and Resilience', () => {
    test('should handle API quota exceeded gracefully', async () => {
      // This test might not trigger quota exceeded in normal testing,
      // but ensures the error handling path works
      const server = new YouTubeMCPServer({
        apiKey: 'invalid-key'
      });

      const result = await server.executeTool('search_videos', {
        query: TEST_DATA.SEARCH_QUERY,
        maxResults: 5
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Error');
    });

    test('should provide helpful error messages', async () => {
      const result = await server.executeTool('get_video_details', {
        videoId: 'invalid-video-id-12345'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.content[0].text).toContain('Error');
    });
  });

  describe('Performance and Quota Management', () => {
    test('should track quota usage across multiple requests', async () => {
      const results = [];
      
      // Make multiple API calls
      for (let i = 0; i < 3; i++) {
        const result = await server.executeTool('search_videos', {
          query: `test query ${i}`,
          maxResults: 2
        });
        results.push(result);
        await apiDelay(300); // Respect rate limits
      }

      // All should succeed
      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.metadata?.quotaUsed).toBeGreaterThan(0);
      });

      // Total quota should be sum of individual requests
      const totalQuota = results.reduce((sum, result) => 
        sum + (result.metadata?.quotaUsed || 0), 0
      );
      expect(totalQuota).toBeGreaterThan(0);
    });
  });
});
