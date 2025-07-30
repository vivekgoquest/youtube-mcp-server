import type { UnifiedSearchParams } from "../types.js";
import { stripUndefinedValues } from "./search-enrichment.js";
import { ErrorHandler } from "./error-handler.js";

/**
 * Validates search query parameters
 */
export function validateSearchQuery(query?: string, channelId?: string): void {
  // Check for null values explicitly
  if (query === null || channelId === null) {
    throw new Error("Query and channelId cannot be null");
  }

  if (!query && !channelId) {
    throw new Error("Either query or channelId must be provided");
  }

  if (query !== undefined && typeof query !== "string") {
    throw new Error("Query must be a string");
  }

  if (channelId !== undefined && typeof channelId !== "string") {
    throw new Error("ChannelId must be a string");
  }

  if (query !== undefined && query.trim() === "") {
    throw new Error("Search query cannot be empty");
  }

  if (channelId !== undefined && channelId.trim() === "") {
    throw new Error("ChannelId cannot be empty");
  }
}

/**
 * Validates maxResults parameter
 */
export function validateMaxResults(maxResults?: number): void {
  if (maxResults === null) {
    throw new Error("maxResults cannot be null");
  }

  if (maxResults !== undefined) {
    if (typeof maxResults !== "number") {
      throw new Error("maxResults must be a number");
    }

    if (!Number.isInteger(maxResults)) {
      throw new Error("maxResults must be an integer");
    }

    if (maxResults < 1 || maxResults > 50) {
      throw new Error("maxResults must be between 1 and 50");
    }
  }
}

/**
 * Validates ISO 8601 date format
 */
function isValidISO8601(dateString: string): boolean {
  if (typeof dateString !== "string") {
    return false;
  }

  if (dateString.trim() === "") {
    return false;
  }

  const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z?$/;
  if (!iso8601Regex.test(dateString)) {
    return false;
  }

  try {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
  } catch {
    return false;
  }
}

/**
 * Validates date range parameters
 */
export function validateDateRange(
  publishedAfter?: string,
  publishedBefore?: string,
): void {
  // Check for null values
  if (publishedAfter === null) {
    throw new Error("publishedAfter cannot be null");
  }

  if (publishedBefore === null) {
    throw new Error("publishedBefore cannot be null");
  }

  // Validate types
  if (publishedAfter !== undefined && typeof publishedAfter !== "string") {
    throw new Error("publishedAfter must be a string");
  }

  if (publishedBefore !== undefined && typeof publishedBefore !== "string") {
    throw new Error("publishedBefore must be a string");
  }

  // Validate formats
  if (publishedAfter && !isValidISO8601(publishedAfter)) {
    throw new Error(
      "publishedAfter must be in ISO 8601 format (YYYY-MM-DDTHH:mm:ssZ)",
    );
  }

  if (publishedBefore && !isValidISO8601(publishedBefore)) {
    throw new Error(
      "publishedBefore must be in ISO 8601 format (YYYY-MM-DDTHH:mm:ssZ)",
    );
  }

  // Validate date logic
  if (publishedAfter && publishedBefore) {
    try {
      const afterDate = new Date(publishedAfter);
      const beforeDate = new Date(publishedBefore);

      if (isNaN(afterDate.getTime()) || isNaN(beforeDate.getTime())) {
        throw new Error("Invalid date values provided");
      }

      if (afterDate >= beforeDate) {
        throw new Error("publishedAfter must be before publishedBefore");
      }

      // Check for dates too far in the future
      const now = new Date();
      const oneYearFromNow = new Date(now);
      oneYearFromNow.setFullYear(now.getFullYear() + 1);

      if (afterDate > oneYearFromNow || beforeDate > oneYearFromNow) {
        throw new Error(
          "Date values cannot be more than one year in the future",
        );
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes("publishedAfter")) {
        throw error;
      }
      ErrorHandler.handleUtilityError(error, {
        operation: "validateDateRange",
        details: `publishedAfter: ${publishedAfter}, publishedBefore: ${publishedBefore}`,
      });
    }
  }
}

