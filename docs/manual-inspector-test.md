# Manual MCP Inspector Testing Guide

This guide provides step-by-step instructions for manually testing the YouTube MCP server using the MCP Inspector CLI. Use this guide to verify functionality, troubleshoot issues, and validate the implementation.

## Prerequisites

### Environment Setup

1. **Set Required Environment Variables:**
   ```bash
   export YOUTUBE_API_KEY="your_youtube_api_key_here"
   export DEBUG_CONSOLE="false"
   export NODE_ENV="production"
   ```

2. **Build the Server:**
   ```bash
   npm run build
   ```

3. **Verify MCP Inspector Availability:**
   ```bash
   # Check if MCP Inspector is available globally
   npx @modelcontextprotocol/inspector --version
   
   # If not available, it will be downloaded automatically
   ```

## Basic Connectivity Testing

### 1. Start MCP Inspector with YouTube Server

```bash
npx @modelcontextprotocol/inspector --cli stdio "node dist/src/index.js"
```

**Expected Output:**
- Connection established message
- MCP Inspector CLI prompt appears

### 2. List Available Tools

```bash
tools/list
```

**Expected Output:**
- JSON response with exactly 20 tools
- Each tool should have: `name`, `description`, `inputSchema`

**Validation Checklist:**
- [ ] Response contains 20 tools
- [ ] All tool names are present (see reference list below)
- [ ] Each tool has required metadata fields
- [ ] No duplicate tool names

### 3. Inspect Individual Tool Schema

```bash
tools/call --args '{"name": "search_videos"}'
```

**Expected Output:**
- Tool schema with input parameters
- Detailed description of the tool

## Tool Testing Procedures

### Search Tools Testing

#### search_videos
```bash
tools/call --args '{"name": "search_videos", "arguments": {"query": "programming tutorial", "maxResults": 5}}'
```

**Expected Output:**
- Array of video objects
- Each video with: title, videoId, channelTitle, description, thumbnails

#### search_channels
```bash
tools/call --args '{"name": "search_channels", "arguments": {"query": "technology", "maxResults": 5}}'
```

**Expected Output:**
- Array of channel objects
- Each channel with: title, channelId, description, thumbnails, subscriberCount

#### search_playlists
```bash
tools/call --args '{"name": "search_playlists", "arguments": {"query": "coding", "maxResults": 5}}'
```

**Expected Output:**
- Array of playlist objects
- Each playlist with: title, playlistId, channelTitle, description

#### advanced_search
```bash
tools/call --args '{"name": "advanced_search", "arguments": {"query": "javascript", "type": "video", "order": "relevance", "duration": "medium"}}'
```

**Expected Output:**
- Filtered search results based on advanced parameters
- Results matching the specified criteria

#### get_trending_videos
```bash
tools/call --args '{"name": "get_trending_videos", "arguments": {"regionCode": "US", "maxResults": 10}}'
```

**Expected Output:**
- Array of trending videos
- Current popular videos in the specified region

### Detail Tools Testing

#### get_video_details
```bash
tools/call --args '{"name": "get_video_details", "arguments": {"videoId": "dQw4w9WgXcQ"}}'
```

**Expected Output:**
- Detailed video information
- Statistics, snippet, content details

#### get_channel_details
```bash
tools/call --args '{"name": "get_channel_details", "arguments": {"channelId": "UC_x5XG1OV2P6uZZ5FSM9Ttw"}}'
```

**Expected Output:**
- Channel information
- Statistics, branding, content details

#### get_playlist_details
```bash
tools/call --args '{"name": "get_playlist_details", "arguments": {"playlistId": "PLrAXtmRdnEQy6nuLMHjMZOz59QiTaWC2K"}}'
```

**Expected Output:**
- Playlist information
- Playlist items, metadata

### Analysis Tools Testing

#### analyze_viral_videos
```bash
tools/call --args '{"name": "analyze_viral_videos", "arguments": {"query": "viral trends", "maxResults": 20}}'
```

**Expected Output:**
- Analysis of viral video patterns
- Engagement metrics, common characteristics

#### analyze_competitor
```bash
tools/call --args '{"name": "analyze_competitor", "arguments": {"channelId": "UC_x5XG1OV2P6uZZ5FSM9Ttw"}}'
```

