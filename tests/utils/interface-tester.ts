import {
  REAL_CLIENT,
  interfaceTestDelay,
  trackQuotaUsage,
  checkQuotaBudget,
  MINIMAL_TEST_INPUTS,
  INVALID_TEST_INPUTS,
} from "../setup.js";
import { ToolRunner, ToolMetadata } from "../../src/interfaces/tool.js";
import { ToolResponse } from "../../src/types.js";
import { ErrorHandler } from "../../src/utils/error-handler.js";

export interface InterfaceTestResult {
  success: boolean;
  tool: string;
  tests: {
    metadata: boolean;
    basicExecution: boolean;
    errorHandling: boolean;
    quotaTracking: boolean;
    responseFormat: boolean;
    quotaMetadata: boolean;
    singlePathExecution: boolean;
  };
  errors: string[];
  quotaUsed: number;
}

export interface ValidationOptions {
  skipQuotaCheck?: boolean;
  maxQuotaPerTest?: number;
  includePerformanceTest?: boolean;
  testTimeout?: number;
}

const DEFAULT_OPTIONS: ValidationOptions = {
  skipQuotaCheck: false,
  maxQuotaPerTest: 10,
  includePerformanceTest: false,
  testTimeout: 8000,
};

export async function testToolInterface(
  toolInstance: ToolRunner,
  metadata: ToolMetadata,
  testInput: any,
  options: ValidationOptions = {},
): Promise<InterfaceTestResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const result: InterfaceTestResult = {
    success: true,
    tool: metadata.name,
    tests: {
      metadata: false,
      basicExecution: false,
      errorHandling: false,
      quotaTracking: false,
      responseFormat: false,
      quotaMetadata: false,
      singlePathExecution: false,
    },
    errors: [],
    quotaUsed: 0,
  };

  try {
    // Test 1: Validate metadata
    result.tests.metadata = validateMetadata(metadata, result.errors);

    // Test 2: Validate quota metadata
    result.tests.quotaMetadata = validateQuotaMetadata(metadata, result.errors);

    // Test 3: Check quota budget before execution
    if (!opts.skipQuotaCheck && !checkQuotaBudget(opts.maxQuotaPerTest || 10)) {
      result.errors.push("Insufficient quota budget for testing");
      result.success = false;
      return result;
    }

    // Test 4: Basic execution with valid input
    const executionResult = await executeWithRateLimit(
      () => toolInstance.run(testInput),
      opts.testTimeout || 8000,
    );

    if (executionResult.success && executionResult.response) {
      result.tests.basicExecution = true;
      result.tests.responseFormat = validateToolResponse(
        executionResult.response,
        result.errors,
      );
      result.tests.quotaTracking = validateQuotaTracking(
        executionResult.response,
        result.errors,
      );

      // Validate quota consistency
      if (executionResult.response.metadata?.quotaUsed) {
        result.quotaUsed += executionResult.response.metadata.quotaUsed;
        trackQuotaUsage(executionResult.response.metadata.quotaUsed);

        // Check if quotaUsed matches metadata quotaCost
        if (
          metadata.quotaCost !== undefined &&
          executionResult.response.metadata.quotaUsed !== metadata.quotaCost
        ) {
          result.errors.push(
            `Quota mismatch: reported ${executionResult.response.metadata.quotaUsed}, expected ${metadata.quotaCost}`,
          );
        }
      }
    } else {
      result.errors.push(
        `Basic execution failed: ${executionResult.error || "No response"}`,
      );
    }

    // Test 5: Error handling with invalid inputs
    result.tests.errorHandling = await testErrorHandling(
      toolInstance,
      metadata,
      result.errors,
    );

    // Test 6: Single-path execution (no fallback logic)
    result.tests.singlePathExecution = await validateSinglePathExecution(
      toolInstance,
      metadata,
      result.errors,
    );

    // Determine overall success
    result.success =
      Object.values(result.tests).every((test) => test) &&
      result.errors.length === 0;
  } catch (error) {
    ErrorHandler.handleTestError(error, {
      testName: "interface-tester",
      operation: "run-interface-test",
    });
  }

  return result;
}

