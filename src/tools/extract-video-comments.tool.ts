import type { ToolMetadata, ToolRunner } from "../interfaces/tool.js";
import { YouTubeClient } from "../youtube-client.js";
import type { ToolResponse } from "../types.js";
import { ErrorHandler } from "../utils/error-handler.js";

interface ExtractCommentsOptions {
  videoIds: string[];
  maxCommentsPerVideo?: number;
  includeSentiment?: boolean;
  includeReplies?: boolean;
  includeAuthorDetails?: boolean;
  maxRepliesPerComment?: number;
}

interface CommentAuthorDetails {
  displayName: string;
  channelId: string;
  channelUrl: string;
  profileImageUrl: string;
}

interface CommentWithDetails {
  text: string;
  likeCount: number;
  publishedAt: string;
  authorDetails?: CommentAuthorDetails;
  replies?: CommentWithDetails[];
}

interface CommentAnalysis {
  videoId: string;
  commentCount: number;
  comments: string[] | CommentWithDetails[];
  sentiment?: {
    positive: number;
    negative: number;
    neutral: number;
  };
  engagementMetrics?: {
    totalLikes: number;
    totalReplies: number;
    averageLikesPerComment: number;
    topCommentsByLikes: CommentWithDetails[];
  };
}

export const metadata: ToolMetadata = {
  name: "extract_video_comments",
  description:
    "Extract and analyze comments from YouTube videos with enhanced capabilities including replies and author details. Use this to gather audience insights, identify common questions or concerns, and understand viewer reactions. Returns comment text, author details, like counts, reply threads, and optional sentiment analysis. Perfect for comprehensive engagement analysis, author profiling, and thread analysis.",
  inputSchema: {
    type: "object",
    properties: {
      videoIds: {
        type: "array",
        items: {
          type: "string",
        },
        description: "Array of YouTube video IDs",
      },
      maxCommentsPerVideo: {
        type: "integer",
        description: "Maximum comments to extract per video (default: 100)",
        minimum: 1,
        maximum: 500,
        default: 100,
      },
      includeSentiment: {
        type: "boolean",
        description: "Include basic sentiment analysis (default: false)",
        default: false,
      },
      includeReplies: {
        type: "boolean",
        description: "Include comment thread replies (default: false)",
        default: false,
      },
      includeAuthorDetails: {
        type: "boolean",
        description: "Include author information (default: false)",
        default: false,
      },
      maxRepliesPerComment: {
        type: "integer",
        description: "Maximum replies to extract per comment (default: 10)",
        minimum: 1,
        maximum: 50,
        default: 10,
      },
    },
    required: ["videoIds"],
  },
};

