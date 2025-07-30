# System Architecture Overview

This document provides a high-level overview of the YouTube MCP server's architecture, including its plug-and-play tool
discovery system, MCP protocol compliance, and overall design principles.

## Architecture Summary

- **Registry-based Discovery**: The server automatically discovers and registers tool files located in the `src/tools/`
  directory. This allows for a modular and extensible architecture where new tools can be added by simply creating a new file.
- **Dynamic Loading**: Tools are loaded dynamically at runtime using ES module imports. This ensures that the server remains
  lightweight and only loads the necessary code for the requested tools.
- **MCP Protocol Integration**: The server uses the official MCP SDK and communicates over stdio, ensuring full compliance
  with the Model Context Protocol standard.
- **Plug-and-Play Design**: Each tool is designed to be self-contained, with its own metadata, implementation, and
  dependencies. This makes it easy to develop, test, and maintain individual tools without affecting the rest of the system.

## Tool Categories

The server's tools are organized into the following categories:

1. **Search Tools**: For finding videos, channels, playlists, and trending content.
2. **Detail Tools**: For retrieving detailed information about specific YouTube content.
3. **Analysis Tools**: For performing advanced analytics, competitor analysis, and content research.
4. **Keyword Tools**: For text processing, keyword extraction, and research workflows.

## MCP Protocol Compliance

### MCP Protocol Requirements

For proper MCP compliance, the server ensures:

1. **`stdout` must be pure JSON** - No `console.log`, `console.warn`, or `console.error` messages are sent to `stdout`.
2. **`stderr` can be used for debugging** - Debug information is only sent to `stderr` when explicitly requested.
3. **Colored output is disabled** - ANSI color codes are not used in the output to avoid breaking JSON parsing.
4. **All tool responses must be valid JSON** - The server ensures that all responses from tools are correctly formatted as JSON.

### Protocol Fix History

**Issue Identified:** Console output from tool files was interfering with the MCP protocol's JSON communication channel.

**Resolution Applied:**
All `console.log`, `console.warn`, and `console.error` statements have been removed from the tool execution paths. Debug
output is now handled conditionally and directed to `stderr` to prevent interference with the MCP protocol.

```typescript
// Before
console.warn(`Failed to get comments for video ${videoId}:`, error);

// After
// Comment extraction failed - continue without comments
if (process.env.DEBUG_CONSOLE === "true") {
  console.error(`Failed to get comments for video ${videoId}:`, error);
}
```

### Prevention Guidelines

1. **Never use `console.log/warn/error`** in production MCP tools.
2. **Use conditional debug output** only when `DEBUG_CONSOLE=true`.
3. **Direct debug output to `stderr`** using `console.error`.
4. **Test with MCP Inspector** before deploying to ensure protocol compliance.
5. **Monitor client logs** for any JSON parsing errors.
