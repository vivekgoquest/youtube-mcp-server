import { ToolMetadata, ToolRunner } from '../interfaces/tool.js';
import { YouTubeClient } from '../youtube-client.js';
import { ToolResponse } from '../types.js';

interface CompetitorAnalysisOptions {
  channelId: string;
  maxVideos?: number;
  analyzeComments?: boolean;
  timeframe?: 'week' | 'month' | 'quarter' | 'year';
}

interface CompetitorAnalysis {
  channelId: string;
  channelName: string;
  subscriberCount: number;
  videoCount: number;
  averageViews: number;
  uploadFrequency: string;
  topPerformingVideos: any[];
  contentThemes: string[];
  uploadPattern: {
    daysOfWeek: Record<string, number>;
    timesOfDay: Record<string, number>;
  };
  engagementMetrics: {
    averageLikes: number;
    averageComments: number;
    engagementRate: number;
  };
}

export const metadata: ToolMetadata = {
  name: 'analyze_competitor',
  description: 'Perform deep competitor analysis including upload patterns, content themes, and performance metrics.',
  inputSchema: {
    type: 'object',
    properties: {
      channelId: {
        type: 'string',
        description: 'Competitor channel ID to analyze'
      },
      maxVideos: {
        type: 'integer',
        description: 'Maximum number of videos to analyze (default: 100)',
        minimum: 1,
        maximum: 500,
        default: 100
      },
      analyzeComments: {
        type: 'boolean',
        description: 'Include comment analysis (default: false)',
        default: false
      },
      timeframe: {
        type: 'string',
        enum: ['week', 'month', 'quarter', 'year'],
        description: 'Timeframe for analysis',
        default: 'month'
      }
    },
    required: ['channelId']
  },
  quotaCost: 2
};

export default class AnalyzeCompetitorTool implements ToolRunner<CompetitorAnalysisOptions, CompetitorAnalysis> {
  constructor(private client: YouTubeClient) {}