export function validateMetadata(
  metadata: ToolMetadata,
  errors: string[],
): boolean {
  let isValid = true;

  // Check required fields
  if (!metadata.name || typeof metadata.name !== "string") {
    errors.push("Metadata missing or invalid name");
    isValid = false;
  }

  if (!metadata.description || typeof metadata.description !== "string") {
    errors.push("Metadata missing or invalid description");
    isValid = false;
  }

  if (!metadata.inputSchema || typeof metadata.inputSchema !== "object") {
    errors.push("Metadata missing or invalid inputSchema");
    isValid = false;
  }

  // Validate input schema structure
  if (metadata.inputSchema) {
    if (metadata.inputSchema.type !== "object") {
      errors.push('Input schema type must be "object"');
      isValid = false;
    }

    if (
      !metadata.inputSchema.properties ||
      typeof metadata.inputSchema.properties !== "object"
    ) {
      errors.push("Input schema missing or invalid properties");
      isValid = false;
    }

    // Check if required fields are valid
    if (metadata.inputSchema.required) {
      if (!Array.isArray(metadata.inputSchema.required)) {
        errors.push("Input schema required field must be an array");
        isValid = false;
      } else {
        const requiredFields = metadata.inputSchema.required;
        const properties = Object.keys(metadata.inputSchema.properties);

        for (const field of requiredFields) {
          if (!properties.includes(field)) {
            errors.push(`Required field "${field}" not found in properties`);
            isValid = false;
          }
        }
      }
    }
  }

  // Validate quota cost if specified
  if (metadata.quotaCost !== undefined) {
    if (typeof metadata.quotaCost !== "number" || metadata.quotaCost < 0) {
      errors.push("Quota cost must be a non-negative number");
      isValid = false;
    }
  }

  return isValid;
}

export function validateToolResponse(
  response: ToolResponse,
  errors: string[],
): boolean {
  let isValid = true;

  // Check required fields
  if (typeof response.success !== "boolean") {
    errors.push("Response missing or invalid success field");
    isValid = false;
  }

  // If successful, should have data
  if (response.success && response.data === undefined) {
    errors.push("Successful response missing data field");
    isValid = false;
  }

  // If not successful, should have error
  if (!response.success && !response.error) {
    errors.push("Failed response missing error field");
    isValid = false;
  }

  // Validate metadata if present
  if (response.metadata) {
    if (
      typeof response.metadata.quotaUsed !== "number" ||
      response.metadata.quotaUsed < 0
    ) {
      errors.push("Response metadata has invalid quotaUsed value");
      isValid = false;
    }

    if (
      typeof response.metadata.requestTime !== "number" ||
      response.metadata.requestTime < 0
    ) {
      errors.push("Response metadata has invalid requestTime value");
      isValid = false;
    }

    if (
      !response.metadata.source ||
      typeof response.metadata.source !== "string"
    ) {
      errors.push("Response metadata missing or invalid source field");
      isValid = false;
    }
  }

  return isValid;
}

export async function testErrorHandling(
  toolInstance: ToolRunner,
  metadata: ToolMetadata,
  errors: string[],
): Promise<boolean> {
  let isValid = true;

  // Build error test cases based on the tool's schema
  const errorTestCases: Array<{ name: string; input: any }> = [
    { name: "null input", input: null },
    { name: "undefined input", input: undefined },
  ];

  // Only test empty object if the tool has required fields
  if (
    metadata.inputSchema.required &&
    metadata.inputSchema.required.length > 0
  ) {
    errorTestCases.push({ name: "empty object", input: {} });
  }

  // Add schema-specific invalid inputs
  errorTestCases.push(
    { name: "invalid string", input: INVALID_TEST_INPUTS.emptyString },
    {
      name: "negative number",
      input: { maxResults: INVALID_TEST_INPUTS.negativeNumber },
    },
  );

  for (const testCase of errorTestCases) {
    try {
      await interfaceTestDelay();

      const result = await executeWithRateLimit(
        () => toolInstance.run(testCase.input),
        5000,
      );

      if (result.success && result.response) {
        if (result.response.success) {
          errors.push(
            `Tool should have failed with ${testCase.name} but succeeded`,
          );
          isValid = false;
        } else {
          // This is expected - tool should return error response for invalid input
          if (!result.response.error) {
            errors.push(
              `Tool failed with ${testCase.name} but didn't provide error message`,
            );
            isValid = false;
          }
        }
      }
      // If result.success is false or response is undefined, that means the tool threw an exception,
      // which is also acceptable error handling
    } catch (error) {
      ErrorHandler.handleTestError(error, {
        testName: "interface-tester",
        operation: "execute-tool-with-timeout",
      });
    }
  }

  return isValid;
}

