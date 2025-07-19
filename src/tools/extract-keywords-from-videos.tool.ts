import { ToolMetadata, ToolRunner } from '../interfaces/tool.js';
import { YouTubeClient } from '../youtube-client.js';
import { ToolResponse, KeywordData } from '../types.js';
import { TextProcessor } from '../utils/text-processing.js';

interface ExtractKeywordsFromVideosOptions {
  videoIds: string[];
  includeComments?: boolean;
  maxCommentsPerVideo?: number;
  maxKeywords?: number;
}

export const metadata: ToolMetadata = {
  name: 'extract_keywords_from_videos',
  description: 'Extract ALL keywords from video titles, descriptions, tags, and optionally comments. Use this to REVERSE ENGINEER successful videos and steal their keyword strategies. Input video IDs from search_videos. Returns: exact tags used, keywords with frequency counts, phrases that appear multiple times. POWERFUL for: copying competitor keywords, finding niche-specific terms, understanding what keywords drive views. Can analyze up to 50 videos at once.',
  inputSchema: {
    type: 'object',
    properties: {
      videoIds: {
        type: 'array',
        items: {
          type: 'string'
        },
        description: 'Array of YouTube video IDs to extract keywords from'
      },
      includeComments: {
        type: 'boolean',
        description: 'Include keywords from video comments (default: false)',
        default: false
      },
      maxCommentsPerVideo: {
        type: 'integer',
        description: 'Maximum comments to analyze per video (default: 100)',
        minimum: 1,
        maximum: 500,
        default: 100
      },
      maxKeywords: {
        type: 'integer',
        description: 'Maximum number of keywords to return (default: 100)',
        minimum: 1,
        maximum: 500,
        default: 100
      }
    },
    required: ['videoIds']
  },
  quotaCost: 1
};

export default class ExtractKeywordsFromVideosTool implements ToolRunner<ExtractKeywordsFromVideosOptions, KeywordData[]> {
  constructor(private client: YouTubeClient) {}

  async run(options: ExtractKeywordsFromVideosOptions): Promise<ToolResponse<KeywordData[]>> {
    const startTime = Date.now();
    
    try {
      if (!options.videoIds || options.videoIds.length === 0) {
        return {
          success: false,
          error: 'Video IDs array is required and cannot be empty',
          metadata: {
            quotaUsed: 0,
            requestTime: Date.now() - startTime,
            source: 'keyword-extraction-videos'
          }
        };
      }

      const allKeywords: KeywordData[] = [];
      const batchSize = 50;
      let quotaUsed = 0;

      // Process videos in batches
      for (let i = 0; i < options.videoIds.length; i += batchSize) {
        const batch = options.videoIds.slice(i, i + batchSize);
        const videosResponse = await this.client.getVideos({
          part: 'snippet,statistics',
          id: batch.join(',')
        });

        quotaUsed += 1;

        for (const video of videosResponse.items) {
          const videoKeywords = this.processVideoContent(video);
          allKeywords.push(...videoKeywords);

          // Extract from comments if requested
          if (options.includeComments) {
            try {
              const comments = await this.getVideoComments(video.id, options.maxCommentsPerVideo || 100);
              quotaUsed += Math.ceil(comments.length / 100);
              const commentKeywords = this.processCommentContent(comments);
              allKeywords.push(...commentKeywords);
            } catch (error) {
              // Comment extraction failed - continue without comments
              if (process.env.DEBUG_CONSOLE === 'true') {
                console.error(`Failed to get comments for video ${video.id}:`, error);
              }
            }
          }
        }
      }

      // Merge and deduplicate keywords
      const mergedKeywords = this.mergeKeywordData(allKeywords);

      // Sort by frequency and limit results
      const finalKeywords = mergedKeywords
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, options.maxKeywords || 100);

      return {
        success: true,
        data: finalKeywords,
        metadata: {
          quotaUsed,
          requestTime: Date.now() - startTime,
          source: 'keyword-extraction-videos'
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        metadata: {
          quotaUsed: 0,
          requestTime: Date.now() - startTime,
          source: 'keyword-extraction-videos'
        }
      };
    }
  }

  private processVideoContent(video: any): KeywordData[] {
    const keywords: KeywordData[] = [];
    const sources = ['title', 'description', 'tags'] as const;

    // Extract from title
    if (video.snippet?.title) {
      const titleKeywords = TextProcessor.extractKeywords(video.snippet.title, {
        minWordLength: 3,
        maxKeywords: 20
      });
      
      titleKeywords.forEach(keyword => {
        keywords.push({
          keyword,
          frequency: 1,
          sources: ['title'],
          relevance: 0.9,
          confidence: 0.9,
          relatedTerms: [],
          contexts: [video.snippet.title]
        });
      });
    }

    // Extract from description
    if (video.snippet?.description) {
      const descKeywords = TextProcessor.extractKeywords(video.snippet.description, {
        minWordLength: 3,
        maxKeywords: 30
      });
      descKeywords.forEach(keyword => {
        keywords.push({
          keyword,
          frequency: 1,
          sources: ['description'],
          relevance: 0.7,
          confidence: 0.7,
          relatedTerms: [],
          contexts: [video.snippet.description.substring(0, 200)]
        });
      });
    }

    // Extract from tags
    if (video.snippet?.tags) {
      video.snippet.tags.forEach((tag: string) => {
        keywords.push({
          keyword: tag.toLowerCase(),
          frequency: 1,
          sources: ['tags'],
          relevance: 0.95,
          confidence: 0.95,
          relatedTerms: [],
          contexts: [tag]
        });
      });
    }

    return keywords;
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

  private processCommentContent(comments: any[]): KeywordData[] {
    const keywords: KeywordData[] = [];
    
    comments.forEach(comment => {
      const commentText = comment.snippet?.topLevelComment?.snippet?.textDisplay || '';
      if (commentText) {
        const commentKeywords = TextProcessor.extractKeywords(commentText, {
          minWordLength: 3,
          maxKeywords: 10
        });
        commentKeywords.forEach(keyword => {
          keywords.push({
            keyword,
            frequency: 1,
            sources: ['comments'],
            relevance: 0.5,
            confidence: 0.5,
            relatedTerms: [],
            contexts: [commentText.substring(0, 100)]
          });
        });
      }
    });

    return keywords;
  }

  private mergeKeywordData(keywords: KeywordData[]): KeywordData[] {
    const keywordMap = new Map<string, KeywordData>();

    keywords.forEach(keyword => {
      const key = keyword.keyword.toLowerCase();
      
      if (keywordMap.has(key)) {
        const existing = keywordMap.get(key)!;
        existing.frequency += keyword.frequency;
        existing.sources = [...new Set([...existing.sources, ...keyword.sources])];
        if (existing.contexts && keyword.contexts) {
          existing.contexts.push(...keyword.contexts);
        }
        existing.relevance = Math.max(existing.relevance, keyword.relevance);
        existing.confidence = Math.max(existing.confidence || 0, keyword.confidence || 0);
      } else {
        keywordMap.set(key, {
          ...keyword,
          contexts: keyword.contexts ? [...keyword.contexts] : []
        });
      }
    });

    return Array.from(keywordMap.values());
  }
}
