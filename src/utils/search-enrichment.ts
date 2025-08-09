import type { YouTubeClient } from "../youtube-client.js";
import type {
  Video,
  Channel,
  Playlist,
  SearchResult,
  UnifiedSearchParams,
} from "../types.js";
import { globalConfig } from "../config/global-config.js";
import { ErrorHandler } from "./error-handler.js";
import { YOUTUBE_API_BATCH_SIZE } from "../config/constants.js";

/**
 * Removes undefined values from an object
 */
export function stripUndefinedValues<T extends Record<string, any>>(
  obj: T,
): Partial<T> {
  if (!obj || typeof obj !== "object") {
    throw new Error("Input must be a valid object");
  }

  if (Array.isArray(obj)) {
    throw new Error("Input must be an object, not an array");
  }

  const result: Partial<T> = {};
  try {
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        result[key as keyof T] = value;
      }
    }
  } catch (error) {
    ErrorHandler.handleUtilityError(error, {
      operation: "stripUndefinedValues",
    });
  }

  return result;
}

/**
 * Splits an array into batches of specified size
 */
export function batchArray<T>(array: T[], batchSize: number): T[][] {
  if (!Array.isArray(array)) {
    throw new Error("First argument must be an array");
  }

  if (!Number.isInteger(batchSize) || batchSize <= 0) {
    throw new Error("Batch size must be a positive integer");
  }

  // Handle empty array
  if (array.length === 0) {
    return [];
  }

  const batches: T[][] = [];
  try {
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
  } catch (error) {
    ErrorHandler.handleUtilityError(error, {
      operation: "batchArray",
      details: `Array length: ${array.length}, batch size: ${batchSize}`,
    });
  }

  return batches;
}

/**
 * Enriches video search results with additional details
 */
export async function enrichVideos(
  client: YouTubeClient,
  videoIds: string[],
  parts: string[],
): Promise<Record<string, Video>> {
  if (!client || typeof client !== "object") {
    throw new Error("Valid YouTube client instance is required");
  }

  if (!Array.isArray(videoIds)) {
    throw new Error("videoIds must be an array");
  }

  if (!Array.isArray(parts)) {
    throw new Error("parts must be an array");
  }

  if (parts.length === 0) {
    throw new Error("At least one part must be specified");
  }


  // Handle empty videoIds array
  if (videoIds.length === 0) {
    return {};
  }

  // Validate video IDs
  const invalidIds = videoIds.filter(
    (id) => !id || typeof id !== "string" || id.trim() === "",
  );
  if (invalidIds.length > 0) {
    throw new Error("All video IDs must be non-empty strings");
  }

  const enrichedVideos: Record<string, Video> = {};

  try {
    const videoBatches = batchArray(videoIds, YOUTUBE_API_BATCH_SIZE);

    for (const batch of videoBatches) {
      const response = await client.getVideos({
        part: parts.join(","),
        id: batch.join(","),
      });
      // Each API call costs 1 quota unit for list operations
      const videos = response.items || [];

      if (!Array.isArray(videos)) {
        throw new Error(
          "Client returned invalid response: expected array of videos",
        );
      }

      for (const video of videos) {
        if (video && video.id) {
          enrichedVideos[video.id] = video;
        }
      }
    }
  } catch (error) {
    ErrorHandler.handleUtilityError(error, {
      operation: "enrichVideos",
      details: `Video IDs count: ${videoIds.length}`,
    });
  }

  return enrichedVideos;
}

/**
 * Enriches channel search results with additional details
 */
export async function enrichChannels(
  client: YouTubeClient,
  channelIds: string[],
  parts: string[],
): Promise<Record<string, Channel>> {
  if (!client || typeof client !== "object") {
    throw new Error("Valid YouTube client instance is required");
  }

  if (!Array.isArray(channelIds)) {
    throw new Error("channelIds must be an array");
  }

  if (!Array.isArray(parts)) {
    throw new Error("parts must be an array");
  }

  if (parts.length === 0) {
    throw new Error("At least one part must be specified");
  }


  // Handle empty channelIds array
  if (channelIds.length === 0) {
    return {};
  }

  // Validate channel IDs
  const invalidIds = channelIds.filter(
    (id) => !id || typeof id !== "string" || id.trim() === "",
  );
  if (invalidIds.length > 0) {
    throw new Error("All channel IDs must be non-empty strings");
  }

  const enrichedChannels: Record<string, Channel> = {};

  try {
    const channelBatches = batchArray(channelIds, YOUTUBE_API_BATCH_SIZE);

    for (const batch of channelBatches) {
      const response = await client.getChannels({
        part: parts.join(","),
        id: batch.join(","),
      });
      // Each API call costs 1 quota unit for list operations
      const channels = response.items || [];

      if (!Array.isArray(channels)) {
        throw new Error(
          "Client returned invalid response: expected array of channels",
        );
      }

      for (const channel of channels) {
        if (channel && channel.id) {
          enrichedChannels[channel.id] = channel;
        }
      }
    }
  } catch (error) {
    ErrorHandler.handleUtilityError(error, {
      operation: "enrichChannels",
      details: `Channel IDs count: ${channelIds.length}`,
    });
  }

  return enrichedChannels;
}

