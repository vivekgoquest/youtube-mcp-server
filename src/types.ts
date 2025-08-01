// YouTube Data API v3 response types
export interface YouTubeApiResponse<T = any> {
  kind: string;
  etag: string;
  items: T[];
  nextPageToken?: string;
  prevPageToken?: string;
  pageInfo: {
    totalResults: number;
    resultsPerPage: number;
  };
}

export interface VideoSnippet {
  publishedAt: string;
  channelId: string;
  title: string;
  description: string;
  thumbnails: {
    default: Thumbnail;
    medium: Thumbnail;
    high: Thumbnail;
    standard?: Thumbnail;
    maxres?: Thumbnail;
  };
  channelTitle: string;
  tags?: string[];
  categoryId: string;
  liveBroadcastContent: string;
  localized: {
    title: string;
    description: string;
  };
}

export interface VideoStatistics {
  viewCount: string;
  likeCount?: string;
  favoriteCount: string;
  commentCount?: string;
}

export interface VideoContentDetails {
  duration: string;
  dimension: string;
  definition: string;
  caption: string;
  licensedContent: boolean;
  regionRestriction?: {
    allowed?: string[];
    blocked?: string[];
  };
}

export interface Video {
  kind: string;
  etag: string;
  id: string;
  snippet?: VideoSnippet;
  statistics?: VideoStatistics;
  contentDetails?: VideoContentDetails;
}

export interface ChannelSnippet {
  title: string;
  description: string;
  customUrl?: string;
  publishedAt: string;
  thumbnails: {
    default: Thumbnail;
    medium: Thumbnail;
    high: Thumbnail;
  };
  localized: {
    title: string;
    description: string;
  };
  country?: string;
}

export interface ChannelStatistics {
  viewCount: string;
  subscriberCount: string;
  hiddenSubscriberCount: boolean;
  videoCount: string;
}

export interface Channel {
  kind: string;
  etag: string;
  id: string;
  snippet?: ChannelSnippet;
  statistics?: ChannelStatistics;
  contentDetails?: {
    relatedPlaylists: {
      likes?: string;
      uploads: string;
    };
  };
}

export interface PlaylistSnippet {
  publishedAt: string;
  channelId: string;
  title: string;
  description: string;
  thumbnails: {
    default: Thumbnail;
    medium: Thumbnail;
    high: Thumbnail;
    standard?: Thumbnail;
    maxres?: Thumbnail;
  };
  channelTitle: string;
  tags?: string[];
  localized: {
    title: string;
    description: string;
  };
}

export interface Playlist {
  kind: string;
  etag: string;
  id: string;
  snippet?: PlaylistSnippet;
  contentDetails?: {
    itemCount: number;
  };
}

export interface SearchResult {
  kind: string;
  etag: string;
  id: {
    kind: string;
    videoId?: string;
    channelId?: string;
    playlistId?: string;
  };
  snippet: {
    publishedAt: string;
    channelId: string;
    title: string;
    description: string;
    thumbnails: {
      default: Thumbnail;
      medium: Thumbnail;
      high: Thumbnail;
    };
    channelTitle: string;
    liveBroadcastContent?: string;
  };
}

export interface Thumbnail {
  url: string;
  width: number;
  height: number;
}

// Client configuration and error types
export interface YouTubeClientConfig {
  apiKey: string;
  baseURL?: string;
  timeout?: number;
}

export interface YouTubeApiError {
  code: number;
  message: string;
  errors?: Array<{
    domain: string;
    reason: string;
    message: string;
  }>;
}

// Channel Analysis Types
// Export data formats
// Search parameters
export interface SearchParams {
  part?: string;
  q?: string;
  channelId?: string;
  channelType?: "any" | "show";
  eventType?: "completed" | "live" | "upcoming";
  maxResults?: number;
  order?:
    | "date"
    | "rating"
    | "relevance"
    | "title"
    | "videoCount"
    | "viewCount";
  publishedAfter?: string;
  publishedBefore?: string;
  regionCode?: string;
  safeSearch?: "moderate" | "none" | "strict";
  type?: "channel" | "playlist" | "video";
  videoDuration?: "any" | "long" | "medium" | "short";
  pageToken?: string;
}

// Video list parameters
export interface VideoListParams {
  part: string;
  id?: string;
  chart?: "mostPopular";
  maxResults?: number;
  regionCode?: string;
  videoCategoryId?: string;
  pageToken?: string;
}