**Expected Output:**
- Competitor analysis data
- Performance metrics, content strategies

#### analyze_channel_videos
```bash
tools/call --args '{"name": "analyze_channel_videos", "arguments": {"channelId": "UC_x5XG1OV2P6uZZ5FSM9Ttw", "maxResults": 50}}'
```

**Expected Output:**
- Channel video analysis
- Performance trends, content patterns

#### discover_channel_network
```bash
tools/call --args '{"name": "discover_channel_network", "arguments": {"channelId": "UC_x5XG1OV2P6uZZ5FSM9Ttw"}}'
```

**Expected Output:**
- Related channels network
- Connection analysis, collaboration patterns

#### extract_video_comments
```bash
tools/call --args '{"name": "extract_video_comments", "arguments": {"videoId": "dQw4w9WgXcQ", "maxResults": 100}}'
```

**Expected Output:**
- Video comments data
- Comment text, author info, metrics

#### find_content_gaps
```bash
tools/call --args '{"name": "find_content_gaps", "arguments": {"niche": "web development", "competitorChannels": ["UC_x5XG1OV2P6uZZ5FSM9Ttw"]}}'
```

**Expected Output:**
- Content gap analysis
- Opportunity identification, market insights

#### analyze_keyword_opportunities
```bash
tools/call --args '{"name": "analyze_keyword_opportunities", "arguments": {"keywords": ["javascript", "react", "nodejs"]}}'
```

**Expected Output:**
- Keyword opportunity analysis
- Search volumes, competition metrics

### Keyword Tools Testing

#### extract_keywords_from_text
```bash
tools/call --args '{"name": "extract_keywords_from_text", "arguments": {"text": "This comprehensive tutorial covers advanced JavaScript programming concepts including closures, promises, and async/await patterns for modern web development."}}'
```

**Expected Output:**
- Extracted keywords from text
- Relevance scores, keyword categories

#### extract_keywords_from_videos
```bash
tools/call --args '{"name": "extract_keywords_from_videos", "arguments": {"videoIds": ["dQw4w9WgXcQ", "jNQXAC9IVRw"]}}'
```

**Expected Output:**
- Keywords extracted from video metadata
- Common themes, topic clustering

#### analyze_keywords
```bash
tools/call --args '{"name": "analyze_keywords", "arguments": {"keywords": ["programming", "tutorial", "javascript", "beginner"]}}'
```

**Expected Output:**
- Keyword analysis results
- Search trends, related keywords

#### generate_keyword_cloud
```bash
tools/call --args '{"name": "generate_keyword_cloud", "arguments": {"text": "machine learning artificial intelligence deep learning neural networks python tensorflow pytorch data science algorithms"}}'
```

**Expected Output:**
- Keyword cloud data
- Word frequencies, visualization data

#### keyword_research_workflow
```bash
tools/call --args '{"name": "keyword_research_workflow", "arguments": {"seedKeywords": ["react", "tutorial"], "niche": "web development"}}'
```

**Expected Output:**
- Comprehensive keyword research
- Expanded keyword lists, opportunity analysis

## Error Testing Procedures

### 1. Invalid Tool Names

```bash
tools/call --args '{"name": "nonexistent_tool", "arguments": {}}'
```

**Expected Output:**
- Error response indicating tool not found
- Clear error message

### 2. Missing Required Parameters

```bash
tools/call --args '{"name": "search_videos", "arguments": {}}'
```

**Expected Output:**
- Validation error for missing 'query' parameter
- Clear description of required fields

### 3. Invalid Parameter Values

```bash
tools/call --args '{"name": "search_videos", "arguments": {"query": "", "maxResults": -1}}'
```

**Expected Output:**
- Validation error for invalid parameters
- Specific error messages for each invalid field

### 4. Invalid API Key Testing

1. **Set Invalid API Key:**
   ```bash
   export YOUTUBE_API_KEY="invalid_key"
   ```

2. **Test Tool Execution:**
   ```bash
   tools/call --args '{"name": "search_videos", "arguments": {"query": "test", "maxResults": 5}}'
   ```

**Expected Output:**
- API authentication error
- Clear error message about invalid credentials

## Performance Testing

