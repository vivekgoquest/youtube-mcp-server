# YouTube MCP Server - Quick Start Guide

## Overview

The YouTube MCP server provides 21 powerful tools for YouTube API integration with the Model Context Protocol (MCP). This
guide covers installation, configuration, testing, troubleshooting, and protocol compliance.

**Key Statistics:**

- **Total Tools:** 21
- **Success Rate:** 95.2% (20/21 tools fully operational)
- **Categories:** Search, Content Details, Analysis, Keywords, Specialized
- **MCP Protocol:** Fully compliant

## Table of Contents

1. [Environment Setup](#environment-setup)
2. [Configuration](./../configuration/client-setup.md)
3. [Testing](./../testing/inspector-manual-guide.md)
4. [Available Tools](./../reference/tools-catalogue.md)
5. [Architecture](./../architecture/system-overview.md)
6. [Deployment](./../deployment/npm-publish.md)

## Environment Setup

### Required Environment Variables

```bash
YOUTUBE_API_KEY="your_youtube_api_key_here"  # Required: YouTube Data API v3 key
DEBUG_CONSOLE="true"                         # Optional: enables debug output
NODE_ENV="development"                       # Optional: for development mode
ENABLE_DEBUG_LOGGING="false"                # Disabled to prevent MCP interference
```

### Installation

**Via NPM (Recommended):**

```bash
npm install -g youtube-mcp-server
```

**From Source:**

```bash
git clone https://github.com/vivekgoquest/youtube-mcp-server.git
cd youtube-mcp-server
npm install
npm run build
```
