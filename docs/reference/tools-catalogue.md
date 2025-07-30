# Tool Catalogue

This document provides a comprehensive catalogue of all the tools available in the YouTube MCP Server.

## Tool Discovery

The server uses a registry-based discovery system that automatically scans for `.tool.ts` files in the `src/tools/` directory. Each tool is a self-contained module with its own metadata and implementation, allowing for a plug-and-play architecture.

---

## Search Tools

### 1. `unified_search`

- **Description**: Search YouTube for videos, channels, or playlists with optional enrichment and advanced filtering.
- **Input Schema**:
  - `query` (string, required if channelId not provided): Search query
  - `channelId` (string, required if query not provided): Channel ID to search within
  - `type` (string, optional, default: 'video'): Type of resource to search for (`video`, `channel`, `playlist`)
  - `maxResults` (number, optional, default: 10): Maximum number of results (1-50)
  - `order` (string, optional, default: 'relevance'): Sort order (`date`, `rating`, `relevance`, `title`, `viewCount`)
  - `publishedAfter` (string, optional): ISO 8601 date - only include results published after this date
  - `publishedBefore` (string, optional): ISO 8601 date - only include results published before this date
  - `videoDuration` (string, optional): Filter by video duration (`any`, `long`, `medium`, `short`)
  - `regionCode` (string, optional): ISO 3166-1 alpha-2 country code for region-specific results
  - `safeSearch` (string, optional, default: 'moderate'): Safe search filtering level (`moderate`, `none`, `strict`)
  - `pageToken` (string, optional): Token for pagination
  - `filters` (object, optional): Advanced filtering options
    - `duration` (string, optional): Video duration filter (`any`, `long`, `medium`, `short`)
    - `uploadDate` (string, optional): Upload date filter (`any`, `hour`, `today`, `week`, `month`, `year`)
    - `sortBy` (string, optional): Sort order (`relevance`, `upload_date`, `view_count`, `rating`)
  - `enrichParts` (object, optional): Parts to fetch for enrichment by resource type
    - `video` (array of strings, optional): Parts for video enrichment (`snippet`, `contentDetails`, `statistics`, `status`, `localizations`, `topicDetails`)
    - `channel` (array of strings, optional): Parts for channel enrichment (`snippet`, `contentDetails`, `statistics`, `status`, `brandingSettings`, `localizations`)
    - `playlist` (array of strings, optional): Parts for playlist enrichment (`snippet`, `contentDetails`, `status`, `localizations`)
- **Quota Cost**: 100 (base) + enrichment costs

### 2. `search_channels`

- **Description**: Find channels based on a search query.
- **Input Schema**:
  - `query` (string, required): The search term.
  - `maxResults` (number, optional, default: 10): The maximum number of results to return.
- **Quota Cost**: 100

### 3. `search_playlists`

- **Description**: Discover playlists that match a search query.
- **Input Schema**:
  - `query` (string, required): The search term.
  - `maxResults` (number, optional, default: 10): The maximum number of results to return.
- **Quota Cost**: 100

### 4. `get_trending_videos`

- **Description**: Get a list of the current trending videos for a specific region.
- **Input Schema**:
  - `regionCode` (string, optional, default: 'US'): The ISO 3166-1 alpha-2 country code.
  - `maxResults` (number, optional, default: 10): The maximum number of results to return.
- **Quota Cost**: 1

---

## Content Detail Tools

### 6. `get_video_details`

- **Description**: Retrieve complete metadata and statistics for a specific video.
- **Input Schema**:
  - `videoId` (string, required): The ID of the video.
- **Quota Cost**: 1

### 7. `get_channel_details`

- **Description**: Get detailed information and statistics for a specific channel.
- **Input Schema**:
  - `channelId` (string, required): The ID of the channel.
- **Quota Cost**: 1

### 8. `get_playlist_details`

- **Description**: Retrieve information about a specific playlist, including its items.
- **Input Schema**:
  - `playlistId` (string, required): The ID of the playlist.
- **Quota Cost**: 1

---

## Analysis Tools

### 9. `analyze_viral_videos`

- **Description**: Analyze the characteristics of viral videos based on a query.
- **Input Schema**:
  - `query` (string, required): The search term for viral videos.
  - `maxResults` (number, optional, default: 20): The maximum number of videos to analyze.
  - `minViews` (number, optional, default: 1000000): The minimum view count to be considered viral.
- **Quota Cost**: 5

### 10. `analyze_competitor`

- **Description**: Perform a detailed analysis of a competitor's channel.
- **Input Schema**:
  - `channelId` (string, required): The ID of the competitor's channel.
  - `maxVideos` (number, optional, default: 50): The maximum number of videos to analyze.
- **Quota Cost**: 10

### 11. `analyze_channel_videos`

- **Description**: Perform a comprehensive analysis of a channel's video performance.
- **Input Schema**:
  - `channelId` (string, required): The ID of the channel.
  - `maxResults` (number, optional, default: 50): The maximum number of videos to analyze.
- **Quota Cost**: 10

### 12. `discover_channel_network`

- **Description**: Map the relationships and networks between channels.
- **Input Schema**:
  - `channelId` (string, required): The ID of the seed channel.
  - `maxDepth` (number, optional, default: 1): The depth of the network to explore.
- **Quota Cost**: 5

### 13. `extract_video_comments`

- **Description**: Extract and analyze comments from a video.
- **Input Schema**:
  - `videoId` (string, required): The ID of the video.
  - `maxResults` (number, optional, default: 100): The maximum number of comments to extract.
- **Quota Cost**: 1

### 14. `find_content_gaps`

- **Description**: Identify content gaps and opportunities in a specific niche.
- **Input Schema**:
  - `niche` (string, required): The niche to analyze.
  - `competitorChannels` (array of strings, optional): A list of competitor channel IDs.
- **Quota Cost**: 15

### 15. `analyze_keyword_opportunities`

- **Description**: Analyze the opportunities for a list of keywords, including search volume and competition.
- **Input Schema**:
  - `keywords` (array of strings, required): The keywords to analyze.
- **Quota Cost**: 5

---

## Keyword Tools

### 16. `extract_keywords_from_text`

- **Description**: Extract keywords from a given text using NLP.
- **Input Schema**:
  - `text` (string, required): The text to analyze.
  - `maxKeywords` (number, optional, default: 10): The maximum number of keywords to return.
- **Quota Cost**: 0 (local processing)

### 17. `extract_keywords_from_videos`

- **Description**: Extract keywords from the metadata of one or more videos.
- **Input Schema**:
  - `videoIds` (array of strings, required): The IDs of the videos.
- **Quota Cost**: 2 per video

### 18. `analyze_keywords`

- **Description**: Perform a competitive analysis for a list of keywords.
- **Input Schema**:
  - `keywords` (array of strings, required): The keywords to analyze.
  - `includeCompetition` (boolean, optional, default: false): Whether to include competition data.
- **Quota Cost**: 2 per keyword

### 19. `generate_keyword_cloud`

- **Description**: Generate data for a keyword cloud from a given text.
- **Input Schema**:
  - `text` (string, required): The text to generate the cloud from.
- **Quota Cost**: 0 (local processing)

### 20. `keyword_research_workflow`

- **Description**: A comprehensive workflow that combines multiple keyword research tools.
- **Input Schema**:
  - `seedKeywords` (array of strings, required): The initial keywords to start the research.
  - `niche` (string, optional): The niche to focus the research on.
- **Quota Cost**: 20+ (chainable tool, cost varies)
- **Chainable**: Yes
