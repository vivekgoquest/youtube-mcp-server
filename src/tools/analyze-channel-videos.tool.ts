import { ToolMetadata, ToolRunner } from '../interfaces/tool.js';
import { YouTubeClient } from '../youtube-client.js';
import { ToolResponse } from '../types.js';

interface ChannelAnalysisOptions {
  channelId: string;
  maxVideos?: number;
  videoDurationFilter?: 'any' | 'short' | 'medium' | 'long';
  publishedAfter?: string;
  publishedBefore?: string;
}

interface VideoAnalysis {
  videoId: string;
  videoUrl: string;
  title: string;
  channelName: string;
  channelId: string;
  channelUrl: string;
  uploadDate: string;
  views: number;
  likes: number;
  comments: number;
  duration: number;
  durationRange: string;
  durationRangeSequence: number;
  daysSinceUpload: number;
  monthsSinceUpload: number;
  viewsPerMonth: number;
  tags: string[];
  description?: string;
}

export const metadata: ToolMetadata = {
  name: 'analyze_channel_videos',
  description: 'Analyze all videos from a channel with detailed metrics including views, engagement, duration, and performance over time.',
  inputSchema: {
    type: 'object',
    properties: {
      channelId: {
        type: 'string',
        description: 'YouTube channel ID to analyze'
      },
      maxVideos: {
        type: 'integer',
        description: 'Maximum number of videos to analyze (default: 200)',
        minimum: 1,
        maximum: 1000,
        default: 200
      },
      videoDurationFilter: {
        type: 'string',
        enum: ['any', 'short', 'medium', 'long'],
        description: 'Filter videos by duration',
        default: 'any'
      },
      publishedAfter: {
        type: 'string',
        description: 'Return videos published after this date (ISO 8601)'
      },
      publishedBefore: {
        type: 'string',
        description: 'Return videos published before this date (ISO 8601)'
      }
    },
    required: ['channelId']
  },
  quotaCost: 2
};

export default class AnalyzeChannelVideosTool implements ToolRunner<ChannelAnalysisOptions, VideoAnalysis[]> {
  constructor(private client: YouTubeClient) {}

  async run(options: ChannelAnalysisOptions): Promise<ToolResponse<VideoAnalysis[]>> {
    try {
      const startTime = Date.now();
      const maxVideos = options.maxVideos || 200;
      
      // Get channel's upload playlist
      const channelResponse = await this.client.getChannels({
        part: 'contentDetails',
        id: options.channelId
      });

      if (channelResponse.items.length === 0) {
        throw new Error(`Channel ${options.channelId} not found`);
      }

      const uploadsPlaylistId = channelResponse.items[0].contentDetails?.relatedPlaylists?.uploads;
      if (!uploadsPlaylistId) {
        throw new Error(`No uploads playlist found for channel ${options.channelId}`);
      }

      // Get all video IDs from the uploads playlist
      const videoIds = await this.getAllPlaylistVideoIds(uploadsPlaylistId, maxVideos);
      
      // Get detailed video information in batches
      const videoAnalyses: VideoAnalysis[] = [];
      const batchSize = 50; // YouTube API limit
      
      for (let i = 0; i < videoIds.length; i += batchSize) {
        const batch = videoIds.slice(i, i + batchSize);
        const videosResponse = await this.client.getVideos({
          part: 'snippet,statistics,contentDetails',
          id: batch.join(',')
        });

        for (const video of videosResponse.items) {
          const analysis = this.createVideoAnalysis(video);
          
          // Apply filters
          if (this.shouldIncludeVideo(analysis, options)) {
            videoAnalyses.push(analysis);
          }
        }
      }

      return {
        success: true,
        data: videoAnalyses,
        metadata: {
          quotaUsed: Math.ceil(videoIds.length / 50) + 1, // Batched video requests + playlist request
          requestTime: Date.now() - startTime,
          source: 'youtube-channel-analysis'
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        metadata: {
          quotaUsed: 1,
          requestTime: 0,
          source: 'youtube-channel-analysis'
        }
      };
    }
  }

  private async getAllPlaylistVideoIds(playlistId: string, maxResults: number): Promise<string[]> {
    const videoIds: string[] = [];
    let pageToken: string | undefined;

    do {
      const response = await this.client.makeRawRequest('/playlistItems', {
        part: 'contentDetails',
        playlistId,
        maxResults: Math.min(50, maxResults - videoIds.length),
        pageToken
      });

      for (const item of response.items || []) {
        if (item.contentDetails?.videoId) {
          videoIds.push(item.contentDetails.videoId);
        }
      }

      pageToken = response.nextPageToken;
    } while (pageToken && videoIds.length < maxResults);

    return videoIds;
  }

  private createVideoAnalysis(video: any): VideoAnalysis {
    const uploadDate = new Date(video.snippet?.publishedAt || '');
    const now = new Date();
    const daysSinceUpload = Math.floor((now.getTime() - uploadDate.getTime()) / (1000 * 60 * 60 * 24));
    const monthsSinceUpload = Math.max(1, Math.floor(daysSinceUpload / 30));
    
    const duration = this.parseDuration(video.contentDetails?.duration || 'PT0S');
    const views = parseInt(video.statistics?.viewCount || '0');

    return {
      videoId: video.id,
      videoUrl: `https://www.youtube.com/watch?v=${video.id}`,
      title: video.snippet?.title || '',
      channelName: video.snippet?.channelTitle || '',
      channelId: video.snippet?.channelId || '',
      channelUrl: `https://www.youtube.com/channel/${video.snippet?.channelId}`,
      uploadDate: uploadDate.toLocaleDateString(),
      views,
      likes: parseInt(video.statistics?.likeCount || '0'),
      comments: parseInt(video.statistics?.commentCount || '0'),
      duration,
      durationRange: this.getDurationRange(duration),
      durationRangeSequence: this.getDurationRangeSequence(duration),
      daysSinceUpload,
      monthsSinceUpload,
      viewsPerMonth: views / monthsSinceUpload,
      tags: video.snippet?.tags || [],
      description: video.snippet?.description
    };
  }

  private parseDuration(duration: string): number {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    
    const hours = parseInt(match[1]) || 0;
    const minutes = parseInt(match[2]) || 0;
    const seconds = parseInt(match[3]) || 0;
    
    return hours * 60 + minutes + seconds / 60;
  }

  private getDurationRange(duration: number): string {
    if (duration <= 1) return '0-1 min';
    if (duration <= 10) return '1-10 min';
    if (duration <= 30) return '10-30 min';
    return '30+ min';
  }

  private getDurationRangeSequence(duration: number): number {
    if (duration <= 1) return 0;
    if (duration <= 10) return 1;
    if (duration <= 30) return 2;
    return 3;
  }

  private shouldIncludeVideo(video: VideoAnalysis, options: ChannelAnalysisOptions): boolean {
    // Apply duration filter
    if (options.videoDurationFilter && options.videoDurationFilter !== 'any') {
      const duration = video.duration;
      switch (options.videoDurationFilter) {
        case 'short':
          if (duration > 4) return false;
          break;
        case 'medium':
          if (duration <= 4 || duration > 20) return false;
          break;
        case 'long':
          if (duration <= 20) return false;
          break;
      }
    }

    // Apply date filters
    if (options.publishedAfter) {
      const videoDate = new Date(video.uploadDate);
      const afterDate = new Date(options.publishedAfter);
      if (videoDate < afterDate) return false;
    }

    if (options.publishedBefore) {
      const videoDate = new Date(video.uploadDate);
      const beforeDate = new Date(options.publishedBefore);
      if (videoDate > beforeDate) return false;
    }

    return true;
  }
}