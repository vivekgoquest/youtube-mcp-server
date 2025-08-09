import axios from "axios";
import type { AxiosInstance, AxiosError } from "axios";
import type {
  YouTubeClientConfig,
  YouTubeApiResponse,
  Video,
  Channel,
  Playlist,
  SearchResult,
  Comment,
  Activity,
  VideoListParams,
  ChannelListParams,
  PlaylistListParams,
  SearchParams,
  ChannelsByCategoryParams,
  CommentListParams,
  ActivityListParams,
  GetAllVideosOfChannelParams,
  YouTubeApiError,
  ChannelSectionsParams,
  CommentThreadsParams,
  PlaylistItemsParams,
  VideoFilter,
  VideoSortBy,
} from "./types.js";

/**
 * Custom error class for YouTube API validation errors
 * Provides structured error information with parameter context
 */
export class YouTubeValidationError extends Error {
  public readonly params?: Record<string, any>;
  
  constructor(message: string, params?: Record<string, any>) {
    super(`Validation Error: ${message}`);
    this.name = 'YouTubeValidationError';
    this.params = params;
    
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, YouTubeValidationError);
    }
  }
}

/**
 * YouTube API client for interacting with YouTube Data API v3
 * Provides methods for searching, fetching videos, channels, playlists, and more
 * @class YouTubeClient
 */
export class YouTubeClient {
  private axios: AxiosInstance;
  private apiKey: string;
  private baseURL: string;

  /**
   * Creates an instance of YouTubeClient
   * @param {YouTubeClientConfig} config - Configuration for the YouTube client
   * @param {string} config.apiKey - YouTube Data API key
   * @param {string} [config.baseURL] - Base URL for API requests (defaults to YouTube API v3)
   * @param {number} [config.timeout] - Request timeout in milliseconds (defaults to 10000)
   * @throws {Error} Throws error if configuration is invalid
   */
  constructor(config: YouTubeClientConfig) {
    // Validate configuration
    if (!config) {
      throw new Error('Configuration object is required');
    }
    if (!config.apiKey) {
      throw new Error('API key is required in configuration');
    }
    if (typeof config.apiKey !== 'string') {
      throw new Error('API key must be a string');
    }
    if (config.baseURL && typeof config.baseURL !== 'string') {
      throw new Error('Base URL must be a string');
    }
    if (config.timeout && (typeof config.timeout !== 'number' || config.timeout <= 0)) {
      throw new Error('Timeout must be a positive number');
    }
    
    this.apiKey = config.apiKey;
    this.baseURL = config.baseURL || "https://www.googleapis.com/youtube/v3";

    this.axios = axios.create({
      baseURL: this.baseURL,
      timeout: config.timeout || 10000,
      params: {
        key: this.apiKey,
      },
    });

    this._setupInterceptors();
  }

  // ============================================================================
  // CORE API METHODS - YouTube Data API v3 endpoints
  // ============================================================================

  /**
   * Search for videos, channels, or playlists on YouTube
   * @param {SearchParams} params - Search parameters
   * @param {string} params.part - Comma-separated list of resource parts
   * @param {string} [params.q] - Search query term
   * @param {string} [params.type] - Resource type to search for (video, channel, playlist)
   * @param {number} [params.maxResults] - Maximum number of results to return (1-50)
   * @returns {Promise<YouTubeApiResponse<SearchResult>>} Search results
   * @throws {Error} Throws error if API request fails or parameters are invalid
   */
  async search(
    params: SearchParams,
  ): Promise<YouTubeApiResponse<SearchResult>> {
    // Validate required parameters
    if (!params.part) {
      throw this._createValidationError('part parameter is required', params);
    }
    this._validateStringParam(params.part, 'part');
    
    // Validate optional parameters
    this._validateStringParam(params.q, 'q');
    this._validateStringParam(params.type, 'type');
    this._validateNumberParam(params.maxResults, 'maxResults', 1, 50);
    
    // Validate enum values
    if (params.type && !['video', 'channel', 'playlist'].includes(params.type)) {
      throw this._createValidationError(
        'type must be one of: video, channel, playlist',
        { type: params.type }
      );
    }
    
    try {
      return await this._request<YouTubeApiResponse<SearchResult>>("/search", params);
    } catch (error) {
      throw this._handleApiError(error, 'search', params);
    }
  }

