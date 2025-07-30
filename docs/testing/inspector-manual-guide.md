# Manual and Automated Testing Guide for MCP Inspector

This comprehensive guide covers both automated and manual testing procedures for the YouTube MCP server using the MCP Inspector.

## 1. Quick Start Testing

### Prerequisites

- **Environment Variables**:
  ```bash
  export YOUTUBE_API_KEY="your_youtube_api_key_here"
  export DEBUG_CONSOLE="false"
  export NODE_ENV="test"
  ```
- **Build the Server**:
  ```bash
  npm run build
  ```

### One-Command Test Execution

Run the complete test suite, which includes tool discovery, automated MCP Inspector tests, and Jest-based end-to-end tests:

```bash
npm run test:inspector
```

### Quick Verification

To verify that all 20 tools are discoverable:

```bash
npm run verify:tools
```

## 2. Automated Testing

### Shell Script Test Suite

- **Location**: `scripts/test-mcp-inspector.sh`
- **Features**: Comprehensive testing of MCP connectivity, individual tool execution, error handling, and concurrency.
- **Usage**: `npm run test:mcp`
- **Output**: Color-coded results in the console, detailed logs in `test-results.log`, and server logs in `server.log`.

### Jest-Based End-to-End Tests

- **Location**: `tests/e2e/mcp-inspector.test.ts`
- **Coverage**: Tool discovery, sample tool execution, error handling, protocol compliance, and performance.
- **Usage**: `npm run test:e2e`

### Tool Discovery Verification

- **Location**: `scripts/verify-tool-discovery.js`
- **Purpose**: Verifies the tool discovery mechanism in both development (TypeScript) and production (JavaScript) environments.
- **Usage**: `npm run test:discovery`
- **Output**: A detailed report saved to `tool-discovery-report.json`.

## 3. Manual Testing Procedures

### Basic Connectivity

1.  **Start MCP Inspector**:
    ```bash
    npx @modelcontextprotocol/inspector --cli stdio "node dist/src/index.js"
    ```
2.  **List Tools**:
    ```bash
    tools/list
    ```
    **Expected**: A JSON response with all 20 tools and their metadata.

### Comprehensive Tool Testing

The following sections provide sample commands for testing each tool.

#### Search Tools

- `unified_search`: `tools/call --args '{"name": "unified_search", "arguments": {"query": "programming tutorial", "maxResults": 5, "type": "video"}}'`
- `unified_search` (with filters): `tools/call --args '{"name": "unified_search", "arguments": {"query": "javascript", "type": "video", "order": "relevance", "filters": {"duration": "medium", "uploadDate": "month"}}}'`
- `unified_search` (with enrichment): `tools/call --args '{"name": "unified_search", "arguments": {"query": "react tutorial", "maxResults": 3, "enrichParts": {"video": ["snippet", "statistics"]}}}'`
- `search_channels`: `tools/call --args '{"name": "search_channels", "arguments": {"query": "technology", "maxResults": 5}}'`
- `search_playlists`: `tools/call --args '{"name": "search_playlists", "arguments": {"query": "coding", "maxResults": 5}}'`
- `get_trending_videos`: `tools/call --args '{"name": "get_trending_videos", "arguments": {"regionCode": "US", "maxResults": 10}}'`

#### Detail Tools

- `get_video_details`: `tools/call --args '{"name": "get_video_details", "arguments": {"videoId": "dQw4w9WgXcQ"}}'`
- `get_channel_details`: `tools/call --args '{"name": "get_channel_details", "arguments": {"channelId": "UC_x5XG1OV2P6uZZ5FSM9Ttw"}}'`
- `get_playlist_details`: `tools/call --args '{"name": "get_playlist_details", "arguments": {"playlistId": "PLrAXtmRdnEQy6nuLMHjMZOz59QiTaWC2K"}}'`

#### Analysis Tools

- `analyze_viral_videos`: `tools/call --args '{"name": "analyze_viral_videos", "arguments": {"query": "viral trends", "maxResults": 20}}'`
- `analyze_competitor`: `tools/call --args '{"name": "analyze_competitor", "arguments": {"channelId": "UC_x5XG1OV2P6uZZ5FSM9Ttw"}}'`
- `analyze_channel_videos`: `tools/call --args '{"name": "analyze_channel_videos", "arguments": {"channelId": "UC_x5XG1OV2P6uZZ5FSM9Ttw", "maxResults": 50}}'`
- `discover_channel_network`: `tools/call --args '{"name": "discover_channel_network", "arguments": {"channelId": "UC_x5XG1OV2P6uZZ5FSM9Ttw"}}'`
- `extract_video_comments`: `tools/call --args '{"name": "extract_video_comments", "arguments": {"videoId": "dQw4w9WgXcQ", "maxResults": 100}}'`
- `find_content_gaps`: `tools/call --args '{"name": "find_content_gaps", "arguments": {"niche": "web development", "competitorChannels": ["UC_x5XG1OV2P6uZZ5FSM9Ttw"]}}'`
- `analyze_keyword_opportunities`: `tools/call --args '{"name": "analyze_keyword_opportunities", "arguments": {"keywords": ["javascript", "react", "nodejs"]}}'`

#### Keyword Tools

