# MCP Inspector Testing Guide

This comprehensive guide covers testing the YouTube MCP server with MCP Inspector, including both automated and manual testing procedures for the plug-and-play tool architecture.

## Overview

The YouTube MCP server implements a registry-based discovery system that automatically scans for individual `.tool.ts` files, dynamically loads them, and broadcasts them via the MCP protocol. The system provides 20 specialized tools for YouTube content research, analytics, and keyword discovery workflows.

### Architecture Summary

- **Registry-based Discovery**: Automatically discovers tool files in the `src/tools/` directory
- **Dynamic Loading**: Tools are loaded at runtime using ES module imports
- **MCP Protocol Integration**: Uses the official MCP SDK with stdio transport
- **Plug-and-Play Design**: Each tool is self-contained with metadata and implementation

### Tool Categories

1. **Search Tools** (5): Video, channel, playlist, and trending content search
2. **Detail Tools** (3): Detailed information retrieval for specific content
3. **Analysis Tools** (7): Advanced analytics and competitor analysis
4. **Keyword Tools** (5): Text processing and keyword research workflows

## Quick Start Testing

### Prerequisites

1. **Environment Setup**:
   ```bash
   export YOUTUBE_API_KEY="your_youtube_api_key_here"
   export DEBUG_CONSOLE="false"
   export NODE_ENV="test"
   ```

2. **Build the Server**:
   ```bash
   npm run build
   ```

3. **Install Dependencies** (if needed):
   ```bash
   npm install
   ```

### One-Command Test Execution

Run the complete test suite:

```bash
npm run test:inspector
```

This executes:
1. Tool discovery verification
2. Automated MCP Inspector tests
3. Jest-based end-to-end tests

### Quick Verification

Verify all tools are discoverable:

```bash
npm run verify:tools
```

Expected output: Discovery report showing all 20 tools found.

## Automated Testing

### Shell Script Test Suite

**Location**: `scripts/test-mcp-inspector.sh`

**Features**:
- Comprehensive MCP connectivity testing
- Individual tool execution validation
- Error handling verification
- Concurrency testing
- Automated report generation

**Usage**:
```bash
npm run test:mcp
```

**Output**: 
- Console output with color-coded results
- Detailed logs in `test-results.log`
- Server logs in `server.log`

### Jest-Based End-to-End Tests

**Location**: `tests/e2e/mcp-inspector.test.ts`

**Coverage**:
- Tool discovery validation (20 tools expected)
- Tool execution with sample inputs
- Error handling for invalid inputs
- Protocol compliance verification
- Performance and reliability testing

**Usage**:
```bash
npm run test:e2e
```

**Features**:
- Spawns actual MCP server process
- Tests real MCP Inspector interaction
- Validates JSON-RPC protocol compliance
- Measures response times and stability

### Tool Discovery Verification

**Location**: `scripts/verify-tool-discovery.js`

**Purpose**: Verifies the registry discovery mechanism works correctly in both development and production environments.

**Usage**:
```bash
npm run test:discovery
```

**Validation Points**:
- Development mode (TypeScript source): 20 tools discovered
- Production mode (compiled JavaScript): 20 tools discovered
- Consistency between modes
- Metadata validation
- Path resolution verification

**Output**: Detailed report saved to `tool-discovery-report.json`

### CI/CD Integration

Tests can be integrated into GitHub Actions or other CI systems:

```bash
# In CI environment
export YOUTUBE_API_KEY=${{ secrets.YOUTUBE_API_KEY }}
npm ci
npm run build
npm run test:all
```

## Manual Testing Procedures

### Basic Connectivity

1. **Start MCP Inspector**:
   ```bash
   npx @modelcontextprotocol/inspector --cli stdio "node dist/src/index.js"
   ```

2. **List Tools**:
   ```bash
   tools/list
   ```
   
   Expected: 20 tools with complete metadata

3. **Test Individual Tool**:
   ```bash
   tools/call --args '{"name": "search_videos", "arguments": {"query": "test", "maxResults": 5}}'
   ```

### Comprehensive Tool Testing

