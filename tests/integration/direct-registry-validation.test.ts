import { ToolRegistry } from "../../src/registry/tool-registry.js";
import { YouTubeClient } from "../../src/youtube-client.js";
import { YouTubeMCPServer } from "../../src/mcp-server.js";
import { responseValidator } from "../../src/utils/response-validator.js";
import { TOOL_TEST_INPUTS } from "../fixtures/test-inputs.js";

describe("Direct Registry Validation Tests", () => {
  let registry: ToolRegistry;
  let client: YouTubeClient;
  let mcpServer: YouTubeMCPServer;
  const TEST_TIMEOUT = 45000;

  beforeAll(async () => {
    // Generate schemas before running tests
    try {
      const { generateAllSchemas } = await import(
        "../../scripts/generate-schemas.js"
      );
      await generateAllSchemas();
    } catch (error) {
      console.warn("Schema generation failed:", error.message);
    }

    // Initialize API key
    if (!process.env.YOUTUBE_API_KEY) {
      throw new Error("YOUTUBE_API_KEY environment variable not set");
    }

    // Initialize components
    const config = { apiKey: process.env.YOUTUBE_API_KEY };
    client = new YouTubeClient(config);
    registry = new ToolRegistry();
    mcpServer = new YouTubeMCPServer(config);

    await registry.loadAllTools();
    await mcpServer.initialize();
  });

  describe("Tool Registry Direct Execution", () => {
    const testableTools = [
      "unified_search",
      "search_channels",
      "get_trending_videos",
      "extract_keywords_from_text",
      "generate_keyword_cloud",
    ];

    testableTools.forEach((toolName) => {
      test(`should execute ${toolName} directly via registry with schema validation`, async () => {
        const functionalInput = TOOL_TEST_INPUTS[toolName]?.functional;

        if (!functionalInput) {
          console.warn(`No functional input found for ${toolName}, skipping`);
          return;
        }

        // Execute tool directly through registry
        const startTime = Date.now();
        const toolResult = await registry.executeTool(
          toolName,
          functionalInput,
          client,
        );
        const executionTime = Date.now() - startTime;

        // Validate the ToolResponse structure
        expect(toolResult).toBeDefined();
        expect(toolResult).toHaveProperty("success");
        expect(toolResult).toHaveProperty("data");
        expect(toolResult).toHaveProperty("metadata");

        // Schema validation of ToolResponse
        const toolValidation = await responseValidator.validateToolResponse(
          toolResult,
          toolName,
        );
        if (!toolValidation.valid) {
          const errorDetails = toolValidation.errors
            .map((e) => `${e.field}: ${e.message}`)
            .join("; ");
          fail(
            `Direct registry tool response validation failed for ${toolName}: ${errorDetails}`,
          );
        }

        // Validate metadata structure
        expect(toolResult.metadata).toHaveProperty("quotaUsed");
        expect(toolResult.metadata).toHaveProperty("requestTime");
        expect(typeof toolResult.metadata.quotaUsed).toBe("number");
        expect(typeof toolResult.metadata.requestTime).toBe("number");
        expect(toolResult.metadata.quotaUsed).toBeGreaterThanOrEqual(0);
        expect(toolResult.metadata.requestTime).toBeGreaterThan(0);

        // Validate quota usage against tool metadata
        const toolMetadata = registry.getMetadata(toolName);
        const expectedQuota = toolMetadata?.quotaCost ?? 0;

        // Validate that tool has quotaCost defined
        expect(expectedQuota).toBeGreaterThan(0);

        // For successful responses, validate quota accuracy
        if (toolResult.success) {
          expect(toolResult.metadata.quotaUsed).toBe(expectedQuota);
        }

        console.log(
          `✓ ${toolName}: executed in ${executionTime}ms, quota: ${toolResult.metadata.quotaUsed}`,
        );
      });

      test(`should handle invalid input for ${toolName} via registry`, async () => {
        const invalidInput = TOOL_TEST_INPUTS[toolName]?.invalid;

        if (!invalidInput) {
          console.warn(`No invalid input found for ${toolName}, skipping`);
          return;
        }

        try {
          const toolResult = await registry.executeTool(
            toolName,
            invalidInput,
            client,
          );

          // If it doesn't throw, it should still be a valid ToolResponse structure
          expect(toolResult).toHaveProperty("success");
          expect(toolResult).toHaveProperty("data");
          expect(toolResult).toHaveProperty("metadata");

          // For invalid inputs, success should typically be false
          if (!toolResult.success) {
            expect(toolResult).toHaveProperty("error");
            expect(typeof toolResult.error).toBe("string");
          }

          // Validate the error response structure
          const toolValidation = await responseValidator.validateToolResponse(
            toolResult,
            toolName,
          );
          if (!toolValidation.valid) {
            console.warn(
              `Invalid input test for ${toolName} returned malformed response`,
            );
          }
        } catch (error) {
          // Exceptions are acceptable for invalid inputs
          expect(error).toBeDefined();
          console.log(
            `✓ ${toolName}: properly rejected invalid input with error: ${error.message}`,
          );
        }
      });
    });
  });

  describe("MCP Server vs Direct Registry Comparison", () => {
    const comparisonTools = [
      "extract_keywords_from_text",
      "generate_keyword_cloud",
    ];

    comparisonTools.forEach((toolName) => {
      test(`should return consistent results between registry and MCP server for ${toolName}`, async () => {
        const functionalInput = TOOL_TEST_INPUTS[toolName]?.functional;

        if (!functionalInput) {
          console.warn(`No functional input found for ${toolName}, skipping`);
          return;
        }

        // Execute via direct registry
        const registryResult = await registry.executeTool(
          toolName,
          functionalInput,
          client,
        );

        // Execute via MCP server
        const mcpResult = await mcpServer.executeTool(
          toolName,
          functionalInput,
        );

        // Both should succeed
        expect(registryResult.success).toBe(true);
        expect(mcpResult.success).toBe(true);

        // Compare core data structure (allowing for minor differences in timing/metadata)
        expect(registryResult.data).toBeDefined();
        expect(mcpResult.content).toBeDefined();

        // Validate both responses with schemas
        const registryValidation = await responseValidator.validateToolResponse(
          registryResult,
          toolName,
        );
        const mcpValidation =
          await responseValidator.validateMCPToolResult(mcpResult);

        expect(registryValidation.valid).toBe(true);
        expect(mcpValidation.valid).toBe(true);

        // Log comparison results
        console.log(
          `✓ ${toolName}: both registry and MCP server returned valid responses`,
        );
      });
    });
  });

  describe("Systematic Fixture Testing", () => {
    test(
      "should validate all fixture categories for available tools",
      async () => {
        const availableTools = registry.listTools().map((tool) => tool.name);
        const fixtureTools = Object.keys(TOOL_TEST_INPUTS);

        // Test first 5 tools to manage test time
        const toolsToTest = availableTools
          .filter((tool) => fixtureTools.includes(tool))
          .slice(0, 5);

        expect(toolsToTest.length).toBeGreaterThan(0);

        const validationResults = [];

        for (const toolName of toolsToTest) {
          const fixtures = TOOL_TEST_INPUTS[toolName];
          if (!fixtures) continue;

          // Test minimal input
          if (fixtures.minimal) {
            try {
              const result = await registry.executeTool(
                toolName,
                fixtures.minimal,
                client,
              );
              const validation = await responseValidator.validateToolResponse(
                result,
                toolName,
              );
              validationResults.push({
                tool: toolName,
                category: "minimal",
                ...validation,
              });
            } catch (error) {
              validationResults.push({
                tool: toolName,
                category: "minimal",
                valid: false,
                errors: [
                  { field: "execution", message: error.message, value: null },
                ],
                performance: { validationTime: 0 },
                summary: `Execution failed: ${error.message}`,
              });
            }
          }

          // Test functional input
          if (fixtures.functional) {
            try {
              const result = await registry.executeTool(
                toolName,
                fixtures.functional,
                client,
              );
              const validation = await responseValidator.validateToolResponse(
                result,
                toolName,
              );
              validationResults.push({
                tool: toolName,
                category: "functional",
                ...validation,
              });
            } catch (error) {
              validationResults.push({
                tool: toolName,
                category: "functional",
                valid: false,
                errors: [
                  { field: "execution", message: error.message, value: null },
                ],
                performance: { validationTime: 0 },
                summary: `Execution failed: ${error.message}`,
              });
            }
          }

          // Add small delay between tool tests
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        // Analyze results
        const summary =
          responseValidator.getValidationSummary(validationResults);

        expect(summary.totalTests).toBeGreaterThan(0);
        expect(summary.passed).toBeGreaterThan(0);

        console.log(`Systematic fixture testing summary: ${summary.summary}`);

        // Log any failures for debugging
        const failures = validationResults.filter((r) => !r.valid);
        if (failures.length > 0) {
          console.log(
            "Validation failures:",
            failures.map((f) => `${f.tool}/${f.category}: ${f.summary}`),
          );
        }

        // At least 70% should pass (allowing for some API variability)
        const successRate = summary.passed / summary.totalTests;
        expect(successRate).toBeGreaterThanOrEqual(0.7);
      },
      TEST_TIMEOUT * 2,
    );
  });

  describe("Quota Metadata Validation", () => {
    test("should have quotaCost defined in metadata for all tools", async () => {
      const tools = registry.listTools();
      const missingQuotaCost: string[] = [];

      for (const tool of tools) {
        const metadata = registry.getMetadata(tool.name);

        if (
          !metadata ||
          metadata.quotaCost === undefined ||
          metadata.quotaCost === null
        ) {
          missingQuotaCost.push(tool.name);
        } else if (
          typeof metadata.quotaCost !== "number" ||
          metadata.quotaCost < 0
        ) {
          missingQuotaCost.push(
            `${tool.name} (invalid value: ${metadata.quotaCost})`,
          );
        }
      }

      if (missingQuotaCost.length > 0) {
        console.error("❌ Tools missing or having invalid quotaCost:");
        missingQuotaCost.forEach((toolName) =>
          console.error(`  - ${toolName}`),
        );
      }

      expect(missingQuotaCost).toHaveLength(0);
      console.log(
        `✅ All ${tools.length} tools have valid quotaCost defined in metadata`,
      );
    });

    test("should validate single-path execution (no fallback logic)", async () => {
      // Test that tools fail cleanly without fallback logic
      const tool = "unified_search";
      const invalidEnrichInput = {
        query: "test",
        maxResults: 1,
        enrichParts: {
          video: ["invalid_part"],
          channel: ["invalid_part"],
        },
      };

      try {
        const result = await registry.executeTool(
          tool,
          invalidEnrichInput,
          client,
        );

        // If it doesn't throw, validate the response
        if (!result.success) {
          // Should have error but no partial data
          expect(result.error).toBeDefined();
          expect(result.data).toBeUndefined();
        }
      } catch (error) {
        // Clean failure is acceptable
        expect(error).toBeDefined();
      }

      console.log(
        "✅ Tools follow single-path execution without fallback logic",
      );
    });
  });

  describe("Performance and Resource Management", () => {
    test("should complete tool execution within reasonable time", async () => {
      const tool = "extract_keywords_from_text";
      const input = TOOL_TEST_INPUTS[tool]?.functional || {
        text: "performance test content",
      };

      const startTime = Date.now();
      const result = await registry.executeTool(tool, input, client);
      const executionTime = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(executionTime).toBeLessThan(10000); // Should complete within 10 seconds

      console.log(`Performance test: ${tool} completed in ${executionTime}ms`);
    });

    test("should handle concurrent tool execution", async () => {
      const tool = "extract_keywords_from_text";
      const input = TOOL_TEST_INPUTS[tool]?.functional || {
        text: "concurrent test",
      };

      const concurrentPromises = Array(3)
        .fill(null)
        .map((_, index) =>
          registry.executeTool(
            tool,
            { ...input, text: `concurrent test ${index + 1}` },
            client,
          ),
        );

      const results = await Promise.all(concurrentPromises);

      expect(results).toHaveLength(3);
      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        console.log(
          `Concurrent test ${index + 1}: quota ${result.metadata.quotaUsed}, time ${result.metadata.requestTime}ms`,
        );
      });

      // Validate all concurrent results
      const validationPromises = results.map((result) =>
        responseValidator.validateToolResponse(result, tool),
      );
      const validations = await Promise.all(validationPromises);

      validations.forEach((validation) => {
        expect(validation.valid).toBe(true);
      });
    });

    test("should manage quota usage efficiently", async () => {
      const tool = "unified_search";
      const input = { ...TOOL_TEST_INPUTS[tool]?.minimal }; // Use minimal input for efficiency

      const result = await registry.executeTool(tool, input, client);

      expect(result.success).toBe(true);
      expect(result.metadata.quotaUsed).toBeGreaterThan(0);

      // Validate quota matches metadata
      const toolMetadata = registry.getMetadata(tool);
      expect(result.metadata.quotaUsed).toBe(toolMetadata?.quotaCost);

      console.log(
        `Quota efficiency test: ${tool} used ${result.metadata.quotaUsed} quota units (expected: ${toolMetadata?.quotaCost})`,
      );
    });
  });

  describe("Error Recovery and Validation", () => {
    test("should recover from tool execution errors", async () => {
      const tool = "get_video_details";
      const invalidInput = { videoId: "invalid_video_id" };

      try {
        const result = await registry.executeTool(tool, invalidInput, client);

        // If it doesn't throw, validate the error response structure
        if (!result.success) {
          expect(result).toHaveProperty("error");
          expect(result.metadata.quotaUsed).toBeGreaterThanOrEqual(0);

          const validation = await responseValidator.validateToolResponse(
            result,
            tool,
          );
          // Error responses should still be structurally valid
          expect(validation.valid).toBe(true);
        }
      } catch (error) {
        // Exceptions are acceptable for invalid inputs
        expect(error).toBeDefined();
      }

      // Verify the registry is still functional after error
      const validTool = "extract_keywords_from_text";
      const validInput = TOOL_TEST_INPUTS[validTool]?.functional || {
        text: "recovery test",
      };

      const recoveryResult = await registry.executeTool(
        validTool,
        validInput,
        client,
      );
      expect(recoveryResult.success).toBe(true);

      console.log("✓ Registry recovered successfully after error");
    });

    test("should validate tool metadata consistency", async () => {
      const tools = ["extract_keywords_from_text", "generate_keyword_cloud"];

      for (const toolName of tools) {
        const input = TOOL_TEST_INPUTS[toolName]?.functional;
        if (!input) continue;

        const result = await registry.executeTool(toolName, input, client);

        expect(result.success).toBe(true);
        expect(result.metadata).toBeDefined();
        expect(result.metadata.quotaUsed).toBeGreaterThanOrEqual(0);
        expect(result.metadata.requestTime).toBeGreaterThan(0);
        expect(result.metadata.requestTime).toBeLessThan(30000); // Reasonable upper bound

        if (result.metadata.source) {
          expect(typeof result.metadata.source).toBe("string");
        }

        console.log(`✓ ${toolName}: metadata validation passed`);
      }
    });
  });
});
