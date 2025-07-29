# Cline MCP Configuration Guide

This guide helps you configure Cline (formerly Claude Dev) to use the YouTube MCP Server for enhanced YouTube research capabilities.

## Overview

The YouTube MCP Server integration provides Cline with powerful YouTube research tools including:
- Video search and analysis
- Channel analytics
- Keyword research
- Competitor analysis
- Content gap identification
- Viral content analysis

## Prerequisites

Before configuring Cline MCP, ensure you have:

- **YouTube MCP Server installed globally**: `npm install -g youtube-mcp-server`
- **YouTube API Key**: From [Google Cloud Console](https://console.developers.google.com/)
- **VS Code with Cline extension**: Install from VS Code marketplace
- **Node.js**: Version 18 or higher

### Verify Global Installation

Check if the YouTube MCP Server is properly installed:

```bash
# Check if globally installed
youtube-mcp-server --version

# Verify location
which youtube-mcp-server

# Test basic functionality (will timeout - this is normal)
timeout 3s youtube-mcp-server
```

## Configuration Options

### Option 1: Global Package (Recommended)

This method uses the globally installed package command directly.

#### Cline Settings Configuration

1. **Open VS Code**
2. **Open Command Palette** (`Cmd/Ctrl + Shift + P`)
3. **Run "Cline: Open Settings"**
4. **Navigate to "MCP Servers" section**
5. **Add new server with these settings**:

| Field | Value |
|-------|-------|
| **Server Name** | `youtube-mcp` |
| **Command** | `youtube-mcp-server` |
| **Args** | `[]` (empty array) |
| **Environment Variables** | `YOUTUBE_API_KEY: your_api_key_here` |

### Option 2: Node Direct Execution

This method explicitly calls Node.js with the package path.

#### Configuration

| Field | Value |
|-------|-------|
| **Server Name** | `youtube-mcp` |
| **Command** | `node` |
| **Args** | `["/path/to/youtube-mcp-server"]` |
| **Environment Variables** | `YOUTUBE_API_KEY: your_api_key_here` |

To find the path:
```bash
which youtube-mcp-server
# Use the output path in the Args field
```

## JSON Configuration

For manual configuration or backup, here's the complete JSON structure for `cline_mcp_settings.json`:

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

### Configuration File Location

The Cline MCP settings file is typically located at:

- **macOS**: `~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`
- **Windows**: `%APPDATA%\Code\User\globalStorage\saoudrizwan.claude-dev\settings\cline_mcp_settings.json`
- **Linux**: `~/.config/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`

## YouTube API Key Setup

### Getting Your API Key

1. **Go to Google Cloud Console**: [console.developers.google.com](https://console.developers.google.com/)

2. **Create or Select Project**:
   - Create a new project or select existing one
   - Enable billing (required for API usage)

3. **Enable YouTube Data API**:
   - Navigate to "APIs & Services" → "Library"
   - Search for "YouTube Data API v3"
   - Click "Enable"

4. **Create Credentials**:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "API Key"
   - Copy the generated API key

5. **Configure API Key** (Optional but Recommended):
   - Click on the API key to edit
   - Add application restrictions (HTTP referrers, IP addresses)
   - Restrict to YouTube Data API v3 only

### Setting Environment Variable

#### Option A: In Cline Settings (Recommended)
Add the API key directly in the Cline MCP server configuration as shown above.

#### Option B: System Environment Variable
```bash
# Add to your shell profile (.bashrc, .zshrc, etc.)
export YOUTUBE_API_KEY="your_api_key_here"

# Or set temporarily
YOUTUBE_API_KEY="your_api_key_here" code
```

## Testing Configuration

### Basic Connectivity Test

After configuration, test the connection:

```bash
# Test server startup (should start and display initialization messages)
YOUTUBE_API_KEY="your_api_key_here" youtube-mcp-server
```

### Testing in Cline

1. **Open VS Code** with Cline configured
2. **Start a new Cline conversation**
3. **Try a simple YouTube search**:
   ```
   Search for videos about "machine learning" using the YouTube MCP server
   ```

4. **Verify tool availability**:
   ```
   List all available YouTube MCP tools
   ```

Expected tools include:
- `search_videos`
- `search_channels`
- `get_video_details`
- `analyze_competitor`
- `keyword_research_workflow`
- And 15+ more research tools

## Advanced Configuration

### Multiple Environment Setup

For different API keys or configurations:

```json
{
  "mcpServers": {
    "youtube-mcp-dev": {
      "command": "youtube-mcp-server",
      "args": [],
      "env": {
        "YOUTUBE_API_KEY": "dev_api_key_here",
        "NODE_ENV": "development"
      }
    },
    "youtube-mcp-prod": {
      "command": "youtube-mcp-server", 
      "args": [],
      "env": {
        "YOUTUBE_API_KEY": "prod_api_key_here",
        "NODE_ENV": "production"
      }
    }
  }
}
```

### Debug Mode

Enable debug logging for troubleshooting:

```json
{
  "mcpServers": {
    "youtube-mcp": {
      "command": "youtube-mcp-server",
      "args": [],
      "env": {
        "YOUTUBE_API_KEY": "your_api_key_here",
        "DEBUG": "youtube-mcp:*",
        "NODE_ENV": "development"
      }
    }
  }
}
```

## Troubleshooting

### Common Issues

#### "youtube-mcp-server not found"
```bash
# Reinstall globally
npm uninstall -g youtube-mcp-server
npm install -g youtube-mcp-server

# Verify installation
npm list -g youtube-mcp-server
```

#### "Invalid API Key" Errors
- Verify API key is correct and not expired
- Check YouTube Data API v3 is enabled in Google Cloud Console
- Ensure API key has proper permissions and restrictions

#### "Permission Denied" Errors
- Check file permissions on global npm packages
- Try installing with appropriate permissions:
  ```bash
  sudo npm install -g youtube-mcp-server
  ```

#### "Connection Failed" in Cline
- Verify server starts successfully with API key
- Check Cline MCP settings format is correct
- Restart VS Code after configuration changes

### Debug Commands

```bash
# Check global package installation
npm list -g youtube-mcp-server

# Test API key validity
YOUTUBE_API_KEY="your_key" youtube-mcp-server --test-api

# Check Node.js version
node --version

# Verify package executable
ls -la $(npm root -g)/youtube-mcp-server/bin/
```

### Log Analysis

Check Cline logs for MCP server issues:
- **VS Code Developer Tools**: `Help` → `Toggle Developer Tools` → `Console`
- **Cline Output Panel**: Look for MCP connection messages
- **Server Logs**: Check for API quota/authentication errors

## Best Practices

### Security
- **Never commit API keys** to version control
- **Use environment variables** instead of hardcoded keys
- **Rotate API keys periodically**
- **Monitor API usage** in Google Cloud Console

### Performance
- **Set reasonable rate limits** if processing large datasets
- **Monitor API quotas** to avoid service interruptions
- **Cache results** when possible for repeated queries
- **Use batch operations** for multiple video/channel analyses

### Organization
- **Use descriptive server names** for multiple configurations
- **Document custom configurations** for team sharing
- **Keep backup** of working configurations
- **Test after updates** to ensure compatibility

## Available Tools

Once configured, Cline will have access to these YouTube research tools:

### Core Search Tools
- `search_videos` - Search YouTube videos with filters
- `search_channels` - Find and analyze channels
- `search_playlists` - Discover curated playlists
- `advanced_search` - Power search with advanced filters

### Content Analysis
- `get_video_details` - Comprehensive video metadata
- `get_channel_details` - Channel statistics and branding
- `analyze_viral_videos` - Study viral content patterns
- `extract_video_comments` - Analyze audience engagement

### Research & Strategy
- `analyze_competitor` - Deep competitor analysis
- `find_content_gaps` - Identify untapped opportunities
- `keyword_research_workflow` - Complete keyword analysis
- `analyze_keyword_opportunities` - Score keyword difficulty

### Network & Discovery
- `discover_channel_network` - Map channel relationships
- `get_trending_videos` - Current trending content
- `analyze_channel_videos` - Channel content analysis

---

**Tip**: After successful configuration, try the `keyword_research_workflow` tool - it's a powerful starting point that combines multiple research tools into one comprehensive analysis.