// Channel list parameters
export interface ChannelListParams {
  part: string;
  id?: string;
  forUsername?: string;
  mine?: boolean;
  maxResults?: number;
  pageToken?: string;
}

// Playlist list parameters
export interface PlaylistListParams {
  part: string;
  id?: string;
  channelId?: string;
  mine?: boolean;
  maxResults?: number;
  pageToken?: string;
}

// Tool response types for workflow chaining
export interface ToolRequestMetadata {
  quotaUsed: number;
  requestTime: number;
  source: string;
  estimatedQuota?: number;
}

export interface ToolResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: ToolRequestMetadata;
}

// Search tool parameters
export interface SearchVideosParams {
  query?: string;
  channelId?: string;
  maxResults?: number;
  order?: "date" | "rating" | "relevance" | "title" | "viewCount";
  publishedAfter?: string;
  publishedBefore?: string;
  videoDuration?: "any" | "long" | "medium" | "short";
  regionCode?: string;
  safeSearch?: "moderate" | "none" | "strict";
  pageToken?: string;
}

export interface SearchChannelsParams {
  query?: string;
  maxResults?: number;
  order?: "date" | "relevance" | "title" | "videoCount" | "viewCount";
  regionCode?: string;
  pageToken?: string;
}

export interface SearchPlaylistsParams {
  query?: string;
  channelId?: string;
  maxResults?: number;
  order?: "date" | "relevance" | "title" | "videoCount" | "viewCount";
  regionCode?: string;
  pageToken?: string;
}

export interface TrendingVideosParams {
  maxResults?: number;
  regionCode?: string;
  videoCategoryId?: string;
  pageToken?: string;
}

// Keyword Research Types
export interface KeywordData {
  keyword: string;
  frequency: number;
  sources: ("title" | "description" | "tags" | "comments")[];
  relevance: number;
  confidence?: number;
  relatedTerms?: string[];
  contexts?: string[];
  weight?: number;
  searchVolume?: number;
  competition?: number;
  difficulty?: "Low" | "Medium" | "High";
}

export interface KeywordCluster {
  clusterId: string;
  mainKeyword: string;
  relatedKeywords: KeywordData[];
  theme: string;
  totalFrequency: number;
  opportunityScore: number;
  color?: string;
}

export interface KeywordCloudData {
  keywords: Array<{
    text: string;
    weight: number;
    frequency: number;
    opportunityScore: number;
    cluster?: string;
    sources: string[];
  }>;
  clusters: KeywordCluster[];
  metadata: {
    totalKeywords: number;
    totalSources: number;
    generatedAt: string;
    sourceTypes: string[];
    processingTime: number;
  };
}

export interface KeywordExtractionOptions {
  minFrequency?: number;
  maxKeywords?: number;
  includeSingleWords?: boolean;
  includeStopWords?: boolean;
  languageFilter?: string;
  sources?: ("title" | "description" | "tags" | "comments")[];
  minWordLength?: number;
  includeNGrams?: boolean;
  nGramSize?: number;
}

export interface KeywordAnalysisResult {
  keywords: KeywordData[];
  clusters: KeywordCluster[];
  insights: {
    topKeywords: KeywordData[];
    emergingKeywords: KeywordData[];
    competitiveKeywords: KeywordData[];
    opportunityKeywords: KeywordData[];
  };
  recommendations: string[];
  competitionAnalysis?: {
    level: "low" | "medium" | "high";
    topCompetitors: string[];
    gaps: string[];
  };
}

// New Video Part Interfaces for expanded YouTube API v3 data
export interface VideoStatus {
  uploadStatus?: string;
  failureReason?: string;
  rejectionReason?: string;
  privacyStatus?: string;
  publishAt?: string;
  license?: string;
  embeddable?: boolean;
  publicStatsViewable?: boolean;
  madeForKids?: boolean;
  selfDeclaredMadeForKids?: boolean;
}

export interface VideoTopicDetails {
  topicIds?: string[];
  relevantTopicIds?: string[];
  topicCategories?: string[];
}

export interface VideoRecordingDetails {
  recordingDate?: string;
  location?: {
    latitude?: number;
    longitude?: number;
    altitude?: number;
  };
  locationDescription?: string;
}

export interface VideoLiveStreamingDetails {
  actualStartTime?: string;
  actualEndTime?: string;
  scheduledStartTime?: string;
  scheduledEndTime?: string;
  concurrentViewers?: string;
  activeLiveChatId?: string;
}