  /**
   * Get videos by ID or chart (e.g., most popular)
   * @param {VideoListParams} params - Video list parameters
   * @param {string} params.part - Comma-separated list of resource parts
   * @param {string} [params.id] - Comma-separated list of video IDs
   * @param {string} [params.chart] - Chart name (e.g., 'mostPopular')
   * @param {number} [params.maxResults] - Maximum number of results to return (1-50)
   * @returns {Promise<YouTubeApiResponse<Video>>} Video data
   * @throws {Error} Throws error if neither id nor chart is provided
   */
  async getVideos(params: VideoListParams): Promise<YouTubeApiResponse<Video>> {
    // Validate required parameters
    if (!params.part) {
      throw this._createValidationError('part parameter is required', params);
    }
    this._validateStringParam(params.part, 'part');
    
    // Validate at least one identifier is provided
    this._validateRequiredParams(
      params,
      ['id', 'chart'],
      'Either id or chart parameter is required for getVideos'
    );
    
    // Validate optional parameters
    this._validateStringParam(params.id, 'id');
    this._validateStringParam(params.chart, 'chart');
    this._validateNumberParam(params.maxResults, 'maxResults', 1, 50);
    
    // Validate enum values
    if (params.chart && params.chart !== 'mostPopular') {
      throw this._createValidationError(
        'chart must be "mostPopular"',
        { chart: params.chart }
      );
    }
    
    try {
      return await this._request<YouTubeApiResponse<Video>>("/videos", params);
    } catch (error) {
      throw this._handleApiError(error, 'getVideos', params);
    }
  }

  /**
   * Get channels by ID, username, or authenticated user's channel
   * @param {ChannelListParams} params - Channel list parameters
   * @param {string} params.part - Comma-separated list of resource parts
   * @param {string} [params.id] - Comma-separated list of channel IDs
   * @param {string} [params.forUsername] - YouTube username
   * @param {boolean} [params.mine] - Return authenticated user's channel
   * @param {number} [params.maxResults] - Maximum number of results to return (1-50)
   * @returns {Promise<YouTubeApiResponse<Channel>>} Channel data
   * @throws {Error} Throws error if no identification parameter is provided
   */
  async getChannels(
    params: ChannelListParams,
  ): Promise<YouTubeApiResponse<Channel>> {
    // Validate required parameters
    if (!params.part) {
      throw this._createValidationError('part parameter is required', params);
    }
    this._validateStringParam(params.part, 'part');
    
    // Validate at least one identifier is provided
    this._validateRequiredParams(
      params,
      ['id', 'forUsername', 'mine'],
      'One of id, forUsername, or mine parameter is required for getChannels'
    );
    
    // Validate optional parameters
    this._validateStringParam(params.id, 'id');
    this._validateStringParam(params.forUsername, 'forUsername');
    if (params.mine !== undefined && typeof params.mine !== 'boolean') {
      throw this._createValidationError('mine must be a boolean', { mine: params.mine });
    }
    this._validateNumberParam(params.maxResults, 'maxResults', 1, 50);
    
    try {
      return await this._request<YouTubeApiResponse<Channel>>("/channels", params);
    } catch (error) {
      throw this._handleApiError(error, 'getChannels', params);
    }
  }