Refer to the detailed manual testing guide: `scripts/manual-inspector-test.md`

**Test Categories**:
- Search tools with various queries
- Detail tools with sample IDs
- Analysis tools with realistic parameters
- Keyword tools with text processing
- Error scenarios and edge cases

### Performance Testing

1. **Response Time Measurement**:
   - Simple tools: < 2 seconds
   - API-dependent tools: < 5 seconds
   - Complex analysis: < 15 seconds

2. **Concurrent Execution**:
   ```bash
   # Execute multiple tools simultaneously
   tools/call --args '{"name": "tool1", "arguments": {...}}' &
   tools/call --args '{"name": "tool2", "arguments": {...}}' &
   tools/call --args '{"name": "tool3", "arguments": {...}}' &
   wait
   ```

## Tool-Specific Testing

### Search Tools

| Tool | Test Input | Expected Output |
|------|------------|-----------------|
| `search_videos` | `{"query": "programming", "maxResults": 5}` | Array of 5 videos |
| `search_channels` | `{"query": "technology", "maxResults": 5}` | Array of 5 channels |
| `search_playlists` | `{"query": "tutorials", "maxResults": 5}` | Array of 5 playlists |
| `advanced_search` | `{"query": "javascript", "type": "video"}` | Filtered video results |
| `get_trending_videos` | `{"regionCode": "US", "maxResults": 10}` | Trending videos list |

### Detail Tools

| Tool | Test Input | Expected Output |
|------|------------|-----------------|
| `get_video_details` | `{"videoId": "dQw4w9WgXcQ"}` | Complete video metadata |
| `get_channel_details` | `{"channelId": "UC_x5XG1OV2P6uZZ5FSM9Ttw"}` | Channel information |
| `get_playlist_details` | `{"playlistId": "PLrAXtmRdnEQy6nuLMHjMZOz59QiTaWC2K"}` | Playlist metadata |

### Analysis Tools

| Tool | Test Input | Expected Output |
|------|------------|-----------------|
| `analyze_viral_videos` | `{"query": "viral", "maxResults": 20}` | Viral pattern analysis |
| `analyze_competitor` | `{"channelId": "UC_x5XG1OV2P6uZZ5FSM9Ttw"}` | Competitor insights |
| `find_content_gaps` | `{"niche": "tech", "competitorChannels": ["..."]}` | Content opportunities |

### Keyword Tools

| Tool | Test Input | Expected Output |
|------|------------|-----------------|
| `extract_keywords_from_text` | `{"text": "AI machine learning tutorial"}` | Extracted keywords |
| `analyze_keywords` | `{"keywords": ["AI", "ML", "tutorial"]}` | Keyword analysis |
| `generate_keyword_cloud` | `{"text": "technology programming coding"}` | Keyword cloud data |

## Development Workflow

### Testing During Development

1. **Development Mode Testing**:
   ```bash
   # Test with TypeScript source
   tsx scripts/verify-tool-discovery.js
   ```

2. **Production Mode Testing**:
   ```bash
   # Build and test compiled version
   npm run build
   npm run test:discovery
   ```

### Adding New Tools

When adding new tools, verify:

1. **Tool Discovery**: New tool appears in discovery list
2. **Metadata Validation**: Required fields are present
3. **Execution Testing**: Tool executes without errors
4. **Integration Testing**: Tool works through MCP Inspector

```bash
# After adding new tool
npm run verify:tools
npm run test:inspector
```

### Debugging Failed Tests

1. **Enable Debug Logging**:
   ```bash
   export DEBUG_CONSOLE="true"
   export NODE_ENV="development"
   ```

2. **Check Logs**:
   - `test-results.log`: Automated test results
   - `server.log`: Server startup and execution logs
   - `tool-discovery-report.json`: Discovery verification results

3. **Manual Verification**:
   ```bash
   # Test specific tool manually
   npx @modelcontextprotocol/inspector --cli stdio "node dist/src/index.js"
   ```

## Troubleshooting

### Common Issues

**Tool Discovery Failures**:
- Verify `src/tools/` directory exists
- Check tool file naming (must end with `.tool.ts`)
- Validate tool metadata structure
- Ensure proper exports in tool files

