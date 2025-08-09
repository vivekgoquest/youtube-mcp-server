# YouTube Client Testing Documentation

This directory contains the test suite for the YouTube MCP Server's YouTubeClient class.

## Prerequisites

### YouTube API Key Setup

1. **Copy the environment template**:
   ```bash
   cp .env.test.example .env.test
   ```

2. **Add your YouTube API key**:
   - Open `.env.test` in your editor
   - Add your YouTube Data API v3 key: `YOUTUBE_API_KEY="your-api-key-here"`
   - Save the file

3. **Secure your API key**:
   - `.env.test` is already in `.gitignore` - never commit it
   - Use a dedicated API key for testing if possible

### Required Installation

Make sure you've installed the test dependencies:
```bash
npm install
```

## Running Tests

### Run the complete test suite
```bash
npm test
```

The tests run with a 30-second timeout to accommodate real YouTube API calls and potential network latency.

### Expected Output

A successful test run will show:
- ✓ Client setup and configuration tests
- ✓ Core API method tests (search, getVideos, getChannels, getPlaylists)
- ✓ Complex workflow tests (getAllVideosOfAChannel, pagination)
- ✓ Error handling tests

## Test Structure

### Organization

All tests are contained in `youtube-client.test.ts` following an all-in-one approach for simplicity:

1. **Helper Functions** - Utility functions for test setup and validation
2. **Client Setup & Configuration** - Tests for client instantiation and API key validation
3. **Core API Methods** - Tests for individual YouTube API operations
4. **Complex Workflows** - Tests for multi-step operations and pagination
5. **Error Handling** - Tests for various error scenarios

### Test Data

The tests use stable, well-known YouTube content that's unlikely to be deleted:

- **Video ID**: `dQw4w9WgXcQ` - Rick Astley's "Never Gonna Give You Up"
- **Channel ID**: `UCuAXFkgsw1L7xaCfnd5JJOw` - Rick Astley's official channel
- **Search Terms**: "javascript tutorial", "music" - consistently return results
- **Invalid IDs**: "invalid-video-123", "nonexistent-channel" - for error testing

### Test Implementation

Each test is:
- Independent and self-contained
- Uses real YouTube API calls (not mocked)
- Includes proper async/await handling
- Has descriptive names explaining what's being tested
- Validates both response structure and content

## Troubleshooting

### Common Issues

1. **"API key not set" errors**:
   - Ensure `.env.test` exists and contains `YOUTUBE_API_KEY`
   - Check the API key is valid in the Google Cloud Console

2. **Network/Timeout errors**:
   - Check internet connectivity
   - The 30-second timeout should handle slow connections
   - Retry if experiencing temporary network issues

3. **API quota exceeded**:
   - YouTube API has daily quota limits
   - Wait until quota resets (midnight Pacific Time)
   - Consider using a different API key

4. **Test failures with valid data**:
   - YouTube content can change - channels/videos might be deleted
   - Check if the test data IDs still exist on YouTube
   - Update test data if necessary

## API Usage Notes

### Quota Consumption

Each test run consumes YouTube API quota:
- Search operations: ~100 units per test
- Video/Channel/Playlist details: ~1-3 units per test
- getAllVideosOfAChannel: ~100+ units depending on channel size

**Estimated total per full test run**: ~500-1000 quota units

### Best Practices

1. **API Key Management**:
   - Use a dedicated testing API key
   - Monitor quota usage in Google Cloud Console
   - Set up billing alerts if using paid quota

2. **Minimize Quota Usage**:
   - Tests request minimal 'part' parameters
   - Reuse test data where possible
   - Group related assertions in single API calls

3. **Development Tips**:
   - Run individual tests during development
   - Use `describe.skip()` to temporarily disable test groups
   - Check quota before running full test suite

## Adding New Tests

When adding tests:
1. Follow the existing pattern in `youtube-client.test.ts`
2. Use stable test data that won't change
3. Include proper error handling
4. Document any new test data or special requirements
5. Keep API quota usage in mind

## CI/CD Considerations

For continuous integration:
- Store API key as a secure environment variable
- Consider separate API keys for different environments
- Monitor quota usage across all test runs
- Implement retry logic for transient failures
