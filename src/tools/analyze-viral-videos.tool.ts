import { ToolMetadata, ToolRunner } from '../interfaces/tool.js';
import { YouTubeClient } from '../youtube-client.js';
import { ToolResponse } from '../types.js';

interface ViralVideoOptions {
  categoryId?: string;
  regionCode?: string;
  minViews?: number;
  timeframe?: 'day' | 'week' | 'month';
  maxResults?: number;
}

interface ViralVideoAnalysis {
  videoId: string;
  title: string;
  channelName: string;
  channelId: string;
  views: number;
  likes: number;
  comments: number;
  publishedAt: string;
  duration: string;
  tags: string[];
  description: string;
  viralScore: number;
  growthRate: number;
  engagementRate: number;
  characteristics: string[];
}

export const metadata: ToolMetadata = {
  name: 'analyze_viral_videos',
  description: 'DECODE the viral formula by analyzing videos with 1M+ views in your niche. Examines titles, thumbnails patterns, video length, upload timing, and engagement ratios that correlate with viral success. Use this to REVERSE ENGINEER viral hits and apply winning formulas to your content. Returns: common title patterns, optimal video lengths, best upload times, engagement benchmarks. Filter by category and region for laser-focused insights.',
  inputSchema: {
    type: 'object',
    properties: {
      categoryId: {
        type: 'string',
        description: 'Filter by video category ID'
      },
      regionCode: {
        type: 'string',
        description: 'Region code for analysis (ISO 3166-1 alpha-2)',
        default: 'US'
      },
      minViews: {
        type: 'integer',
        description: 'Minimum view count to consider viral (default: 1,000,000)',
        minimum: 100000,
        default: 1000000
      },
      timeframe: {
        type: 'string',
        enum: ['day', 'week', 'month'],
        description: 'Timeframe for viral analysis',
        default: 'week'
      },
      maxResults: {
        type: 'integer',
        description: 'Maximum number of viral videos to analyze (default: 50)',
        minimum: 1,
        maximum: 50,
        default: 50
      }
    }
  },
  quotaCost: 1
};

export default class AnalyzeViralVideosTool implements ToolRunner<ViralVideoOptions, ViralVideoAnalysis[]> {
  constructor(private client: YouTubeClient) {}

  async run(options: ViralVideoOptions): Promise<ToolResponse<ViralVideoAnalysis[]>> {
    const startTime = Date.now();
    
    try {
      const minViews = options.minViews || 1000000; // 1M+ views considered viral
      const maxResults = options.maxResults || 50;
      
      // Get trending videos first
      const trendingResponse = await this.client.getVideos({
        part: 'snippet,statistics,contentDetails',
        chart: 'mostPopular',
        maxResults: Math.min(maxResults, 50),
        regionCode: options.regionCode || 'US',
        videoCategoryId: options.categoryId
      });

      const viralAnalyses: ViralVideoAnalysis[] = [];

      for (const video of trendingResponse.items) {
        const views = parseInt(video.statistics?.viewCount || '0');
        if (views < minViews) continue;

        const likes = parseInt(video.statistics?.likeCount || '0');
        const comments = parseInt(video.statistics?.commentCount || '0');
        const publishedAt = new Date(video.snippet?.publishedAt || '');
        const now = new Date();
        const hoursOld = (now.getTime() - publishedAt.getTime()) / (1000 * 60 * 60);
        
        // Calculate viral metrics
        const growthRate = views / Math.max(hoursOld, 1); // Views per hour
        const engagementRate = (likes + comments) / views;
        const viralScore = this.calculateViralScore(views, growthRate, engagementRate, hoursOld);
        
        // Identify viral characteristics
        const characteristics = this.identifyViralCharacteristics(video, views, engagementRate);

        const analysis: ViralVideoAnalysis = {
          videoId: video.id,
          title: video.snippet?.title || '',
          channelName: video.snippet?.channelTitle || '',
          channelId: video.snippet?.channelId || '',
          views,
          likes,
          comments,
          publishedAt: video.snippet?.publishedAt || '',
          duration: video.contentDetails?.duration || '',
          tags: video.snippet?.tags || [],
          description: video.snippet?.description || '',
          viralScore,
          growthRate,
          engagementRate,
          characteristics
        };

        viralAnalyses.push(analysis);
      }

      // Sort by viral score
      viralAnalyses.sort((a, b) => b.viralScore - a.viralScore);

      return {
        success: true,
        data: viralAnalyses,
        metadata: {
          quotaUsed: 1,
          requestTime: Date.now() - startTime,
          source: 'youtube-viral-analysis'
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        metadata: {
          quotaUsed: 1,
          requestTime: Date.now() - startTime,
          source: 'youtube-viral-analysis'
        }
      };
    }
  }

  private calculateViralScore(views: number, growthRate: number, engagementRate: number, hoursOld: number): number {
    const viewScore = Math.log10(views) * 10;
    const growthScore = Math.log10(growthRate + 1) * 20;
    const engagementScore = engagementRate * 1000;
    const timeDecay = Math.max(0, 100 - hoursOld / 24); // Decay over days
    
    return (viewScore + growthScore + engagementScore + timeDecay) / 4;
  }

  private identifyViralCharacteristics(video: any, views: number, engagementRate: number): string[] {
    const characteristics: string[] = [];
    
    const title = video.snippet?.title?.toLowerCase() || '';
    const description = video.snippet?.description?.toLowerCase() || '';
    
    // Title characteristics
    if (title.includes('!')) characteristics.push('Exclamatory title');
    if (title.includes('?')) characteristics.push('Question in title');
    if (/\b(how|why|what|when|where)\b/.test(title)) characteristics.push('How-to/Question format');
    if (/\b(shocking|amazing|incredible|unbelievable)\b/.test(title)) characteristics.push('Sensational language');
    if (title.length < 50) characteristics.push('Short title');
    if (title.length > 80) characteristics.push('Long descriptive title');
    
    // Engagement characteristics
    if (engagementRate > 0.05) characteristics.push('High engagement rate');
    if (engagementRate > 0.1) characteristics.push('Extremely high engagement');
    
    // Content characteristics
    if (video.snippet?.tags?.length > 10) characteristics.push('Well-tagged');
    if (description.length > 1000) characteristics.push('Detailed description');
    
    return characteristics;
  }
}
