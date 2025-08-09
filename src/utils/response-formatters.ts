/**
 * Shared formatting utilities for tool responses
 * These utilities help create consistent, well-formatted responses across all tools
 */

export class ResponseFormatters {
  /**
   * Format a number with locale-appropriate thousands separators
   */
  static formatNumber(num: string | number): string {
    if (num == null || num === '') return "0";
    
    const number = typeof num === "string" ? parseInt(num) : num;
    
    if (isNaN(number)) {
      return "Invalid number";
    }
    
    return number.toLocaleString();
  }

  /**
   * Format YouTube ISO 8601 duration to human-readable format
   * PT4M13S -> 4:13
   * PT1H23M45S -> 1:23:45
   */
  static formatDuration(duration: string): string {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return duration;

    const hours = match[1] ? parseInt(match[1]) : 0;
    const minutes = match[2] ? parseInt(match[2]) : 0;
    const seconds = match[3] ? parseInt(match[3]) : 0;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    } else {
      return `${minutes}:${seconds.toString().padStart(2, "0")}`;
    }
  }
  /**
   * Format view count with K/M abbreviations
   */
  static formatViewCount(views: number): string {
    if (views >= 1000000) {
      return `${(views / 1000000).toFixed(1)}M`;
    } else if (views >= 1000) {
      return `${(views / 1000).toFixed(0)}K`;
    }
    return views.toString();
  }

  /**
   * Format date to locale string
   */
  static formatDate(dateString: string): string {
    if (!dateString) return "Unknown";
    try {
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? "Invalid Date" : date.toLocaleDateString();
    } catch {
      return "Invalid Date";
    }
  }

  /**
   * Truncate text with ellipsis
   */
  static truncateText(text: string, maxLength: number = 150): string {
    if (!text) return "";
    return text.length > maxLength
      ? text.substring(0, maxLength) + "..."
      : text;
  }

  /**
   * Generate YouTube URL for different resource types
   */
  static getYouTubeUrl(type: "video" | "channel" | "playlist", id: string): string {
    switch (type) {
      case "video":
        return `https://www.youtube.com/watch?v=${id}`;
      case "channel":
        return `https://www.youtube.com/channel/${id}`;
      case "playlist":
        return `https://www.youtube.com/playlist?list=${id}`;
      default:
        throw new Error(`Invalid YouTube resource type: ${type}. Expected one of: video, channel, playlist`);
    }
  }

  /**
   * Format percentage with specified decimal places
   */
  static formatPercentage(value: number, decimals: number = 1): string {
    if (!Number.isFinite(value)) return "0.0%";
    return `${value.toFixed(decimals)}%`;
  }

  /**
   * Create a section header with emoji
   */
  static sectionHeader(emoji: string, title: string): string {
    return `${emoji} **${title}**\n`;
  }

  /**
   * Create a bulleted list item
   */
  static bulletPoint(label: string, value: string): string {
    return `• ${label}: ${value}\n`;
  }

  /**
   * Create a numbered list item
   */
  static numberedItem(index: number, content: string): string {
    return `${index}. ${content}\n`;
  }

  /**
   * Format a key-value pair with proper spacing
   */
  static keyValue(key: string, value: string, indent: number = 0): string {
    const spacing = " ".repeat(indent);
    return `${spacing}${key}: ${value}\n`;
  }

  /**
   * Create a markdown link
   */
  static link(text: string, url: string): string {
    return `[${text}](${url})`;
  }

  /**
   * Create a code block
   */
  static codeBlock(content: any, language: string = "json"): string {
    const text = typeof content === "string" ? content : JSON.stringify(content, null, 2);
    return `\`\`\`${language}\n${text}\n\`\`\``;
  }

  /**
   * Format search result item with consistent structure
   */
  static formatSearchItem(item: any, index: number, type: "video" | "channel" | "playlist"): string {
    let result = this.numberedItem(index + 1, `**${item.snippet?.title || "Untitled"}**`);

    // Add type-specific information
    if (type === "channel" && item.statistics?.subscriberCount) {
      result += this.keyValue("Subscribers", this.formatNumber(item.statistics.subscriberCount), 3);
    } else if (type !== "channel") {
      result += this.keyValue("Channel", item.snippet?.channelTitle || "Unknown Channel", 3);
    }

    result += this.keyValue("Published", this.formatDate(item.snippet?.publishedAt), 3);

    // Add ID and URL based on type
    if (item.id?.videoId) {
      result += this.keyValue("Video ID", item.id.videoId, 3);
      result += this.keyValue("URL", this.getYouTubeUrl("video", item.id.videoId), 3);
    } else if (item.id?.channelId) {
      result += this.keyValue("Channel ID", item.id.channelId, 3);
      result += this.keyValue("URL", this.getYouTubeUrl("channel", item.id.channelId), 3);
    } else if (item.id?.playlistId) {
      result += this.keyValue("Playlist ID", item.id.playlistId, 3);
      result += this.keyValue("URL", this.getYouTubeUrl("playlist", item.id.playlistId), 3);
    }

    // Add description if available
    if (item.snippet?.description) {
      result += this.keyValue("Description", this.truncateText(item.snippet.description, 150), 3);
    }

    return result + "\n";
  }
}
