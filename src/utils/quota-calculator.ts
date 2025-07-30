import type { UnifiedSearchParams } from "../types.js";
import { YOUTUBE_API_BATCH_SIZE } from "../config/constants.js";

/**
 * YouTube API Quota Costs (as of 2025)
 * Source: https://developers.google.com/youtube/v3/determine_quota_cost
 */
export const API_QUOTA_COSTS = {
  // Search operations
  search: {
    list: 100, // search.list
  },

  // List operations (all cost 1 unit)
  videos: {
    list: 1, // videos.list
  },
  channels: {
    list: 1, // channels.list
  },
  playlists: {
    list: 1, // playlists.list
  },

  // Write operations (typically 50 units)
  write: {
    insert: 50,
    update: 50,
    delete: 50,
  },

  // Video upload
  videos_insert: 1600,
} as const;

/**
 * Calculates the estimated quota cost for a unified search operation
 * including any enrichment operations
 */
export function calculateSearchQuota(params: UnifiedSearchParams): number {
  // Base search cost
  let totalQuota = API_QUOTA_COSTS.search.list;

  // Calculate enrichment costs if enrichParts is specified
  if (params.enrichParts && params.maxResults) {
    const maxResults = params.maxResults || 10;
    const type = params.type || "video";

    // Check if enrichment is requested for this type
    const enrichmentParts = params.enrichParts[type];
    if (enrichmentParts && enrichmentParts.length > 0) {
      // Calculate number of batches needed (YouTube allows 50 items per request)
      const batchSize = YOUTUBE_API_BATCH_SIZE;
      const numBatches = Math.ceil(maxResults / batchSize);

      // Each batch requires one API call
      let enrichmentCost = 0;
      switch (type) {
        case "video":
          enrichmentCost = numBatches * API_QUOTA_COSTS.videos.list;
          break;
        case "channel":
          enrichmentCost = numBatches * API_QUOTA_COSTS.channels.list;
          break;
        case "playlist":
          enrichmentCost = numBatches * API_QUOTA_COSTS.playlists.list;
          break;
      }

      totalQuota += enrichmentCost;
    }
  }

  return totalQuota;
}
