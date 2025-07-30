import {
  ResponseValidator,
  responseValidator,
  validateMCPToolResult,
  validateToolResponse,
  validateYouTubeApiResponse,
  validateResponseIntegrity,
  assertValidMcpResult,
  assertValidToolResponse,
  getValidationSummary,
} from "../../src/utils/response-validator.js";
import { TOOL_TEST_INPUTS } from "../fixtures/test-inputs.js";

describe("Response Validation System", () => {
  const TEST_TIMEOUT = 30000;

  beforeAll(async () => {
    // Generate schemas before running tests
    try {
      const { generateAllSchemas } = await import(
        "../../scripts/generate-schemas.js"
      );
      await generateAllSchemas();
    } catch (error) {
      console.warn(
        "Schema generation failed, some tests may fail:",
        error.message,
      );
    }
  });

  describe("Schema Loading and Caching", () => {
    test("should load schemas without errors", async () => {
      expect(() => new ResponseValidator()).not.toThrow();
    });

    test("should cache schemas for performance", async () => {
      const validator = new ResponseValidator();

      // First validation (should load schema)
      const startTime1 = Date.now();
      const result1 = await validator.validateMCPToolResult({
        success: true,
        content: [{ type: "text", text: "test" }],
      });
      const duration1 = Date.now() - startTime1;

      // Second validation (should use cached schema)
      const startTime2 = Date.now();
      const result2 = await validator.validateMCPToolResult({
        success: true,
        content: [{ type: "text", text: "test" }],
      });
      const duration2 = Date.now() - startTime2;

      expect(result1.valid).toBe(true);
      expect(result2.valid).toBe(true);
      expect(duration2).toBeLessThan(duration1); // Second should be faster due to caching
    });

    test("should clear cache when requested", async () => {
      const validator = new ResponseValidator();
      validator.clearCache();

      const result = await validator.validateMCPToolResult({
        success: true,
        content: [{ type: "text", text: "test" }],
      });

      expect(result.valid).toBe(true);
      expect(result.performance.schemaLoadTime).toBeGreaterThan(0);
    });
  });

  describe("MCP Tool Result Validation", () => {
    test("should validate correct MCP tool result", async () => {
      const validResponse = {
        success: true,
        content: [
          { type: "text", text: "This is a valid response" },
          { type: "text", text: "Multiple content items are allowed" },
        ],
        metadata: {
          quotaUsed: 10,
          requestTime: 1500,
          source: "youtube-api",
        },
      };

      const result = await validateMCPToolResult(validResponse);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.summary).toContain("passed");
      expect(result.performance.validationTime).toBeGreaterThan(0);
    });

    test("should reject invalid MCP tool result", async () => {
      const invalidResponse = {
        success: true,
        content: "invalid content type", // Should be array
        metadata: {
          quotaUsed: "invalid", // Should be number
          requestTime: 1500,
        },
      };

      const result = await validateMCPToolResult(invalidResponse);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.summary).toContain("failed");
    });

    test("should validate minimal valid MCP response", async () => {
      const minimalResponse = {
        success: true,
        content: [{ type: "text", text: "minimal" }],
      };

      const result = await validateMCPToolResult(minimalResponse);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test("should reject response missing required fields", async () => {
      const incompleteResponse = {
        success: true,
        // Missing content field
      };

      const result = await validateMCPToolResult(incompleteResponse);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field.includes("content"))).toBe(true);
    });

    test("should validate error responses", async () => {
      const errorResponse = {
        success: false,
        content: [{ type: "text", text: "Error occurred" }],
        error: "Invalid input parameter",
        metadata: {
          quotaUsed: 1,
          requestTime: 500,
        },
      };

      const result = await validateMCPToolResult(errorResponse);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe("Tool Response Validation", () => {
    test("should validate tool response with known tool", async () => {
      const toolResponse = {
        success: true,
        data: {
          items: [
            {
              id: "dQw4w9WgXcQ",
              snippet: {
                title: "Test Video",
                description: "Test description",
              },
            },
          ],
        },
        metadata: {
          quotaUsed: 10,
          requestTime: 1500,
        },
      };

      const result = await validateToolResponse(toolResponse, "unified_search");

      expect(result.valid).toBe(true);
      expect(result.summary).toContain("unified_search");
    });

    test("should validate YouTube ID formats", async () => {
      const videoResponse = {
        success: true,
        data: {
          items: [
            { id: "dQw4w9WgXcQ" }, // Valid video ID
            { id: "invalid_id" }, // Invalid video ID
          ],
        },
        metadata: {
          quotaUsed: 5,
          requestTime: 1000,
        },
      };

      const result = await validateToolResponse(
        videoResponse,
        "get_video_details",
      );

      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) =>
          e.message.includes("Invalid YouTube video ID"),
        ),
      ).toBe(true);
    });

    test("should validate channel ID formats", async () => {
      const channelResponse = {
        success: true,
        data: {
          items: [
            { id: "UC_x5XG1OV2P6uZZ5FSM9Ttw" }, // Valid channel ID
            { id: "invalid_channel_id" }, // Invalid channel ID
          ],
        },
        metadata: {
          quotaUsed: 5,
          requestTime: 1000,
        },
      };

      const result = await validateToolResponse(
        channelResponse,
        "get_channel_details",
      );

      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) =>
          e.message.includes("Invalid YouTube channel ID"),
        ),
      ).toBe(true);
    });
  });

  describe("Response Integrity Validation", () => {
    test("should validate complete response integrity", async () => {
      const response = {
        success: true,
        content: [
          { type: "text", text: "Valid content" },
          { type: "text", text: "Another valid item" },
        ],
        metadata: {
          quotaUsed: 15,
          requestTime: 2000,
          source: "youtube-api",
        },
      };

      const result = await validateResponseIntegrity(response);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.summary).toContain("passed");
    });

    test("should detect content array issues", async () => {
      const response = {
        success: true,
        content: [
          { type: "text", text: "Valid item" },
          { type: "image", text: "Invalid type" }, // Wrong type
          { text: "Missing type field" }, // Missing type
        ],
      };

      const result = await validateResponseIntegrity(response);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(
        result.errors.some((e) => e.field.includes("content[1].type")),
      ).toBe(true);
      expect(result.errors.some((e) => e.field.includes("content[2]"))).toBe(
        true,
      );
    });

    test("should validate metadata field types", async () => {
      const response = {
        success: true,
        content: [{ type: "text", text: "test" }],
        metadata: {
          quotaUsed: "invalid", // Should be number
          requestTime: true, // Should be number
          source: 123, // Should be string
        },
      };

      const result = await validateResponseIntegrity(response);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "metadata.quotaUsed")).toBe(
        true,
      );
      expect(
        result.errors.some((e) => e.field === "metadata.requestTime"),
      ).toBe(true);
    });
  });

  describe("Assertion Functions", () => {
    test("should pass assertion for valid MCP result", async () => {
      const validResponse = {
        success: true,
        content: [{ type: "text", text: "test" }],
      };

      await expect(assertValidMcpResult(validResponse)).resolves.not.toThrow();
    });

    test("should throw assertion error for invalid MCP result", async () => {
      const invalidResponse = {
        success: true,
        content: "invalid", // Should be array
      };

      await expect(assertValidMcpResult(invalidResponse)).rejects.toThrow();
    });

    test("should pass assertion for valid tool response", async () => {
      const validResponse = {
        success: true,
        data: { items: [] },
        metadata: { quotaUsed: 5, requestTime: 1000 },
      };

      await expect(
        assertValidToolResponse(validResponse, "search_videos"),
      ).resolves.not.toThrow();
    });

    test("should throw assertion error for invalid tool response", async () => {
      const invalidResponse = {
        success: true,
        // Missing required fields
      };

      await expect(
        assertValidToolResponse(invalidResponse, "search_videos"),
      ).rejects.toThrow();
    });
  });

  describe("Validation with Test Fixtures", () => {
    test("should validate functional fixture inputs", async () => {
      const toolName = "search_videos";
      const functionalInput = TOOL_TEST_INPUTS[toolName]?.functional;

      expect(functionalInput).toBeDefined();
      expect(functionalInput.query).toBeDefined();
      expect(functionalInput.maxResults).toBeDefined();
    });

    test("should handle invalid fixture inputs", async () => {
      const toolName = "search_videos";
      const invalidInput = TOOL_TEST_INPUTS[toolName]?.invalid;

      expect(invalidInput).toBeDefined();
      // Invalid inputs should have problematic values for testing
      expect(invalidInput.query || invalidInput.maxResults).toBeDefined();
    });

    test("should validate against all available tools in fixtures", async () => {
      const availableTools = Object.keys(TOOL_TEST_INPUTS);
      expect(availableTools.length).toBeGreaterThan(10);

      // Check that each tool has functional test data
      availableTools.forEach((toolName) => {
        const functionalInput = TOOL_TEST_INPUTS[toolName]?.functional;
        expect(functionalInput).toBeDefined();
      });
    });
  });

  describe("Validation Summary and Performance", () => {
    test("should generate validation summary", async () => {
      const results = [
        {
          valid: true,
          errors: [],
          performance: { validationTime: 10 },
          summary: "test 1 passed",
        },
        {
          valid: false,
          errors: [{ field: "test", message: "error", value: null }],
          performance: { validationTime: 15 },
          summary: "test 2 failed",
        },
        {
          valid: true,
          errors: [],
          performance: { validationTime: 8 },
          summary: "test 3 passed",
        },
      ];

      const summary = getValidationSummary(results);

      expect(summary.totalTests).toBe(3);
      expect(summary.passed).toBe(2);
      expect(summary.failed).toBe(1);
      expect(summary.totalErrors).toBe(1);
      expect(summary.avgValidationTime).toBeCloseTo(11);
      expect(summary.summary).toContain("2/3 passed");
    });

    test("should track validation performance", async () => {
      const response = {
        success: true,
        content: [{ type: "text", text: "performance test" }],
      };

      const startTime = Date.now();
      const result = await validateMCPToolResult(response);
      const totalTime = Date.now() - startTime;

      expect(result.performance.validationTime).toBeGreaterThan(0);
      expect(result.performance.validationTime).toBeLessThan(totalTime);
      expect(result.performance.validationTime).toBeLessThan(1000); // Should be fast
    });

    test("should handle validation errors gracefully", async () => {
      const malformedResponse = null;

      const result = await validateMCPToolResult(malformedResponse);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.summary).toContain("failed");
    });
  });

  describe("Edge Cases and Error Handling", () => {
    test("should handle empty responses", async () => {
      const emptyResponse = {};

      const result = await validateMCPToolResult(emptyResponse);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test("should handle null responses", async () => {
      const nullResponse = null;

      const result = await validateMCPToolResult(nullResponse);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test("should handle undefined responses", async () => {
      const undefinedResponse = undefined;

      const result = await validateMCPToolResult(undefinedResponse);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test("should handle circular references", async () => {
      const circularResponse: any = {
        success: true,
        content: [{ type: "text", text: "test" }],
      };
      circularResponse.self = circularResponse; // Create circular reference

      // Should not crash the validator
      const result = await validateMCPToolResult(circularResponse);

      // Result depends on how JSON schema handles circular refs
      expect(result).toBeDefined();
    });

    test("should handle very large responses", async () => {
      const largeContent = Array(1000)
        .fill(null)
        .map((_, i) => ({
          type: "text",
          text: `Large content item ${i}`.repeat(100),
        }));

      const largeResponse = {
        success: true,
        content: largeContent,
      };

      const result = await validateMCPToolResult(largeResponse);

      expect(result).toBeDefined();
      expect(result.performance.validationTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});
