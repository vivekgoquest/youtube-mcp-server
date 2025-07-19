#!/bin/bash

# Configure Cline MCP to use the globally installed youtube-mcp-server
echo "Configuring Cline MCP to use global YouTube MCP server..."

# Check if global package is installed
if ! command -v youtube-mcp-server &> /dev/null; then
    echo "ERROR: youtube-mcp-server not found globally"
    echo "Please run: npm install -g youtube-mcp-server"
    exit 1
fi

echo "✅ Global youtube-mcp-server found at: $(which youtube-mcp-server)"

# Create MCP config command for Cline
echo ""
echo "🔧 MCP Configuration for Cline:"
echo "================================="
echo ""
echo "Option 1: Global Package (Recommended)"
echo "Server Name: youtube-mcp"  
echo "Command: youtube-mcp-server"
echo "Args: []"
echo "Environment Variables:"
echo "  YOUTUBE_API_KEY: Your YouTube API key"
echo ""
echo "Option 2: Using Node directly"
echo "Server Name: youtube-mcp"
echo "Command: node"
echo "Args: [\"$(which youtube-mcp-server)\"]"
echo "Environment Variables:"
echo "  YOUTUBE_API_KEY: Your YouTube API key"
echo ""

echo "📝 To configure in Cline:"
echo "1. Open VS Code"
echo "2. Open Cline settings (Cmd/Ctrl + Shift + P → 'Cline: Open Settings')"
echo "3. Navigate to 'MCP Servers' section"
echo "4. Add a new server with the above configuration"
echo "5. Make sure to add your YouTube API key in the environment variables"
echo ""

echo "🔑 Get your YouTube API key from:"
echo "https://console.developers.google.com/"
echo ""

echo "🧪 Test command:"
echo "YOUTUBE_API_KEY=\"your-api-key\" youtube-mcp-server"
echo ""

# Test the server
echo "Testing server (will timeout in 3 seconds - this is normal)..."
timeout 3s youtube-mcp-server 2>&1 | head -5 || true

echo ""
echo "✅ Configuration ready! Add this to Cline MCP settings."
echo ""
echo "📋 JSON Configuration for cline_mcp_settings.json:"
echo '{'
echo '  "mcpServers": {'
echo '    "youtube-mcp": {'
echo '      "command": "youtube-mcp-server",'
echo '      "args": [],'
echo '      "env": {'
echo '        "YOUTUBE_API_KEY": "YOUR_YOUTUBE_API_KEY_HERE"'
echo '      }'
echo '    }'
echo '  }'
echo '}'