export function validateQuotaTracking(
  response: ToolResponse,
  errors: string[],
): boolean {
  if (!response.metadata) {
    errors.push("Response missing metadata for quota tracking");
    return false;
  }

  if (
    typeof response.metadata.quotaUsed !== "number" ||
    response.metadata.quotaUsed < 0
  ) {
    errors.push("Invalid quota usage tracking");
    return false;
  }

  if (
    typeof response.metadata.requestTime !== "number" ||
    response.metadata.requestTime < 0
  ) {
    errors.push("Invalid request time tracking");
    return false;
  }

  return true;
}

export async function executeWithRateLimit<T>(
  operation: () => Promise<T>,
  timeoutMs: number = 8000,
): Promise<{ success: boolean; response?: T; error?: string }> {
  try {
    await interfaceTestDelay();

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Operation timeout")), timeoutMs);
    });

    const response = await Promise.race([operation(), timeoutPromise]);
    return { success: true, response };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export function getMinimalTestInputForTool(toolName: string): any {
  const inputMap: Record<string, any> = {
    unified_search: { query: "test", maxResults: 1 },
    search_channels: { query: "test", maxResults: 1 },
    search_playlists: { query: "test", maxResults: 1 },
    get_video_details: MINIMAL_TEST_INPUTS.video,
    get_channel_details: MINIMAL_TEST_INPUTS.channel,
    get_playlist_details: MINIMAL_TEST_INPUTS.playlist,
    get_trending_videos: { maxResults: 1 },
    extract_video_comments: {
      videoId: MINIMAL_TEST_INPUTS.video.videoId,
      maxComments: 1,
    },
    extract_keywords_from_videos: {
      videoIds: [MINIMAL_TEST_INPUTS.video.videoId],
      maxKeywords: 5,
    },
    extract_keywords_from_text: { text: "sample test text", maxKeywords: 5 },
    analyze_keywords: { keywords: ["test"], maxResults: 1 },
    generate_keyword_cloud: { keywords: ["test"], maxKeywords: 5 },
    analyze_channel_videos: {
      channelId: MINIMAL_TEST_INPUTS.channel.channelId,
      maxVideos: 1,
    },
    analyze_viral_videos: { maxResults: 1 },
    analyze_competitor: {
      channelId: MINIMAL_TEST_INPUTS.channel.channelId,
      maxVideos: 1,
    },
    find_content_gaps: {
      seedKeywords: ["test"],
      niche: "test",
      competitorChannels: [MINIMAL_TEST_INPUTS.channel.channelId],
      maxResults: 1,
    },
    analyze_keyword_opportunities: { keywords: ["test"], maxResults: 1 },
    discover_channel_network: {
      seedChannelIds: [MINIMAL_TEST_INPUTS.channel.channelId],
      maxDepth: 1,
      maxChannelsPerLevel: 1,
    },
    keyword_research_workflow: {
      seedKeywords: ["test"],
      niche: "test",
      maxVideosToAnalyze: 10,
    },
  };

  return inputMap[toolName] || { query: "test", maxResults: 1 };
}

