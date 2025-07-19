# YouTube MCP Server - Global Package Setup Guide

This guide provides complete instructions for installing and configuring the YouTube MCP server as a global package.

## 🌐 Global Installation

### Prerequisites
- Node.js 16.x or higher
- npm or yarn
- YouTube Data API v3 key

### Installation Steps

1. **Install the package globally:**
   ```bash
   npm install -g youtube-mcp-server
   ```

2. **Verify installation:**
   ```bash
   # Check if the command is available
   which youtube-mcp-server
   
   # Should output: /usr/local/bin/youtube-mcp-server
   ```

3. **Test the server:**
   ```bash
   # This will show an error about missing API key - that's expected
   youtube-mcp-server
   ```

## 🔧 Configuration

### For Claude Desktop

Update your Claude Desktop configuration at `~/.config/claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "youtube-mcp": {
      "command": "youtube-mcp-server",
      "args": [],
      "env": {
        "YOUTUBE_API_KEY": "YOUR_YOUTUBE_API_KEY_HERE"
      }
    }
  }
}
```

### For Cline (VS Code Extension)

The configuration has been automatically updated at:
`~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`

```json
{
  "mcpServers": {
    "youtube-mcp-server": {
      "disabled": false,
      "timeout": 60,
      "type": "stdio",
      "command": "youtube-mcp-server",
      "args": [],
      "env": {
        "YOUTUBE_API_KEY": "YOUR_YOUTUBE_API_KEY_HERE"
      }
    }
  }
}
```

### For Other MCP Clients

Use these settings:
- **Command**: `youtube-mcp-server`
- **Arguments**: `[]` (empty array)
- **Environment Variables**: 
  - `YOUTUBE_API_KEY`: Your YouTube API key

## 🔑 Getting a YouTube API Key

1. Go to [Google Developers Console](https://console.developers.google.com/)
2. Create a new project or select an existing one
3. Enable the YouTube Data API v3
4. Create credentials (API Key)
5. Copy the API key

## 🧪 Testing the Global Package

### Basic Test
```bash
YOUTUBE_API_KEY="your-api-key" youtube-mcp-server
```

### With Debug Output
```bash
YOUTUBE_API_KEY="your-api-key" DEBUG_CONSOLE=true youtube-mcp-server
```

### Test MCP Connection
```bash
# The server will wait for MCP client connections
# Press Ctrl+C to exit after testing
```

## 🚀 Usage

Once configured, the YouTube MCP server will be available in your MCP client (Claude Desktop, Cline, etc.) with the following tools:

### Search Tools
- `search_videos` - Search for videos with filters
- `search_channels` - Find YouTube channels
- `search_playlists` - Search for playlists
- `advanced_search` - Complex search with multiple filters

### Analysis Tools
- `analyze_channel_videos` - Deep channel analysis
- `analyze_competitor` - Competitor research
- `analyze_viral_videos` - Viral content patterns
- `analyze_keywords` - Keyword performance

### Keyword Research
- `extract_keywords_from_videos` - Extract keywords from video metadata
- `extract_keywords_from_text` - Extract keywords from any text
- `analyze_keyword_opportunities` - Find keyword gaps
- `find_content_gaps` - Discover content opportunities
- `keyword_research_workflow` - Complete keyword research process

### Data Retrieval
- `get_video_details` - Detailed video information
- `get_channel_details` - Channel statistics and info
- `get_playlist_details` - Playlist information
- `get_trending_videos` - Current trending videos

## 🔄 Updating the Global Package

To update to the latest version:

```bash
npm update -g youtube-mcp-server
```

To check current version:

```bash
npm list -g youtube-mcp-server
```

## 🐛 Troubleshooting

### Command not found
```bash
# Reinstall the package
npm uninstall -g youtube-mcp-server
npm install -g youtube-mcp-server
```

### Permission errors
```bash
# Use sudo if needed (not recommended)
sudo npm install -g youtube-mcp-server

# Better: fix npm permissions
npm config set prefix ~/.npm-global
export PATH=~/.npm-global/bin:$PATH
```

### API Key issues
- Ensure your API key is valid
- Check API quota in Google Console
- Verify YouTube Data API v3 is enabled

### MCP Connection issues
1. Restart your MCP client (Claude Desktop, Cline, etc.)
2. Check logs for error messages
3. Verify the server starts without errors

## 📊 Monitoring Usage

The server includes built-in monitoring:
- Request counting
- Error tracking
- Performance metrics

Enable debug mode to see detailed logs:
```bash
YOUTUBE_API_KEY="your-key" DEBUG_CONSOLE=true youtube-mcp-server
```

## 🔗 Links

- [YouTube Data API Documentation](https://developers.google.com/youtube/v3)
- [MCP Protocol Specification](https://modelcontextprotocol.io)
- [Package on npm](https://www.npmjs.com/package/youtube-mcp-server)

## 📝 Notes

- The global package is the recommended installation method
- Always keep your API key secure
- Monitor your API quota usage
- Update regularly for new features and fixes