### 1. Response Time Testing

Monitor response times for different tool types:

- **Simple tools** (keyword extraction): < 2 seconds
- **API-dependent tools** (search): < 5 seconds  
- **Complex analysis tools**: < 15 seconds

### 2. Concurrent Testing

Open multiple terminal windows and execute tools simultaneously:

```bash
# Terminal 1
tools/call --args '{"name": "search_videos", "arguments": {"query": "test1", "maxResults": 5}}'

# Terminal 2  
tools/call --args '{"name": "search_channels", "arguments": {"query": "test2", "maxResults": 5}}'

# Terminal 3
tools/call --args '{"name": "extract_keywords_from_text", "arguments": {"text": "concurrent test"}}'
```

**Expected Behavior:**
- All requests complete successfully
- Server remains responsive
- No deadlocks or connection issues

## Validation Checklists

### Tool Response Validation

For each successful tool execution, verify:

- [ ] Response has success indicator
- [ ] Content is properly formatted
- [ ] Required fields are present
- [ ] Data types match expected schema
- [ ] No sensitive information leaked

### Error Response Validation

For each error scenario, verify:

- [ ] Error response follows MCP error schema
- [ ] Error messages are clear and helpful
- [ ] No stack traces or internal details exposed
- [ ] Appropriate HTTP status codes

### MCP Protocol Compliance

- [ ] JSON-RPC request/response format
- [ ] Proper content structure in responses
- [ ] Metadata inclusion where appropriate
- [ ] Error format compliance

## Reference: Complete Tools List

The YouTube MCP server should include exactly these 20 tools:

1. **search_videos** - Search for YouTube videos
2. **search_channels** - Search for YouTube channels  
3. **search_playlists** - Search for YouTube playlists
4. **advanced_search** - Advanced YouTube search with filters
5. **get_trending_videos** - Get trending videos by region
6. **get_video_details** - Get detailed video information
7. **get_channel_details** - Get detailed channel information
8. **get_playlist_details** - Get detailed playlist information
9. **analyze_viral_videos** - Analyze viral video patterns
10. **analyze_competitor** - Analyze competitor channels
11. **analyze_channel_videos** - Analyze channel video performance
12. **discover_channel_network** - Discover related channels
13. **extract_video_comments** - Extract video comments
14. **find_content_gaps** - Find content opportunities
15. **analyze_keyword_opportunities** - Analyze keyword opportunities
16. **extract_keywords_from_text** - Extract keywords from text
17. **extract_keywords_from_videos** - Extract keywords from videos
18. **analyze_keywords** - Analyze keyword performance
19. **generate_keyword_cloud** - Generate keyword cloud
20. **keyword_research_workflow** - Complete keyword research

## Troubleshooting Guide

### Common Issues

**Connection Failed:**
- Verify server is built: `npm run build`
- Check environment variables are set
- Ensure no firewall blocking connections

**API Errors:**
- Verify YOUTUBE_API_KEY is valid
- Check API quota limits
- Ensure proper API permissions

**Tool Not Found:**
- Verify tool name spelling
- Check tools list output
- Rebuild server if needed

**Timeout Issues:**
- Increase timeout values for slow connections
- Check network connectivity
- Monitor API response times

**Permission Errors:**
- Verify API key has required permissions
- Check YouTube API service is enabled
- Validate quota settings

### Debug Mode

Enable debug mode for detailed logging:

```bash
export DEBUG_CONSOLE="true"
export NODE_ENV="development"
```

This will provide additional logging information for troubleshooting.

## Test Results Documentation

Document your test results using this template:

```
Test Date: [DATE]
Tester: [NAME] 
Environment: [dev/prod]

✓ Basic connectivity - PASSED/FAILED
✓ Tool discovery (20 tools) - PASSED/FAILED  
✓ Search tools (5/5) - PASSED/FAILED
✓ Detail tools (3/3) - PASSED/FAILED
✓ Analysis tools (7/7) - PASSED/FAILED
✓ Keyword tools (5/5) - PASSED/FAILED
✓ Error handling - PASSED/FAILED
✓ Performance - PASSED/FAILED

Issues Found:
- [List any issues]

Notes:
- [Additional observations]
```

Save test results for future reference and comparison.
