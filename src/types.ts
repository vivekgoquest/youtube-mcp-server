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
export interface ChannelDetails {
  id: string;
  snippet: {
    title: string;
    description: string;
    publishedAt: string;
    country?: string;
    customUrl?: string;
  };
  statistics: {
    subscriberCount: string;
    viewCount: string;
    videoCount: string;
  };
  contentDetails?: {
    relatedPlaylists?: {
      uploads?: string;
    };
  };
}

export interface VideoDetails {
  id: string;
  snippet: {
    title: string;
    description: string;
    channelId: string;
    channelTitle: string;
    publishedAt: string;
    tags?: string[];
  };
  statistics: {
    viewCount: string;
    likeCount?: string;
    commentCount?: string;
  };
  contentDetails: {
    duration: string;
    definition: string;
  };
}

export interface CommentThread {
  id: string;
  snippet: {
    topLevelComment: {
      snippet: {
        textDisplay: string;
        authorDisplayName: string;
        authorChannelId?: {
          value: string;
        };
        publishedAt: string;
        likeCount: number;
      };
    };
    totalReplyCount: number;
  };
}

export interface PlaylistItem {
  id: string;
  snippet: {
    title: string;
    description: string;
    resourceId: {
      videoId: string;
    };
  };
  contentDetails: {
    videoId: string;
  };
}

// Export data formats
export interface ExportOptions {
  format: 'json' | 'csv';
  fields?: string[];
  filename?: string;
}

export interface AnalysisReport {
  channelId: string;
  channelName: string;
  generatedAt: string;
  videoAnalysis?: any[];
  commentAnalysis?: any[];
  networkAnalysis?: any[];
  summary?: {
    totalVideos: number;
    totalViews: number;
    averageViews: number;
    totalComments: number;
    engagementRate: number;
  };
}

// Search parameters
export interface SearchParams {
  part?: string;
  q?: string;
  channelId?: string;
  channelType?: 'any' | 'show';
  eventType?: 'completed' | 'live' | 'upcoming';
  maxResults?: number;
  order?: 'date' | 'rating' | 'relevance' | 'title' | 'videoCount' | 'viewCount';
  publishedAfter?: string;
  publishedBefore?: string;
  regionCode?: string;
  safeSearch?: 'moderate' | 'none' | 'strict';
  type?: 'channel' | 'playlist' | 'video';
  videoDuration?: 'any' | 'long' | 'medium' | 'short';
  pageToken?: string;
}

// Video list parameters
export interface VideoListParams {
  part: string;
  id?: string;
  chart?: 'mostPopular';
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
export interface ToolResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    quotaUsed: number;
    requestTime: number;
    source: string;
  };
}

// Search tool parameters
export interface SearchVideosParams {
  query?: string;
  channelId?: string;
  maxResults?: number;
  order?: 'date' | 'rating' | 'relevance' | 'title' | 'viewCount';
  publishedAfter?: string;
  publishedBefore?: string;
  videoDuration?: 'any' | 'long' | 'medium' | 'short';
  regionCode?: string;
  safeSearch?: 'moderate' | 'none' | 'strict';
  pageToken?: string;
}

export interface SearchChannelsParams {
  query?: string;
  maxResults?: number;
  order?: 'date' | 'relevance' | 'title' | 'videoCount' | 'viewCount';
  regionCode?: string;
  pageToken?: string;
}

export interface SearchPlaylistsParams {
  query?: string;
  channelId?: string;
  maxResults?: number;
  order?: 'date' | 'relevance' | 'title' | 'videoCount' | 'viewCount';
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
  sources: ('title' | 'description' | 'tags' | 'comments')[];
  relevance: number;
  confidence?: number;
  relatedTerms?: string[];
  contexts?: string[];
  weight?: number;
  searchVolume?: number;
  competition?: number;
  difficulty?: 'Low' | 'Medium' | 'High';
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
  sources?: ('title' | 'description' | 'tags' | 'comments')[];
  minWordLength?: number;
  includeNGrams?: boolean;
  nGramSize?: number;
}

export interface KeywordResearchWorkflowOptions {
  searchQuery?: string;
  channelIds?: string[];
  maxVideos?: number;
  maxChannels?: number;
  includeComments?: boolean;
  timeframe?: 'week' | 'month' | 'quarter' | 'year';
  minKeywordFrequency?: number;
  generateClusters?: boolean;
  exportFormat?: 'json' | 'csv' | 'visualization';
  analysisDepth?: 'basic' | 'detailed' | 'comprehensive';
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
    level: 'low' | 'medium' | 'high';
    topCompetitors: string[];
    gaps: string[];
  };
}

export interface KeywordTrendData {
  keyword: string;
  timeframe: string;
  dataPoints: Array<{
    date: string;
    frequency: number;
    volume: number;
  }>;
  trend: 'rising' | 'falling' | 'stable';
  trendScore: number;
}

export interface ContentOpportunity {
  keyword: string;
  opportunityScore: number;
  difficulty: 'easy' | 'medium' | 'hard';
  searchVolume: number;
  competition: number;
  suggestedContentTypes: string[];
  reasoning: string[];
}
