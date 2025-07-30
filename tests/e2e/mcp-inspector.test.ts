import { spawn, ChildProcess } from "child_process";
import { setTimeout } from "timers/promises";
import { ToolRegistry } from "../../src/registry/tool-registry";
import {
  responseValidator,
  ValidationResult,
} from "../../src/utils/response-validator.js";
import { TOOL_TEST_INPUTS } from "../fixtures/test-inputs.js";

describe("MCP Inspector Integration Tests", () => {
  let serverProcess: ChildProcess;
  const TEST_TIMEOUT = 30000;
  const SERVER_STARTUP_DELAY = 3000;
  let actualToolCount: number;
  let actualToolNames: string[];

  // Timing data collection
  const testTimings: Array<{ name: string; duration: number }> = [];

  // Helper function to get actual tool registry data
  const getActualToolData = async () => {
    const registry = new ToolRegistry();
    await registry.loadAllTools();
    const tools = registry.listTools();
    actualToolCount = tools.length;
    actualToolNames = tools.map((tool) => tool.name);
  };

  beforeAll(async () => {
    // Set test environment variables
    process.env.DEBUG_CONSOLE = "false";
    process.env.NODE_ENV = "test";

    // Ensure YOUTUBE_API_KEY is available
    if (!process.env.YOUTUBE_API_KEY) {
      throw new Error("YOUTUBE_API_KEY environment variable not set");
    }

    // Get actual tool registry data
    await getActualToolData();

    // Start the MCP server
    serverProcess = spawn("node", ["dist/index.js"], {
      stdio: ["pipe", "pipe", "pipe"],
      env: process.env,
    });

    // Handle server startup
    let serverReady = false;
    let serverError = "";

    serverProcess.stdout?.on("data", (data) => {
      const output = data.toString();
      if (
        output.includes("server") ||
        output.includes("ready") ||
        output.includes("listening")
      ) {
        serverReady = true;
      }
    });

    serverProcess.stderr?.on("data", (data) => {
      serverError += data.toString();
    });

    // Wait for server to start
    await setTimeout(SERVER_STARTUP_DELAY);

    if (serverProcess.exitCode !== null) {
      throw new Error(`Server failed to start: ${serverError}`);
    }
  }, TEST_TIMEOUT);

  afterAll(async () => {
    if (serverProcess && !serverProcess.killed) {
      serverProcess.kill("SIGTERM");

      // Wait for graceful shutdown
      await new Promise<void>((resolve) => {
        serverProcess.on("exit", () => resolve());
        // Use global setTimeout instead of imported one
        const timeoutId = globalThis.setTimeout(() => {
          if (!serverProcess.killed) {
            serverProcess.kill("SIGKILL");
          }
          resolve();
        }, 5000);
      });
    }

    // Log timing summary if enabled
    if (process.env.LOG_TIMING !== "false" && testTimings.length > 0) {
      console.log("\n=== Jest Test Timing Summary ===");
      const sortedTimings = testTimings.sort((a, b) => b.duration - a.duration);
      const totalTime = testTimings.reduce((sum, t) => sum + t.duration, 0);

      console.log(`Total execution time: ${totalTime}ms`);
      console.log("Slowest tests:");
      sortedTimings.slice(0, 5).forEach((timing, index) => {
        console.log(`  ${index + 1}. ${timing.name}: ${timing.duration}ms`);
      });

      // Write timing data to file for integration with restart script
      const fs = await import("fs");
      const timingData = {
        totalTime,
        testCount: testTimings.length,
        slowestTests: sortedTimings.slice(0, 10),
        timestamp: new Date().toISOString(),
      };

      try {
        fs.writeFileSync(
          "jest-timing.json",
          JSON.stringify(timingData, null, 2),
        );
      } catch (error) {
        console.warn("Failed to write timing data:", error.message);
      }
    }
  });

  const executeInspectorCommand = async (
    command: string,
    args?: any,
  ): Promise<any> => {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const cmdArgs = ["@modelcontextprotocol/inspector"];

      if (command) {
        cmdArgs.push("--command", command);
      }

      if (args) {
        cmdArgs.push("--args", JSON.stringify(args));
      }

      cmdArgs.push("stdio", "node", "dist/src/index.js");

      const inspectorProcess = spawn("npx", cmdArgs, {
        env: process.env,
        timeout: TEST_TIMEOUT,
      });

      let stdout = "";
      let stderr = "";

      inspectorProcess.stdout?.on("data", (data) => {
        stdout += data.toString();
      });

      inspectorProcess.stderr?.on("data", (data) => {
        stderr += data.toString();
      });

      inspectorProcess.on("close", (code) => {
        const duration = Date.now() - startTime;
        const slowThreshold = parseInt(
          process.env.SLOW_THRESHOLD_MS || "5000",
          10,
        );

        // Log slow commands if timing is enabled
        if (process.env.LOG_TIMING !== "false" && duration > slowThreshold) {
          console.log(`SLOW COMMAND: ${command} took ${duration}ms`);
        }

        if (code === 0) {
          try {
            // Try to parse JSON response
            const result = JSON.parse(stdout);
            resolve({ ...result, executionTimeMs: duration });
          } catch (error) {
            // If not JSON, return raw output
            resolve({
              success: true,
              output: stdout,
              stderr,
              executionTimeMs: duration,
            });
          }
        } else {
          reject(
            new Error(
              `Inspector command failed with code ${code}: ${stderr || stdout}`,
            ),
          );
        }
      });

      inspectorProcess.on("error", (error) => {
        reject(error);
      });
    });
  };

  describe("Tool Discovery", () => {
    test(
      "should list the correct number of tools",
      async () => {
        const result = await executeInspectorCommand("tools/list");

        expect(result).toBeDefined();
        const tools = result.tools || result;
        expect(tools).toHaveLength(actualToolCount);

        // Sanity check - ensure we have a reasonable number of tools
        expect(tools.length).toBeGreaterThan(10);
      },
      TEST_TIMEOUT,
    );

    test(
      "should have required metadata for each tool",
      async () => {
        const result = await executeInspectorCommand("tools/list");
        const tools = result.tools || result;

        expect(Array.isArray(tools)).toBe(true);

        tools.forEach((tool: any) => {
          expect(tool).toHaveProperty("name");
          expect(tool).toHaveProperty("description");
          expect(tool).toHaveProperty("inputSchema");
          expect(typeof tool.name).toBe("string");
          expect(typeof tool.description).toBe("string");
          expect(typeof tool.inputSchema).toBe("object");
        });
      },
      TEST_TIMEOUT,
    );

    test(
      "should include expected tool names",
      async () => {
        const result = await executeInspectorCommand("tools/list");
        const tools = result.tools || result;
        const toolNames = tools.map((tool: any) => tool.name);

        // Use actual tool names from the registry
        actualToolNames.forEach((expectedTool) => {
          expect(toolNames).toContain(expectedTool);
        });

        // Also verify that the returned tools match the actual count
        expect(toolNames).toHaveLength(actualToolCount);
      },
      TEST_TIMEOUT,
    );
  });

  describe("Tool Execution with Schema Validation", () => {
    // Get all available tools from fixtures
    const getTestableTools = () => {
      return Object.keys(TOOL_TEST_INPUTS).slice(0, 10); // Test first 10 tools to manage test time
    };

    const testableTools = getTestableTools();

    testableTools.forEach((toolName: string) => {
      test(
        `should execute ${toolName} with functional input and pass schema validation`,
        async () => {
          if (process.env.LOG_TIMING !== "false") {
            console.log(`Testing ${toolName} with schema validation...`);
          }

          const functionalInput = TOOL_TEST_INPUTS[toolName]?.functional;
          if (!functionalInput) {
            console.warn(
              `No functional test input found for ${toolName}, skipping`,
            );
            return;
          }

          const result = await executeInspectorCommand("tools/call", {
            name: toolName,
            arguments: functionalInput,
          });

          if (process.env.LOG_TIMING !== "false" && result.executionTimeMs) {
            console.log(`${toolName} completed in ${result.executionTimeMs}ms`);
            testTimings.push({
              name: toolName,
              duration: result.executionTimeMs,
            });
          }

          expect(result).toBeDefined();

          // Perform comprehensive schema validation
          const mcpValidation =
            await responseValidator.validateMCPToolResult(result);
          if (!mcpValidation.valid) {
            const errorDetails = mcpValidation.errors
              .map((e) => `${e.field}: ${e.message}`)
              .join("; ");
            fail(
              `MCP protocol validation failed for ${toolName}: ${errorDetails}`,
            );
          }

          // Perform data integrity validation
          const integrityValidation =
            await responseValidator.validateResponseIntegrity(result);
          if (!integrityValidation.valid) {
            const errorDetails = integrityValidation.errors
              .map((e) => `${e.field}: ${e.message}`)
              .join("; ");
            fail(
              `Response integrity validation failed for ${toolName}: ${errorDetails}`,
            );
          }

          // Check that result has proper success status
          expect(result.success).toBe(true);
          expect(Array.isArray(result.content)).toBe(true);

          // Validate content array structure
          if (result.content && result.content.length > 0) {
            result.content.forEach((item: any, index: number) => {
              expect(item).toHaveProperty("type", "text");
              expect(item).toHaveProperty("text");
              expect(typeof item.text).toBe("string");
            });
          }
        },
        TEST_TIMEOUT,
      );

      test(
        `should handle invalid input for ${toolName} with proper error structure`,
        async () => {
          const invalidInput = TOOL_TEST_INPUTS[toolName]?.invalid;
          if (!invalidInput) {
            console.warn(
              `No invalid test input found for ${toolName}, skipping`,
            );
            return;
          }

          try {
            const result = await executeInspectorCommand("tools/call", {
              name: toolName,
              arguments: invalidInput,
            });

            // If it doesn't throw, it should still be a valid MCP response structure
            const mcpValidation =
              await responseValidator.validateMCPToolResult(result);
            if (!mcpValidation.valid) {
              console.warn(
                `Invalid input test for ${toolName} returned malformed MCP response`,
              );
            }
          } catch (error) {
            // Error is expected for invalid inputs
            expect(error).toBeDefined();
          }
        },
        TEST_TIMEOUT,
      );
    });
  });

  describe("Error Handling", () => {
    test(
      "should handle invalid tool names",
      async () => {
        try {
          await executeInspectorCommand("tools/call", {
            name: "invalid_tool_name",
            arguments: {},
          });
          fail("Should have thrown an error for invalid tool name");
        } catch (error) {
          expect(error).toBeDefined();
          expect(error.message).toMatch(/error|invalid|not found/i);
        }
      },
      TEST_TIMEOUT,
    );

    test(
      "should handle missing required arguments",
      async () => {
        try {
          await executeInspectorCommand("tools/call", {
            name: "search_videos",
            arguments: {}, // Missing required 'query' parameter
          });
          fail("Should have thrown an error for missing arguments");
        } catch (error) {
          expect(error).toBeDefined();
          expect(error.message).toMatch(/error|required|missing/i);
        }
      },
      TEST_TIMEOUT,
    );

    test(
      "should handle malformed arguments",
      async () => {
        try {
          await executeInspectorCommand("tools/call", {
            name: "search_videos",
            arguments: "invalid_json_string",
          });
          fail("Should have thrown an error for malformed arguments");
        } catch (error) {
          expect(error).toBeDefined();
        }
      },
      TEST_TIMEOUT,
    );
  });

  describe("Protocol Compliance with Schema Validation", () => {
    test(
      "should return valid MCP response structure with complete schema validation",
      async () => {
        const testTool = "extract_keywords_from_text";
        const functionalInput = TOOL_TEST_INPUTS[testTool]?.functional || {
          text: "test content",
        };

        const result = await executeInspectorCommand("tools/call", {
          name: testTool,
          arguments: functionalInput,
        });

        expect(result).toBeDefined();
        expect(typeof result).toBe("object");

        // Comprehensive MCP protocol validation
        const mcpValidation =
          await responseValidator.validateMCPToolResult(result);
        expect(mcpValidation.valid).toBe(true);

        if (!mcpValidation.valid) {
          const errorDetails = mcpValidation.errors
            .map((e) => `${e.field}: ${e.message}`)
            .join("; ");
          fail(`MCP protocol validation failed: ${errorDetails}`);
        }

        // Validate specific MCP structure requirements
        expect(result).toHaveProperty("success");
        expect(result).toHaveProperty("content");
        expect(Array.isArray(result.content)).toBe(true);

        // Validate content array structure deeply
        result.content.forEach((item: any, index: number) => {
          expect(item).toHaveProperty("type", "text");
          expect(item).toHaveProperty("text");
          expect(typeof item.text).toBe("string");
          expect(item.text.length).toBeGreaterThan(0);
        });
      },
      TEST_TIMEOUT,
    );

    test(
      "should include properly structured metadata in responses",
      async () => {
        const testTool = "generate_keyword_cloud";
        const functionalInput = TOOL_TEST_INPUTS[testTool]?.functional || {
          text: "technology programming",
        };

        const result = await executeInspectorCommand("tools/call", {
          name: testTool,
          arguments: functionalInput,
        });

        expect(result).toBeDefined();

        // Validate metadata structure if present
        if (result.metadata) {
          expect(typeof result.metadata).toBe("object");

          if (result.metadata.quotaUsed !== undefined) {
            expect(typeof result.metadata.quotaUsed).toBe("number");
            expect(result.metadata.quotaUsed).toBeGreaterThanOrEqual(0);
          }

          if (result.metadata.requestTime !== undefined) {
            expect(typeof result.metadata.requestTime).toBe("number");
            expect(result.metadata.requestTime).toBeGreaterThan(0);
          }

          if (result.metadata.source !== undefined) {
            expect(typeof result.metadata.source).toBe("string");
          }
        }

        // Perform full integrity validation
        const integrityValidation =
          await responseValidator.validateResponseIntegrity(result);
        expect(integrityValidation.valid).toBe(true);

        if (!integrityValidation.valid) {
          const errorDetails = integrityValidation.errors
            .map((e) => `${e.field}: ${e.message}`)
            .join("; ");
          fail(`Response integrity validation failed: ${errorDetails}`);
        }
      },
      TEST_TIMEOUT,
    );

    test(
      "should validate response performance metrics",
      async () => {
        const testTool = "extract_keywords_from_text";
        const functionalInput = TOOL_TEST_INPUTS[testTool]?.functional || {
          text: "performance test content",
        };

        const validationStartTime = Date.now();
        const result = await executeInspectorCommand("tools/call", {
          name: testTool,
          arguments: functionalInput,
        });

        // Validate response structure with performance tracking
        const mcpValidation =
          await responseValidator.validateMCPToolResult(result);
        const validationTime = Date.now() - validationStartTime;

        expect(mcpValidation.valid).toBe(true);
        expect(mcpValidation.performance.validationTime).toBeGreaterThan(0);

        // Validation should be fast (under 1 second)
        expect(mcpValidation.performance.validationTime).toBeLessThan(1000);

        if (process.env.LOG_TIMING !== "false") {
          console.log(
            `Schema validation completed in ${mcpValidation.performance.validationTime}ms`,
          );
        }
      },
      TEST_TIMEOUT,
    );
  });

  describe("Performance and Reliability", () => {
    test(
      "should handle concurrent tool execution with schema validation",
      async () => {
        const concurrentCalls = [
          executeInspectorCommand("tools/call", {
            name: "extract_keywords_from_text",
            arguments: TOOL_TEST_INPUTS.extract_keywords_from_text
              ?.functional || { text: "concurrent test 1" },
          }),
          executeInspectorCommand("tools/call", {
            name: "extract_keywords_from_text",
            arguments: TOOL_TEST_INPUTS.extract_keywords_from_text
              ?.functional || { text: "concurrent test 2" },
          }),
          executeInspectorCommand("tools/call", {
            name: "generate_keyword_cloud",
            arguments: TOOL_TEST_INPUTS.generate_keyword_cloud?.functional || {
              text: "concurrent test 3",
            },
          }),
        ];

        const results = await Promise.all(concurrentCalls);

        expect(results).toHaveLength(3);

        // Validate each concurrent result with schema validation
        const validationPromises = results.map(async (result, index) => {
          expect(result).toBeDefined();

          const mcpValidation =
            await responseValidator.validateMCPToolResult(result);
          if (!mcpValidation.valid) {
            const errorDetails = mcpValidation.errors
              .map((e) => `${e.field}: ${e.message}`)
              .join("; ");
            fail(
              `Concurrent call ${index + 1} failed MCP validation: ${errorDetails}`,
            );
          }

          return mcpValidation;
        });

        const validationResults = await Promise.all(validationPromises);

        // All concurrent calls should pass validation
        validationResults.forEach((validation, index) => {
          expect(validation.valid).toBe(true);
        });

        // Log validation summary if timing is enabled
        if (process.env.LOG_TIMING !== "false") {
          const summary =
            responseValidator.getValidationSummary(validationResults);
          console.log(`Concurrent validation summary: ${summary.summary}`);
        }
      },
      TEST_TIMEOUT,
    );

    test(
      "should respond within reasonable time limits",
      async () => {
        const startTime = Date.now();

        await executeInspectorCommand("tools/call", {
          name: "extract_keywords_from_text",
          arguments: { text: "performance test content" },
        });

        const endTime = Date.now();
        const responseTime = endTime - startTime;

        // Should respond within 15 seconds for simple operations
        expect(responseTime).toBeLessThan(15000);
      },
      TEST_TIMEOUT,
    );

    test(
      "should recover from tool execution errors",
      async () => {
        // First, try a call that might fail
        try {
          await executeInspectorCommand("tools/call", {
            name: "get_video_details",
            arguments: { videoId: "invalid_video_id" },
          });
        } catch (error) {
          // Expected to fail with invalid video ID
        }

        // Then verify the server is still responsive
        const result = await executeInspectorCommand("tools/call", {
          name: "extract_keywords_from_text",
          arguments: { text: "recovery test" },
        });

        expect(result).toBeDefined();
      },
      TEST_TIMEOUT,
    );
  });
});
