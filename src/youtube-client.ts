import axios, { AxiosInstance, AxiosError } from "axios";
import {
  YouTubeClientConfig,
  YouTubeApiResponse,
  Video,
  Channel,
  Playlist,
  SearchResult,
  VideoListParams,
  ChannelListParams,
  PlaylistListParams,
  SearchParams,
  YouTubeApiError,
} from "./types.js";
import { ErrorHandler } from "./utils/error-handler.js";

export class YouTubeClient {
  private axios: AxiosInstance;
  private apiKey: string;
  private baseURL: string;

  constructor(config: YouTubeClientConfig) {
    this.apiKey = config.apiKey;
    this.baseURL = config.baseURL || "https://www.googleapis.com/youtube/v3";

    this.axios = axios.create({
      baseURL: this.baseURL,
      timeout: config.timeout || 10000,
      params: {
        key: this.apiKey,
      },
    });

    // Add response interceptor for error handling
    this.axios.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.data) {
          const apiError = error.response.data as { error: YouTubeApiError };
          throw new Error(`YouTube API Error: ${apiError.error.message}`);
        }
        throw error;
      },
    );
  }

  /**
   * Search for videos, channels, or playlists
   */
  async search(
    params: SearchParams,
  ): Promise<YouTubeApiResponse<SearchResult>> {
    const response = await this.axios.get("/search", { params });
    return response.data;
  }

  /**
   * Get videos by ID or chart
   */
  async getVideos(params: VideoListParams): Promise<YouTubeApiResponse<Video>> {
    // Validate required parameters
    if (!params.id && !params.chart) {
      throw new Error("Either id or chart parameter is required");
    }

    const response = await this.axios.get("/videos", { params });
    return response.data;
  }

  /**
   * Get channels by ID or other criteria
   */
  async getChannels(
    params: ChannelListParams,
  ): Promise<YouTubeApiResponse<Channel>> {
    // Validate required parameters
    if (!params.id && !params.forUsername && !params.mine) {
      throw new Error("One of id, forUsername, or mine parameter is required");
    }

    const response = await this.axios.get("/channels", { params });
    return response.data;
  }

  /**
   * Get playlists by ID or for a channel
   */
  async getPlaylists(
    params: PlaylistListParams,
  ): Promise<YouTubeApiResponse<Playlist>> {
    // Validate required parameters
    if (!params.id && !params.channelId && !params.mine) {
      throw new Error("One of id, channelId, or mine parameter is required");
    }

    const response = await this.axios.get("/playlists", { params });
    return response.data;
  }

  /**
   * Make a raw HTTP request (for advanced use cases)
   */
  private async makeRequest(url: string): Promise<any> {
    try {
      const response = await this.axios.get(url, {
        timeout: 10000,
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.data?.error) {
        const apiError = error.response.data.error as YouTubeApiError;
        throw new Error(
          `YouTube API Error (${apiError.code}): ${apiError.message}`,
        );
      }
      ErrorHandler.handleUtilityError(error, {
        operation: "makeRequest",
        details: url,
      });
    }
  }

  /**
   * Make a raw API request to any YouTube API endpoint
   */
  async makeRawRequest(
    endpoint: string,
    params: Record<string, any> = {},
  ): Promise<any> {
    try {
      const response = await this.axios.get(endpoint, { params });
      //   itemCount: response.data?.items?.length || 0,
      //   hasNextPageToken: !!response.data?.nextPageToken
      // }); // TEMPORARILY DISABLED
      return response.data;
    } catch (error: any) {
      ErrorHandler.handleUtilityError(error, {
        operation: "makeRawRequest",
        details: endpoint,
      });
    }
  }

  /**
   * Get channel sections for featured channels discovery
   */
  async getChannelSections(params: {
    part: string;
    channelId?: string;
    id?: string;
    mine?: boolean;
  }): Promise<YouTubeApiResponse<any>> {
    const response = await this.axios.get("/channelSections", { params });
    return response.data;
  }

  /**
   * Get comment threads for videos or channels
   */
  async getCommentThreads(params: {
    part: string;
    videoId?: string;
    channelId?: string;
    allThreadsRelatedToChannelId?: string;
    maxResults?: number;
    order?: "time" | "relevance";
    pageToken?: string;
  }): Promise<YouTubeApiResponse<any>> {
    const response = await this.axios.get("/commentThreads", { params });
    return response.data;
  }

  /**
   * Get playlist items
   */
  async getPlaylistItems(params: {
    part: string;
    playlistId: string;
    maxResults?: number;
    pageToken?: string;
  }): Promise<YouTubeApiResponse<any>> {
    const response = await this.axios.get("/playlistItems", { params });
    return response.data;
  }

  /**
   * Test API connectivity
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.getVideos({
        part: "snippet",
        chart: "mostPopular",
        maxResults: 1,
        regionCode: "US",
      });
      return true;
    } catch (error) {
      // @remove-legacy legacy error path; consolidate via utils/error-handler
      return false;
    }
  }

  /**
   * Validate API key
   */
  async validateApiKey(): Promise<{ valid: boolean; error?: string }> {
    const isConnected = await this.testConnection();
    if (isConnected) {
      return { valid: true };
    } else {
      return {
        valid: false,
        error: "Invalid API key or connection failed",
      };
    }
  }
}
