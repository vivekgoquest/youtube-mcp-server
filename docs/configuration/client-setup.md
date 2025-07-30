# MCP Client Setup Guide

This guide provides instructions for configuring various MCP (Model Context Protocol) clients to work with the YouTube MCP
Server.

## Universal Configuration Settings

For any MCP client, you will generally need the following settings:

- **Server Name**: A unique identifier for the server (e.g., `youtube-mcp`).
- **Command**: The command to execute the server. If you installed it globally via npm, this is simply `youtube-mcp-server`.
- **Arguments**: An array of arguments to pass to the command. For the global package, this is usually an empty array (`[]`).
- **Environment Variables**: The necessary environment variables. The most important one is `YOUTUBE_API_KEY`.

---

## Cline (VS Code Extension)

### Option 1: Global Package (Recommended)

This method uses the globally installed `youtube-mcp-server` package.

1. **Open VS Code** and the Command Palette (`Cmd/Ctrl + Shift + P`).
2. Run **"Cline: Open Settings"**.
3. Navigate to the "MCP Servers" section.
4. Add a new server with the following details:

| Field                     | Value                                |
| ------------------------- | ------------------------------------ |
| **Server Name**           | `youtube-mcp`                        |
| **Command**               | `youtube-mcp-server`                 |
| **Args**                  | `[]` (empty array)                   |
| **Environment Variables** | `YOUTUBE_API_KEY: your_api_key_here` |

### JSON Configuration for Cline

You can also manually edit the `cline_mcp_settings.json` file.

**Location:**

- **macOS**: `~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`
- **Windows**: `%APPDATA%\Code\User\globalStorage\saoudrizwan.claude-dev\settings\cline_mcp_settings.json`
- **Linux**: `~/.config/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`

**Example JSON:**

```json
{
  "mcpServers": {
    "youtube-mcp-server": {
      "command": "youtube-mcp-server",
      "args": [],
      "env": {
        "YOUTUBE_API_KEY": "YOUR_YOUTUBE_API_KEY_HERE"
      }
    }
  }
}
```

---

## Claude Desktop

Update your Claude Desktop configuration file.

**Location:** `~/.config/claude/claude_desktop_config.json`

**Example JSON:**

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

---

## MCP Inspector (for testing)

When using MCP Inspector, you can configure the server directly from the command line.

**Working Configuration:**
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

---

## Advanced Configuration

### Multiple Environments

You can set up different server configurations for different environments (e.g., development and production) by defining
multiple entries in your client's settings.

**Example for Cline:**

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

To enable debug logging for troubleshooting, you can add the `DEBUG` environment variable.

**Example for Cline:**

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