/**
 * Validates enrichment parts parameter
 */
export function validateEnrichmentParts(
  enrichParts?: UnifiedSearchParams["enrichParts"],
  resourceType?: "video" | "channel" | "playlist",
): void {
  if (enrichParts === undefined) {
    return;
  }

  // Validate overall structure
  if (
    typeof enrichParts !== "object" ||
    enrichParts === null ||
    Array.isArray(enrichParts)
  ) {
    throw new Error("enrichParts must be an object");
  }

  // Check for unexpected properties
  const validResourceTypes = ["video", "channel", "playlist"];
  const providedKeys = Object.keys(enrichParts);
  const invalidKeys = providedKeys.filter(
    (key) => !validResourceTypes.includes(key),
  );
  if (invalidKeys.length > 0) {
    throw new Error(
      `Invalid enrichParts keys: ${invalidKeys.join(", ")}. Valid keys are: ${validResourceTypes.join(", ")}`,
    );
  }

  // Validate resource type consistency - now just logs a warning instead of throwing
  if (resourceType) {
    // When searching for a specific resource type, warn if other types' parts are provided
    const otherTypes = validResourceTypes.filter(
      (type) => type !== resourceType,
    );
    const otherTypesWithParts = otherTypes.filter(
      (type) =>
        type in enrichParts && enrichParts[type as keyof typeof enrichParts],
    );

    if (otherTypesWithParts.length > 0) {
      // Log warning but don't throw - allows more flexible enrichment across resource types
      console.warn(
        `Note: When searching for ${resourceType}, you've also provided enrichment parts for: ${otherTypesWithParts.join(", ")}. These will be ignored for ${resourceType} results but can enrich related resources if the API returns them.`,
      );
    }
  }

  const validVideoParts = [
    "snippet",
    "contentDetails",
    "statistics",
    "status",
    "localizations",
    "topicDetails",
  ];
  const validChannelParts = [
    "snippet",
    "contentDetails",
    "statistics",
    "status",
    "brandingSettings",
    "localizations",
  ];
  const validPlaylistParts = [
    "snippet",
    "contentDetails",
    "status",
    "localizations",
  ];

  // Validate video parts
  if (enrichParts.video !== undefined) {
    if (!Array.isArray(enrichParts.video)) {
      throw new Error("enrichParts.video must be an array");
    }

    if (enrichParts.video.length === 0) {
      throw new Error(
        "enrichParts.video cannot be empty. Either omit it or provide valid parts",
      );
    }

    const invalidParts = enrichParts.video.filter(
      (part) => !validVideoParts.includes(part),
    );
    if (invalidParts.length > 0) {
      throw new Error(
        `Invalid video parts: ${invalidParts.join(", ")}. Valid parts are: ${validVideoParts.join(", ")}`,
      );
    }
  }

  // Validate channel parts
  if (enrichParts.channel !== undefined) {
    if (!Array.isArray(enrichParts.channel)) {
      throw new Error("enrichParts.channel must be an array");
    }

    if (enrichParts.channel.length === 0) {
      throw new Error(
        "enrichParts.channel cannot be empty. Either omit it or provide valid parts",
      );
    }

    const invalidParts = enrichParts.channel.filter(
      (part) => !validChannelParts.includes(part),
    );
    if (invalidParts.length > 0) {
      throw new Error(
        `Invalid channel parts: ${invalidParts.join(", ")}. Valid parts are: ${validChannelParts.join(", ")}`,
      );
    }
  }

  // Validate playlist parts
  if (enrichParts.playlist !== undefined) {
    if (!Array.isArray(enrichParts.playlist)) {
      throw new Error("enrichParts.playlist must be an array");
    }

    if (enrichParts.playlist.length === 0) {
      throw new Error(
        "enrichParts.playlist cannot be empty. Either omit it or provide valid parts",
      );
    }

    const invalidParts = enrichParts.playlist.filter(
      (part) => !validPlaylistParts.includes(part),
    );
    if (invalidParts.length > 0) {
      throw new Error(
        `Invalid playlist parts: ${invalidParts.join(", ")}. Valid parts are: ${validPlaylistParts.join(", ")}`,
      );
    }
  }

  // Check if at least one resource type has parts when enrichParts is provided
  if (providedKeys.length === 0) {
    throw new Error(
      "enrichParts must contain at least one resource type with parts",
    );
  }
}

