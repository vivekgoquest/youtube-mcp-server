# Installation Guide

This guide provides comprehensive instructions for installing the YouTube MCP Server on different computers and platforms.

## Prerequisites

Before you begin, ensure the target computer has:

- **Node.js**: Version 18.x or higher.
- **npm**: Node Package Manager (usually included with Node.js).
- **YouTube API Key**: A valid key from the Google Cloud Console.

## Installation Methods

### Method 1: Global NPM Install (Recommended)

This is the simplest and most common method for end-users.

1. **Install the package globally**:

   ```bash
   npm install -g youtube-mcp-server
   ```

2. **Verify the installation**:

   ```bash
   youtube-mcp-server --version
   ```

### Method 2: Using NPX (No Persistent Installation)

This method allows you to run the server without installing it globally. It's useful for quick tests or for ensuring you're always using the latest version.

Your MCP client should be configured to use `npx` as the command.

- **Command**: `npx`
- **Arguments**: `["youtube-mcp-server"]`

### Method 3: Cloning from GitHub (For Developers)

This method is ideal for developers who want to modify the source code.

1. **Clone the repository**:

   ```bash
   git clone https://github.com/vivekgoquest/youtube-mcp-server.git
   cd youtube-mcp-server
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Build the project**:

   ```bash
   npm run build
   ```

4. **Run the server from the local build**:
   Your MCP client should be configured to run the server from the `dist` directory.
   - **Command**: `node`
   - **Arguments**: `["/path/to/youtube-mcp-server/dist/src/index.js"]`

### Method 4: Docker Deployment

You can also run the server in a Docker container for isolated environments.

1. **Create a `Dockerfile`**:

   ```dockerfile
   FROM node:18-alpine
   RUN npm install -g youtube-mcp-server
   ENV YOUTUBE_API_KEY=your_api_key_here
   CMD ["youtube-mcp-server"]
   ```

2. **Build and run the container**:

   ```bash
   docker build -t youtube-mcp .
   docker run -e YOUTUBE_API_KEY=your_api_key youtube-mcp
   ```

## Platform-Specific Instructions

### Windows

1. **Install Node.js** from [nodejs.org](https://nodejs.org/).
2. Open **PowerShell** as an Administrator.
3. **Install the package**:

   ```powershell
   npm install -g youtube-mcp-server
   ```

### macOS

1. **Install Node.js** (e.g., via Homebrew):

   ```bash
   brew install node
   ```

2. **Install the package**:

   ```bash
   npm install -g youtube-mcp-server
   ```

### Linux

1. **Install Node.js** using your distribution's package manager:

   ```bash
   # For Debian/Ubuntu
   sudo apt update && sudo apt install nodejs npm

   # For Fedora
   sudo dnf install nodejs npm
   ```

2. **Install the package**:

   ```bash
   sudo npm install -g youtube-mcp-server
   ```

## Verification

After installation, verify that the server is working correctly:

1. **Check the version**:

   ```bash
   youtube-mcp-server --version
   ```

2. **Test run the server**:

   ```bash
   YOUTUBE_API_KEY="your_api_key_here" youtube-mcp-server
   ```

   The server should start without errors.

3. **Test in your MCP client**:
   - Restart your MCP client (e.g., Cline, Claude Desktop).
   - Try running a simple command, like listing the available tools.

## Updating the Package

To update the server to the latest version, run:

```bash
npm update -g youtube-mcp-server
```
