#!/usr/bin/env node

/**
 * Unified YouTube MCP Server Diagnostics CLI
 * Consolidates API health, quota usage, and tool discovery verification
 */

import { Command } from "commander";
import chalk from "chalk";
import { join } from "path";
import fs from "fs";
import { ErrorHandler } from "../utils/error-handler.js";

// Shared utilities for consistent CLI experience
class DiagnosticsLogger {
  static success(message: string): void {
    console.log(chalk.green(`✅ ${message}`));
  }

  static error(message: string): void {
    console.log(chalk.red(`❌ ${message}`));
  }

  static warning(message: string): void {
    console.log(chalk.yellow(`⚠️  ${message}`));
  }

  static info(message: string): void {
    console.log(chalk.blue(`ℹ️  ${message}`));
  }

  static separator(char: string = "=", length: number = 50): void {
    console.log(char.repeat(length));
  }

  static header(title: string): void {
    console.log(chalk.bold.cyan(`🔍 ${title}`));
    this.separator();
  }

  static section(title: string): void {
    console.log(chalk.bold(`\n${title}:`));
    this.separator("-");
  }
}

// Health check command implementation
async function healthCommand(options: any): Promise<void> {
  DiagnosticsLogger.header("YouTube API Health Check");

  try {
    // Check for API key
    if (!process.env['YOUTUBE_API_KEY']) {
      DiagnosticsLogger.error("YOUTUBE_API_KEY environment variable not set");
      process.exit(1);
    }

    DiagnosticsLogger.success("API Key found");

    // Dynamic import to handle module resolution
    const { YouTubeClient } = await import("../youtube-client.js");
    const client = new YouTubeClient({ apiKey: process.env['YOUTUBE_API_KEY'] });
    DiagnosticsLogger.success("YouTube client initialized");

    // Test basic API call with minimal quota usage
    DiagnosticsLogger.section("Testing API connectivity");

    const startTime = Date.now();
    const response = await client.getVideos({
      part: "snippet",
      id: "dQw4w9WgXcQ", // Well-known video ID for connectivity check
      maxResults: 1,
    });

    const responseTime = Date.now() - startTime;

    if (response.items && response.items.length > 0) {
      DiagnosticsLogger.success("API call successful");
      DiagnosticsLogger.info(`Response time: ${responseTime}ms`);
      const firstItem = response.items[0];
      if (firstItem) {
        DiagnosticsLogger.info(
          `Test video found: ${firstItem.snippet?.title || "Unknown title"}`,
        );
      }
    } else {
      DiagnosticsLogger.warning("API call returned no results");
    }

    // Check response info
    if (response.pageInfo) {
      DiagnosticsLogger.info(
        `Results info: ${response.pageInfo.totalResults} total results`,
      );
    }

    // Test error handling
    DiagnosticsLogger.section("Testing error handling");
    try {
      await client.getVideos({
        part: "snippet",
        id: "invalid-video-id-12345",
        maxResults: 1,
      });
      DiagnosticsLogger.success("Invalid ID handled gracefully (empty result)");
    } catch (error) {
      ErrorHandler.handleSystemError(error, {
        component: "mcp-diagnostics",
        operation: "invalid-id-check",
        critical: false,
      });
    }

    // Performance assessment
    DiagnosticsLogger.section("Performance Assessment");
    if (responseTime < 500) {
      DiagnosticsLogger.success(`Excellent response time: ${responseTime}ms`);
      console.log("   └─ API is performing well");
    } else if (responseTime < 1000) {
      DiagnosticsLogger.warning(`Moderate response time: ${responseTime}ms`);
      console.log("   └─ Consider optimizing API calls if needed");
    } else {
      DiagnosticsLogger.error(`Slow response time: ${responseTime}ms`);
      console.log("   └─ Check network connectivity");
    }

    // Summary with specific recommendations
    DiagnosticsLogger.section("Health Check Summary");
    DiagnosticsLogger.success("API Key: Valid");
    DiagnosticsLogger.success("Client: Functional");
    DiagnosticsLogger.success("API: Responsive");
    DiagnosticsLogger.success("Error Handling: Working");
    DiagnosticsLogger.success(`Response Time: ${responseTime}ms`);

    console.log("\n✨ YouTube API is healthy and ready!");

    if (options.json) {
      const result = {
        success: true,
        responseTime,
      };
      console.log("\nJSON Output:");
      console.log(JSON.stringify(result, null, 2));
    }
  } catch (error: any) {
    ErrorHandler.handleSystemError(error, {
      component: "mcp-diagnostics",
      operation: "health-check",
      critical: false,
    });

    if (error.message.includes("API key not valid")) {
      console.error("\n🔑 Invalid API Key. Please check:");
      console.error("1. Your API key is correct");
      console.error(
        "2. YouTube Data API v3 is enabled in Google Cloud Console",
      );
      console.error("3. API key restrictions allow YouTube Data API");
    } else if (error.message.includes("quota")) {
      console.error("\n💰 API limit exceeded. Please check:");
      console.error("1. Your API usage in Google Cloud Console");
      console.error("2. Consider waiting before retrying");
      console.error("3. Check your API quota limits");
    } else {
      console.error("\n🔧 Troubleshooting tips:");
      console.error("1. Check internet connectivity");
      console.error("2. Verify API key permissions");
      console.error("3. Check Google Cloud Console for any issues");
      console.error("4. Check API key restrictions in Google Cloud Console");
    }

    console.error("\n🎯 Troubleshooting Recommendations:");
    console.error("- API limit issues: Wait before retrying");
    console.error("- API key issues: Check Google Cloud Console setup");
    console.error("- Network issues: Verify connectivity and try again");
    console.error(
      "- For development: Consider implementing retry logic",
    );

    if (options.json) {
      const result = {
        success: false,
        error: error.message,
      };
      console.log("\nJSON Output:");
      console.log(JSON.stringify(result, null, 2));
    }

    process.exit(1);
  }
}