/**
 * Maps filter parameters to YouTube API parameters
 */
function mapFiltersToApiParams(
  filters?: UnifiedSearchParams["filters"],
): Record<string, any> {
  if (!filters) return {};

  if (filters === null) {
    throw new Error("filters cannot be null");
  }

  if (typeof filters !== "object" || Array.isArray(filters)) {
    throw new Error("filters must be an object");
  }

  const params: Record<string, any> = {};

  try {
    // Map uploadDate to publishedAfter
    if (filters.uploadDate) {
      const validUploadDates = ["hour", "today", "week", "month", "year"];
      if (!validUploadDates.includes(filters.uploadDate)) {
        throw new Error(
          `Invalid uploadDate: ${filters.uploadDate}. Valid values are: ${validUploadDates.join(", ")}`,
        );
      }

      const now = new Date();
      switch (filters.uploadDate) {
        case "hour":
          params.publishedAfter = new Date(
            now.getTime() - 60 * 60 * 1000,
          ).toISOString();
          break;
        case "today":
          params.publishedAfter = new Date(
            now.getTime() - 24 * 60 * 60 * 1000,
          ).toISOString();
          break;
        case "week":
          params.publishedAfter = new Date(
            now.getTime() - 7 * 24 * 60 * 60 * 1000,
          ).toISOString();
          break;
        case "month":
          params.publishedAfter = new Date(
            now.getTime() - 30 * 24 * 60 * 60 * 1000,
          ).toISOString();
          break;
        case "year":
          params.publishedAfter = new Date(
            now.getTime() - 365 * 24 * 60 * 60 * 1000,
          ).toISOString();
          break;
      }
    }

    // Map sortBy to order
    if (filters.sortBy) {
      const validSortBy = ["relevance", "upload_date", "view_count", "rating"];
      if (!validSortBy.includes(filters.sortBy)) {
        throw new Error(
          `Invalid sortBy: ${filters.sortBy}. Valid values are: ${validSortBy.join(", ")}`,
        );
      }

      switch (filters.sortBy) {
        case "relevance":
          params.order = "relevance";
          break;
        case "upload_date":
          params.order = "date";
          break;
        case "view_count":
          params.order = "viewCount";
          break;
        case "rating":
          params.order = "rating";
          break;
      }
    }

    // Map duration filter
    if (filters.duration) {
      const validDurations = ["any", "short", "medium", "long"];
      if (!validDurations.includes(filters.duration)) {
        throw new Error(
          `Invalid duration: ${filters.duration}. Valid values are: ${validDurations.join(", ")}`,
        );
      }

      if (filters.duration !== "any") {
        params.videoDuration = filters.duration;
      }
    }
  } catch (error) {
    ErrorHandler.handleUtilityError(error, {
      operation: "mapFilterParameters",
      details: "Error mapping filter parameters to API params",
    });
  }

  return params;
}

/**
 * Validates for parameter conflicts
 */
