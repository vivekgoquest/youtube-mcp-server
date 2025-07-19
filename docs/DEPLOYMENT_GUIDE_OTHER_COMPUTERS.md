# YouTube MCP Server - Deployment on Other Computers

This guide shows how to deploy the YouTube MCP Server on other computers after publishing to GitHub and NPM.

## 🚀 Quick Start (Easiest Method)

### Method 1: Global NPM Install
```bash
# On the new computer:
npm install -g youtube-mcp-server

# Verify installation
youtube-mcp-server --version
```

### Method 2: Using npx (No Installation)
```bash
# Just configure your MCP client to use npx
# No installation needed!
```

## 📋 Prerequisites

On the target computer, ensure you have:
- **Node.js 18+** installed ([Download](https://nodejs.org/))
- **YouTube API Key** ([Get one here](https://console.cloud.google.com/apis/credentials))

## 🔧 Deployment Methods

### 1. NPM Global Package (Recommended)

**Install:**
```bash
npm install -g youtube-mcp-server
```

**Configure Claude Desktop:**
```json
{
  "mcpServers": {
    "youtube": {
      "command": "youtube-mcp-server",
      "env": {
        "YOUTUBE_API_KEY": "YOUR_API_KEY_HERE"
      }
    }
  }
}
```

**Configure Cline:**
```json
{
  "youtube": {
    "command": "youtube-mcp-server",
    "env": {
      "YOUTUBE_API_KEY": "YOUR_API_KEY_HERE"
    }
  }
}
```

### 2. Using npx (No Installation Required)

**Configure MCP Client:**
```json
{
  "mcpServers": {
    "youtube": {
      "command": "npx",
      "args": ["youtube-mcp-server"],
      "env": {
        "YOUTUBE_API_KEY": "YOUR_API_KEY_HERE"
      }
    }
  }
}
```

### 3. Clone from GitHub (For Development)

**Clone and Build:**
```bash
# Clone the repository
git clone https://github.com/vivekgoquest/youtube-mcp-server.git
cd youtube-mcp-server

# Install dependencies
npm install

# Build the project
npm run build

# Optional: Install globally from local build
npm link
```

**Configure MCP Client (Local Path):**
```json
{
  "mcpServers": {
    "youtube": {
      "command": "node",
      "args": ["/path/to/youtube-mcp-server/dist/src/index.js"],
      "env": {
        "YOUTUBE_API_KEY": "YOUR_API_KEY_HERE"
      }
    }
  }
}
```

### 4. Docker Deployment

**Create Dockerfile:**
```dockerfile
FROM node:18-alpine
RUN npm install -g youtube-mcp-server
ENV YOUTUBE_API_KEY=your_api_key_here
CMD ["youtube-mcp-server"]
```

**Build and Run:**
```bash
docker build -t youtube-mcp .
docker run -e YOUTUBE_API_KEY=your_api_key youtube-mcp
```

## 🛠️ Platform-Specific Setup

### Windows

1. **Install Node.js** from [nodejs.org](https://nodejs.org/)
2. **Open PowerShell as Administrator**
3. **Install the package:**
   ```powershell
   npm install -g youtube-mcp-server
   ```
4. **Configure Claude Desktop:**
   - Location: `%APPDATA%\Claude\claude_desktop_config.json`

### macOS

1. **Install Node.js** (via Homebrew):
   ```bash
   brew install node
   ```
2. **Install the package:**
   ```bash
   npm install -g youtube-mcp-server
   ```
3. **Configure Claude Desktop:**
   - Location: `~/.config/claude/claude_desktop_config.json`

### Linux

1. **Install Node.js:**
   ```bash
   # Ubuntu/Debian
   sudo apt update
   sudo apt install nodejs npm
   
   # Fedora
   sudo dnf install nodejs npm
   ```
2. **Install the package:**
   ```bash
   sudo npm install -g youtube-mcp-server
   ```
3. **Configure Claude Desktop:**
   - Location: `~/.config/claude/claude_desktop_config.json`

## 📝 One-Line Deployment Script

Create a deployment script for easy setup:

```bash
#!/bin/bash
# deploy-youtube-mcp.sh

echo "Installing YouTube MCP Server..."
npm install -g youtube-mcp-server

echo "Enter your YouTube API key:"
read -s API_KEY

# Detect OS and configure
if [[ "$OSTYPE" == "darwin"* ]]; then
    CONFIG_PATH="$HOME/.config/claude/claude_desktop_config.json"
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
    CONFIG_PATH="$APPDATA/Claude/claude_desktop_config.json"
else
    CONFIG_PATH="$HOME/.config/claude/claude_desktop_config.json"
fi

# Create config directory if it doesn't exist
mkdir -p "$(dirname "$CONFIG_PATH")"

# Add YouTube MCP configuration
echo "Configuring Claude Desktop..."
# (Add jq commands to update JSON)

echo "✅ YouTube MCP Server deployed successfully!"
```

## 🔍 Verification Steps

1. **Check Installation:**
   ```bash
   youtube-mcp-server --version
   ```

2. **Test the Server:**
   ```bash
   YOUTUBE_API_KEY=your_key youtube-mcp-server
   ```

3. **Verify in Claude Desktop:**
   - Restart Claude Desktop
   - Check for YouTube tools in the tools menu

## 🚨 Troubleshooting

### Common Issues

**1. "command not found" error**
```bash
# Check npm global path
npm config get prefix

# Add to PATH (bash/zsh)
export PATH="$PATH:$(npm config get prefix)/bin"
```

**2. Permission errors**
```bash
# macOS/Linux: Use sudo
sudo npm install -g youtube-mcp-server

# Or fix npm permissions
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
export PATH=~/.npm-global/bin:$PATH
```

**3. API Key not working**
- Ensure YouTube Data API v3 is enabled in Google Cloud Console
- Check API key restrictions
- Verify quota limits

### Debug Mode
```json
{
  "mcpServers": {
    "youtube": {
      "command": "youtube-mcp-server",
      "env": {
        "YOUTUBE_API_KEY": "YOUR_API_KEY",
        "DEBUG_CONSOLE": "true"
      }
    }
  }
}
```

## 📊 Deployment Checklist

- [ ] Node.js 18+ installed
- [ ] NPM package manager available
- [ ] YouTube API key obtained
- [ ] YouTube Data API v3 enabled
- [ ] MCP client (Claude Desktop/Cline) installed
- [ ] Configuration file updated
- [ ] Server tested and working

## 🔗 Resources

- **GitHub Repository**: https://github.com/vivekgoquest/youtube-mcp-server
- **NPM Package**: https://www.npmjs.com/package/youtube-mcp-server
- **YouTube API Console**: https://console.cloud.google.com/apis/credentials
- **MCP Documentation**: https://modelcontextprotocol.io

## 💡 Tips

1. **Use environment variables** for API keys in production
2. **Set up API key restrictions** in Google Cloud Console
3. **Monitor API usage** to avoid quota limits
4. **Keep the package updated**: `npm update -g youtube-mcp-server`

---

Need help? Open an issue on [GitHub](https://github.com/vivekgoquest/youtube-mcp-server/issues)