  async run(options: CompetitorAnalysisOptions): Promise<ToolResponse<CompetitorAnalysis>> {
    const startTime = Date.now();
    
    try {
      const maxVideos = options.maxVideos || 100;
      
      // Get channel details
      const channelResponse = await this.client.getChannels({
        part: 'snippet,statistics,contentDetails',
        id: options.channelId
      });

      if (channelResponse.items.length === 0) {
        throw new Error(`Channel ${options.channelId} not found`);
      }

      const channel = channelResponse.items[0];
      const uploadsPlaylistId = channel.contentDetails?.relatedPlaylists?.uploads;
      
      if (!uploadsPlaylistId) {
        throw new Error('No uploads playlist found');
      }

      // Get recent videos
      const videoIds = await this.getAllPlaylistVideoIds(uploadsPlaylistId, maxVideos);
      const videos = await this.getVideosInBatches(videoIds);
      
      // Analyze upload patterns
      const uploadPattern = this.analyzeUploadPattern(videos);
      
      // Calculate metrics
      const totalViews = videos.reduce((sum, v) => sum + parseInt(v.statistics?.viewCount || '0'), 0);
      const totalLikes = videos.reduce((sum, v) => sum + parseInt(v.statistics?.likeCount || '0'), 0);
      const totalComments = videos.reduce((sum, v) => sum + parseInt(v.statistics?.commentCount || '0'), 0);
      
      const averageViews = totalViews / videos.length;
      const averageLikes = totalLikes / videos.length;
      const averageComments = totalComments / videos.length;
      const engagementRate = (totalLikes + totalComments) / totalViews;
      
      // Get top performing videos
      const topPerformingVideos = videos
        .sort((a, b) => parseInt(b.statistics?.viewCount || '0') - parseInt(a.statistics?.viewCount || '0'))
        .slice(0, 10)
        .map(v => ({
          videoId: v.id,
          title: v.snippet?.title,
          views: parseInt(v.statistics?.viewCount || '0'),
          publishedAt: v.snippet?.publishedAt
        }));

      // Extract content themes from titles and tags
      const contentThemes = this.extractContentThemes(videos);
      
      // Calculate upload frequency
      const uploadFrequency = this.calculateUploadFrequency(videos);

      const analysis: CompetitorAnalysis = {
        channelId: options.channelId,
        channelName: channel.snippet?.title || '',
        subscriberCount: parseInt(channel.statistics?.subscriberCount || '0'),
        videoCount: parseInt(channel.statistics?.videoCount || '0'),
        averageViews,
        uploadFrequency,
        topPerformingVideos,
        contentThemes,
        uploadPattern,
        engagementMetrics: {
          averageLikes,
          averageComments,
          engagementRate
        }
      };

      return {
        success: true,
        data: analysis,
        metadata: {
          quotaUsed: Math.ceil(videoIds.length / 50) + 1,
          requestTime: Date.now() - startTime,
          source: 'youtube-competitor-analysis'
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        metadata: {
          quotaUsed: 1,
          requestTime: Date.now() - startTime,
          source: 'youtube-competitor-analysis'
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

  private async getVideosInBatches(videoIds: string[]): Promise<any[]> {
    const videos: any[] = [];
    const batchSize = 50;
    
    for (let i = 0; i < videoIds.length; i += batchSize) {
      const batch = videoIds.slice(i, i + batchSize);
      const response = await this.client.getVideos({
        part: 'snippet,statistics,contentDetails',
        id: batch.join(',')
      });
      videos.push(...response.items);
    }
    
    return videos;
  }

  private analyzeUploadPattern(videos: any[]): { daysOfWeek: Record<string, number>; timesOfDay: Record<string, number> } {
    const daysOfWeek: Record<string, number> = {};
    const timesOfDay: Record<string, number> = {};
    
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    for (const video of videos) {
      const publishedAt = new Date(video.snippet?.publishedAt || '');
      const dayName = dayNames[publishedAt.getDay()];
      const hour = publishedAt.getHours();
      
      daysOfWeek[dayName] = (daysOfWeek[dayName] || 0) + 1;
      timesOfDay[`${hour}:00`] = (timesOfDay[`${hour}:00`] || 0) + 1;
    }
    
    return { daysOfWeek, timesOfDay };
  }

  private extractContentThemes(videos: any[]): string[] {
    const themes = new Map<string, number>();
    
    for (const video of videos) {
      const title = video.snippet?.title?.toLowerCase() || '';
      const tags = video.snippet?.tags || [];
      
      // Extract themes from tags
      for (const tag of tags) {
        const normalizedTag = tag.toLowerCase().trim();
        if (normalizedTag.length > 2) {
          themes.set(normalizedTag, (themes.get(normalizedTag) || 0) + 1);
        }
      }
      
      // Extract themes from common words in titles
      const words = title.split(/\s+/).filter((word: string) => word.length > 3);
      for (const word of words) {
        themes.set(word, (themes.get(word) || 0) + 1);
      }
    }
    
    return Array.from(themes.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([theme]) => theme);
  }

  private calculateUploadFrequency(videos: any[]): string {
    if (videos.length < 2) return 'Insufficient data';
    
    const dates = videos
      .map(v => new Date(v.snippet?.publishedAt || ''))
      .sort((a, b) => b.getTime() - a.getTime());
    
    const daysBetween = (dates[0].getTime() - dates[dates.length - 1].getTime()) / (1000 * 60 * 60 * 24);
    const averageDaysBetween = daysBetween / (videos.length - 1);
    
    if (averageDaysBetween < 1) return 'Multiple times per day';
    if (averageDaysBetween < 2) return 'Daily';
    if (averageDaysBetween < 4) return '2-3 times per week';
    if (averageDaysBetween < 8) return 'Weekly';
    if (averageDaysBetween < 15) return 'Bi-weekly';
    if (averageDaysBetween < 32) return 'Monthly';
    return 'Irregular';
  }
}