export async function runBatchInterfaceTests(
  tools: Array<{ instance: ToolRunner; metadata: ToolMetadata }>,
  options: ValidationOptions = {},
): Promise<InterfaceTestResult[]> {
  const results: InterfaceTestResult[] = [];

  for (const { instance, metadata } of tools) {
    if (!checkQuotaBudget(options.maxQuotaPerTest || 10)) {
      console.warn(`Skipping ${metadata.name} - insufficient quota budget`);
      continue;
    }

    const testInput = getMinimalTestInputForTool(metadata.name);
    const result = await testToolInterface(
      instance,
      metadata,
      testInput,
      options,
    );
    results.push(result);

    // Add delay between tool tests
    await interfaceTestDelay();
  }

  return results;
}

/**
 * Validates that a tool has quota cost defined in its metadata.
 * This ensures quota tracking is properly configured.
 */
export function validateQuotaMetadata(
  metadata: ToolMetadata,
  errors: string[],
): boolean {
  // Check if quotaCost is defined in metadata
  if (metadata.quotaCost === undefined || metadata.quotaCost === null) {
    errors.push(`Tool ${metadata.name} is missing quotaCost in metadata`);
    return false;
  }

  if (typeof metadata.quotaCost !== "number" || metadata.quotaCost < 0) {
    errors.push(
      `Tool ${metadata.name} has invalid quotaCost: ${metadata.quotaCost}`,
    );
    return false;
  }

  return true;
}

/**
 * Validates that all tools have quota costs defined in their metadata.
 * This is a batch validation function for multiple tools.
 * Enable via VALIDATE_QUOTA_METADATA=true environment variable.
 */
export function validateAllToolsQuotaMetadata(
  tools: Array<{ instance: ToolRunner; metadata: ToolMetadata }>,
): { isValid: boolean; missing: string[] } {
  const missing: string[] = [];

  // Only run validation if environment variable is set
  if (process.env.VALIDATE_QUOTA_METADATA !== "true") {
    return { isValid: true, missing: [] };
  }

  for (const { metadata } of tools) {
    // Check if quotaCost is defined in metadata
    if (metadata.quotaCost === undefined || metadata.quotaCost === null) {
      missing.push(metadata.name);
    }
  }

  // Log missing quota costs if any found
  if (missing.length > 0) {
    console.error("❌ Missing quota costs in tool metadata:");
    console.error(
      "The following tools need quotaCost defined in their metadata:",
    );
    for (const toolName of missing) {
      console.error(`  - ${toolName}`);
    }
    console.error("");
    console.error(
      "To fix, add quotaCost to the metadata object in each tool file.",
    );
  } else {
    console.log("✅ All tools have quota costs defined in metadata");
  }

  return {
    isValid: missing.length === 0,
    missing,
  };
}

/**
 * Validates that a tool follows single-path execution without fallback logic.
 * This ensures tools don't have graceful degradation or fallback paths.
 */
export async function validateSinglePathExecution(
  toolInstance: ToolRunner,
  metadata: ToolMetadata,
  errors: string[],
): Promise<boolean> {
  // This is a basic validation that the tool either succeeds or fails cleanly
  // without fallback logic. The actual validation happens in the tool implementation
  // by ensuring all errors use ErrorHandler and no try-catch blocks have fallback paths.

  // For now, we validate that error responses are properly formatted
  // and don't contain signs of fallback execution
  try {
    // Test with an input that should trigger enrichment if supported
    const testInput = getMinimalTestInputForTool(metadata.name);

    // Add enrichParts if the tool supports it
    if (metadata.inputSchema.properties?.enrichParts) {
      testInput.enrichParts = {
        video: ["invalid_part"],
        channel: ["invalid_part"],
      };
    }

    const result = await executeWithRateLimit(
      () => toolInstance.run(testInput),
      5000,
    );

    if (result.success && result.response) {
      // Check that the response doesn't contain partial data indicating fallback
      if (!result.response.success && result.response.data) {
        errors.push(
          "Tool returned partial data on failure - possible fallback logic detected",
        );
        return false;
      }
    }

    return true;
  } catch (error) {
    // Tool throwing an error is acceptable - it means no fallback logic
    return true;
  }
}