  /**
   * Get playlists by ID, channel ID, or authenticated user's playlists
   * @param {PlaylistListParams} params - Playlist list parameters
   * @param {string} params.part - Comma-separated list of resource parts
   * @param {string} [params.id] - Comma-separated list of playlist IDs
   * @param {string} [params.channelId] - Channel ID to retrieve playlists for
   * @param {boolean} [params.mine] - Return authenticated user's playlists
   * @param {number} [params.maxResults] - Maximum number of results to return (1-50)
   * @returns {Promise<YouTubeApiResponse<Playlist>>} Playlist data
   * @throws {Error} Throws error if no identification parameter is provided
   */
  async getPlaylists(
    params: PlaylistListParams,
  ): Promise<YouTubeApiResponse<Playlist>> {
    // Validate required parameters
    if (!params.part) {
      throw this._createValidationError('part parameter is required', params);
    }
    this._validateStringParam(params.part, 'part');
    
    // Validate at least one identifier is provided
    this._validateRequiredParams(
      params,
      ['id', 'channelId', 'mine'],
      'One of id, channelId, or mine parameter is required for getPlaylists'
    );
    
    // Validate optional parameters
    this._validateStringParam(params.id, 'id');
    this._validateStringParam(params.channelId, 'channelId');
    if (params.mine !== undefined && typeof params.mine !== 'boolean') {
      throw this._createValidationError('mine must be a boolean', { mine: params.mine });
    }
    this._validateNumberParam(params.maxResults, 'maxResults', 1, 50);
    
    try {
      return await this._request<YouTubeApiResponse<Playlist>>("/playlists", params);
    } catch (error) {
      throw this._handleApiError(error, 'getPlaylists', params);
    }
  }

  /**
   * Get channel sections for discovering featured channels and content
   * @param {ChannelSectionsParams} params - Channel sections parameters
   * @param {string} params.part - Comma-separated list of resource parts
   * @param {string} [params.channelId] - Channel ID to retrieve sections for
   * @param {string} [params.id] - Comma-separated list of section IDs
   * @returns {Promise<YouTubeApiResponse<any>>} Channel sections data
   * @throws {Error} Throws error if API request fails or parameters are invalid
   */
  async getChannelSections(params: ChannelSectionsParams): Promise<YouTubeApiResponse<any>> {
    // Validate required parameters
    if (!params.part) {
      throw this._createValidationError('part parameter is required', params);
    }
    this._validateStringParam(params.part, 'part');
    
    // Validate optional parameters
    this._validateStringParam(params.channelId, 'channelId');
    this._validateStringParam(params.id, 'id');
    
    try {
      return await this._request<YouTubeApiResponse<any>>("/channelSections", params);
    } catch (error) {
      throw this._handleApiError(error, 'getChannelSections', params);
    }
  }

  /**
   * Get comment threads for videos or channels
   * @param {CommentThreadsParams} params - Comment threads parameters
   * @param {string} params.part - Comma-separated list of resource parts
   * @param {string} [params.videoId] - Video ID to retrieve comments for
   * @param {string} [params.channelId] - Channel ID to retrieve comments for
   * @param {number} [params.maxResults] - Maximum number of results to return (1-100)
   * @returns {Promise<YouTubeApiResponse<any>>} Comment threads data
   * @throws {Error} Throws error if API request fails or parameters are invalid
   */
  async getCommentThreads(params: CommentThreadsParams): Promise<YouTubeApiResponse<any>> {
    // Validate required parameters
    if (!params.part) {
      throw this._createValidationError('part parameter is required', params);
    }
    this._validateStringParam(params.part, 'part');
    
    // Validate optional parameters
    this._validateStringParam(params.videoId, 'videoId');
    this._validateStringParam(params.channelId, 'channelId');
    this._validateNumberParam(params.maxResults, 'maxResults', 1, 100);
    
    try {
      return await this._request<YouTubeApiResponse<any>>("/commentThreads", params);
    } catch (error) {
      throw this._handleApiError(error, 'getCommentThreads', params);
    }
  }