export interface VideoPlayer {
  embedHtml?: string;
  embedHeight?: number;
  embedWidth?: number;
}

export interface VideoLocalizations {
  [languageCode: string]: {
    title: string;
    description: string;
  };
}

export interface VideoFileDetails {
  fileName?: string;
  fileSize?: string;
  fileType?: string;
  container?: string;
  videoStreams?: Array<{
    widthPixels?: number;
    heightPixels?: number;
    frameRateFps?: number;
    aspectRatio?: number;
    codec?: string;
    bitrateBps?: string;
    rotation?: string;
    vendor?: string;
  }>;
  audioStreams?: Array<{
    channelCount?: number;
    codec?: string;
    bitrateBps?: string;
    vendor?: string;
  }>;
  durationMs?: string;
  bitrateBps?: string;
  creationTime?: string;
}

export interface VideoProcessingDetails {
  processingStatus?: string;
  processingProgress?: {
    partsTotal?: string;
    partsProcessed?: string;
    timeLeftMs?: string;
  };
  processingFailureReason?: string;
  fileDetailsAvailability?: string;
  processingIssuesAvailability?: string;
  tagSuggestionsAvailability?: string;
  editorSuggestionsAvailability?: string;
  thumbnailsAvailability?: string;
}

export interface VideoSuggestions {
  processingErrors?: string[];
  processingWarnings?: string[];
  processingHints?: string[];
  tagSuggestions?: Array<{
    tag?: string;
    categoryRestricts?: string[];
  }>;
  editorSuggestions?: string[];
}

// New Channel Part Interfaces
export interface ChannelBrandingSettings {
  channel?: {
    title?: string;
    description?: string;
    keywords?: string;
    trackingAnalyticsAccountId?: string;
    moderateComments?: boolean;
    unsubscribedTrailer?: string;
    defaultLanguage?: string;
    country?: string;
  };
  watch?: {
    textColor?: string;
    backgroundColor?: string;
    featuredPlaylistId?: string;
  };
  image?: {
    bannerImageUrl?: string;
    bannerMobileImageUrl?: string;
    bannerTabletLowImageUrl?: string;
    bannerTabletImageUrl?: string;
    bannerTabletHdImageUrl?: string;
    bannerTabletExtraHdImageUrl?: string;
    bannerMobileLowImageUrl?: string;
    bannerMobileMediumHdImageUrl?: string;
    bannerMobileHdImageUrl?: string;
    bannerMobileExtraHdImageUrl?: string;
    bannerTvImageUrl?: string;
    bannerTvLowImageUrl?: string;
    bannerTvMediumImageUrl?: string;
    bannerTvHighImageUrl?: string;
  };
}

export interface ChannelTopicDetails {
  topicIds?: string[];
  topicCategories?: string[];
}

export interface ChannelStatus {
  privacyStatus?: string;
  isLinked?: boolean;
  longUploadsStatus?: string;
  madeForKids?: boolean;
  selfDeclaredMadeForKids?: boolean;
}

export interface ChannelAuditDetails {
  overallGoodStanding?: boolean;
  communityGuidelinesGoodStanding?: boolean;
  copyrightStrikesGoodStanding?: boolean;
  contentIdClaimsGoodStanding?: boolean;
}

export interface ChannelContentOwnerDetails {
  contentOwner?: string;
  timeLinked?: string;
}

export interface ChannelLocalizations {
  [languageCode: string]: {
    title: string;
    description: string;
  };
}

// New Playlist Part Interfaces
export interface PlaylistStatus {
  privacyStatus?: string;
}

export interface PlaylistPlayer {
  embedHtml?: string;
}

export interface PlaylistLocalizations {
  [languageCode: string]: {
    title: string;
    description: string;
  };
}

// Enhanced Comment Interfaces

export interface CommentReply {
  id: string;
  snippet: {
    textDisplay: string;
    authorDisplayName?: string;
    authorChannelId?: {
      value: string;
    };
    authorProfileImageUrl?: string;
    publishedAt: string;
    updatedAt?: string;
    likeCount: number;
    parentId?: string;
  };
}

// Search Enhancement Types
export type EnrichmentOptions =
  | boolean
  | {
      parts: string[];
      fields?: string;
    };
