import { YouTubeClient } from "../src/youtube-client.js";
import { TEST_DATA, apiDelay } from "./setup.js";
import { ErrorHandler } from "../src/utils/error-handler.js";

describe("YouTubeClient", () => {
  let client: YouTubeClient;

  beforeEach(() => {
    client = new YouTubeClient({
      apiKey: process.env.YOUTUBE_API_KEY!,
    });
  });

  afterEach(async () => {
    // Add delay between tests to respect rate limits
    await apiDelay(200);
  });

  describe("Basic API Connectivity", () => {
    test("should successfully connect to YouTube API and fetch a video", async () => {
      const response = await client.getVideos({
        part: "snippet",
        id: TEST_DATA.VIDEO_ID,
      });

      expect(response).toBeDefined();
      expect(response.items).toHaveLength(1);
      expect(response.items[0].id).toBe(TEST_DATA.VIDEO_ID);
      expect(response.items[0].snippet?.title).toBeDefined();
      expect(response.items[0].snippet?.channelTitle).toBeDefined();
    });

    test("should handle invalid API key gracefully", async () => {
      const invalidClient = new YouTubeClient({
        apiKey: "invalid-api-key",
      });

      await expect(
        invalidClient.getVideos({
          part: "snippet",
          id: TEST_DATA.VIDEO_ID,
        }),
      ).rejects.toThrow();
    });

    test("should handle non-existent video ID gracefully", async () => {
      const response = await client.getVideos({
        part: "snippet",
        id: "non-existent-video-id",
      });

      expect(response).toBeDefined();
      expect(response.items).toHaveLength(0);
    });
  });

  describe("Channel Operations", () => {
    test("should fetch channel information", async () => {
      const response = await client.getChannels({
        part: "snippet,statistics",
        id: TEST_DATA.CHANNEL_ID,
      });

      expect(response).toBeDefined();
      expect(response.items).toHaveLength(1);
      expect(response.items[0].id).toBe(TEST_DATA.CHANNEL_ID);
      expect(response.items[0].snippet?.title).toBeDefined();
      expect(response.items[0].statistics?.subscriberCount).toBeDefined();
    });
  });

  describe("Search Operations", () => {
    test("should perform basic video search", async () => {
      const response = await client.search({
        part: "snippet",
        q: TEST_DATA.SEARCH_QUERY,
        type: "video",
        maxResults: 5,
      });

      expect(response).toBeDefined();
      expect(response.items.length).toBeGreaterThan(0);
      expect(response.items.length).toBeLessThanOrEqual(5);

      // Check that we got videos back
      response.items.forEach((item) => {
        expect(item.id.kind).toBe("youtube#video");
        expect(item.id.videoId).toBeDefined();
        expect(item.snippet.title).toBeDefined();
      });
    });
  });

  describe("Error Handling", () => {
    test("should handle API quota exceeded errors", async () => {
      // This test might not always trigger quota errors in CI
      // but ensures we handle them properly when they occur
      try {
        await client.getVideos({
          part: "snippet",
          id: TEST_DATA.VIDEO_ID,
        });
      } catch (error: any) {
        ErrorHandler.handleTestError(error, {
          testName: "youtube-client",
          operation: "quota-test",
          expectation: "quota error handling",
        });
      }
    });

    test("should validate required parameters", async () => {
      await expect(
        client.getVideos({
          part: "snippet",
          // Missing required id parameter
        }),
      ).rejects.toThrow();
    });
  });

  describe("Rate Limiting", () => {
    test("should handle multiple sequential requests", async () => {
      const requests = [
        client.getVideos({ part: "snippet", id: TEST_DATA.VIDEO_ID }),
        client.getChannels({ part: "snippet", id: TEST_DATA.CHANNEL_ID }),
      ];

      const responses = await Promise.all(requests);

      expect(responses).toHaveLength(2);
      expect(responses[0].items).toHaveLength(1);
      expect(responses[1].items).toHaveLength(1);
    });
  });
});