  /**
   * Get items from a playlist
   * @param {PlaylistItemsParams} params - Playlist items parameters
   * @param {string} params.part - Comma-separated list of resource parts
   * @param {string} params.playlistId - Playlist ID to retrieve items from
   * @param {number} [params.maxResults] - Maximum number of results to return (1-50)
   * @returns {Promise<YouTubeApiResponse<any>>} Playlist items data
   * @throws {Error} Throws error if API request fails or parameters are invalid
   */
  async getPlaylistItems(params: PlaylistItemsParams): Promise<YouTubeApiResponse<any>> {
    // Validate required parameters
    if (!params.part) {
      throw this._createValidationError('part parameter is required', params);
    }
    if (!params.playlistId) {
      throw this._createValidationError('playlistId parameter is required', params);
    }
    this._validateStringParam(params.part, 'part');
    this._validateStringParam(params.playlistId, 'playlistId');
    
    // Validate optional parameters
    this._validateNumberParam(params.maxResults, 'maxResults', 1, 50);
    
    try {
      return await this._request<YouTubeApiResponse<any>>("/playlistItems", params);
    } catch (error) {
      throw this._handleApiError(error, 'getPlaylistItems', params);
    }
  }

  /**
   * Get channels by category
   * @param {ChannelsByCategoryParams} params - Channels by category parameters
   * @param {string} params.part - Comma-separated list of resource parts
   * @param {string} params.categoryId - Guide category ID
   * @param {number} [params.maxResults] - Maximum number of results to return (1-50)
   * @returns {Promise<YouTubeApiResponse<Channel>>} Channels in the category
   * @throws {Error} Throws error if API request fails or parameters are invalid
   */
  async getChannelsByCategory(
    params: ChannelsByCategoryParams,
  ): Promise<YouTubeApiResponse<Channel>> {
    // Validate required parameters
    if (!params.part) {
      throw this._createValidationError('part parameter is required', params);
    }
    if (!params.categoryId) {
      throw this._createValidationError('categoryId parameter is required', params);
    }
    this._validateStringParam(params.part, 'part');
    this._validateStringParam(params.categoryId, 'categoryId');
    
    // Validate optional parameters
    this._validateNumberParam(params.maxResults, 'maxResults', 1, 50);
    
    try {
      return await this._request<YouTubeApiResponse<Channel>>("/channels", params);
    } catch (error) {
      throw this._handleApiError(error, 'getChannelsByCategory', params);
    }
  }

  /**
   * Get comments (replies to a parent comment)
   * @param {CommentListParams} params - Comment list parameters
   * @param {string} params.part - Comma-separated list of resource parts
   * @param {string} params.parentId - Parent comment ID
   * @param {number} [params.maxResults] - Maximum number of results to return (1-100)
   * @returns {Promise<YouTubeApiResponse<Comment>>} Comments data
   * @throws {Error} Throws error if API request fails or parameters are invalid
   */
  async getComments(
    params: CommentListParams,
  ): Promise<YouTubeApiResponse<Comment>> {
    // Validate required parameters
    if (!params.part) {
      throw this._createValidationError('part parameter is required', params);
    }
    if (!params.parentId) {
      throw this._createValidationError('parentId parameter is required', params);
    }
    this._validateStringParam(params.part, 'part');
    this._validateStringParam(params.parentId, 'parentId');
    
    // Validate optional parameters
    this._validateNumberParam(params.maxResults, 'maxResults', 1, 100);
    
    try {
      return await this._request<YouTubeApiResponse<Comment>>("/comments", params);
    } catch (error) {
      throw this._handleApiError(error, 'getComments', params);
    }
  }