// Update existing interfaces to include new optional parts
export interface Video {
  kind: string;
  etag: string;
  id: string;
  snippet?: VideoSnippet;
  statistics?: VideoStatistics;
  contentDetails?: VideoContentDetails;
  status?: VideoStatus;
  topicDetails?: VideoTopicDetails;
  recordingDetails?: VideoRecordingDetails;
  liveStreamingDetails?: VideoLiveStreamingDetails;
  player?: VideoPlayer;
  localizations?: VideoLocalizations;
  fileDetails?: VideoFileDetails;
  processingDetails?: VideoProcessingDetails;
  suggestions?: VideoSuggestions;
}

export interface Channel {
  kind: string;
  etag: string;
  id: string;
  snippet?: ChannelSnippet;
  statistics?: ChannelStatistics;
  contentDetails?: {
    relatedPlaylists: {
      likes?: string;
      uploads: string;
    };
  };
  brandingSettings?: ChannelBrandingSettings;
  topicDetails?: ChannelTopicDetails;
  status?: ChannelStatus;
  auditDetails?: ChannelAuditDetails;
  contentOwnerDetails?: ChannelContentOwnerDetails;
  localizations?: ChannelLocalizations;
}

export interface Playlist {
  kind: string;
  etag: string;
  id: string;
  snippet?: PlaylistSnippet;
  contentDetails?: {
    itemCount: number;
  };
  status?: PlaylistStatus;
  player?: PlaylistPlayer;
  localizations?: PlaylistLocalizations;
}

// Enhanced Comment Thread with author details and replies
// Update Search Params interfaces to include enrichment options
export interface SearchVideosParams {
  query?: string;
  channelId?: string;
  maxResults?: number;
  order?: "date" | "rating" | "relevance" | "title" | "viewCount";
  publishedAfter?: string;
  publishedBefore?: string;
  videoDuration?: "any" | "long" | "medium" | "short";
  regionCode?: string;
  safeSearch?: "moderate" | "none" | "strict";
  pageToken?: string;
  enrichDetails?: EnrichmentOptions;
}

export interface SearchChannelsParams {
  query?: string;
  maxResults?: number;
  order?: "date" | "relevance" | "title" | "videoCount" | "viewCount";
  regionCode?: string;
  pageToken?: string;
  enrichDetails?: EnrichmentOptions;
}

export interface SearchPlaylistsParams {
  query?: string;
  channelId?: string;
  maxResults?: number;
  order?: "date" | "relevance" | "title" | "videoCount" | "viewCount";
  regionCode?: string;
  pageToken?: string;
  enrichDetails?: EnrichmentOptions;
}

// Global Configuration Type
export interface GlobalConfig {
  // Default parts to include in video requests
  // Note: For new code, use DEFAULT_VIDEO_PARTS from constants.ts directly
  defaultVideoParts: string[];
  // Default parts to include in channel requests
  // Note: For new code, use DEFAULT_CHANNEL_PARTS from constants.ts directly
  defaultChannelParts: string[];
  // Default parts to include in playlist requests
  // Note: For new code, use DEFAULT_PLAYLIST_PARTS from constants.ts directly
  defaultPlaylistParts: string[];
  // Maximum items per batch for enrichment calls
  maxBatchSize: number;
}

// Unified Search Parameters
export interface UnifiedSearchParams {
  query?: string;
  channelId?: string;
  type?: "video" | "channel" | "playlist";
  maxResults?: number;
  order?: "date" | "rating" | "relevance" | "title" | "viewCount";
  publishedAfter?: string;
  publishedBefore?: string;
  videoDuration?: "any" | "long" | "medium" | "short";
  regionCode?: string;
  safeSearch?: "moderate" | "none" | "strict";
  pageToken?: string;
  filters?: {
    duration?: "any" | "long" | "medium" | "short";
    uploadDate?: "any" | "hour" | "today" | "week" | "month" | "year";
    sortBy?: "relevance" | "upload_date" | "view_count" | "rating";
  };
  enrichParts?: {
    video?: string[];
    channel?: string[];
    playlist?: string[];
  };
}

// MCP Prompt Types
export interface PromptArgument {
  name: string;
  description?: string;
  required: boolean;
  default?: any;
}

export interface PromptTemplate {
  name: string;
  description: string;
  arguments?: PromptArgument[];
}

export interface MCPPromptMessage {
  role: "user" | "assistant" | "system";
  content: {
    type: "text";
    text: string;
  };
}
