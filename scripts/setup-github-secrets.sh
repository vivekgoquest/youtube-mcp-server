#!/bin/bash

# GitHub Repository Setup Script for YouTube MCP Server
# This script helps set up GitHub Actions secrets for automatic NPM publishing

echo "🚀 YouTube MCP Server - GitHub Setup"
echo "===================================="
echo ""
echo "Repository: https://github.com/vivekgoquest/youtube-mcp-server"
echo ""

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed."
    echo "Please install it first: https://cli.github.com/"
    exit 1
fi

# Check if logged in to GitHub
if ! gh auth status &> /dev/null; then
    echo "❌ Not logged in to GitHub CLI."
    echo "Please run: gh auth login"
    exit 1
fi

echo "✅ GitHub CLI is installed and authenticated"
echo ""

# Function to set a secret
set_secret() {
    local secret_name=$1
    local prompt_text=$2
    
    echo "Setting up $secret_name..."
    echo "$prompt_text"
    echo -n "Enter value: "
    read -s secret_value
    echo ""
    
    if [ -n "$secret_value" ]; then
        echo "$secret_value" | gh secret set "$secret_name" -R vivekgoquest/youtube-mcp-server
        echo "✅ $secret_name has been set"
    else
        echo "⚠️  Skipped $secret_name (no value provided)"
    fi
    echo ""
}

echo "📋 Required GitHub Secrets Setup"
echo "================================"
echo ""

# NPM Token
echo "1. NPM_TOKEN (Required for automatic publishing)"
echo "   - Go to: https://www.npmjs.com/"
echo "   - Login to your account"
echo "   - Navigate to: Profile → Access Tokens"
echo "   - Generate new token → Select 'Automation' type"
echo "   - Copy the token"
echo ""
set_secret "NPM_TOKEN" "Paste your NPM automation token"

# YouTube API Key (Optional)
echo "2. YOUTUBE_API_KEY (Optional - for running tests in CI)"
echo "   - This allows GitHub Actions to run integration tests"
echo "   - Use the same API key from your local setup"
echo ""
set_secret "YOUTUBE_API_KEY" "Paste your YouTube API key (or press Enter to skip)"

echo ""
echo "🎉 GitHub Setup Complete!"
echo "========================"
echo ""
echo "✅ Repository: https://github.com/vivekgoquest/youtube-mcp-server"
echo "✅ GitHub Actions will now:"
echo "   - Run tests on every push"
echo "   - Automatically publish to NPM when you create version tags"
echo ""
echo "📦 To publish a new version:"
echo "   npm version patch  # Increment patch version (1.0.0 → 1.0.1)"
echo "   npm version minor  # Increment minor version (1.0.0 → 1.1.0)"
echo "   npm version major  # Increment major version (1.0.0 → 2.0.0)"
echo ""
echo "🔗 Your package will be available at:"
echo "   https://www.npmjs.com/package/youtube-mcp-server"
echo ""