**MCP Inspector Connection Issues**:
- Verify server builds successfully (`npm run build`)
- Check environment variables are set
- Ensure no port conflicts
- Validate MCP Inspector is available

**API-Related Errors**:
- Verify `YOUTUBE_API_KEY` is valid and active
- Check API quota limits and usage
- Ensure YouTube Data API v3 is enabled
- Validate API key permissions

**Test Execution Failures**:
- Check Node.js version compatibility (>=16.0.0)
- Verify all dependencies are installed
- Ensure proper file permissions on scripts
- Check available system resources

### Debug Mode

Enable comprehensive debugging:

```bash
export DEBUG_CONSOLE="true"
export NODE_ENV="development"
npm run test:inspector
```

This provides:
- Detailed server startup logs
- Tool loading and validation messages
- API request/response logging
- Error stack traces

### Performance Issues

If tests are slow or timing out:

1. **Increase Timeouts**: Modify timeout values in test files
2. **Check Network**: Verify stable internet connection
3. **API Quotas**: Monitor YouTube API usage
4. **Resource Usage**: Check system CPU and memory

## Reference

### Complete Tools List

The server provides exactly 20 tools:

**Search Tools**:
1. `search_videos` - Video search functionality
2. `search_channels` - Channel search functionality
3. `search_playlists` - Playlist search functionality
4. `advanced_search` - Advanced search with filters
5. `get_trending_videos` - Trending videos by region

**Detail Tools**:
6. `get_video_details` - Detailed video information
7. `get_channel_details` - Detailed channel information
8. `get_playlist_details` - Detailed playlist information

**Analysis Tools**:
9. `analyze_viral_videos` - Viral video pattern analysis
10. `analyze_competitor` - Competitor channel analysis
11. `analyze_channel_videos` - Channel video performance
12. `discover_channel_network` - Related channel discovery
13. `extract_video_comments` - Video comment extraction
14. `find_content_gaps` - Content opportunity identification
15. `analyze_keyword_opportunities` - Keyword opportunity analysis

**Keyword Tools**:
16. `extract_keywords_from_text` - Text-based keyword extraction
17. `extract_keywords_from_videos` - Video-based keyword extraction
18. `analyze_keywords` - Keyword performance analysis
19. `generate_keyword_cloud` - Keyword cloud generation
20. `keyword_research_workflow` - Complete keyword research

### MCP Protocol Compliance

All tools follow MCP standards:

- **Request Format**: JSON-RPC 2.0 protocol
- **Response Structure**: MCP content format with metadata
- **Error Handling**: Standard MCP error responses
- **Tool Metadata**: Complete schema definitions

### File Locations

```
youtube-mcp-server/
├── scripts/
│   ├── test-mcp-inspector.sh          # Automated test script
│   ├── verify-tool-discovery.js       # Discovery verification
│   └── manual-inspector-test.md       # Manual testing guide
├── tests/
│   ├── e2e/
│   │   └── mcp-inspector.test.ts      # End-to-end tests
│   └── unit/
│       └── tool-registry.test.ts      # Unit tests
├── docs/
│   └── MCP_INSPECTOR_TESTING_GUIDE.md # This guide
└── src/
    ├── tools/                         # Individual tool files
    └── registry/
        └── tool-registry.ts           # Discovery and execution
```

## Contributing

When contributing to the testing framework:

1. **Add Tests**: Include tests for new functionality
2. **Update Documentation**: Keep guides current
3. **Validate Integration**: Test with real MCP Inspector
4. **Performance Testing**: Ensure reasonable response times
5. **Error Handling**: Test edge cases and failures

### Test Development Guidelines

- **Comprehensive Coverage**: Test all tool categories
- **Real Environment**: Use actual MCP Inspector
- **Error Scenarios**: Include negative test cases
- **Performance Validation**: Measure and validate timing
- **Documentation**: Update guides with changes

This testing framework ensures the YouTube MCP server works reliably with MCP Inspector and provides confidence in the plug-and-play tool architecture.