export default class ExtractVideoCommentsTool
  implements ToolRunner<ExtractCommentsOptions, CommentAnalysis[]>
{
  constructor(private client: YouTubeClient) {}

  async run(
    options: ExtractCommentsOptions,
  ): Promise<ToolResponse<CommentAnalysis[]>> {
    try {
      const maxCommentsPerVideo = options.maxCommentsPerVideo || 100;
      const commentAnalyses: CommentAnalysis[] = [];

      for (const videoId of options.videoIds) {
        const commentsData = await this.getVideoComments(
          videoId,
          maxCommentsPerVideo,
          options.includeReplies || false,
          options.includeAuthorDetails || false,
          options.maxRepliesPerComment || 10,
        );

        let analysis: CommentAnalysis;

        if (options.includeAuthorDetails || options.includeReplies) {
          // Extract detailed comment data
          const detailedComments = this.extractDetailedComments(
            commentsData.comments,
            options.includeAuthorDetails || false,
            options.includeReplies || false,
          );

          analysis = {
            videoId,
            commentCount: commentsData.totalComments,
            comments: detailedComments,
          };

          // Add engagement metrics
          if (detailedComments.length > 0) {
            analysis.engagementMetrics =
              this.calculateEngagementMetrics(detailedComments);
          }
        } else {
          // Simple comment text extraction
          const commentTexts = commentsData.comments.map(
            (c) => c.snippet?.topLevelComment?.snippet?.textDisplay || "",
          );

          analysis = {
            videoId,
            commentCount: commentsData.totalComments,
            comments: commentTexts,
          };
        }

        // Add basic sentiment analysis if requested
        if (options.includeSentiment) {
          const texts =
            typeof analysis.comments[0] === "string"
              ? (analysis.comments as string[])
              : (analysis.comments as CommentWithDetails[]).map((c) => c.text);
          analysis.sentiment = this.analyzeSentiment(texts);
        }

        commentAnalyses.push(analysis);
      }

      return {
        success: true,
        data: commentAnalyses,
      };
    } catch (error) {
      return ErrorHandler.handleToolError<CommentAnalysis[]>(error);
    }
  }

  private async getVideoComments(
    videoId: string,
    maxResults: number,
    includeReplies: boolean,
    _includeAuthorDetails: boolean,
    _maxRepliesPerComment: number,
  ): Promise<{ comments: any[]; totalComments: number }> {
    const comments: any[] = [];
    let pageToken: string | undefined;

    // Build dynamic parts array
    const parts = ["snippet"];
    if (includeReplies) parts.push("replies");

    do {
      const response = await this.client.makeRawRequest("/commentThreads", {
        part: parts.join(","),
        videoId,
        maxResults: Math.min(100, maxResults - comments.length),
        pageToken,
      });

      comments.push(...(response.items || []));
      pageToken = response.nextPageToken;
    } while (pageToken && comments.length < maxResults);

    return {
      comments,
      totalComments: comments.length,
    };
  }

  private extractDetailedComments(
    comments: any[],
    includeAuthorDetails: boolean,
    includeReplies: boolean,
  ): CommentWithDetails[] {
    return comments.map((commentThread) => {
      const topLevelComment = commentThread.snippet?.topLevelComment;
      const snippet = topLevelComment?.snippet;

      const commentDetails: CommentWithDetails = {
        text: snippet?.textDisplay || "",
        likeCount: snippet?.likeCount || 0,
        publishedAt: snippet?.publishedAt || "",
      };

      // Add author details if requested
      if (includeAuthorDetails && snippet) {
        commentDetails.authorDetails = {
          displayName: snippet.authorDisplayName || "",
          channelId: snippet.authorChannelId?.value || "",
          channelUrl: snippet.authorChannelUrl || "",
          profileImageUrl: snippet.authorProfileImageUrl || "",
        };
      }

      // Add replies if requested and available
      if (includeReplies && commentThread.replies?.comments) {
        commentDetails.replies = commentThread.replies.comments.map(
          (reply: any) => {
            const replySnippet = reply.snippet;
            const replyDetails: CommentWithDetails = {
              text: replySnippet?.textDisplay || "",
              likeCount: replySnippet?.likeCount || 0,
              publishedAt: replySnippet?.publishedAt || "",
            };

            if (includeAuthorDetails && replySnippet) {
              replyDetails.authorDetails = {
                displayName: replySnippet.authorDisplayName || "",
                channelId: replySnippet.authorChannelId?.value || "",
                channelUrl: replySnippet.authorChannelUrl || "",
                profileImageUrl: replySnippet.authorProfileImageUrl || "",
              };
            }

            return replyDetails;
          },
        );
      }

      return commentDetails;
    });
  }

  private calculateEngagementMetrics(comments: CommentWithDetails[]): {
    totalLikes: number;
    totalReplies: number;
    averageLikesPerComment: number;
    topCommentsByLikes: CommentWithDetails[];
  } {
    let totalLikes = 0;
    let totalReplies = 0;

    comments.forEach((comment) => {
      totalLikes += comment.likeCount;
      if (comment.replies) {
        totalReplies += comment.replies.length;
        comment.replies.forEach((reply) => {
          totalLikes += reply.likeCount;
        });
      }
    });

    const averageLikesPerComment =
      comments.length > 0 ? totalLikes / comments.length : 0;

    // Get top 5 comments by likes
    const topCommentsByLikes = [...comments]
      .sort((a, b) => b.likeCount - a.likeCount)
      .slice(0, 5);

    return {
      totalLikes,
      totalReplies,
      averageLikesPerComment,
      topCommentsByLikes,
    };
  }

  private analyzeSentiment(comments: string[]): {
    positive: number;
    negative: number;
    neutral: number;
  } {
    // Basic sentiment analysis using keyword matching
    const positiveWords = [
      "good",
      "great",
      "awesome",
      "amazing",
      "love",
      "excellent",
      "fantastic",
      "wonderful",
    ];
    const negativeWords = [
      "bad",
      "terrible",
      "awful",
      "hate",
      "horrible",
      "worst",
      "stupid",
      "sucks",
    ];

    let positive = 0;
    let negative = 0;
    let neutral = 0;

    for (const comment of comments) {
      const lowerComment = comment.toLowerCase();
      const hasPositive = positiveWords.some((word) =>
        lowerComment.includes(word),
      );
      const hasNegative = negativeWords.some((word) =>
        lowerComment.includes(word),
      );

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
