# YouTube MCP Server

[![npm version](https://img.shields.io/npm/v/youtube-mcp-server)](https://www.npmjs.com/package/youtube-mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

A comprehensive Model Context Protocol (MCP) server that provides powerful YouTube Data API v3 access for content research, analytics, and discovery. This server enables AI assistants to search, analyze, and extract deep insights from YouTube content including advanced keyword research, competitor analysis, and viral content patterns.

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/yourusername/youtube-mcp-server.git
cd youtube-mcp-server

# Install dependencies
npm install

# Build the project
npm run build

# Set your YouTube API key
export YOUTUBE_API_KEY="YOUR_YOUTUBE_API_KEY_HERE"
```

## 📦 Installation & Setup

### Prerequisites

- **Node.js** 16+ and npm
- **YouTube Data API v3 Key** from [Google Cloud Console](https://console.cloud.google.com/)
- **MCP Client** (like [Cline](https://github.com/clinebot/cline) or other MCP-compatible tools)

### Step 1: Get YouTube API Key

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **YouTube Data API v3**
4. Go to **Credentials** → **Create Credentials** → **API Key**
5. Copy your API key (keep it secure!)

### Step 2: Install the Server

```bash
# Clone the repository
git clone https://github.com/yourusername/youtube-mcp-server.git
cd youtube-mcp-server

# Install dependencies
npm install

# Build the project
npm run build
```

### Step 3: Configure Environment

**For Development/Testing:**
Create a `.env` file in the project root:

```bash
YOUTUBE_API_KEY=AIzaSyAqDuM3GcsKivan0IQ1I7_Q3Mx5VNZ9QmU
```

**For Production:**
Replace with your own YouTube API key from Google Cloud Console.

### Step 4: Verify Installation

```bash
# Run tests to verify everything works
npm test

# Check if the server starts correctly
node dist/src/index.js
```

## ⚙️ MCP Configuration

### For Cline (Claude Dev)

Add to your Cline MCP settings file:

```json
{
  "mcpServers": {
    "youtube": {
      "command": "node",
      "args": ["/path/to/youtube-mcp-server/dist/src/index.js"],
      "env": {
        "YOUTUBE_API_KEY": "YOUR_YOUTUBE_API_KEY_HERE"
      }
    }
  }
}
```

### For Other MCP Clients

**Via npx (easiest):**
```json
{
  "mcpServers": {
    "youtube": {
      "command": "npx",
      "args": ["youtube-mcp-server"],
      "env": {
        "YOUTUBE_API_KEY": "YOUR_YOUTUBE_API_KEY_HERE"
      }
    }
  }
}
```

**Via direct path:**
```json
{
  "mcpServers": {
    "youtube": {
      "command": "node",
      "args": ["/absolute/path/to/youtube-mcp-server/dist/src/index.js"],
      "env": {
        "YOUTUBE_API_KEY": "YOUR_YOUTUBE_API_KEY_HERE"
      }
    }
  }
}
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `YOUTUBE_API_KEY` | Yes | Your YouTube Data API v3 key |
| `DEBUG` | No | Set to `youtube-mcp` for debug logging |

### Troubleshooting Configuration

**Common Issues:**

1. **"API key not found"**
   - Ensure `YOUTUBE_API_KEY` is set in your environment
   - Check that the API key is valid and has YouTube Data API enabled

2. **"Server not starting"**
   - Verify Node.js version (16+)
   - Check that the path to `dist/src/index.js` is correct
   - Run `npm run build` to ensure compilation

3. **"Quota exceeded"**
   - Check your API quota usage in Google Cloud Console
   - Free tier has 10,000 units/day, paid has much higher limits

## 🛠️ Available Tools

### 🔍 Search & Discovery Tools

#### `search_videos`
Search for YouTube videos with advanced filtering options.

**Parameters:**
- `query` (string, optional): Search query
- `channelId` (string, optional): Restrict to specific channel
- `maxResults` (integer, 1-50): Number of results (default: 25)
- `order` (enum): `date`, `rating`, `relevance`, `title`, `viewCount`
- `publishedAfter` (string, optional): ISO 8601 date
- `publishedBefore` (string, optional): ISO 8601 date
- `videoDuration` (enum): `any`, `long`, `medium`, `short`
- `regionCode` (string, optional): ISO 3166-1 alpha-2 country code

**Example:**
```json
{
  "query": "machine learning tutorial",
  "maxResults": 10,
  "order": "viewCount",
  "videoDuration": "medium",
  "regionCode": "US"
}
```

#### `search_channels`
Find YouTube channels by search query.

**Parameters:**
- `query` (string, required): Search query
- `maxResults` (integer, 1-50): Number of results
- `order` (enum): Sort order options
- `regionCode` (string, optional): Country code

#### `search_playlists`
Search for YouTube playlists.

**Parameters:**
- `query` (string, optional): Search query
- `channelId` (string, optional): Restrict to specific channel
- `maxResults` (integer, 1-50): Number of results
- `order` (enum): Sort order options
- `regionCode` (string, optional): Country code

#### `get_trending_videos`
Get trending/popular videos by region.

**Parameters:**
- `maxResults` (integer, 1-50): Number of results
- `regionCode` (string): Country code (default: US)
- `videoCategoryId` (string, optional): Filter by category

#### `advanced_search`
Perform complex searches with multiple filters.

**Parameters:**
- `query` (string, required): Search query
- `type` (enum): `video`, `channel`, `playlist`
- `filters` (object): Duration, upload date, sort options
- `maxResults` (integer, 1-50): Number of results

### 📊 Detail & Analytics Tools

#### `get_video_details`
Get comprehensive information about a specific video.

**Parameters:**
- `videoId` (string, required): YouTube video ID
- `includeParts` (array): Data parts - `snippet`, `statistics`, `contentDetails`

**Returns:** Views, likes, comments, duration, description, tags, and more.

#### `get_channel_details`
Get detailed channel information and statistics.

**Parameters:**
- `channelId` (string, required): YouTube channel ID
- `includeParts` (array): Data parts to include

**Returns:** Subscriber count, total views, video count, channel metadata.

#### `get_playlist_details`
Get playlist information and metadata.

**Parameters:**
- `playlistId` (string, required): YouTube playlist ID
- `includeParts` (array): Data parts to include

### 📈 Advanced Analytics Tools

#### `analyze_viral_videos`
Analyze viral videos to identify success patterns and characteristics.

**Parameters:**
- `categoryId` (string, optional): Filter by video category
- `regionCode` (string): Region for analysis (default: US)
- `minViews` (integer): Minimum views to consider viral (default: 1,000,000)
- `timeframe` (enum): `day`, `week`, `month`
- `maxResults` (integer, 1-50): Number of videos to analyze

**Returns:** Viral score, growth rate, engagement metrics, success characteristics.

#### `analyze_competitor`
Perform deep competitor analysis including content strategy and performance.

**Parameters:**
- `channelId` (string, required): Competitor channel ID
- `maxVideos` (integer, 1-500): Videos to analyze (default: 100)
- `analyzeComments` (boolean): Include comment analysis
- `timeframe` (enum): `week`, `month`, `quarter`, `year`

**Returns:** Upload patterns, content themes, engagement metrics, top performing videos.

#### `analyze_channel_videos`
Comprehensive analysis of all videos from a channel.

**Parameters:**
- `channelId` (string, required): Channel to analyze
- `maxVideos` (integer, 1-1000): Videos to analyze (default: 200)
- `videoDurationFilter` (enum): `any`, `short`, `medium`, `long`
- `publishedAfter` (string, optional): ISO 8601 date
- `publishedBefore` (string, optional): ISO 8601 date

**Returns:** Performance metrics, view patterns, engagement analysis, top performers.

#### `discover_channel_network`
Map channel relationships through featured channels and discover networks.

**Parameters:**
- `seedChannelIds` (array, required): Starting channels for network discovery
- `maxDepth` (integer, 1-5): Recursion depth (default: 3)
- `maxChannelsPerLevel` (integer, 1-50): Channels per level (default: 10)
- `includeDetails` (boolean): Include channel details (default: true)

**Returns:** Network map with channel relationships and statistics.

### 💬 Engagement Analysis Tools

#### `extract_video_comments`
Extract and analyze comments from videos with optional sentiment analysis.

**Parameters:**
- `videoIds` (array, required): Video IDs to analyze
- `maxCommentsPerVideo` (integer, 1-500): Comments per video (default: 100)
- `includeSentiment` (boolean): Include sentiment analysis

**Returns:** Comments, sentiment analysis, engagement patterns.

#### `get_commenter_frequency`
Identify frequent commenters and super fans for audience analysis.

**Parameters:**
- `channelId` (string, required): Channel to analyze
- `daysBack` (integer, 1-3650): Days to look back (default: 365)

**Returns:** Commenter frequency rankings and engagement patterns.

### 🔤 Keyword Research Tools

#### `extract_keywords_from_text`
Extract keywords from any text content using advanced NLP techniques.

**Parameters:**
- `text` (string, required): Text content to extract keywords from
- `minWordLength` (integer): Minimum word length (default: 3)
- `maxKeywords` (integer): Maximum keywords to return (default: 50)
- `includeNGrams` (boolean): Include multi-word phrases (default: true)
- `nGramSize` (integer): Maximum n-gram size (default: 3)

**Returns:** Extracted keywords ranked by relevance and frequency.

#### `extract_keywords_from_videos`
Extract keywords from YouTube video titles, descriptions, and tags.

**Parameters:**
- `videoIds` (array, required): YouTube video IDs
- `includeComments` (boolean): Include keywords from comments (default: false)
- `maxCommentsPerVideo` (integer): Max comments to analyze (default: 100)
- `maxKeywords` (integer): Maximum keywords to return (default: 100)

**Returns:** Comprehensive keyword list with frequency data and sources.

#### `analyze_keywords`
Perform comprehensive keyword analysis including scoring and competition analysis.

**Parameters:**
- `keywords` (array, required): Keywords to analyze
- `includeRelated` (boolean): Include related keywords (default: true)
- `includeCompetitionAnalysis` (boolean): Include competition analysis (default: true)
- `maxResults` (integer): Max analyzed keywords (default: 50)

**Returns:** Keyword scores, competition metrics, related keywords, top competing videos.

#### `generate_keyword_cloud`
Generate a keyword cloud visualization with frequency and relevance data.

**Parameters:**
- `keywords` (array, required): Keywords for the cloud
- `maxKeywords` (integer): Max keywords in cloud (default: 100)
- `groupSimilar` (boolean): Group similar keywords (default: true)
- `includeScores` (boolean): Include relevance scores (default: true)

**Returns:** Keyword cloud data with sizing, grouping, and visualization information.

#### `find_content_gaps`
Identify content opportunities by analyzing keyword competition and search volume.

**Parameters:**
- `seedKeywords` (array, required): Keywords to analyze for gaps
- `niche` (string, optional): Specific niche or industry focus
- `competitorChannels` (array, optional): Competitor channel IDs
- `maxResults` (integer, 1-50): Number of opportunities (default: 20)

**Returns:** Competition level, search volume, content opportunities, suggested keywords.

#### `analyze_keyword_opportunities`
Analyze keywords for ranking potential and competition difficulty.

**Parameters:**
- `keywords` (array, required): Keywords to analyze
- `maxResults` (integer, 1-50): Number of analyses (default: 25)
- `includeRelated` (boolean): Include related keywords (default: true)

**Returns:** Competition score, difficulty rating, opportunity score, related keywords.

#### `keyword_research_workflow`
**🎯 Complete end-to-end keyword research workflow.**

**Parameters:**
- `seedKeywords` (array, required): Initial seed keywords
- `niche` (string, optional): Specific niche or industry focus
- `maxVideosToAnalyze` (integer): Max videos to analyze (default: 50)
- `includeCompetitorAnalysis` (boolean): Include competitor analysis (default: true)
- `generateKeywordCloud` (boolean): Generate keyword cloud (default: true)

**Returns:** Complete keyword research report with:
- Extracted keywords from discovered videos
- Keyword analysis with scores and competition data
- Keyword cloud visualization
- Competitor analysis and insights
- Content gap opportunities

## 📋 Usage Examples & Workflows

### Complete Keyword Research Workflow

This is the exact workflow you described: search videos → find channels → extract keywords → build keyword cloud.

```json
{
  "tool": "keyword_research_workflow",
  "arguments": {
    "seedKeywords": ["machine learning", "artificial intelligence"],
    "niche": "tech education",
    "maxVideosToAnalyze": 50,
    "includeCompetitorAnalysis": true,
    "generateKeywordCloud": true
  }
}
```

**This single tool will:**
1. Search for videos using your seed keywords
2. Identify channels from those videos
3. Extract keywords from video titles, descriptions, and tags
4. Analyze keyword opportunities and competition
5. Generate a visual keyword cloud
6. Perform competitor analysis on discovered channels

### Competitor Analysis

```json
{
  "tool": "analyze_competitor",
  "arguments": {
    "channelId": "UC_competitor_channel_id",
    "maxVideos": 100,
    "analyzeComments": true,
    "timeframe": "quarter"
  }
}
```

### Content Gap Discovery

```json
{
  "tool": "find_content_gaps",
  "arguments": {
    "seedKeywords": ["python programming", "web development", "coding tutorial"],
    "niche": "programming education",
    "competitorChannels": ["UC_channel1", "UC_channel2"],
    "maxResults": 15
  }
}
```

### Viral Video Pattern Analysis

```json
{
  "tool": "analyze_viral_videos",
  "arguments": {
    "categoryId": "22",
    "minViews": 5000000,
    "timeframe": "week",
    "maxResults": 20
  }
}
```

### Channel Network Discovery

```json
{
  "tool": "discover_channel_network",
  "arguments": {
    "seedChannelIds": ["UC_channel1", "UC_channel2"],
    "maxDepth": 3,
    "maxChannelsPerLevel": 10,
    "includeDetails": true
  }
}
```

## 🎯 Use Cases

### 📺 Content Creators
- **Content Strategy**: Use `find_content_gaps` and `analyze_keyword_opportunities` to identify trending topics and underserved niches
- **Competitor Research**: Analyze successful channels with `analyze_competitor` to understand their upload patterns, content themes, and engagement strategies
- **Performance Optimization**: Use `analyze_viral_videos` to understand what makes content successful and apply those patterns
- **Audience Engagement**: Track super fans with `get_commenter_frequency` and analyze comment sentiment

### 📊 Market Researchers
- **Trend Analysis**: Monitor trending content and viral patterns across different categories and regions
- **Competitive Intelligence**: Deep dive into competitor strategies, performance metrics, and content approaches
- **Market Gaps**: Identify underserved content areas and opportunities using keyword gap analysis
- **Audience Insights**: Understand viewer behavior, engagement patterns, and community dynamics

### 🏢 Content Agencies
- **Client Research**: Comprehensive channel and competitor analysis for client strategy development
- **Strategy Development**: Data-driven content planning and optimization based on viral patterns and keyword research
- **Performance Tracking**: Monitor content performance, engagement metrics, and audience growth
- **Network Mapping**: Understand influencer relationships and collaboration opportunities

### 🔬 Data Analysts
- **YouTube Analytics**: Extract comprehensive data for analysis, reporting, and business intelligence
- **Trend Forecasting**: Identify emerging trends, viral patterns, and content opportunities
- **Engagement Analysis**: Deep dive into comment patterns, sentiment analysis, and audience behavior
- **Performance Modeling**: Analyze factors that contribute to video success and audience engagement

## 📡 API Reference

### Quota Usage

The server tracks YouTube API quota usage for each operation:

| Operation | Quota Cost | Description |
|-----------|------------|-------------|
| Search operations | 100 units | Video, channel, playlist search |
| Detail fetching | 1 unit | Get video/channel/playlist details |
| Trending videos | 1 unit | Get trending video list |
| Comment extraction | 1 unit per video | Extract comments from videos |
| Channel analysis | Variable | Based on number of videos analyzed |

**Daily Quota Limits:**
- **Free Tier**: 10,000 units/day
- **Paid Tier**: 1,000,000+ units/day (billing required)

### Rate Limiting

The server implements intelligent rate limiting:
- Automatic retry with exponential backoff
- Quota tracking and warnings
- Graceful degradation when limits approached

### Error Handling

Common error responses:

```json
{
  "success": false,
  "error": "API key not found",
  "code": "MISSING_API_KEY"
}
```

```json
{
  "success": false,
  "error": "Quota exceeded",
  "code": "QUOTA_EXCEEDED",
  "quotaUsed": 10000
}
```

## � Debugging Workflow

This server includes a comprehensive automated debugging system that helps identify and resolve issues quickly. The debugging system monitors tool execution, analyzes log files, and provides actionable recommendations for common problems.

### Quick Start

**Enable automated debugging (runs after every build):**
```bash
npm run build  # Includes automatic post-build debugging
```

**Manual debugging session:**
```bash
npm run debug:manual  # Run comprehensive debugging manually
```

**Build without debugging:**
```bash
npm run build:no-debug  # Skip automated debugging
```

### How It Works

The debugging system automatically:

1. **Monitors Tool Execution**: Every tool call is tracked with timing, quota usage, and success/failure status
2. **Analyzes Log Files**: Scans debug logs and MCP task histories for error patterns  
3. **Correlates Issues**: Groups related errors and identifies common failure patterns
4. **Generates Recommendations**: Provides specific, actionable solutions for detected problems
5. **Provides Real-time Alerts**: Notifies about issues as they occur during development

### Integration with Tool Execution

The debugging hooks are automatically triggered during:

- **Server Startup**: Health checks and configuration validation
- **Tool Calls**: Performance monitoring and error detection
- **API Failures**: Automatic analysis of YouTube API errors  
- **Build Process**: Post-build validation and issue detection

### Error Detection & Analysis

The system detects and provides recommendations for:

**API Issues:**
- Quota exceeded errors → Caching strategies and optimization tips
- Authentication failures → API key validation and setup guidance
- Rate limiting → Request throttling and retry strategies

**Tool Execution Problems:**
- Parameter validation errors → Input format corrections
- Timeout issues → Performance optimization suggestions  
- Connection failures → Network troubleshooting steps

**MCP Server Issues:**
- Server startup failures → Configuration and environment fixes
- Client connection problems → Transport and binding solutions
- Protocol errors → Version compatibility and format issues

### Configuration

**Environment Variables:**
```bash
# Enable debug logging to console
DEBUG_CONSOLE=true

# Custom log file location
DEBUG_LOG_DIR=/path/to/logs

# Disable file logging (console only)
DEBUG_FILE_LOGGING=false

# Additional log sources for monitoring
EXTRA_LOG_SOURCES=/path/to/app.log,/path/to/error.log
```

**Debug Configuration File (optional):**
```json
{
  "enableContinuousMonitoring": true,
  "monitoringInterval": 30,
  "errorCorrelationWindow": 5,
  "logSources": [
    "./debug.log",
    "~/.cline/tasks",
    "/var/log/mcp-server.log"
  ]
}
```

### Troubleshooting Common Issues

**"Debug logs not being created":**
```bash
# Check file permissions
ls -la debug.log

# Try alternative location
DEBUG_LOG_DIR=/tmp npm run build

# Use console-only mode
DEBUG_FILE_LOGGING=false npm run build
```

**"Debugging seems slow":**
```bash
# Disable continuous monitoring
npm run debug:manual  # Run once instead of continuous

# Reduce log sources
EXTRA_LOG_SOURCES="" npm run build
```

**"Missing recommendations":**
- Ensure sufficient log history exists (run a few tool operations first)
- Check that error logs contain structured JSON format
- Verify log file permissions and accessibility

### Advanced Usage

**Custom Log Sources:**
Add your application logs to the monitoring system:
```bash
export EXTRA_LOG_SOURCES="/path/to/app.log,/path/to/error.log"
npm run debug:manual
```

**Integration with CI/CD:**
```yaml
# .github/workflows/debug.yml
- name: Build with debugging
  run: npm run build  # Includes automated debugging
  
- name: Upload debug report
  if: failure()
  uses: actions/upload-artifact@v3
  with:
    name: debug-report
    path: debug-session-*.json
```

**Monitoring Multiple Servers:**
```bash
# Monitor specific MCP server logs
DEBUG_LOG_DIR=/shared/mcp-logs npm run debug:manual

# Combine with other MCP servers
EXTRA_LOG_SOURCES="/path/to/other-mcp.log" npm run build
```

### Available Debug Commands

```bash
# Run complete debugging workflow
npm run debug:manual

# Post-build debugging only  
npm run debug:post-build

# Build with debugging (default)
npm run build

# Build without debugging
npm run build:no-debug
```

### Debug Output

The debugging system creates:
- `debug.log` - Structured debug information
- `debug-session-*.json` - Complete debug reports
- Console output with color-coded recommendations

### Complete Setup Guide

For detailed setup instructions, advanced configuration, and troubleshooting:
- [Comprehensive Guide](docs/COMPREHENSIVE_GUIDE.md) - Complete setup, testing, and integration guide
- [Deployment Guide](docs/DEPLOYMENT.md) - NPM publishing and production deployment
- [Tool Test Results](docs/TOOL_TEST_RESULTS.md) - Detailed testing results and validation
- [Debug System README](debug/README.md) - Complete debugging documentation

## �🔧 Development

### Building

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Build for production
npm run build:prod
```

### Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- --testPathPattern=search
```

### Project Structure

```
youtube-mcp-server/
├── src/
│   ├── index.ts              # Main entry point
│   ├── mcp-server.ts         # MCP server implementation
│   ├── youtube-client.ts     # YouTube API client
│   ├── types.ts              # TypeScript type definitions
│   ├── tools/                # Tool implementations (plug-and-play architecture)
│   │   ├── search-videos.tool.ts # Video search
│   │   ├── search-channels.tool.ts # Channel search
│   │   ├── search-playlists.tool.ts # Playlist search
│   │   ├── get-trending-videos.tool.ts # Trending videos
│   │   ├── advanced-search.tool.ts # Advanced search
│   │   ├── get-video-details.tool.ts # Video details
│   │   ├── get-channel-details.tool.ts # Channel details
│   │   ├── get-playlist-details.tool.ts # Playlist details
│   │   ├── analyze-viral-videos.tool.ts # Viral analysis
│   │   ├── analyze-competitor.tool.ts # Competitor analysis
│   │   ├── analyze-channel-videos.tool.ts # Channel video analysis
│   │   ├── discover-channel-network.tool.ts # Channel network discovery
│   │   ├── extract-video-comments.tool.ts # Comment extraction
│   │   ├── find-content-gaps.tool.ts # Content gap analysis
│   │   ├── analyze-keyword-opportunities.tool.ts # Keyword opportunities
│   │   ├── extract-keywords-from-text.tool.ts # Text keyword extraction
│   │   ├── extract-keywords-from-videos.tool.ts # Video keyword extraction
│   │   ├── analyze-keywords.tool.ts # Keyword analysis
│   │   ├── generate-keyword-cloud.tool.ts # Keyword cloud generation
│   │   └── keyword-research-workflow.tool.ts # Research workflows
│   └── utils/                # Utility functions
│       ├── text-processing.ts # NLP utilities
│       ├── keyword-scoring.ts # Scoring algorithms
│       └── debug-logger.ts   # Debug logging
├── tests/                    # Jest test suite
├── dist/                     # Built JavaScript (generated)
└── docs/                     # Additional documentation
```

### Contributing

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes**
4. **Add tests** for new functionality
5. **Ensure tests pass**: `npm test`
6. **Commit your changes**: `git commit -m 'Add amazing feature'`
7. **Push to branch**: `git push origin feature/amazing-feature`
8. **Submit a Pull Request**

**Development Guidelines:**
- Follow TypeScript best practices
- Add tests for new tools and functionality
- Update documentation for API changes
- Use descriptive commit messages
- Ensure all tests pass before submitting PR

## 📄 License

MIT License

Copyright (c) 2025 YouTube MCP Server

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## 🆘 Support & Resources

### Troubleshooting

**Server won't start:**
- Check Node.js version (requires 16+)
- Verify API key is set: `echo $YOUTUBE_API_KEY`
- Ensure project is built: `npm run build`
- Check for port conflicts

**API quota issues:**
- Monitor usage in Google Cloud Console
- Consider upgrading to paid tier for higher limits
- Optimize tool usage to reduce quota consumption

**Missing results:**
- Verify API key has YouTube Data API enabled
- Check search parameters are valid
- Ensure region codes are ISO 3166-1 alpha-2 format

### FAQ

**Q: How do I get more API quota?**
A: Enable billing in Google Cloud Console to get 1M+ units/day.

**Q: Can I use this commercially?**
A: Yes, it's MIT licensed. Ensure you comply with YouTube's API terms.

**Q: Does this store any data?**
A: No, all data is fetched in real-time from YouTube's API.

**Q: Can I add custom tools?**
A: Yes! Follow the development guide to add new tools.

### Resources

- [YouTube Data API Documentation](https://developers.google.com/youtube/v3)
- [Model Context Protocol Specification](https://modelcontextprotocol.io/)
- [Google Cloud Console](https://console.cloud.google.com/)
- [Issues & Bug Reports](https://github.com/yourusername/youtube-mcp-server/issues)

---

**Built with ❤️ for the MCP community**

*This server provides comprehensive YouTube analytics and research capabilities through the Model Context Protocol, enabling AI assistants to perform sophisticated content analysis and discovery workflows.*
