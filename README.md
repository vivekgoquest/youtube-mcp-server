# YouTube MCP Server

[![npm version](https://img.shields.io/npm/v/youtube-mcp-server)](https://www.npmjs.com/package/youtube-mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

A comprehensive Model Context Protocol (MCP) server that provides powerful YouTube Data API v3 access for content research, analytics, and discovery. This server enables AI assistants to search, analyze, and extract deep insights from YouTube content including advanced keyword research, competitor analysis, and viral content patterns.

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/vivekgoquest/youtube-mcp-server.git
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
git clone https://github.com/vivekgoquest/youtube-mcp-server.git
cd youtube-mcp-server

# Install dependencies
npm install

# Build the project
npm run build
```

### Step 3: Configure API Key for Testing

**For Local Testing:**
```bash
# Copy the template and add your real API key
cp tests/.env.test.template tests/.env.test
# Edit tests/.env.test and replace YOUR_YOUTUBE_API_KEY_HERE with your real key
```

**For Production/Development:**
Set the environment variable directly:
```bash
export YOUTUBE_API_KEY="your_real_api_key_here"
```

> ⚠️ **Security Warning**: Never commit real API keys to version control. The `tests/.env.test` file is automatically gitignored. Always use placeholder values in documentation.

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

#### `unified_search`
Search YouTube for videos, channels, or playlists with optional enrichment and advanced filtering.

**Parameters:**
- `query` (string, optional): Search query (required if channelId not provided)
- `channelId` (string, optional): Restrict to specific channel (required if query not provided)
- `type` (enum): `video`, `channel`, `playlist` (default: video)
- `maxResults` (integer, 1-50): Number of results (default: 10)
- `order` (enum): `date`, `rating`, `relevance`, `title`, `viewCount`
- `publishedAfter` (string, optional): ISO 8601 date
- `publishedBefore` (string, optional): ISO 8601 date
- `videoDuration` (enum): `any`, `long`, `medium`, `short` (video search only)
- `regionCode` (string, optional): ISO 3166-1 alpha-2 country code
- `filters` (object, optional): Advanced filtering options
  - `duration`: Video duration filter
  - `uploadDate`: `any`, `hour`, `today`, `week`, `month`, `year`
  - `sortBy`: Overrides order parameter
- `enrichParts` (object, optional): Parts to fetch for enrichment
  - `video`: Array of parts for videos
  - `channel`: Array of parts for channels
  - `playlist`: Array of parts for playlists

**Example:**
```json
{
  "query": "machine learning tutorial",
  "type": "video",
  "maxResults": 10,
  "order": "viewCount",
  "filters": {
    "duration": "medium",
    "uploadDate": "month"
  },
  "enrichParts": {
    "video": ["snippet", "statistics"]
  }
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

## 🔧 Diagnostics CLI

The YouTube MCP Server includes a unified diagnostics CLI for comprehensive testing, monitoring, and troubleshooting. This powerful tool consolidates health checks, quota analysis, and tool discovery verification into a single, easy-to-use interface.

### Quick Start

**Run comprehensive diagnostics:**
```bash
# Check API health, analyze quota, and verify tool discovery
npm run diagnostics health
npm run diagnostics quota  
npm run diagnostics discovery
```

**Direct CLI usage:**
```bash
# Build first if not already built
npm run build

# Run diagnostics directly
node dist/src/cli/mcp-diagnostics.js --help
node dist/src/cli/mcp-diagnostics.js health --json
node dist/src/cli/mcp-diagnostics.js quota --verbose
```

### Available Commands

#### `health` - API Health & Performance Check
Validates YouTube API connectivity, measures performance, and checks current quota usage.

```bash
# Basic health check
npm run test:api-health
# or
node dist/cli/mcp-diagnostics.js health

# JSON output for automation
node dist/cli/mcp-diagnostics.js health --json

# Verbose output with detailed metrics
node dist/cli/mcp-diagnostics.js health --verbose
```

**What it checks:**
- ✅ API key validation and permissions
- ✅ YouTube Data API connectivity  
- ✅ Response time and performance metrics
- ✅ Current quota usage and remaining capacity
- ✅ Rate limiting status

#### `quota` - Quota Analysis & Optimization
Analyzes API quota usage patterns and provides budget recommendations for efficient testing.

```bash
# Analyze quota usage patterns
npm run test:quota-check  
# or
node dist/cli/mcp-diagnostics.js quota

# Get structured quota data
node dist/cli/mcp-diagnostics.js quota --json
```

**Analysis includes:**
- 📊 Tool-by-tool quota cost breakdown
- 📊 High/Medium/Low cost tool categorization  
- 📊 Budget recommendations for different usage patterns
- 📊 Optimization suggestions for quota efficiency
- 📊 Testing strategy recommendations

#### `discovery` - Tool Discovery Verification
Verifies that all tools are properly discovered and functional in both development and production modes.

```bash
# Verify tool discovery
npm run verify:tools
# or  
node dist/cli/mcp-diagnostics.js discovery

# Verbose output showing individual tool tests
node dist/cli/mcp-diagnostics.js discovery --verbose

# Generate detailed JSON report
node dist/cli/mcp-diagnostics.js discovery --json
```

**Verification process:**
- 🔍 Development mode tool discovery
- 🔍 Production mode tool discovery  
- 🔍 Tool interface compliance testing
- 🔍 Parameter validation checks
- 🔍 Error handling verification
- 🔍 Generates `tool-discovery-report.json` with complete results

### Integration with Development Workflow

The diagnostics CLI integrates seamlessly with the development and testing workflow:

**Daily Development:**
```bash
# Quick health check before starting work
npm run test:api-health

# Verify changes haven't broken tool discovery  
npm run verify:tools

# Check quota usage when testing extensively
npm run test:quota-check
```

**CI/CD Integration:**
```bash
# Add to your CI pipeline
npm run build
npm run diagnostics health
npm run diagnostics discovery
```

**Troubleshooting Workflow:**
1. **Start with health check**: `npm run diagnostics health`
2. **If API issues, check quota**: `npm run diagnostics quota`  
3. **If tool issues, run discovery**: `npm run diagnostics discovery`
4. **Use verbose/JSON flags for detailed analysis**

### Command Reference

| Command | Purpose | npm Script | Direct CLI |
|---------|---------|------------|------------|
| **health** | API connectivity & performance | `npm run test:api-health` | `node dist/cli/mcp-diagnostics.js health` |
| **quota** | Quota analysis & budgeting | `npm run test:quota-check` | `node dist/cli/mcp-diagnostics.js quota` |
| **discovery** | Tool discovery verification | `npm run verify:tools` | `node dist/cli/mcp-diagnostics.js discovery` |

### Output Formats

**Human-readable (default):**
- Color-coded status indicators
- Formatted tables and progress indicators
- Clear recommendations and next steps

**JSON format (`--json` flag):**
- Structured data for automation
- Complete metrics and analysis results
- Machine-parseable for CI/CD integration

**Verbose mode (`--verbose` flag):**
- Detailed diagnostic information
- Step-by-step process visibility
- Extended error messages and debugging info

### Common Use Cases

**Before Development Session:**
```bash
npm run diagnostics health  # Ensure API is working
```

**After Making Changes:**  
```bash
npm run diagnostics discovery  # Verify tools still work
```

**When Tests Are Slow:**
```bash
npm run diagnostics quota  # Check if quota is the issue
```

**For CI/CD Health Checks:**
```bash
node dist/cli/mcp-diagnostics.js health --json  # Automated health monitoring
```

**For Debugging Issues:**
```bash
node dist/cli/mcp-diagnostics.js discovery --verbose  # Detailed tool analysis
```

This unified CLI approach replaces the previous individual verification scripts, providing a more consistent and powerful diagnostic experience.

## 🔧 Debugging Workflow

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

## Documentation

For detailed documentation, please refer to the following guides:

-   **[Quick Start Guide](docs/overview/quick-start.md)**: Get up and running in minutes.
-   **[Installation Guide](docs/deployment/install-on-other-computers.md)**: Detailed installation instructions.
-   **[Configuration Guide](docs/configuration/client-setup.md)**: How to configure your MCP client.
-   **[Deployment Guide](docs/deployment/npm-publish.md)**: Publishing new versions to NPM.
-   **[Testing Guide](docs/testing/inspector-manual-guide.md)**: How to test the server.
-   **[Tool Catalogue](docs/reference/tools-catalogue.md)**: A comprehensive list of all available tools.
-   **[System Architecture](docs/architecture/system-overview.md)**: An overview of the server's architecture.

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

## 🧪 Hierarchical Testing Strategy

The YouTube MCP Server implements a comprehensive hierarchical testing strategy that follows an "interface first, drill down when needed" approach. This strategy optimizes for development workflow efficiency while maintaining thorough validation capabilities.

### Quick Interface Validation (Primary)

**Start here for 80% of use cases:**
```bash
# Fast development feedback - catches most issues with minimal quota
npm run test:quick

# Comprehensive interface compliance testing
npm run test:interface

# Minimal mode for development (lowest quota usage)
npm run test:interface:minimal

# Budget-conscious testing for CI/CD
npm run test:interface:budget
```

**When to use interface tests:**
- ✅ Daily development workflow
- ✅ Pull request validation
- ✅ CI/CD pipeline testing
- ✅ API key validation
- ✅ Tool structure verification

### Individual Tool Testing (Deep Debugging)

**Use when interface tests pass but you need deeper validation:**
```bash
# Test a specific tool (replace with actual tool name)
npm run test:tool -- --testNamePattern="searchVideos"

# Test all individual tools
npm run test:tools

# Watch mode for development
npm run test:tools:watch

# Test only expensive tools (search, analyze, workflow)
npm run test:tools:expensive

# Test only cheap tools (get, extract, generate)
npm run test:tools:cheap

# Debug mode with extended timeout and verbose output
npm run test:debug
```

**When to use individual tool tests:**
- 🔍 Interface tests pass but specific tool behavior is suspect
- 🔍 Debugging complex tool interactions
- 🔍 Validating edge cases and error handling
- 🔍 Performance testing individual tools
- 🔍 Developing new tool features

### Complete Hierarchical Workflow

**The recommended testing flow:**
```bash
# Run interface tests first, get guidance for next steps
npm run test:hierarchical
```

This command:
1. Runs interface compliance tests first
2. If successful, provides guidance on individual tool testing
3. Optimizes quota usage by starting with broad validation
4. Gives clear next steps based on results

### Testing Mode Examples

| Scenario | Command | Purpose | Quota Usage |
|----------|---------|---------|-------------|
| **Development** | `npm run test:quick` | Fast feedback loop | Very Low |
| **PR Review** | `npm run test:interface` | Comprehensive validation | Low |
| **CI/CD** | `npm run test:interface:budget` | Automated testing | Medium |
| **Debugging** | `npm run test:tool -- tool-name` | Specific issue investigation | Medium |
| **Full Validation** | `npm run test:tools` | Complete testing | High |
| **Performance** | `npm run test:debug` | Extended diagnostics | Variable |

### Quota-Aware Testing

**Check quota before testing:**
```bash
# Estimate quota usage for different testing approaches
npm run test:quota-check

# Verify API health and get testing recommendations
npm run test:api-health
```

**Budget recommendations:**
- **Development (1,000 units/day)**: Use `test:interface:minimal` primarily
- **CI/CD (10,000 units/day)**: Use `test:interface` for automation
- **Deep debugging**: Use `test:tool` for specific issues only
- **Full validation**: Use `test:tools` when quota permits

### Integration with Existing Tools

The hierarchical testing strategy integrates seamlessly with existing testing infrastructure:

```bash
# Existing comprehensive testing
npm run test:all  # Now includes hierarchical workflow

# MCP-specific testing
npm run test:inspector

# End-to-end testing
npm run test:e2e

# Integration testing
npm run test:integration
```

### Testing Strategy Benefits

1. **Quota Efficiency**: Interface tests catch 80% of issues with 30% of quota usage
2. **Fast Feedback**: Quick validation during development
3. **Targeted Debugging**: Individual tests only when needed
4. **Scalable**: Works from development to CI/CD to production validation
5. **Comprehensive**: Complete coverage when required

### Best Practices

**For Development:**
- Start with `npm run test:quick` for immediate feedback
- Use `npm run test:interface:minimal` for regular validation
- Only run individual tool tests when debugging specific issues

**For CI/CD:**
- Use `npm run test:hierarchical` as the primary test command
- Set appropriate quota limits with environment variables
- Include quota checking in pipeline health monitoring

**For Debugging:**
- Run interface tests first to isolate scope
- Use specific tool tests (`test:tool`) for targeted debugging
- Enable debug mode (`test:debug`) for complex issues
- Monitor quota usage with `test:quota-check`

This hierarchical approach ensures efficient resource usage while maintaining comprehensive validation capabilities throughout the development lifecycle.

### Project Structure

```
youtube-mcp-server/
├── src/
│   ├── index.ts              # Main entry point
│   ├── mcp-server.ts         # MCP server implementation
│   ├── youtube-client.ts     # YouTube API client
│   ├── types.ts              # TypeScript type definitions
│   ├── tools/                # Tool implementations (plug-and-play architecture)
│   │   ├── unified-search.tool.ts # Unified search for videos, channels, playlists
│   │   ├── search-channels.tool.ts # Channel search
│   │   ├── search-playlists.tool.ts # Playlist search
│   │   ├── get-trending-videos.tool.ts # Trending videos
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
- [Issues & Bug Reports](https://github.com/vivekgoquest/youtube-mcp-server/issues)

---

**Built with ❤️ for the MCP community**

*This server provides comprehensive YouTube analytics and research capabilities through the Model Context Protocol, enabling AI assistants to perform sophisticated content analysis and discovery workflows.*