/**
 * Enriches playlist search results with additional details
 */
export async function enrichPlaylists(
  client: YouTubeClient,
  playlistIds: string[],
  parts: string[],
): Promise<Record<string, Playlist>> {
  if (!client || typeof client !== "object") {
    throw new Error("Valid YouTube client instance is required");
  }

  if (!Array.isArray(playlistIds)) {
    throw new Error("playlistIds must be an array");
  }

  if (!Array.isArray(parts)) {
    throw new Error("parts must be an array");
  }

  if (parts.length === 0) {
    throw new Error("At least one part must be specified");
  }


  // Handle empty playlistIds array
  if (playlistIds.length === 0) {
    return {};
  }

  // Validate playlist IDs
  const invalidIds = playlistIds.filter(
    (id) => !id || typeof id !== "string" || id.trim() === "",
  );
  if (invalidIds.length > 0) {
    throw new Error("All playlist IDs must be non-empty strings");
  }

  const enrichedPlaylists: Record<string, Playlist> = {};

  try {
    const playlistBatches = batchArray(playlistIds, YOUTUBE_API_BATCH_SIZE);

    for (const batch of playlistBatches) {
      const response = await client.getPlaylists({
        part: parts.join(","),
        id: batch.join(","),
      });
      // Each API call costs 1 quota unit for list operations
      const playlists = response.items || [];

      if (!Array.isArray(playlists)) {
        throw new Error(
          "Client returned invalid response: expected array of playlists",
        );
      }

      for (const playlist of playlists) {
        if (playlist && playlist.id) {
          enrichedPlaylists[playlist.id] = playlist;
        }
      }
    }
  } catch (error) {
    ErrorHandler.handleUtilityError(error, {
      operation: "enrichPlaylists",
      details: `Playlist IDs count: ${playlistIds.length}`,
    });
  }

  return enrichedPlaylists;
}

/**
 * Merges enriched data back into search results
 */
export function mergeEnrichedData<T extends SearchResult>(
  searchResults: T[],
  enrichedData: Record<string, any>,
  resourceType: "video" | "channel" | "playlist",
): T[] {
  if (!Array.isArray(searchResults)) {
    throw new Error("searchResults must be an array");
  }

  if (
    !enrichedData ||
    typeof enrichedData !== "object" ||
    Array.isArray(enrichedData)
  ) {
    throw new Error("enrichedData must be a valid object");
  }

  const validResourceTypes = ["video", "channel", "playlist"];
  if (!validResourceTypes.includes(resourceType)) {
    throw new Error(
      `Invalid resource type: ${resourceType}. Must be one of: ${validResourceTypes.join(", ")}`,
    );
  }

  // Handle empty search results
  if (searchResults.length === 0) {
    return [];
  }

  try {
    return searchResults.map((result) => {
      if (!result || typeof result !== "object") {
        throw new Error("Each search result must be a valid object");
      }

      if (!result.id || typeof result.id !== "object") {
        // Skip items without proper id structure
        return result;
      }

      const idKey = `${resourceType}Id` as keyof typeof result.id;
      const id = result.id[idKey];

      if (id && typeof id === "string" && enrichedData[id]) {
        return {
          ...result,
          enrichedData: enrichedData[id],
        };
      }

      return result;
    });
  } catch (error) {
    ErrorHandler.handleUtilityError(error, {
      operation: "mergeEnrichedData",
      details: `Resource type: ${resourceType}, search results count: ${searchResults.length}`,
    });
  }
}

/**
 * Extracts IDs from search results based on resource type
 */
export function extractResourceIds(
  searchResults: SearchResult[],
  resourceType: "video" | "channel" | "playlist",
): string[] {
  if (!Array.isArray(searchResults)) {
    throw new Error("searchResults must be an array");
  }

  const validResourceTypes = ["video", "channel", "playlist"];
  if (!validResourceTypes.includes(resourceType)) {
    throw new Error(
      `Invalid resource type: ${resourceType}. Must be one of: ${validResourceTypes.join(", ")}`,
    );
  }

  const idKey = `${resourceType}Id` as keyof SearchResult["id"];

  return searchResults
    .filter((item) => item.id && item.id[idKey])
    .map((item) => item.id[idKey]!)
    .filter((id): id is string => typeof id === "string" && id.trim() !== "");
}