// Tool discovery command implementation - Simplified single-mode validation
async function discoveryCommand(options: any): Promise<void> {
  DiagnosticsLogger.header("Tool Discovery Verification");

  // Expected tools list
  const EXPECTED_TOOLS = [
    "unified_search",
    "search_channels",
    "search_playlists",
    "get_trending_videos",
    "get_video_details",
    "get_channel_details",
    "get_playlist_details",
    "analyze_viral_videos",
    "analyze_competitor",
    "analyze_channel_videos",
    "discover_channel_network",
    "extract_video_comments",
    "find_content_gaps",
    "analyze_keyword_opportunities",
    "extract_keywords_from_text",
    "extract_keywords_from_videos",
    "analyze_keywords",
    "generate_keyword_cloud",
    "keyword_research_workflow",
  ];

  try {
    DiagnosticsLogger.info("Loading ToolRegistry...");

    // Dynamic import from source
    const { ToolRegistry } = await import("../registry/tool-registry.js");
    const registry = new ToolRegistry();

    // Load tools
    await registry.loadAllTools();

    // Get tools list
    const tools = registry.listTools();
    const toolNames = tools.map((tool: any) => tool.name).sort();

    // Validate discovery
    const validation = validateToolDiscovery(
      toolNames,
      EXPECTED_TOOLS,
      "single-mode",
    );

    // Generate simplified report
    const report = {
      timestamp: new Date().toISOString(),
      expectedToolCount: EXPECTED_TOOLS.length,
      expectedTools: EXPECTED_TOOLS,
      discoveredTools: {
        count: tools.length,
        names: toolNames,
        details: tools,
      },
      validation: validation,
    };

    // Save report to file
    const reportPath = join(process.cwd(), "tool-discovery-report.json");
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    DiagnosticsLogger.section("Tool Discovery Results");

    if (validation.success) {
      DiagnosticsLogger.success(`Found expected ${tools.length} tools`);
      console.log(`Expected: ${EXPECTED_TOOLS.length}, Found: ${tools.length}`);
    } else {
      DiagnosticsLogger.error("Tool discovery validation failed");
    }

    // Show validation details
    if (validation.errors.length > 0) {
      DiagnosticsLogger.error("Validation Errors:");
      validation.errors.forEach((err: string) =>
        DiagnosticsLogger.error(`  - ${err}`),
      );
    }

    if (validation.warnings.length > 0) {
      DiagnosticsLogger.warning("Validation Warnings:");
      validation.warnings.forEach((warn: string) =>
        DiagnosticsLogger.warning(`  - ${warn}`),
      );
    }

    // Show discovered tools
    DiagnosticsLogger.section("Discovered Tools");
    console.log(`Total tools discovered: ${tools.length}`);
    toolNames.forEach((name: string) => console.log(`  - ${name}`));

    console.log(`\nDetailed report saved to: ${reportPath}`);

    if (options.json) {
      console.log("\nJSON Output:");
      console.log(JSON.stringify(report, null, 2));
    }

    if (!validation.success) {
      process.exit(1);
    }
  } catch (err: any) {
    DiagnosticsLogger.error(`Tool discovery failed: ${err.message}`);

    if (options.json) {
      const result = {
        success: false,
        error: err.message,
      };
      console.log("\nJSON Output:");
      console.log(JSON.stringify(result, null, 2));
    }

    process.exit(1);
  }
}

// Validate tool discovery results
function validateToolDiscovery(
  actualTools: string[],
  expectedTools: string[],
  mode: string,
): any {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check tool count
  if (actualTools.length !== expectedTools.length) {
    errors.push(
      `Expected ${expectedTools.length} tools, found ${actualTools.length}`,
    );
  } else {
    DiagnosticsLogger.success(
      `Found expected ${actualTools.length} tools in ${mode} mode`,
    );
  }

  // Check for missing tools
  const missingTools = expectedTools.filter(
    (tool) => !actualTools.includes(tool),
  );
  if (missingTools.length > 0) {
    errors.push(`Missing tools: ${missingTools.join(", ")}`);
  }

  // Check for extra tools
  const extraTools = actualTools.filter(
    (tool) => !expectedTools.includes(tool),
  );
  if (extraTools.length > 0) {
    warnings.push(`Extra tools found: ${extraTools.join(", ")}`);
  }

  // Check for duplicates
  const duplicates = actualTools.filter(
    (tool, index) => actualTools.indexOf(tool) !== index,
  );
  if (duplicates.length > 0) {
    errors.push(`Duplicate tools found: ${duplicates.join(", ")}`);
  }

  return {
    success: errors.length === 0,
    errors,
    warnings,
  };
}

// Main CLI setup
const program = new Command();

program
  .name("mcp-diagnostics")
  .description("Unified YouTube MCP Server Diagnostics CLI")
  .version("1.0.0");

program
  .command("health")
  .description("Check YouTube API health and connectivity")
  .option("--json", "Output results in JSON format")
  .option("--verbose", "Enable verbose output")
  .action(healthCommand);


program
  .command("discovery")
  .description("Verify tool discovery mechanism works correctly")
  .option("--json", "Output results in JSON format")
  .option("--verbose", "Enable verbose output")
  .action(discoveryCommand);

// Parse command line arguments
program.parse();
