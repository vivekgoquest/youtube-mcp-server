/**
 * YouTube API Constants
 * Single source of truth for default configuration values
 */

/**
 * Default video parts for enrichment
 * These parts are included by default when fetching video data
 */
export const DEFAULT_VIDEO_PARTS = [
  "snippet",
  "statistics",
  "contentDetails",
  "status",
  "topicDetails",
];

/**
 * Default channel parts for enrichment
 * These parts are included by default when fetching channel data
 */
export const DEFAULT_CHANNEL_PARTS = [
  "snippet",
  "statistics",
  "contentDetails",
  "brandingSettings",
  "topicDetails",
];

/**
 * Default playlist parts for enrichment
 * These parts are included by default when fetching playlist data
 */
export const DEFAULT_PLAYLIST_PARTS = ["snippet", "contentDetails", "status"];

/**
 * Standard batch size for YouTube API calls
 * YouTube API allows up to 50 items per batch request
 * This applies to videos.list, channels.list, playlists.list, etc.
 */
export const YOUTUBE_API_BATCH_SIZE = 50;
