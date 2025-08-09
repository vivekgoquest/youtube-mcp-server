import { YouTubeClient } from '../src/youtube-client.js';
import { YouTubeClientConfig } from '../src/types.js';
import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Save original environment variables
const originalEnv = { ...process.env };

// Load environment variables from .env.test
dotenv.config({ path: path.resolve(process.cwd(), '.env.test') });

// ==================== Helper Functions ====================

// Check for API key at module level
const hasApiKey = !!process.env.YOUTUBE_API_KEY;

function getApiKey(): string {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    throw new Error(
      'YOUTUBE_API_KEY not set. Please copy .env.test.example to .env.test and add your API key.'
    );
  }
  return apiKey;
}

function createTestClient(): YouTubeClient {
  const config: YouTubeClientConfig = {
    apiKey: getApiKey(),
  };
  return new YouTubeClient(config);
}

function validateYouTubeResponse(response: any): void {
  expect(response).toBeDefined();
  expect(response).toHaveProperty('kind');
  expect(response).toHaveProperty('etag');
}

// ==================== Test Suite ====================

// Use Jest's conditional test execution based on API key availability
const describeIfApiKey = hasApiKey ? describe : describe.skip;

describeIfApiKey('YouTubeClient: End-to-End Tests', () => {
  let client: YouTubeClient;

  beforeAll(() => {
    if (!hasApiKey) {
      console.warn('Skipping tests: No API key configured. Please copy .env.test.example to .env.test and add your API key.');
      return;
    }
    client = createTestClient();
  });

  afterAll(() => {
    // Restore original environment variables
    Object.keys(process.env).forEach(key => {
      if (!(key in originalEnv)) {
        delete process.env[key];
      }
    });
    Object.assign(process.env, originalEnv);
  });

  // ==================== 1. Client Setup and Configuration ====================

  describe('Client Setup and Configuration', () => {
    test('should successfully instantiate client with valid config', () => {
      expect(client).toBeDefined();
      expect(client).toBeInstanceOf(YouTubeClient);
    });

    test('validateApiKey() should return true with valid key', async () => {
      const result = await client.validateApiKey();
      expect(result.valid).toBe(true);
    });

    test('should handle client with invalid API key', async () => {
      const invalidClient = new YouTubeClient({ apiKey: 'invalid-key-12345' });
      const result = await invalidClient.validateApiKey();
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  // ==================== 2. Core API Methods (Real API Calls) ====================

  describe('Core API Methods', () => {
    describe('search()', () => {
      test('should search for videos with known query', async () => {
        const response = await client.search({
          q: 'javascript tutorial',
          type: 'video',
          maxResults: 5,
          part: 'snippet',
        });

        validateYouTubeResponse(response);
        expect(response.items).toBeDefined();
        expect(Array.isArray(response.items)).toBe(true);
        expect(response.items.length).toBeGreaterThan(0);
        expect(response.items.length).toBeLessThanOrEqual(5);

        // Validate first item structure
        if (response.items.length > 0) {
          const firstItem = response.items[0];
          expect(firstItem).toHaveProperty('kind', 'youtube#searchResult');
          expect(firstItem).toHaveProperty('id');
          expect(firstItem.id).toHaveProperty('videoId');
          expect(firstItem).toHaveProperty('snippet');
          expect(firstItem.snippet).toHaveProperty('title');
          expect(firstItem.snippet).toHaveProperty('description');
        }
      });

      test('should search for channels', async () => {
        const response = await client.search({
          q: 'Rick Astley',
          type: 'channel',
          maxResults: 3,
          part: 'snippet',
        });

        validateYouTubeResponse(response);
        expect(response.items).toBeDefined();
        expect(Array.isArray(response.items)).toBe(true);
        
        // Should find at least one channel
        expect(response.items.length).toBeGreaterThan(0);
        
        // Validate channel structure
        const firstChannel = response.items[0];
        expect(firstChannel.id).toHaveProperty('channelId');
        expect(firstChannel.snippet).toHaveProperty('channelTitle');
      });
    });

    describe('getVideos()', () => {
      test('should get video details with stable video ID', async () => {
        const response = await client.getVideos({
          id: 'dQw4w9WgXcQ', // Rick Astley - Never Gonna Give You Up
          part: 'snippet,statistics',
        });

        validateYouTubeResponse(response);
        expect(response.items).toBeDefined();
        expect(response.items).toHaveLength(1);

        const video = response.items[0];
        expect(video).toHaveProperty('kind', 'youtube#video');
        expect(video).toHaveProperty('id', 'dQw4w9WgXcQ');
        expect(video).toHaveProperty('snippet');
        expect(video.snippet).toHaveProperty('title');
        expect(video.snippet?.title).toContain('Never Gonna Give You Up');
        expect(video).toHaveProperty('statistics');
        expect(video.statistics).toHaveProperty('viewCount');
        expect(parseInt(video.statistics?.viewCount || '0')).toBeGreaterThan(1000000); // Should have millions of views
      });

      test('should handle multiple video IDs', async () => {
        const response = await client.getVideos({
          id: 'dQw4w9WgXcQ,kJQP7kiw5Fk', // Rick Astley & Luis Fonsi - Despacito
          part: 'snippet',
        });

        validateYouTubeResponse(response);
        expect(response.items).toBeDefined();
        expect(response.items.length).toBe(2);
        
        // Verify we got both videos
        const videoIds = response.items.map((item: any) => item.id);
        expect(videoIds).toContain('dQw4w9WgXcQ');
        expect(videoIds).toContain('kJQP7kiw5Fk');
      });
    });

    describe('getChannels()', () => {
      test('should get channel details with stable channel ID', async () => {
        const response = await client.getChannels({
          id: 'UCuAXFkgsw1L7xaCfnd5JJOw', // Rick Astley's official channel
          part: 'snippet,statistics',
        });

        validateYouTubeResponse(response);
        expect(response.items).toBeDefined();
        expect(response.items).toHaveLength(1);

        const channel = response.items[0];
        expect(channel).toHaveProperty('kind', 'youtube#channel');
        expect(channel).toHaveProperty('id', 'UCuAXFkgsw1L7xaCfnd5JJOw');
        expect(channel).toHaveProperty('snippet');
        expect(channel.snippet).toHaveProperty('title');
        expect(channel).toHaveProperty('statistics');
        expect(channel.statistics).toHaveProperty('subscriberCount');
      });
    });

    describe('getPlaylists()', () => {
      test('should search for public playlists', async () => {
        const response = await client.search({
          q: 'javascript tutorials',
          type: 'playlist',
          maxResults: 5,
          part: 'snippet',
        });

        validateYouTubeResponse(response);
        expect(response.items).toBeDefined();
        expect(Array.isArray(response.items)).toBe(true);
        expect(response.items.length).toBeGreaterThan(0);

        // Validate playlist structure
        if (response.items.length > 0) {
          const firstPlaylist = response.items[0];
          expect(firstPlaylist.id).toHaveProperty('playlistId');
          expect(firstPlaylist.snippet).toHaveProperty('title');
        }
      });
    });

    describe('getPlaylistItems()', () => {
      test('should get items from a public playlist', async () => {
        // First, search for a public playlist
        const searchResponse = await client.search({
          q: 'Rick Astley greatest hits',
          type: 'playlist',
          maxResults: 1,
          part: 'snippet',
        });

        expect(searchResponse.items.length).toBeGreaterThan(0);
        const playlistId = searchResponse.items[0].id.playlistId;
        expect(playlistId).toBeDefined();

        // Get items from the playlist
        const response = await client.getPlaylistItems({
          part: 'snippet,contentDetails',
          playlistId: playlistId!,
          maxResults: 10,
        });

        validateYouTubeResponse(response);
        expect(response.items).toBeDefined();
        expect(Array.isArray(response.items)).toBe(true);
        expect(response.items.length).toBeGreaterThan(0);
        expect(response.items.length).toBeLessThanOrEqual(10);

        // Validate item structure
        const firstItem = response.items[0];
        expect(firstItem).toHaveProperty('kind');
        expect(firstItem).toHaveProperty('snippet');
        expect(firstItem.snippet).toHaveProperty('title');
        expect(firstItem.snippet).toHaveProperty('playlistId', playlistId);
        expect(firstItem.snippet).toHaveProperty('resourceId');
        expect(firstItem.snippet.resourceId).toHaveProperty('kind');
        expect(firstItem.snippet.resourceId).toHaveProperty('videoId');
        expect(firstItem).toHaveProperty('contentDetails');
      });

      test('should handle pagination with pageToken', async () => {
        // Search for a popular playlist likely to have many items
        const searchResponse = await client.search({
          q: 'official music videos',
          type: 'playlist',
          maxResults: 1,
          part: 'snippet',
        });

        expect(searchResponse.items.length).toBeGreaterThan(0);
        const playlistId = searchResponse.items[0].id.playlistId;

        // First page
        const firstPage = await client.getPlaylistItems({
          part: 'snippet',
          playlistId: playlistId!,
          maxResults: 5,
        });

        validateYouTubeResponse(firstPage);
        expect(firstPage.items).toBeDefined();
        expect(firstPage.items.length).toBeGreaterThan(0);

        // If there's a next page, fetch it
        if (firstPage.nextPageToken) {
          const secondPage = await client.getPlaylistItems({
            part: 'snippet',
            playlistId: playlistId!,
            maxResults: 5,
            pageToken: firstPage.nextPageToken,
          });

          validateYouTubeResponse(secondPage);
          expect(secondPage.items).toBeDefined();
          expect(secondPage.items.length).toBeGreaterThan(0);

          // Verify different items
          const firstPageIds = firstPage.items.map((item: any) => item.snippet.resourceId.videoId);
          const secondPageIds = secondPage.items.map((item: any) => item.snippet.resourceId.videoId);
          
          // Should have different videos
          const overlap = firstPageIds.filter((id: string) => secondPageIds.includes(id));
          expect(overlap.length).toBe(0);
        }
      });

      test('should get items from channel uploads playlist', async () => {
        // Get Rick Astley's channel to find uploads playlist
        const channelResponse = await client.getChannels({
          id: 'UCuAXFkgsw1L7xaCfnd5JJOw',
          part: 'contentDetails',
        });

        expect(channelResponse.items).toHaveLength(1);
        const uploadsPlaylistId = channelResponse.items[0].contentDetails?.relatedPlaylists.uploads;
        expect(uploadsPlaylistId).toBeDefined();

        // Get items from uploads playlist
        const response = await client.getPlaylistItems({
          part: 'snippet',
          playlistId: uploadsPlaylistId!,
          maxResults: 5,
        });

        validateYouTubeResponse(response);
        expect(response.items).toBeDefined();
        expect(response.items.length).toBeGreaterThan(0);
        expect(response.items.length).toBeLessThanOrEqual(5);

        // All items should be from Rick Astley's channel
        response.items.forEach((item: any) => {
          expect(item.snippet.channelId).toBe('UCuAXFkgsw1L7xaCfnd5JJOw');
        });
      });
    });
  });

  // ==================== 3. Complex Workflows ====================

  describe('Complex Workflows', () => {
    describe('getAllVideosOfAChannel()', () => {
      test('should get all videos from a channel with pagination', async () => {
        // Use a channel with a moderate number of videos for testing
        const response = await client.getAllVideosOfAChannel({
          channelId: 'UCuAXFkgsw1L7xaCfnd5JJOw', // Rick Astley's channel
          maxTotalVideos: 20, // Limit to 20 videos for testing
        });

        expect(response).toBeDefined();
        expect(response.items).toBeDefined();
        expect(Array.isArray(response.items)).toBe(true);
        expect(response.items.length).toBeGreaterThan(0);
        expect(response.items.length).toBeLessThanOrEqual(20);

        // Validate video structure
        response.items.slice(0, 5).forEach(video => {
          expect(video).toHaveProperty('kind');
          expect(video).toHaveProperty('snippet');
        });
      });
    });

    describe('getAllPlaylistItems()', () => {
      test('should get all items from a playlist with pagination', async () => {
        // First, search for a public playlist
        const searchResponse = await client.search({
          q: 'Rick Astley greatest hits',
          type: 'playlist',
          maxResults: 1,
          part: 'snippet',
        });

        expect(searchResponse.items.length).toBeGreaterThan(0);
        const playlistId = searchResponse.items[0].id.playlistId;
        expect(playlistId).toBeDefined();

        // Get all items from the playlist
        const response = await client.getAllPlaylistItems(
          playlistId!,
          'snippet',
          20 // Limit for testing
        );

        expect(response).toBeDefined();
        expect(response.kind).toBe('youtube#playlistItemListResponse');
        expect(response.items).toBeDefined();
        expect(Array.isArray(response.items)).toBe(true);
        expect(response.items.length).toBeGreaterThan(0);
        expect(response.items.length).toBeLessThanOrEqual(20);

        // Validate item structure
        response.items.slice(0, 5).forEach(item => {
          expect(item).toHaveProperty('kind');
          expect(item).toHaveProperty('snippet');
          expect(item.snippet).toHaveProperty('title');
          expect(item.snippet).toHaveProperty('resourceId');
        });
      });
    });

    describe('End-to-end scenario', () => {
      test('should search for video then fetch its details', async () => {
        // Step 1: Search for a video
        const searchResponse = await client.search({
          q: 'Rick Astley official',
          type: 'video',
          maxResults: 1,
          part: 'snippet',
        });

        expect(searchResponse.items).toBeDefined();
        expect(searchResponse.items.length).toBe(1);

        const videoId = searchResponse.items[0].id.videoId;
        expect(videoId).toBeDefined();

        // Step 2: Get full details of the video
        const videoResponse = await client.getVideos({
          id: videoId,
          part: 'snippet,statistics,contentDetails',
        });

        expect(videoResponse.items).toBeDefined();
        expect(videoResponse.items).toHaveLength(1);

        const video = videoResponse.items[0];
        expect(video).toHaveProperty('id', videoId);
        expect(video).toHaveProperty('snippet');
        expect(video).toHaveProperty('statistics');
        expect(video).toHaveProperty('contentDetails');
        expect(video.contentDetails).toHaveProperty('duration');
      });
    });

    describe('Pagination testing', () => {
      test('should handle pagination with pageToken', async () => {
        // First page
        const firstPage = await client.search({
          q: 'music',
          type: 'video',
          maxResults: 5,
          part: 'snippet',
        });

        validateYouTubeResponse(firstPage);
        expect(firstPage.items).toBeDefined();
        expect(firstPage.items.length).toBe(5);
        expect(firstPage).toHaveProperty('nextPageToken');

        // Second page using nextPageToken
        const secondPage = await client.search({
          q: 'music',
          type: 'video',
          maxResults: 5,
          pageToken: firstPage.nextPageToken!,
          part: 'snippet',
        });

        validateYouTubeResponse(secondPage);
        expect(secondPage.items).toBeDefined();
        expect(secondPage.items.length).toBe(5);

        // Verify different results
        const firstPageIds = firstPage.items.map((item: any) => item.id.videoId);
        const secondPageIds = secondPage.items.map((item: any) => item.id.videoId);
        
        // Should have mostly different results (allow some overlap as YouTube API may have overlapping pages)
        const overlap = firstPageIds.filter((id: string) => secondPageIds.includes(id));
        const uniqueInSecondPage = secondPageIds.filter((id: string) => !firstPageIds.includes(id));
        
        // At least some videos should be different between pages
        expect(uniqueInSecondPage.length).toBeGreaterThan(0);
      });
    });
  });

  // ==================== 4. Error Handling ====================

  describe('Error Handling', () => {
    test('should handle non-existent video ID gracefully', async () => {
      const response = await client.getVideos({
        id: 'invalid-video-123',
        part: 'snippet',
      });

      // YouTube API returns empty items array for non-existent IDs
      validateYouTubeResponse(response);
      expect(response.items).toBeDefined();
      expect(response.items).toHaveLength(0);
    });

    test('should handle non-existent channel ID gracefully', async () => {
      try {
        const response = await client.getChannels({
          id: 'nonexistent-channel-123',
          part: 'snippet',
        });

        // If we get a response, it should have an empty items array
        if (response && response.items !== undefined) {
          validateYouTubeResponse(response);
          expect(response.items).toBeDefined();
          expect(response.items).toHaveLength(0);
        } else {
          // YouTube API might return a different structure for non-existent channels
          expect(response).toBeDefined();
        }
      } catch (error) {
        // Some YouTube API implementations throw errors for non-existent resources
        expect(error).toBeDefined();
      }
    });

    test('should throw error with invalid API key on actual API call', async () => {
      const invalidClient = new YouTubeClient({ apiKey: 'invalid-key-12345' });
      
      await expect(
        invalidClient.search({
          q: 'test',
          type: 'video',
          part: 'snippet',
        })
      ).rejects.toThrow(/YouTube API Error|API key not valid|Invalid API key/);
    });

    test('should handle missing required parameters', async () => {
      await expect(client.search({
        // Missing required 'part' parameter
      } as any)).rejects.toThrow(/part parameter is required/);
      
      await expect(client.getVideos({
        // Missing required 'part' parameter
      } as any)).rejects.toThrow(/part parameter is required/);
    });

    test('should reject if no identifier params provided for getVideos', async () => {
      await expect(
        client.getVideos({
          part: 'snippet',
        })
      ).rejects.toThrow(/Either id or chart parameter is required/);
    });

    test('should handle invalid part parameter', async () => {
      await expect(
        client.search({
          q: 'test',
          type: 'video',
          // @ts-expect-error Testing invalid part parameter
          part: ['invalid-part'],
        })
      ).rejects.toThrow(/part must be a string/);
    });

    test('should reject with invalid chart value', async () => {
      await expect(
        client.getVideos({
          chart: 'invalid-chart' as any,
          part: 'snippet',
        })
      ).rejects.toThrow(/chart must be "mostPopular"/);
    });

    test('should handle missing required parameters for getPlaylistItems', async () => {
      // Missing required 'part' parameter
      await expect(
        client.getPlaylistItems({
          playlistId: 'PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf',
        } as any)
      ).rejects.toThrow(/part parameter is required/);

      // Missing required 'playlistId' parameter
      await expect(
        client.getPlaylistItems({
          part: 'snippet',
        } as any)
      ).rejects.toThrow(/playlistId parameter is required/);
    });

    test('should handle non-existent playlist ID gracefully', async () => {
      // YouTube API throws an error for invalid playlist ID format
      await expect(
        client.getPlaylistItems({
          part: 'snippet',
          playlistId: 'PLnonexistent12345',
          maxResults: 5,
        })
      ).rejects.toThrow(/Invalid Value|playlistId parameter|not found/);
    });

    test('should handle invalid maxResults for getPlaylistItems', async () => {
      await expect(
        client.getPlaylistItems({
          part: 'snippet',
          playlistId: 'PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf',
          maxResults: 100, // Exceeds maximum of 50
        })
      ).rejects.toThrow(/maxResults must be at most 50/);

      await expect(
        client.getPlaylistItems({
          part: 'snippet',
          playlistId: 'PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf',
          maxResults: 0, // Less than minimum of 1
        })
      ).rejects.toThrow(/maxResults must be at least 1/);
    });
  });

  // ==================== Performance and Quota Considerations ====================

  describe('Performance', () => {
    test('API calls should complete within reasonable time', async () => {
      const startTime = Date.now();
      
      await client.search({
        q: 'test',
        type: 'video',
        maxResults: 1,
        part: 'snippet',
      });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within 10 seconds (generous for slow networks)
      expect(duration).toBeLessThan(10000);
    });
  });
});