/**
 * Gets enrichment parts with defaults from config
 *
 * This function determines which API parts should be requested for enrichment:
 * 1. If enrichParts is not provided → returns null (no enrichment)
 * 2. If resource type is not in enrichParts → returns null (skip this resource type)
 * 3. If resource type has empty array → returns default parts from config
 * 4. If resource type has non-empty array → returns the specified parts
 *
 * @param enrichParts - Optional configuration for which parts to enrich per resource type
 * @param resourceType - The type of resource being enriched ('video', 'channel', or 'playlist')
 * @returns Array of part names to request, or null if enrichment should be skipped
 *
 * @example
 * // No enrichment requested
 * getEnrichmentParts(undefined, 'video') // returns null
 *
 * @example
 * // Video enrichment not requested (not in enrichParts object)
 * getEnrichmentParts({ channel: ['snippet'] }, 'video') // returns null
 *
 * @example
 * // Empty array means use default parts
 * getEnrichmentParts({ video: [] }, 'video') // returns ['snippet', 'statistics', ...]
 *
 * @example
 * // Specific parts requested
 * getEnrichmentParts({ video: ['snippet', 'statistics'] }, 'video') // returns ['snippet', 'statistics']
 */
export function getEnrichmentParts(
  enrichParts: UnifiedSearchParams["enrichParts"],
  resourceType: "video" | "channel" | "playlist",
): string[] | null {
  // Step 1: Check if any enrichment is requested at all
  if (!enrichParts) {
    // No enrichParts object provided - skip all enrichment
    return null;
  }

  // Validate resource type
  const validResourceTypes = ["video", "channel", "playlist"] as const;
  if (!validResourceTypes.includes(resourceType)) {
    throw new Error(
      `Invalid resource type: ${resourceType}. Must be one of: ${validResourceTypes.join(", ")}`,
    );
  }

  // Step 2: Check if this specific resource type should be enriched
  const requestedParts = enrichParts[resourceType];
  if (requestedParts === undefined) {
    // Resource type not included in enrichParts - skip enrichment for this type
    return null;
  }

  // Step 3: Validate that requestedParts is an array
  if (!Array.isArray(requestedParts)) {
    throw new Error(`enrichParts.${resourceType} must be an array`);
  }

  // Step 4: Handle empty array case - use defaults
  if (requestedParts.length === 0) {
    // Empty array explicitly means "use default parts for this resource type"
    switch (resourceType) {
      case "video":
        return globalConfig.defaultVideoParts;
      case "channel":
        return globalConfig.defaultChannelParts;
      case "playlist":
        return globalConfig.defaultPlaylistParts;
      default:
        throw new Error(`Unexpected resource type: ${resourceType}`);
    }
  }

  // Step 5: Use the explicitly provided parts
  // Validate that all parts are non-empty strings
  const invalidParts = requestedParts.filter(
    (part) => typeof part !== "string" || part.trim() === "",
  );
  if (invalidParts.length > 0) {
    throw new Error(`All parts must be non-empty strings`);
  }

  return requestedParts;
}

/**
 * Performs enrichment for search results
 */
export async function performEnrichment(
  client: YouTubeClient,
  searchResults: SearchResult[],
  enrichParts: UnifiedSearchParams["enrichParts"],
  resourceType: "video" | "channel" | "playlist",
): Promise<SearchResult[]> {
  if (!client || typeof client !== "object") {
    throw new Error("Valid YouTube client instance is required");
  }

  if (!Array.isArray(searchResults)) {
    throw new Error("searchResults must be an array");
  }


  // Check if enrichment is requested
  const parts = getEnrichmentParts(enrichParts, resourceType);
  if (!parts || searchResults.length === 0) {
    return searchResults;
  }

  // Extract IDs
  const ids = extractResourceIds(searchResults, resourceType);
  if (ids.length === 0) {
    return searchResults;
  }

  // Perform enrichment based on resource type
  let enrichedData: Record<string, any> = {};

  switch (resourceType) {
    case "video":
      enrichedData = await enrichVideos(client, ids, parts);
      break;
    case "channel":
      enrichedData = await enrichChannels(client, ids, parts);
      break;
    case "playlist":
      enrichedData = await enrichPlaylists(client, ids, parts);
      break;
  }

  // Merge enriched data back into search results
  return mergeEnrichedData(searchResults, enrichedData, resourceType);
}
