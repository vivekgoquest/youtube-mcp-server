import { ToolMetadata, ToolRunner } from '../interfaces/tool.js';
import { YouTubeClient } from '../youtube-client.js';
import { ToolResponse } from '../types.js';

interface ExtractCommentsOptions {
  videoIds: string[];
  maxCommentsPerVideo?: number;
  includeSentiment?: boolean;
}

interface CommentAnalysis {
  videoId: string;
  commentCount: number;
  comments: string[];
  sentiment?: {
    positive: number;
    negative: number;
    neutral: number;
  };
}

export const metadata: ToolMetadata = {
  name: 'extract_video_comments',
  description: 'Extract comments from videos with analysis options including sentiment analysis.',
  inputSchema: {
    type: 'object',
    properties: {
      videoIds: {
        type: 'array',
        items: {
          type: 'string'
        },
        description: 'Array of YouTube video IDs'
      },
      maxCommentsPerVideo: {
        type: 'integer',
        description: 'Maximum comments to extract per video (default: 100)',
        minimum: 1,
        maximum: 500,
        default: 100
      },
      includeSentiment: {
        type: 'boolean',
        description: 'Include basic sentiment analysis (default: false)',
        default: false
      }
    },
    required: ['videoIds']
  },
  quotaCost: 1
};

export default class ExtractVideoCommentsTool implements ToolRunner<ExtractCommentsOptions, CommentAnalysis[]> {
  constructor(private client: YouTubeClient) {}

  async run(options: ExtractCommentsOptions): Promise<ToolResponse<CommentAnalysis[]>> {
    try {
      const startTime = Date.now();
      const maxCommentsPerVideo = options.maxCommentsPerVideo || 100;
      const commentAnalyses: CommentAnalysis[] = [];

      for (const videoId of options.videoIds) {
        try {
          const comments = await this.getVideoComments(videoId, maxCommentsPerVideo);
          
          const analysis: CommentAnalysis = {
            videoId,
            commentCount: comments.length,
            comments: comments.map(c => c.snippet?.topLevelComment?.snippet?.textDisplay || '')
          };

          // Add basic sentiment analysis if requested
          if (options.includeSentiment) {
            analysis.sentiment = this.analyzeSentiment(analysis.comments);
          }

          commentAnalyses.push(analysis);
        } catch (error) {
          // Comment extraction failed - continue without comments
          if (process.env.DEBUG_CONSOLE === 'true') {
            console.error(`Failed to get comments for video ${videoId}:`, error);
          }
        }
      }

      return {
        success: true,
        data: commentAnalyses,
        metadata: {
          quotaUsed: options.videoIds.length,
          requestTime: Date.now() - startTime,
          source: 'youtube-comments-analysis'
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        metadata: {
          quotaUsed: 0,
          requestTime: 0,
          source: 'youtube-comments-analysis'
        }
      };
    }
  }

  private async getVideoComments(videoId: string, maxResults: number): Promise<any[]> {
    const comments: any[] = [];
    let pageToken: string | undefined;

    do {
      const response = await this.client.makeRawRequest('/commentThreads', {
        part: 'snippet',
        videoId,
        maxResults: Math.min(100, maxResults - comments.length),
        pageToken
      });

      comments.push(...(response.items || []));
      pageToken = response.nextPageToken;
    } while (pageToken && comments.length < maxResults);

    return comments;
  }

  private analyzeSentiment(comments: string[]): { positive: number; negative: number; neutral: number } {
    // Basic sentiment analysis using keyword matching
    const positiveWords = ['good', 'great', 'awesome', 'amazing', 'love', 'excellent', 'fantastic', 'wonderful'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'horrible', 'worst', 'stupid', 'sucks'];

    let positive = 0;
    let negative = 0;
    let neutral = 0;

    for (const comment of comments) {
      const lowerComment = comment.toLowerCase();
      const hasPositive = positiveWords.some(word => lowerComment.includes(word));
      const hasNegative = negativeWords.some(word => lowerComment.includes(word));

      if (hasPositive && !hasNegative) {
        positive++;
      } else if (hasNegative && !hasPositive) {
        negative++;
      } else {
        neutral++;
      }
    }

    return { positive, negative, neutral };
  }
}