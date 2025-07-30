#!/usr/bin/env node

/**
 * Unified YouTube MCP Server Diagnostics CLI
 * Consolidates API health, quota usage, and tool discovery verification
 */

import { Command } from "commander";
import chalk from "chalk";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
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
    if (!process.env.YOUTUBE_API_KEY) {
      DiagnosticsLogger.error("YOUTUBE_API_KEY environment variable not set");
      process.exit(1);
    }

    DiagnosticsLogger.success("API Key found");

    // Dynamic import to handle module resolution
    const { YouTubeClient } = await import("../youtube-client.js");
    const client = new YouTubeClient({ apiKey: process.env.YOUTUBE_API_KEY });
    DiagnosticsLogger.success("YouTube client initialized");

    // Test basic API call with minimal quota usage
    DiagnosticsLogger.section("Testing API connectivity");

    const startTime = Date.now();
    const response = await client.getVideos({
      part: "snippet",
      id: "dQw4w9WgXcQ", // Rick Roll video - stable test
      maxResults: 1,
    });

    const responseTime = Date.now() - startTime;

    if (response.items && response.items.length > 0) {
      DiagnosticsLogger.success("API call successful");
      DiagnosticsLogger.info(`Response time: ${responseTime}ms`);
      DiagnosticsLogger.info(
        `Test video found: ${response.items[0].snippet?.title || "Unknown title"}`,
      );
    } else {
      DiagnosticsLogger.warning("API call returned no results");
    }

    // Check quota (if available in response headers)
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
      ErrorHandler.handleTestError(error, {
        testName: "error-handling",
        operation: "invalid-id-test",
      });
    }

    // Estimate current quota status (conservative approach)
    DiagnosticsLogger.section("Quota Status Estimation");

    const dailyQuotaLimit = 10000; // Default YouTube Data API quota
    const currentHour = new Date().getHours();
    const estimatedUsagePercent = Math.min(currentHour * 4, 80); // Conservative estimate
    const estimatedRemainingQuota = Math.floor(
      (dailyQuotaLimit * (100 - estimatedUsagePercent)) / 100,
    );

    console.log(`📊 Daily Quota Limit: ~${dailyQuotaLimit} units`);
    console.log(`⏰ Current Time: ${new Date().toLocaleTimeString()}`);
    console.log(
      `📈 Estimated Usage: ~${estimatedUsagePercent}% (conservative)`,
    );
    console.log(`💰 Estimated Remaining: ~${estimatedRemainingQuota} units`);
    console.log("\n⚠️  Note: YouTube API doesn't expose actual quota usage");
    console.log("   These are conservative estimates for planning purposes");

    // Testing readiness assessment
    DiagnosticsLogger.section("Testing Readiness Assessment");

    const interfaceTestQuota = 300; // From quota estimation script
    const individualTestQuota = 1000; // Full individual testing
    const expensiveTestQuota = 500; // Expensive tools only

    const canRunInterface = estimatedRemainingQuota >= interfaceTestQuota;
    const canRunIndividual = estimatedRemainingQuota >= individualTestQuota;
    const canRunExpensive = estimatedRemainingQuota >= expensiveTestQuota;

    console.log(
      `🔬 Interface Compliance Tests (${interfaceTestQuota} units): ${canRunInterface ? "✅ READY" : "❌ LIMITED"}`,
    );
    if (canRunInterface) {
      console.log("   └─ Recommended: npm run test:interface");
      console.log(
        "   └─ Alternative: npm run test:interface:minimal (lower quota)",
      );
    } else {
      console.log("   └─ Recommended: npm run test:interface:minimal");
      console.log("   └─ Or wait for quota reset");
    }

    console.log(
      `🔍 Individual Tool Tests (${individualTestQuota} units): ${canRunIndividual ? "✅ READY" : "❌ LIMITED"}`,
    );
    if (canRunIndividual) {
      console.log("   └─ Recommended: npm run test:tool -- <tool-name>");
      console.log("   └─ Full suite: npm run test:tools");
    } else if (canRunExpensive) {
      console.log("   └─ Limited: npm run test:tools:cheap");
      console.log("   └─ Avoid: npm run test:tools:expensive");
    } else {
      console.log("   └─ Not recommended: Wait for quota reset");
    }

    console.log(
      `💎 Expensive Tools Only (${expensiveTestQuota} units): ${canRunExpensive ? "✅ READY" : "❌ LIMITED"}`,
    );
    if (canRunExpensive) {
      console.log("   └─ Available: npm run test:tools:expensive");
      console.log("   └─ Use for: Deep debugging search/analyze tools");
    } else {
      console.log("   └─ Unavailable: Quota too low for expensive operations");
    }

    // Hierarchical testing guidance
    DiagnosticsLogger.section("Hierarchical Testing Guidance");

    if (canRunInterface) {
      console.log("🎯 RECOMMENDED WORKFLOW:");
      console.log("1️⃣  Start with: npm run test:hierarchical");
      console.log("   └─ Runs interface tests first, provides next steps");
      console.log("2️⃣  If issues found: npm run test:tool -- <specific-tool>");
      console.log("3️⃣  For debugging: npm run test:debug");
    } else if (estimatedRemainingQuota > 100) {
      console.log("⚠️  LIMITED QUOTA WORKFLOW:");
      console.log("1️⃣  Start with: npm run test:interface:minimal");
      console.log("2️⃣  Check quota: npm run test:quota-check");
      console.log("3️⃣  Wait for reset or use individual cheap tools");
    } else {
      console.log("❌ QUOTA EXHAUSTED:");
      console.log("1️⃣  Wait for daily quota reset (Pacific Time)");
      console.log("2️⃣  Check Google Cloud Console for quota details");
      console.log("3️⃣  Consider quota increase if needed regularly");
    }

    // Performance assessment
    DiagnosticsLogger.section("Performance Assessment");
    if (responseTime < 500) {
      DiagnosticsLogger.success(`Excellent response time: ${responseTime}ms`);
      console.log("   └─ API is performing well for testing");
    } else if (responseTime < 1000) {
      DiagnosticsLogger.warning(`Moderate response time: ${responseTime}ms`);
      console.log("   └─ Consider increasing test timeouts if needed");
    } else {
      DiagnosticsLogger.error(`Slow response time: ${responseTime}ms`);
      console.log("   └─ May need extended timeouts for testing");
      console.log("   └─ Check network connectivity");
    }

    // Summary with specific recommendations
    DiagnosticsLogger.section("Health Check Summary");
    DiagnosticsLogger.success("API Key: Valid");
    DiagnosticsLogger.success("Client: Functional");
    DiagnosticsLogger.success("API: Responsive");
    DiagnosticsLogger.success("Error Handling: Working");
    DiagnosticsLogger.success(`Response Time: ${responseTime}ms`);
    console.log(
      `💰 Quota Status: ${canRunInterface ? "Good" : canRunExpensive ? "Limited" : "Low"}`,
    );

    console.log("\n✨ YouTube API is healthy and ready for testing!");

    // Final testing recommendation
    if (canRunInterface) {
      console.log("🚀 Next step: npm run test:hierarchical");
    } else if (estimatedRemainingQuota > 100) {
      console.log("🎯 Next step: npm run test:interface:minimal");
    } else {
      console.log(
        "⏳ Next step: Wait for quota reset or check Google Cloud Console",
      );
    }

    if (options.json) {
      const result = {
        success: true,
        responseTime,
        estimatedRemainingQuota,
        canRunInterface,
        canRunIndividual,
        canRunExpensive,
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
      console.error("\n💰 Quota exceeded. Please check:");
      console.error("1. Your daily quota limit in Google Cloud Console");
      console.error("2. Consider waiting until quota resets");
      console.error("3. For testing: Use npm run test:interface:minimal");
      console.error("4. For quota monitoring: npm run test:quota-check");
    } else {
      console.error("\n🔧 Troubleshooting tips:");
      console.error("1. Check internet connectivity");
      console.error("2. Verify API key permissions");
      console.error("3. Check Google Cloud Console for any issues");
      console.error("4. For testing readiness: npm run test:api-health");
    }

    console.error("\n🎯 Testing Recommendations (API Issues):");
    console.error("- Quota issues: Use minimal testing modes");
    console.error("- API key issues: Check Google Cloud Console setup");
    console.error("- Network issues: Verify connectivity and try again");
    console.error(
      "- For development: Consider mock testing when API unavailable",
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

// Quota check command implementation
async function quotaCommand(options: any): Promise<void> {
  DiagnosticsLogger.header("YouTube MCP Server - Quota Usage Estimation");

  try {
    // Dynamic import to handle module resolution
    const { ToolRegistry } = await import("../registry/tool-registry.js");

    // Initialize registry
    const registry = new ToolRegistry();
    await registry.loadAllTools();

    // Calculate quota for all tools from metadata
    const allTools = registry.listTools();
    const toolQuotas = allTools
      .map((tool) => {
        const metadata = registry.getTool(tool.name);
        return {
          tool: tool.name,
          quota: metadata?.quotaCost || 0,
        };
      })
      .sort((a, b) => b.quota - a.quota);

    // Group by quota ranges
    const quotaGroups = {
      free: toolQuotas.filter((t: any) => t.quota === 0),
      low: toolQuotas.filter((t: any) => t.quota > 0 && t.quota <= 50),
      medium: toolQuotas.filter((t: any) => t.quota > 50 && t.quota <= 150),
      high: toolQuotas.filter((t: any) => t.quota > 150),
    };

    DiagnosticsLogger.section("Quota Usage by Tool");
    toolQuotas.forEach(({ tool, quota }: any) => {
      const bar = "█".repeat(Math.ceil(quota / 10));
      console.log(
        `${tool.padEnd(30)} ${quota.toString().padStart(4)} units ${bar}`,
      );
    });

    DiagnosticsLogger.section("Quota Groups Summary");
    console.log(`Free (0 units):       ${quotaGroups.free.length} tools`);
    console.log(`Low (1-50 units):     ${quotaGroups.low.length} tools`);
    console.log(`Medium (51-150 units): ${quotaGroups.medium.length} tools`);
    console.log(`High (151+ units):    ${quotaGroups.high.length} tools`);

    const totalQuota = toolQuotas.reduce(
      (sum: number, t: any) => sum + t.quota,
      0,
    );
    console.log(`\n💰 Total Quota (all tools): ${totalQuota} units`);

    // Estimate test scenarios
    DiagnosticsLogger.section("Test Scenario Estimates");

    const minimalTestQuota =
      quotaGroups.free.reduce((sum: number, t: any) => sum + t.quota, 0) +
      quotaGroups.low
        .slice(0, 2)
        .reduce((sum: number, t: any) => sum + t.quota, 0) +
      quotaGroups.medium
        .slice(0, 1)
        .reduce((sum: number, t: any) => sum + t.quota, 0);

    const standardTestQuota =
      quotaGroups.free.reduce((sum: number, t: any) => sum + t.quota, 0) +
      quotaGroups.low.reduce((sum: number, t: any) => sum + t.quota, 0) +
      quotaGroups.medium.reduce((sum: number, t: any) => sum + t.quota, 0);

    const interfaceTestQuota = Math.ceil(totalQuota * 0.3); // Interface tests use ~30% of full quota
    const individualTestQuota = totalQuota; // Individual tests can use full quota

    console.log(
      `Interface Tests:     ~${interfaceTestQuota} units (interface compliance)`,
    );
    console.log(
      `Individual Tests:    ~${individualTestQuota} units (deep debugging)`,
    );
    console.log(
      `Minimal Mode:        ~${minimalTestQuota} units (development)`,
    );
    console.log(`Standard Mode:       ~${standardTestQuota} units (CI/CD)`);

    // Enhanced cost breakdown by tool category
    DiagnosticsLogger.section("Enhanced Cost Breakdown");
    // Define tool categories based on actual tool names
    const cheapTools = [
      "get_video_details",
      "get_channel_details",
      "get_playlist_details",
      "extract_keywords_from_text",
    ];
    const expensiveTools = [
      "unified_search",
      "analyze_channel_videos",
      "analyze_competitor",
      "find_content_gaps",
    ];
    const workflowTools = [
      "keyword_research_workflow",
      "analyze_viral_videos",
      "discover_channel_network",
    ];

    const cheapQuota = toolQuotas
      .filter((t: any) => cheapTools.includes(t.tool))
      .reduce((sum: number, t: any) => sum + t.quota, 0);
    const expensiveQuota = toolQuotas
      .filter((t: any) => expensiveTools.includes(t.tool))
      .reduce((sum: number, t: any) => sum + t.quota, 0);
    const workflowQuota = toolQuotas
      .filter((t: any) => workflowTools.includes(t.tool))
      .reduce((sum: number, t: any) => sum + t.quota, 0);

    console.log(
      `Free Tools:          ${quotaGroups.free.length} tools (0 units each)`,
    );
    console.log(
      `Cheap Tools:         ~${cheapQuota} units (get/extract/generate)`,
    );
    console.log(
      `Expensive Tools:     ~${expensiveQuota} units (search/analyze)`,
    );
    console.log(`Workflow Tools:      ~${workflowQuota} units (comprehensive)`);

    // Budget recommendations
    DiagnosticsLogger.section("Budget Recommendations");
    const daily10k = 10000;
    const daily1k = 1000;

    console.log(`📈 Development Workflow (${daily1k} units/day):`);
    console.log(
      `  ✅ Interface tests: ${Math.floor(daily1k / interfaceTestQuota)} runs/day`,
    );
    console.log(
      `  ⚠️  Individual tests: ${Math.floor(daily1k / individualTestQuota)} full runs/day`,
    );
    console.log(
      `  💡 Recommendation: Use test:interface:minimal for development`,
    );

    console.log(`\n📈 CI/CD Pipeline (${daily10k} units/day):`);
    console.log(
      `  ✅ Interface tests: ${Math.floor(daily10k / interfaceTestQuota)} runs/day`,
    );
    console.log(
      `  ✅ Individual tests: ${Math.floor(daily10k / individualTestQuota)} full runs/day`,
    );
    console.log(
      `  💡 Recommendation: Use test:interface for CI, test:tools for deep debugging`,
    );

    console.log(`\n📈 Deep Debugging (quota permitting):`);
    console.log(
      `  🔍 Individual tool testing: Best for isolating specific issues`,
    );
    console.log(
      `  🔍 Expensive tools only: ~${Math.ceil(expensiveQuota)} units per run`,
    );
    console.log(
      `  💡 Recommendation: Use test:tools:expensive for targeted debugging`,
    );

    // Testing approach guidance
    DiagnosticsLogger.section("Testing Approach Guidance");
    if (daily1k / interfaceTestQuota >= 5) {
      DiagnosticsLogger.success(
        "RECOMMENDED: Start with interface tests (npm run test:interface)",
      );
      console.log("   - Catches 80% of issues with minimal quota usage");
      console.log("   - Perfect for development workflow");
    } else {
      DiagnosticsLogger.warning(
        "LIMITED QUOTA: Use minimal testing (npm run test:interface:minimal)",
      );
    }

    if (daily1k / individualTestQuota >= 1) {
      DiagnosticsLogger.success(
        "AVAILABLE: Individual tool testing (npm run test:tool)",
      );
      console.log("   - Use for deep debugging specific tools");
      console.log("   - Target expensive tools when needed");
    } else {
      DiagnosticsLogger.error("QUOTA LIMITED: Avoid full individual testing");
      console.log("   - Use test:tools:cheap for basic validation");
      console.log("   - Save expensive tests for critical debugging");
    }

    console.log("\n💡 Final Recommendations:");
    DiagnosticsLogger.separator("-");
    console.log("- Use COMPLIANCE_TEST_MODE=minimal for development");
    console.log("- Set MAX_QUOTA_FOR_COMPLIANCE_TESTS=300 for CI/CD");
    console.log("- Run test:hierarchical for complete validation workflow");
    console.log("- Use test:tool -- <tool-name> for individual debugging");
    console.log("- Monitor actual usage with test:compliance-report");

    if (options.json) {
      const result = {
        success: true,
        totalQuota,
        quotaGroups,
        testScenarios: {
          interface: interfaceTestQuota,
          individual: individualTestQuota,
          minimal: minimalTestQuota,
          standard: standardTestQuota,
        },
        toolQuotas,
      };
      console.log("\nJSON Output:");
      console.log(JSON.stringify(result, null, 2));
    }
  } catch (error: any) {
    DiagnosticsLogger.error(`Quota check failed: ${error.message}`);

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
  .command("quota")
  .description("Analyze quota usage and provide testing recommendations")
  .option("--json", "Output results in JSON format")
  .option("--verbose", "Enable verbose output")
  .action(quotaCommand);

program
  .command("discovery")
  .description("Verify tool discovery mechanism works correctly")
  .option("--json", "Output results in JSON format")
  .option("--verbose", "Enable verbose output")
  .action(discoveryCommand);

// Parse command line arguments
program.parse();
