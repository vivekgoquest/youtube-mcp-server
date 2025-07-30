/**
 * Simple test to validate ALL tools in one go
 */
import fs from "fs";
import path from "path";
import { REAL_CLIENT } from "./setup.js";
import {
  testToolInterface,
  InterfaceTestResult,
} from "./utils/interface-tester.js";
import { TOOL_TEST_INPUTS } from "./fixtures/test-inputs.js";
import { ToolMetadata, ToolRunner } from "../src/interfaces/tool.js";
import { ToolRegistry } from "../src/registry/tool-registry.js";
import { ErrorHandler } from "../src/utils/error-handler.js";

interface ToolModule {
  default: new (client: any, registry?: any) => ToolRunner<any, any>;
  metadata: ToolMetadata;
}

async function testAllTools() {
  console.log("🚀 Starting test of ALL YouTube MCP Server tools...\n");

  const toolsDir = path.join(process.cwd(), "src/tools");
  const toolFiles = fs
    .readdirSync(toolsDir)
    .filter((file) => file.endsWith(".tool.ts"))
    .sort();

  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    errors: [] as Array<{ tool: string; error: string }>,
  };

  for (const file of toolFiles) {
    const toolName = file.replace(".tool.ts", "").replace(/-/g, "_");
    const modulePath = `../src/tools/${file}`;

    try {
      console.log(`\n📦 Testing ${toolName}...`);

      // Import tool
      const module = (await import(modulePath)) as ToolModule;

      if (!module.default || !module.metadata) {
        throw new Error(`Missing default export or metadata`);
      }

      // Get test inputs
      const testInputs =
        TOOL_TEST_INPUTS[toolName as keyof typeof TOOL_TEST_INPUTS];
      if (!testInputs) {
        throw new Error(`No test inputs found`);
      }

      // Create tool instance
      let toolInstance;
      if (module.metadata.requiresRegistry) {
        const registry = new ToolRegistry();
        toolInstance = new module.default(REAL_CLIENT, registry);
      } else {
        toolInstance = new module.default(REAL_CLIENT);
      }

      // Run interface test
      const result = await testToolInterface(
        toolInstance,
        module.metadata,
        testInputs.minimal,
        {
          skipQuotaCheck: true, // Skip quota checks for this test
          testTimeout: 10000,
        },
      );

      results.total++;

      if (result.success) {
        results.passed++;
        console.log(`✅ ${toolName} - PASSED`);
      } else {
        results.failed++;
        const failedTests = Object.entries(result.tests)
          .filter(([, passed]) => !passed)
          .map(([test]) => test);
        console.log(`❌ ${toolName} - FAILED: ${failedTests.join(", ")}`);
      }

      // Small delay between tests
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      results.total++;
      results.failed++;
      const errorMsg = error instanceof Error ? error.message : String(error);
      results.errors.push({ tool: toolName, error: errorMsg });
      console.log(`❌ ${toolName} - ERROR: ${errorMsg}`);
      ErrorHandler.handleTestError(error, {
        testName: "test-all-tools",
        operation: "execute-tool-test",
      });
    }
  }

  // Print summary
  console.log("\n" + "=".repeat(80));
  console.log("📊 TEST SUMMARY");
  console.log("=".repeat(80));
  console.log(`Total Tools: ${results.total}`);
  console.log(
    `Passed: ${results.passed} (${((results.passed / results.total) * 100).toFixed(1)}%)`,
  );
  console.log(`Failed: ${results.failed}`);

  if (results.errors.length > 0) {
    console.log("\n❌ Errors:");
    results.errors.forEach(({ tool, error }) => {
      console.log(`  - ${tool}: ${error}`);
    });
  }

  console.log("=".repeat(80));

  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run the test
testAllTools().catch((error) => {
  ErrorHandler.handleSystemError(error, {
    component: "test-runner",
    operation: "test-all-tools",
    critical: true,
  });
});