function checkParameterConflicts(
  params: UnifiedSearchParams,
  filterParams: Record<string, any>,
): void {
  // Check for conflicting order parameters
  if (
    params.order &&
    filterParams.order &&
    params.order !== filterParams.order
  ) {
    throw new Error(
      `Conflicting sort parameters: 'order' is set to '${params.order}' but filters.sortBy implies '${filterParams.order}'`,
    );
  }

  // Check for conflicting date parameters
  if (params.publishedAfter && filterParams.publishedAfter) {
    throw new Error(
      `Conflicting date parameters: both 'publishedAfter' and 'filters.uploadDate' are specified`,
    );
  }

  // Check for conflicting duration parameters
  if (
    params.videoDuration &&
    filterParams.videoDuration &&
    params.videoDuration !== filterParams.videoDuration
  ) {
    throw new Error(
      `Conflicting duration parameters: 'videoDuration' is set to '${params.videoDuration}' but filters.duration is set to '${filterParams.videoDuration}'`,
    );
  }

  // Check for type-specific parameters used with wrong type
  if (params.videoDuration && params.type && params.type !== "video") {
    throw new Error(
      `videoDuration can only be used when searching for videos (type='video')`,
    );
  }

  // Validate that filters.duration is only used with video searches
  if (filterParams.videoDuration && params.type && params.type !== "video") {
    throw new Error(
      `filters.duration can only be used when searching for videos (type='video')`,
    );
  }
}

/**
 * Builds clean search parameters for YouTube API
 */
export function buildSearchParams(
  params: UnifiedSearchParams,
): Record<string, any> {
  if (!params || typeof params !== "object" || Array.isArray(params)) {
    throw new Error("params must be a valid object");
  }

  // Map filters to API parameters
  const filterParams = mapFiltersToApiParams(params.filters);

  // Check for parameter conflicts
  checkParameterConflicts(params, filterParams);

  // Validate type parameter
  if (params.type) {
    const validTypes = ["video", "channel", "playlist"];
    if (!validTypes.includes(params.type)) {
      throw new Error(
        `Invalid type: ${params.type}. Valid values are: ${validTypes.join(", ")}`,
      );
    }
  }

  // Validate order parameter
  if (params.order) {
    const validOrders = [
      "date",
      "rating",
      "relevance",
      "title",
      "videoCount",
      "viewCount",
    ];
    if (!validOrders.includes(params.order)) {
      throw new Error(
        `Invalid order: ${params.order}. Valid values are: ${validOrders.join(", ")}`,
      );
    }
  }

  // Validate videoDuration parameter
  if (params.videoDuration) {
    const validDurations = ["short", "medium", "long"];
    if (!validDurations.includes(params.videoDuration)) {
      throw new Error(
        `Invalid videoDuration: ${params.videoDuration}. Valid values are: ${validDurations.join(", ")}`,
      );
    }
  }

  // Validate regionCode parameter
  if (params.regionCode) {
    if (
      typeof params.regionCode !== "string" ||
      params.regionCode.length !== 2
    ) {
      throw new Error("regionCode must be a 2-letter ISO country code");
    }
  }

  // Validate safeSearch parameter
  if (params.safeSearch) {
    const validSafeSearch = ["none", "moderate", "strict"];
    if (!validSafeSearch.includes(params.safeSearch)) {
      throw new Error(
        `Invalid safeSearch: ${params.safeSearch}. Valid values are: ${validSafeSearch.join(", ")}`,
      );
    }
  }

  // Validate pageToken
  if (
    params.pageToken !== undefined &&
    (params.pageToken === null || typeof params.pageToken !== "string")
  ) {
    throw new Error("pageToken must be a string");
  }

  const searchParams = {
    part: "snippet",
    q: params.query,
    channelId: params.channelId,
    type: params.type || "video",
    maxResults: params.maxResults || 10,
    order: params.order || filterParams.order || "relevance",
    publishedAfter: params.publishedAfter || filterParams.publishedAfter,
    publishedBefore: params.publishedBefore,
    videoDuration: params.videoDuration || filterParams.videoDuration,
    regionCode: params.regionCode,
    safeSearch: params.safeSearch || "moderate",
    pageToken: params.pageToken,
  };

  return stripUndefinedValues(searchParams);
}
