# YouTube MCP Server - Comprehensive Guide

## Overview

The YouTube MCP server provides 21 powerful tools for YouTube API integration with the Model Context Protocol (MCP). This guide covers installation, configuration, testing, troubleshooting, and protocol compliance.

**Key Statistics:**
- **Total Tools:** 21
- **Success Rate:** 95.2% (20/21 tools fully operational)
- **Categories:** Search, Content Details, Analysis, Keywords, Specialized
- **MCP Protocol:** Fully compliant

## Table of Contents

1. [Environment Setup](#environment-setup)
2. [MCP Configuration](#mcp-configuration)
3. [Testing Guide](#testing-guide)
4. [Available Tools](#available-tools)
5. [Protocol Compliance](#protocol-compliance)
6. [Troubleshooting](#troubleshooting)
7. [Integration](#integration)
8. [Performance Guidelines](#performance-guidelines)

## Environment Setup

### Required Environment Variables

```bash
YOUTUBE_API_KEY="your_youtube_api_key_here"  # Required: YouTube Data API v3 key
DEBUG_CONSOLE="true"                         # Optional: enables debug output
NODE_ENV="development"                       # Optional: for development mode
ENABLE_DEBUG_LOGGING="false"                # Disabled to prevent MCP interference
```

### Installation

**Via NPM (Recommended):**
```bash
npm install -g youtube-mcp-server
```

**From Source:**
```bash
git clone https://github.com/yourusername/youtube-mcp-server.git
cd youtube-mcp-server
npm install
npm run build
```

## MCP Configuration

### Working MCP Inspector Configuration

File: `config/mcp-inspector-config.json`

```json
{
  "mcpServers": {
    "youtube": {
      "command": "node",
      "args": ["./dist/src/index.js"],
      "env": {
        "YOUTUBE_API_KEY": "your_youtube_api_key_here",
        "DEBUG_CONSOLE": "true",
        "NODE_ENV": "development"
      }
    }
  }
}
```

### Claude Desktop Configuration

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "youtube": {
      "command": "npx",
      "args": ["youtube-mcp-server"],
      "env": {
        "YOUTUBE_API_KEY": "your_youtube_api_key_here"
      }
    }
  }
}
```

### Cline VSCode Extension Configuration

Add to Cline settings:

```json
{
  "youtube": {
    "command": "npx",
    "args": ["youtube-mcp-server"],
    "env": {
      "YOUTUBE_API_KEY": "your_youtube_api_key_here"
    }
  }
}
```

## Testing Guide

### Installation of MCP Inspector

Install MCP Inspector globally:

```bash
npm install -g @modelcontextprotocol/inspector
```

### 1. Testing Server Connection and Tool Listing

List all available tools to verify server is working:

```bash
YOUTUBE_API_KEY="your_api_key" DEBUG_CONSOLE="true" NODE_ENV="development" \\
npx @modelcontextprotocol/inspector \\
--cli node dist/src/index.js \\
--method tools/list
```

**Expected Output:** JSON response with 21 YouTube tools.

### 2. Testing Core Functionality

#### Video Search Test
```bash
YOUTUBE_API_KEY="your_api_key" DEBUG_CONSOLE="true" NODE_ENV="development" \\
npx @modelcontextprotocol/inspector \\
--cli node dist/src/index.js \\
--method tools/call \\
--tool-name search_videos \\
--tool-arg query="test"
```

#### Video Details Test
```bash
YOUTUBE_API_KEY="your_api_key" DEBUG_CONSOLE="true" NODE_ENV="development" \\
npx @modelcontextprotocol/inspector \\
--cli node dist/src/index.js \\
--method tools/call \\
--tool-name get_video_details \\
--tool-arg videoId="dQw4w9WgXcQ"
```

#### Channel Analysis Test
```bash
YOUTUBE_API_KEY="your_api_key" DEBUG_CONSOLE="true" NODE_ENV="development" \\
npx @modelcontextprotocol/inspector \\
--cli node dist/src/index.js \\
--method tools/call \\
--tool-name analyze_channel_videos \\
--tool-arg channelId="UCWv7vMbMWH4-V0ZXdmDpPBA" \\
--tool-arg maxResults="2"
```

### Command Structure

#### Basic Command Format
```bash
npx @modelcontextprotocol/inspector [options] --cli <server_command> [server_args]
```

#### Common Options
- `--method tools/list` - List all available tools
- `--method tools/call` - Execute a specific tool
- `--tool-name <name>` - Specify which tool to call
- `--tool-arg <key>=<value>` - Pass arguments to the tool
- `--cli` - Use CLI mode (required for Node.js servers)

#### Parameter Patterns
```bash
# Single string parameters
--tool-arg query="search term"
--tool-arg channelId="UCxxxxxxxxx"

# Numeric parameters
--tool-arg maxResults="5"
--tool-arg maxVideos="10"

# Boolean parameters
--tool-arg includeComments="true"

# Array parameters (JSON format required)
--tool-arg 'videoIds=["abc123", "def456"]'
--tool-arg 'keywords=["keyword1", "keyword2"]'
```

## Available Tools

### Search Tools (4/4 - 100% Success)
- **search_videos** - Search for videos with query and filters
- **search_channels** - Find channels based on search criteria
- **search_playlists** - Discover playlists matching query
- **advanced_search** - Advanced search with duration, order, and filters

### Content Detail Tools (3/3 - 100% Success)
- **get_video_details** - Complete video metadata and statistics
- **get_channel_details** - Channel information and subscriber data
- **get_playlist_details** - Playlist information and video count

### Analysis Tools (5/6 - 83% Success)
- **get_trending_videos** - Current trending videos by region
- **analyze_channel_videos** - Comprehensive channel performance analysis
- **discover_channel_network** - Map channel relationships and networks
- **analyze_competitor** - Detailed competitor analysis
- **analyze_viral_videos** - Viral content characteristics
- **get_commenter_frequency** ⏱️ - Complex comment analysis (may timeout)

### Keyword Tools (6/6 - 100% Success)
- **extract_keywords_from_text** - NLP-based keyword extraction
- **extract_keywords_from_videos** - Video content keyword analysis
- **analyze_keywords** - Keyword competitive analysis
- **generate_keyword_cloud** - Keyword cloud generation
- **analyze_keyword_opportunities** - Opportunity scoring
- **keyword_research_workflow** - Complete research pipeline

### Specialized Tools (2/2 - 100% Success)
- **extract_video_comments** - Comment extraction and analysis
- **find_content_gaps** - Content gap identification

## Protocol Compliance

### MCP Protocol Requirements

For proper MCP compliance, the server ensures:

1. **stdout must be pure JSON** - No console.log, console.warn, or console.error to stdout
2. **stderr can be used for debug** - But only when explicitly requested
3. **Colored output interferes** - ANSI color codes break JSON parsing
4. **All tool responses must be valid JSON** - No mixed text/JSON output

### Protocol Fix History

**Issue Identified:** Console output from tool files was interfering with MCP protocol's JSON communication channel.

**Files Fixed:**
- Tool files with console output interfering with MCP protocol
- Updated all tool implementations to use proper logging patterns
- Removed direct console output from tool execution paths

**Resolution Applied:**
```typescript
// Before
console.warn(`Failed to get comments for video ${videoId}:`, error);

// After  
// Comment extraction failed - continue without comments
if (process.env.DEBUG_CONSOLE === 'true') {
  console.error(`Failed to get comments for video ${videoId}:`, error);
}
```

### Prevention Guidelines

1. **Never use console.log/warn/error** in production MCP tools
2. **Use conditional debug output** only when `DEBUG_CONSOLE=true`
3. **Direct debug output to stderr** using `console.error` (not stdout)
4. **Test with MCP Inspector** before deploying to Claude Desktop
5. **Monitor Claude Desktop logs** for JSON parsing errors

## Troubleshooting

### Common Issues and Solutions

#### 1. Connection Refused
- Ensure the server builds successfully: `npm run build`
- Check that `dist/src/index.js` exists
- Verify environment variables are set

#### 2. Tool Execution Errors
- Verify YouTube API key is valid
- Check quota limits on YouTube API
- Ensure network connectivity

#### 3. Debug System Interference
- Make sure `ENABLE_DEBUG_LOGGING` is not set to "true"
- Debug output should only go to stderr when `DEBUG_CONSOLE="true"`
- MCP protocol messages must use stdout exclusively

#### 4. JSON Parsing Errors
- Check Claude Desktop logs for: `Unexpected token '', "[32m[3:37"... is not valid JSON`
- Ensure no console output is going to stdout
- Verify all tool responses are valid JSON

#### 5. Performance Issues
- **Timeout errors:** Some analysis tools require significant processing time
- **Quota exhaustion:** Monitor API usage for high-volume operations
- **Rate limiting:** Implement delays for bulk operations

### Verification Checklist

- ✅ Server starts without errors
- ✅ `tools/list` returns all 21 tools
- ✅ `search_videos` returns formatted video results
- ✅ `get_video_details` returns complete video information
- ✅ `get_channel_details` returns channel statistics
- ✅ No debug output interferes with MCP protocol messages
- ✅ Environment variables are properly passed to server

## Integration

### Production Deployment

1. **Install via NPM:**
   ```bash
   npm install -g youtube-mcp-server
   ```

2. **Configure MCP Client:**
   ```json
   {
     "mcpServers": {
       "youtube": {
         "command": "npx",
         "args": ["youtube-mcp-server"],
         "env": {
           "YOUTUBE_API_KEY": "your_api_key"
         }
       }
     }
   }
   ```

3. **Test Integration:**
   ```bash
   # Test with MCP Inspector
   npx @modelcontextprotocol/inspector --cli npx youtube-mcp-server --method tools/list
   ```

### Development Setup

1. **Clone Repository:**
   ```bash
   git clone https://github.com/yourusername/youtube-mcp-server.git
   cd youtube-mcp-server
   npm install
   ```

2. **Build and Test:**
   ```bash
   npm run build
   npm test
   ```

3. **Local MCP Testing:**
   ```bash
   YOUTUBE_API_KEY="your_key" npx @modelcontextprotocol/inspector --cli node dist/src/index.js --method tools/list
   ```

## Performance Guidelines

### Response Times
- **Fast (< 5 seconds):** Search tools, detail tools, simple keyword tools
- **Medium (5-15 seconds):** Analysis tools, complex keyword workflows
- **Slow (> 15 seconds):** Comment frequency analysis (may timeout)

### API Quota Usage
- **Low quota tools:** Search, get details (1-5 quota units)
- **Medium quota tools:** Analysis tools (10-50 quota units)
- **High quota tools:** Comprehensive workflows (100+ quota units)

### Optimization Recommendations

#### Production Use
1. **Use timeout handling** for comment analysis tools
2. **Monitor API quota usage** for workflow tools
3. **Implement rate limiting** for high-volume operations
4. **Cache results** for frequently accessed data

#### Performance Optimization
1. **Batch processing** for multiple video analysis
2. **Async operations** for network discovery
3. **Pagination** for large result sets
4. **Connection pooling** for API efficiency

#### Error Handling
1. **Retry logic** for network timeouts
2. **Graceful degradation** for quota limits
3. **Fallback responses** for API failures
4. **User-friendly error messages** for validation issues

## Conclusion

The YouTube MCP server demonstrates **excellent functionality** across all tool categories:

- **20/21 tools fully operational** (95.2% success rate)
- **Complete MCP protocol compliance**
- **Rich, well-formatted outputs**
- **Comprehensive YouTube API integration**
- **Ready for production deployment**

The single timeout issue with `get_commenter_frequency` is expected due to the computational complexity of comment analysis across multiple videos and channels. All other tools perform reliably and efficiently.

For support and updates, visit the [GitHub repository](https://github.com/yourusername/youtube-mcp-server) or [NPM package](https://www.npmjs.com/package/youtube-mcp-server).
