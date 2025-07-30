import fs from "fs";
import path from "path";
import { REAL_CLIENT } from "./setup.js";
import {
  testToolInterface,
  InterfaceTestResult,
  ValidationOptions,
} from "./utils/interface-tester.js";
import { TOOL_TEST_INPUTS } from "./fixtures/test-inputs.js";
import { ToolMetadata, ToolRunner } from "../src/interfaces/tool.js";
import { ToolRegistry } from "../src/registry/tool-registry.js";
import { ErrorHandler } from "../src/utils/error-handler.js";

interface ToolModule {
  default: new (client: any, registry?: any) => ToolRunner<any, any>;
  metadata: ToolMetadata;
}

interface TestReport {
  totalTools: number;
  passedTools: number;
  failedTools: number;
  toolResults: InterfaceTestResult[];
  errors: Array<{ tool: string; error: string }>;
}

describe("Tool Interface Compliance Tests", () => {
  let allTools: Array<{ name: string; module: ToolModule }> = [];
  let testReport: TestReport;

  beforeAll(async () => {
    console.log("🚀 Starting Tool Interface Compliance Tests...\n");

    // List all tool files from the source directory
    const toolsDir = path.join(process.cwd(), "src/tools");
    const toolFiles = fs
      .readdirSync(toolsDir)
      .filter((file) => file.endsWith(".tool.ts"))
      .sort();

    // Import all tools
    for (const file of toolFiles) {
      const toolName = file.replace(".tool.ts", "").replace(/-/g, "_");
      const modulePath = `../src/tools/${file}`;

      try {
        const module = (await import(modulePath)) as ToolModule;

        if (!module.default || !module.metadata) {
          console.error(`Tool ${toolName} missing default export or metadata`);
          continue;
        }

        allTools.push({
          name: toolName,
          module,
        });

        console.log(`✓ Imported ${toolName}`);
      } catch (error) {
        ErrorHandler.handleTestError(error, {
          testName: "tool-interface-compliance",
          operation: "import-tool",
        });
      }
    }

    // Initialize test report
    testReport = {
      totalTools: allTools.length,
      passedTools: 0,
      failedTools: 0,
      toolResults: [],
      errors: [],
    };

    console.log(`\n🔍 Discovered ${allTools.length} tools for testing\n`);
  });

  afterAll(() => {
    console.log("\n" + "=".repeat(80));
    console.log("📋 TOOL INTERFACE COMPLIANCE TEST REPORT");
    console.log("=".repeat(80));
    console.log(`Total Tools: ${testReport.totalTools}`);
    console.log(`Passed: ${testReport.passedTools}`);
    console.log(`Failed: ${testReport.failedTools}`);
    console.log(
      `Success Rate: ${testReport.totalTools > 0 ? ((testReport.passedTools / testReport.totalTools) * 100).toFixed(1) : 0}%`,
    );

    if (testReport.errors.length > 0) {
      console.log("\n❌ Errors:");
      testReport.errors.forEach(({ tool, error }) => {
        console.log(`  - ${tool}: ${error}`);
      });
    }

    console.log("\n📊 Results:");
    testReport.toolResults.forEach((result) => {
      const status = result.success ? "✅" : "❌";
      const tests = Object.entries(result.tests)
        .map(([test, passed]) => `${test}:${passed ? "✓" : "✗"}`)
        .join(" ");
      console.log(`  ${status} ${result.tool} (${tests})`);
    });

    console.log("=".repeat(80));
  });

  // Test ALL tools in a single test
  describe("All Tools", () => {
    test("should test all tools for interface compliance", async () => {
      for (const toolInfo of allTools) {
        await testSingleTool(toolInfo);
      }
    }, 300000); // 5 minute timeout for all tools
  });

  // Helper function to test a single tool
  async function testSingleTool(toolInfo: {
    name: string;
    module: ToolModule;
  }) {
    const { name: toolName, module } = toolInfo;

    try {
      console.log(`🧪 Testing ${toolName}...`);

      // Get test inputs for this tool
      const testInputs =
        TOOL_TEST_INPUTS[toolName as keyof typeof TOOL_TEST_INPUTS];
      if (!testInputs) {
        throw new Error(`No test inputs found for tool: ${toolName}`);
      }

      // Create tool instance
      let toolInstance;
      if (module.metadata.requiresRegistry) {
        const registry = new ToolRegistry();
        toolInstance = new module.default(REAL_CLIENT, registry);
      } else {
        toolInstance = new module.default(REAL_CLIENT);
      }

      // Run interface compliance test with relaxed options
      const options: ValidationOptions = {
        skipQuotaCheck: true, // Skip all quota restrictions
        testTimeout: 15000,
      };

      const result = await testToolInterface(
        toolInstance,
        module.metadata,
        testInputs.minimal,
        options,
      );

      testReport.toolResults.push(result);

      if (result.success) {
        testReport.passedTools++;
        console.log(`✅ ${toolName} - PASSED`);
      } else {
        testReport.failedTools++;
        const failedTests = Object.entries(result.tests)
          .filter(([, passed]) => !passed)
          .map(([test]) => test);
        console.log(`❌ ${toolName} - FAILED: ${failedTests.join(", ")}`);
      }

      // Small delay between tests
      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(result.success).toBe(true);
    } catch (error) {
      testReport.failedTools++;
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      testReport.errors.push({ tool: toolName, error: errorMessage });

      console.error(`❌ ${toolName} - ERROR: ${errorMessage}`);
      ErrorHandler.handleTestError(error, {
        testName: "tool-interface-compliance",
        operation: "execute-tool",
      });
    }
  }

  // Validate tool discovery and setup
  describe("Tool Discovery", () => {
    test("should discover all expected tools", () => {
      expect(allTools.length).toBeGreaterThan(0);
      expect(allTools.length).toBeGreaterThan(10);
      console.log(`✅ Successfully discovered ${allTools.length} tools`);
    });

    test("should have valid metadata for all tools", () => {
      allTools.forEach(({ name, module }) => {
        expect(module.metadata).toBeDefined();
        expect(module.metadata.name).toBe(name);
        expect(module.metadata.description).toBeTruthy();
        expect(module.metadata.inputSchema).toBeDefined();
      });
    });

    test("should have quotaCost defined in metadata for all tools", () => {
      const missingQuotaCost: string[] = [];

      allTools.forEach(({ name, module }) => {
        if (
          module.metadata.quotaCost === undefined ||
          module.metadata.quotaCost === null
        ) {
          missingQuotaCost.push(name);
        } else if (
          typeof module.metadata.quotaCost !== "number" ||
          module.metadata.quotaCost < 0
        ) {
          missingQuotaCost.push(
            `${name} (invalid value: ${module.metadata.quotaCost})`,
          );
        }
      });

      if (missingQuotaCost.length > 0) {
        console.error("❌ Tools missing or having invalid quotaCost:");
        missingQuotaCost.forEach((toolName) =>
          console.error(`  - ${toolName}`),
        );
      }

      expect(missingQuotaCost).toHaveLength(0);
    });

    test("should have test inputs for all tools", () => {
      allTools.forEach(({ name }) => {
        const testInputs =
          TOOL_TEST_INPUTS[name as keyof typeof TOOL_TEST_INPUTS];
        expect(testInputs).toBeDefined();
        expect(testInputs.minimal).toBeDefined();
      });
    });
  });
});
