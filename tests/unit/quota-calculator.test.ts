import {
  calculateSearchQuota,
  estimateQuotaUsage,
  API_QUOTA_COSTS,
} from "../../src/utils/quota-calculator.js";
import type { UnifiedSearchParams } from "../../src/types.js";

describe("Quota Calculator", () => {
  describe("calculateSearchQuota", () => {
    it("should return base search cost when no enrichment is requested", () => {
      const params: UnifiedSearchParams = {
        query: "test",
        maxResults: 10,
      };

      const quota = calculateSearchQuota(params);
      expect(quota).toBe(100); // Only base search cost
    });

    it("should add video enrichment cost for single batch", () => {
      const params: UnifiedSearchParams = {
        query: "test",
        maxResults: 10,
        type: "video",
        enrichParts: {
          video: ["snippet", "statistics"],
        },
      };

      const quota = calculateSearchQuota(params);
      expect(quota).toBe(101); // 100 (search) + 1 (1 batch of videos.list)
    });

    it("should calculate multiple batches for video enrichment", () => {
      const params: UnifiedSearchParams = {
        query: "test",
        maxResults: 100, // Will need 2 batches (50 per batch)
        type: "video",
        enrichParts: {
          video: ["snippet"],
        },
      };

      const quota = calculateSearchQuota(params);
      expect(quota).toBe(102); // 100 (search) + 2 (2 batches of videos.list)
    });

    it("should add channel enrichment cost", () => {
      const params: UnifiedSearchParams = {
        query: "test",
        maxResults: 25,
        type: "channel",
        enrichParts: {
          channel: ["snippet", "statistics"],
        },
      };

      const quota = calculateSearchQuota(params);
      expect(quota).toBe(101); // 100 (search) + 1 (1 batch of channels.list)
    });

    it("should add playlist enrichment cost", () => {
      const params: UnifiedSearchParams = {
        query: "test",
        maxResults: 75, // Will need 2 batches
        type: "playlist",
        enrichParts: {
          playlist: ["snippet"],
        },
      };

      const quota = calculateSearchQuota(params);
      expect(quota).toBe(102); // 100 (search) + 2 (2 batches of playlists.list)
    });

    it("should not add enrichment cost when enrichParts is empty for the type", () => {
      const params: UnifiedSearchParams = {
        query: "test",
        maxResults: 10,
        type: "video",
        enrichParts: {
          channel: ["snippet"], // Only channel enrichment, not video
        },
      };

      const quota = calculateSearchQuota(params);
      expect(quota).toBe(100); // Only base search cost
    });

    it("should handle edge case of exactly 50 results", () => {
      const params: UnifiedSearchParams = {
        query: "test",
        maxResults: 50,
        type: "video",
        enrichParts: {
          video: ["snippet"],
        },
      };

      const quota = calculateSearchQuota(params);
      expect(quota).toBe(101); // 100 (search) + 1 (1 batch)
    });

    it("should handle edge case of 51 results", () => {
      const params: UnifiedSearchParams = {
        query: "test",
        maxResults: 51,
        type: "video",
        enrichParts: {
          video: ["snippet"],
        },
      };

      const quota = calculateSearchQuota(params);
      expect(quota).toBe(102); // 100 (search) + 2 (2 batches)
    });
  });

  describe("estimateQuotaUsage", () => {
    it("should estimate search operation quota", () => {
      const quota = estimateQuotaUsage("search");
      expect(quota).toBe(100);
    });

    it("should estimate video list operation quota", () => {
      const quota = estimateQuotaUsage("video_list", { maxResults: 100 });
      expect(quota).toBe(2); // 2 batches
    });

    it("should estimate channel list operation quota", () => {
      const quota = estimateQuotaUsage("channel_list", { maxResults: 25 });
      expect(quota).toBe(1); // 1 batch
    });

    it("should estimate playlist list operation quota", () => {
      const quota = estimateQuotaUsage("playlist_list", { maxResults: 150 });
      expect(quota).toBe(3); // 3 batches
    });

    it("should handle search with enrichment params", () => {
      const params: UnifiedSearchParams = {
        query: "test",
        maxResults: 30,
        type: "video",
        enrichParts: {
          video: ["snippet", "statistics"],
        },
      };

      const quota = estimateQuotaUsage("search", params);
      expect(quota).toBe(101); // 100 (search) + 1 (enrichment batch)
    });
  });

  describe("API_QUOTA_COSTS", () => {
    it("should have correct quota costs based on YouTube API documentation", () => {
      expect(API_QUOTA_COSTS.search.list).toBe(100);
      expect(API_QUOTA_COSTS.videos.list).toBe(1);
      expect(API_QUOTA_COSTS.channels.list).toBe(1);
      expect(API_QUOTA_COSTS.playlists.list).toBe(1);
      expect(API_QUOTA_COSTS.write.insert).toBe(50);
      expect(API_QUOTA_COSTS.videos_insert).toBe(1600);
    });
  });
});