  /**
   * Get activities for a channel
   * @param {ActivityListParams} params - Activity list parameters
   * @param {string} params.part - Comma-separated list of resource parts
   * @param {string} params.channelId - Channel ID to retrieve activities for
   * @param {number} [params.maxResults] - Maximum number of results to return (1-50)
   * @returns {Promise<YouTubeApiResponse<Activity>>} Activities data
   * @throws {Error} Throws error if API request fails or parameters are invalid
   */
  async getActivities(
    params: ActivityListParams,
  ): Promise<YouTubeApiResponse<Activity>> {
    // Validate required parameters
    if (!params.part) {
      throw this._createValidationError('part parameter is required', params);
    }
    if (!params.channelId) {
      throw this._createValidationError('channelId parameter is required', params);
    }
    this._validateStringParam(params.part, 'part');
    this._validateStringParam(params.channelId, 'channelId');
    
    // Validate optional parameters
    this._validateNumberParam(params.maxResults, 'maxResults', 1, 50);
    
    try {
      return await this._request<YouTubeApiResponse<Activity>>("/activities", params);
    } catch (error) {
      throw this._handleApiError(error, 'getActivities', params);
    }
  }

  // ============================================================================
  // UTILITY AND HELPER METHODS - High-level operations and utilities
  // ============================================================================

  /**
   * Make a raw API request to any YouTube API endpoint
   * Useful for accessing endpoints not covered by specific methods
   * @param {string} endpoint - API endpoint path (e.g., '/videos', '/search')
   * @param {Record<string, any>} [params={}] - Query parameters for the request
   * @returns {Promise<any>} Raw API response data
   * @throws {Error} Throws error if API request fails or parameters are invalid
   */
  async makeRawRequest(
    endpoint: string,
    params: Record<string, any> = {},
  ): Promise<any> {
    // Validate required parameters
    if (!endpoint) {
      throw this._createValidationError('endpoint parameter is required');
    }
    this._validateStringParam(endpoint, 'endpoint');
    
    // Validate endpoint format
    if (!endpoint.startsWith('/')) {
      throw this._createValidationError(
        'endpoint must start with "/"',
        { endpoint }
      );
    }
    
    // Validate params is an object
    if (params && typeof params !== 'object') {
      throw this._createValidationError(
        'params must be an object',
        { params }
      );
    }
    
    try {
      const response = await this.axios.get(endpoint, { params });
      return response.data;
    } catch (error) {
      throw this._handleApiError(error, 'makeRawRequest', { endpoint, ...params });
    }
  }

  // ============================================================================
  // COMPLEX WORKFLOW METHODS - Multi-step operations with advanced features
  // ============================================================================

  /**
   * Get ALL items from a playlist with automatic pagination
   * Fetches all videos/items in a playlist, handling YouTube's pagination automatically
   * @param {string} playlistId - YouTube playlist ID
   * @param {string} [part] - Comma-separated list of resource parts (defaults to 'snippet')
   * @param {number} [maxResults] - Maximum total number of items to return (fetches all if not specified)
   * @returns {Promise<YouTubeApiResponse<any>>} All items from the playlist
   * @throws {Error} Throws error if playlist not found or parameters are invalid
   */
  async getAllPlaylistItems(
    playlistId: string,
    part: string = "snippet",
    maxResults?: number
  ): Promise<YouTubeApiResponse<any>> {
    // Validate required parameters
    if (!playlistId) {
      throw this._createValidationError('playlistId is required');
    }
    this._validateStringParam(playlistId, 'playlistId');
    this._validateStringParam(part, 'part');
    this._validateNumberParam(maxResults, 'maxResults', 1);

    try {
      // Fetch all items using pagination with max 50 items per page (API limit)
      const allItems = await this._fetchAllPages(
        (pageToken) => this.getPlaylistItems({
          part,
          playlistId,
          maxResults: 50, // Always use maximum per page for efficiency
          ...(pageToken && { pageToken }),
        }),
        maxResults // Total items limit (optional)
      );

      // Return in YouTube API response format
      return {
        kind: "youtube#playlistItemListResponse",
        etag: "",
        items: allItems,
        pageInfo: {
          totalResults: allItems.length,
          resultsPerPage: allItems.length,
        },
      };
    } catch (error) {
      throw this._handleApiError(error, 'getAllPlaylistItems', { playlistId, part, maxResults });
    }
  }