- `extract_keywords_from_text`: `tools/call --args '{"name": "extract_keywords_from_text", "arguments": {"text": "A tutorial on JavaScript."}}'`
- `extract_keywords_from_videos`: `tools/call --args '{"name": "extract_keywords_from_videos", "arguments": {"videoIds": ["dQw4w9WgXcQ"]}}'`
- `analyze_keywords`: `tools/call --args '{"name": "analyze_keywords", "arguments": {"keywords": ["programming", "tutorial"]}}'`
- `generate_keyword_cloud`: `tools/call --args '{"name": "generate_keyword_cloud", "arguments": {"text": "machine learning ai"}}'`
- `keyword_research_workflow`: `tools/call --args '{"name": "keyword_research_workflow", "arguments": {"seedKeywords": ["react", "tutorial"], "niche": "web development"}}'`

### Error Testing

- **Invalid Tool Name**: `tools/call --args '{"name": "nonexistent_tool", "arguments": {}}'`
- **Missing Parameters**: `tools/call --args '{"name": "unified_search", "arguments": {}}'`
- **Invalid Parameters**: `tools/call --args '{"name": "unified_search", "arguments": {"query": "", "maxResults": -1}}'`
- **Invalid API Key**: Set `YOUTUBE_API_KEY` to an invalid value and run any tool that calls the API.

## 4. Development Workflow

### Testing During Development

- **Dev Mode**: Test with TypeScript source: `tsx scripts/verify-tool-discovery.js`
- **Prod Mode**: Build and test the compiled version: `npm run build && npm run test:discovery`

### Adding New Tools

When adding a new tool, ensure it is discoverable, its metadata is valid, it executes correctly, and it integrates with MCP Inspector.

### Debugging

- **Enable Debug Logging**:
  ```bash
  export DEBUG_CONSOLE="true"
  export NODE_ENV="development"
  ```
- **Check Logs**: Review `test-results.log`, `server.log`, and `tool-discovery-report.json`.

## 5. Test Timing and Performance Analysis

The testing infrastructure now includes comprehensive timing instrumentation to help identify bottlenecks and optimize test execution.

### Environment Variables

- `LOG_TIMING=true` (default): Enable detailed timing logs for all test phases and individual tool executions
- `SLOW_THRESHOLD_MS=5000` (default): Threshold in milliseconds for flagging slow individual tool executions
- `SLOW_THRESHOLD_SECONDS=10` (default): Threshold in seconds for flagging slow test phases

### Timing Output

- The test scripts provide detailed timing information for each test phase
- Individual tool executions are timed and slow tools (>5s) are flagged
- Test results include a timing summary showing which phases took the most time
- Jest tests also capture timing data for individual test cases

### Troubleshooting Slow Tests

- **If `individual_tools` phase is slow**: Check API quota limits, network connectivity, or specific tool implementations
- **If specific tools consistently timeout**: Consider the tool's quota cost and complexity - tools like `analyze_competitor` and `keyword_research_workflow` are inherently more expensive
- **If Jest tests are slow**: Check the `jest-timing.json` file for detailed per-test timing
- **Network issues**: Tools that make multiple API calls (analysis tools) are more sensitive to network latency

### Log Files

- `test-results.log`: Contains detailed test execution logs including timing information from bash scripts
- `jest-timing.json`: Contains Jest test timing data (generated when Jest tests run)
- `*.timing.log`: Additional timing log files for specific test runs

### Example Usage

```bash
# Run with custom timing thresholds
LOG_TIMING=true SLOW_THRESHOLD_MS=3000 ./scripts/test-mcp-inspector.sh

# Disable timing logs
LOG_TIMING=false ./scripts/restart-claude-mcp.sh

# Run with very strict timing thresholds for performance optimization
SLOW_THRESHOLD_MS=2000 SLOW_THRESHOLD_SECONDS=5 npm run test:inspector
```

### Reading Timing Output

- Look for **"SLOW:"** prefixed messages to identify bottlenecks
- Check the timing summary at the end of test execution
- Review the restart script's final summary for overall timing breakdown
- Focus on the `individual_tools` phase as it typically takes the most time

### Performance Expectations

- **Fast tools** (< 2s): `extract_keywords_from_text`, `generate_keyword_cloud`
- **Medium tools** (2-10s): `unified_search`, `get_trending_videos`, `get_video_details`
- **Slow tools** (10-30s): `analyze_competitor`, `analyze_channel_videos`, `keyword_research_workflow`
- **Very slow tools** (30s+): Complex analysis tools with high API quota usage

## 6. Troubleshooting

- **Tool Discovery Failures**: Check that tool files end in `.tool.ts` and have valid metadata.
- **Connection Issues**: Ensure the server builds successfully and environment variables are set.
- **API Errors**: Verify your `YOUTUBE_API_KEY` is valid and has not exceeded its quota.
- **Performance Issues**: Use timing analysis to identify slow tools and check API quota usage patterns.

## 6. Reference

### Complete Tool List (20 Tools)

**Search**: `unified_search`, `search_channels`, `search_playlists`, `get_trending_videos`
**Details**: `get_video_details`, `get_channel_details`, `get_playlist_details`
**Analysis**: `analyze_viral_videos`, `analyze_competitor`, `analyze_channel_videos`, `discover_channel_network`, `extract_video_comments`, `find_content_gaps`, `analyze_keyword_opportunities`
**Keywords**: `extract_keywords_from_text`, `extract_keywords_from_videos`, `analyze_keywords`, `generate_keyword_cloud`, `keyword_research_workflow`

### File Locations

- **Automated Tests**: `scripts/test-mcp-inspector.sh`
- **E2E Tests**: `tests/e2e/mcp-inspector.test.ts`
- **Tool Discovery Script**: `scripts/verify-tool-discovery.js`
- **Tool Implementations**: `src/tools/`