  /**
   * Get all videos from a channel with optional filtering and sorting
   * Fetches videos from the channel's uploads playlist with pagination support
   * @param {GetAllVideosOfChannelParams} params - Parameters for fetching channel videos
   * @param {string} params.channelId - YouTube channel ID
   * @param {string} [params.part] - Comma-separated list of resource parts (defaults to 'snippet')
   * @param {number} [params.maxResults] - Maximum number of videos to return
   * @param {VideoFilter} [params.filterBy] - Filtering criteria for videos
   * @param {VideoSortBy} [params.sortBy] - Sorting criteria for videos
   * @returns {Promise<YouTubeApiResponse<any>>} All videos from the channel
   * @throws {Error} Throws error if channel not found, has no uploads, or parameters are invalid
   */
  async getAllVideosOfAChannel(
    params: GetAllVideosOfChannelParams,
  ): Promise<YouTubeApiResponse<any>> {
    // Validate required parameters
    if (!params.channelId) {
      throw this._createValidationError('channelId parameter is required', params);
    }
    this._validateStringParam(params.channelId, 'channelId');
    
    // Validate optional parameters
    this._validateStringParam(params.part, 'part');
    this._validateNumberParam(params.maxTotalVideos, 'maxTotalVideos', 1);
    
    try {
      // Get the channel's uploads playlist ID
      const uploadsPlaylistId = await this._fetchChannelUploadsPlaylistId(params.channelId);

      // Fetch all videos using pagination helper
      const part = params.part || "snippet";
      const maxVideosPerPage = Math.min(params.maxTotalVideos || 50, 50);
      
      const allVideos = await this._fetchAllPages(
        (pageToken) => this.getPlaylistItems({
          part,
          playlistId: uploadsPlaylistId,
          maxResults: maxVideosPerPage,
          ...(pageToken && { pageToken }),
        }),
        params.maxTotalVideos
      );

      // Apply filtering and sorting
      const filteredVideos = this._filterVideos(allVideos, params.filterBy);
      const sortedVideos = this._sortVideos(filteredVideos, params.sortBy);

      // Return in YouTube API response format
      return {
        kind: "youtube#playlistItemListResponse",
        etag: "",
        items: sortedVideos,
        pageInfo: {
          totalResults: sortedVideos.length,
          resultsPerPage: sortedVideos.length,
        },
      };
    } catch (error) {
      throw this._handleApiError(error, 'getAllVideosOfAChannel', params);
    }
  }

  // ============================================================================
  // VALIDATION AND CONNECTION METHODS - API health checks and validation
  // ============================================================================

  /**
   * Verify API connectivity by making a test request
   * @returns {Promise<boolean>} True if connection is successful, false otherwise
   */
  async verifyConnection(): Promise<boolean> {
    try {
      await this.getVideos({
        part: "snippet",
        chart: "mostPopular",
        maxResults: 1,
        regionCode: "US",
      });
      return true;
    } catch (error) {
      // Log error for debugging but don't throw
      console.debug('Connection verification failed:', error);
      return false;
    }
  }

  /**
   * Validate the configured API key
   * @returns {Promise<{valid: boolean; error?: string}>} Validation result with optional error message
   */
  async validateApiKey(): Promise<{ valid: boolean; error?: string }> {
    try {
      const isConnected = await this.verifyConnection();
      if (isConnected) {
        return { valid: true };
      } else {
        return {
          valid: false,
          error: "Invalid API key or connection failed",
        };
      }
    } catch (error: any) {
      return {
        valid: false,
        error: error.message || "Failed to validate API key",
      };
    }
  }

  // ============================================================================
  // PRIVATE UTILITY METHODS - Internal helper functions
  // ============================================================================

  /**
   * Set up axios interceptors for error handling
   */
  private _setupInterceptors(): void {
    this.axios.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.data) {
          const apiError = error.response.data as { error: YouTubeApiError };
          throw this._createApiError(apiError.error);
        }
        throw this._createNetworkError(error);
      },
    );
  }

  /**
   * Generic request method for all API calls
   */
  private async _request<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const response = await this.axios.get(endpoint, { params });
    return response.data;
  }

  // ============================================================================
  // PRIVATE ERROR HANDLING METHODS - Error creation and formatting
  // ============================================================================

  /**
   * Create a standardized API error
   */
  private _createApiError(error: YouTubeApiError): Error {
    const baseMessage = `YouTube API Error (${error.code}): ${error.message}`;
    if (error.errors && error.errors.length > 0) {
      const details = error.errors
        .map(e => `${e.reason}: ${e.message}`)
        .join('; ');
      return new Error(`${baseMessage} - ${details}`);
    }
    return new Error(baseMessage);
  }

  /**
   * Create a standardized network error
   */
  private _createNetworkError(error: AxiosError): Error {
    if (error.code === 'ECONNABORTED') {
      return new Error(`Request timeout: ${error.message}`);
    }
    if (error.code === 'ENOTFOUND') {
      return new Error(`Network error: Unable to reach YouTube API`);
    }
    return new Error(`Network error: ${error.message}`);
  }

  /**
   * Create a validation error with consistent formatting
   */
  private _createValidationError(message: string, params?: Record<string, any>): YouTubeValidationError {
    return new YouTubeValidationError(message, params);
  }

  /**
   * Handle API errors with consistent formatting and context
   */
  private _handleApiError(error: any, operation: string, params?: Record<string, any>): Error {
    if (error.message && error.message.includes('YouTube API Error')) {
      // Already formatted API error from interceptor
      return error;
    }
    
    const contextInfo = params ? ` (params: ${JSON.stringify(params)})` : '';
    const baseMessage = `Error in ${operation}${contextInfo}: `;
    
    if (error.response?.data?.error) {
      // YouTube API error
      const apiError = error.response.data.error;
      return this._createApiError(apiError);
    } else if (error.code === 'ECONNABORTED') {
      return new Error(`${baseMessage}Request timeout`);
    } else if (error.code === 'ENOTFOUND') {
      return new Error(`${baseMessage}Unable to reach YouTube API`);
    } else {
      return new Error(`${baseMessage}${error.message || 'Unknown error'}`);
    }
  }

  // ============================================================================
  // PRIVATE VALIDATION METHODS - Parameter validation utilities
  // ============================================================================

  /**
   * Validate that at least one of the required parameters is present
   */
  private _validateRequiredParams(
    params: Record<string, any>,
    requiredFields: string[],
    errorMessage?: string
  ): void {
    const hasRequiredParam = requiredFields.some(field => params[field] !== undefined);
    if (!hasRequiredParam) {
      const message = errorMessage || 
        `At least one of the following parameters is required: ${requiredFields.join(', ')}`;
      throw this._createValidationError(message, params);
    }
  }

  /**
   * Validate string parameter format
   */
  private _validateStringParam(value: any, paramName: string, pattern?: RegExp): void {
    if (value !== undefined && typeof value !== 'string') {
      throw this._createValidationError(`${paramName} must be a string`, { [paramName]: value });
    }
    if (pattern && value && !pattern.test(value)) {
      throw this._createValidationError(
        `${paramName} has invalid format`,
        { [paramName]: value, pattern: pattern.toString() }
      );
    }
  }

  /**
   * Validate numeric parameter
   */
  private _validateNumberParam(
    value: any, 
    paramName: string, 
    min?: number, 
    max?: number
  ): void {
    if (value === undefined) return;
    
    const numValue = Number(value);
    if (isNaN(numValue)) {
      throw this._createValidationError(`${paramName} must be a number`, { [paramName]: value });
    }
    if (min !== undefined && numValue < min) {
      throw this._createValidationError(
        `${paramName} must be at least ${min}`,
        { [paramName]: value, min }
      );
    }
    if (max !== undefined && numValue > max) {
      throw this._createValidationError(
        `${paramName} must be at most ${max}`,
        { [paramName]: value, max }
      );
    }
  }

  // ============================================================================
  // PRIVATE DATA PROCESSING METHODS - Data transformation and filtering
  // ============================================================================

  /**
   * Filter videos based on criteria
   */
  private _filterVideos(videos: any[], filterBy?: VideoFilter): any[] {
    if (!filterBy) return videos;

    let filtered = [...videos];
    const { titleContains, publishedAfter, publishedBefore } = filterBy;

    if (titleContains) {
      const searchTerm = titleContains.toLowerCase();
      filtered = filtered.filter(video =>
        video.snippet?.title?.toLowerCase().includes(searchTerm)
      );
    }

    if (publishedAfter) {
      const afterDate = new Date(publishedAfter);
      filtered = filtered.filter(video => {
        const videoDate = new Date(video.snippet?.publishedAt);
        return !isNaN(videoDate.getTime()) && videoDate > afterDate;
      });
    }

    if (publishedBefore) {
      const beforeDate = new Date(publishedBefore);
      filtered = filtered.filter(video => {
        const videoDate = new Date(video.snippet?.publishedAt);
        return !isNaN(videoDate.getTime()) && videoDate < beforeDate;
      });
    }

    return filtered;
  }

  /**
   * Sort videos based on criteria
   */
  private _sortVideos(videos: any[], sortBy?: VideoSortBy): any[] {
    if (!sortBy) return videos;

    return [...videos].sort((a, b) => {
      switch (sortBy) {
        case "date_asc":
          return new Date(a.snippet?.publishedAt).getTime() - 
                 new Date(b.snippet?.publishedAt).getTime();
        case "date_desc":
          return new Date(b.snippet?.publishedAt).getTime() - 
                 new Date(a.snippet?.publishedAt).getTime();
        case "title_asc":
          return (a.snippet?.title || "").localeCompare(b.snippet?.title || "");
        case "title_desc":
          return (b.snippet?.title || "").localeCompare(a.snippet?.title || "");
        default:
          return 0;
      }
    });
  }

  // ============================================================================
  // PRIVATE PAGINATION METHODS - Handling paginated API responses
  // ============================================================================

  /**
   * Generic pagination helper for fetching all items from paginated endpoints
   */
  private async _fetchAllPages<T>(
    fetchPage: (pageToken?: string) => Promise<YouTubeApiResponse<T>>,
    maxResults?: number
  ): Promise<T[]> {
    const allItems: T[] = [];
    let nextPageToken: string | undefined;
    let totalFetched = 0;

    do {
      try {
        const response = await fetchPage(nextPageToken);
        const itemsToAdd = maxResults 
          ? response.items.slice(0, maxResults - totalFetched)
          : response.items;
        
        allItems.push(...itemsToAdd);
        totalFetched += itemsToAdd.length;
        nextPageToken = response.nextPageToken;

        // Stop if we've reached the requested maximum
        if (maxResults && totalFetched >= maxResults) {
          break;
        }
      } catch (error) {
        // If we have some items, return what we got
        if (allItems.length > 0) {
          console.warn('Pagination stopped due to error:', error);
          break;
        }
        throw error;
      }
    } while (nextPageToken);

    return allItems;
  }

  // ============================================================================
  // PRIVATE CHANNEL HELPER METHODS - Channel-specific utilities
  // ============================================================================

  /**
   * Convert channel ID to uploads playlist ID
   * YouTube channels use UC prefix, while uploads playlists use UU prefix
   */
  private async _fetchChannelUploadsPlaylistId(channelId: string): Promise<string> {
    if (!channelId) {
      throw this._createValidationError('channelId is required');
    }
    this._validateStringParam(channelId, 'channelId');

    // Convert UC (channel) to UU (uploads playlist) prefix
    if (channelId.startsWith('UC') && channelId.length === 24) {
      return 'UU' + channelId.substring(2);
    }
    
    throw this._createValidationError(
      `Invalid channel ID format. Expected format starting with 'UC': ${channelId}`,
      { channelId }
    );
  }
}
