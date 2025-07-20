import {
  REAL_CLIENT,
  interfaceTestDelay,
  trackQuotaUsage,
  checkQuotaBudget,
  MINIMAL_TEST_INPUTS,
  INVALID_TEST_INPUTS
} from '../setup.js';
import { ToolRunner, ToolMetadata } from '../../src/interfaces/tool.js';
import { ToolResponse } from '../../src/types.js';

export interface InterfaceTestResult {
  success: boolean;
  tool: string;
  tests: {
    metadata: boolean;
    basicExecution: boolean;
    errorHandling: boolean;
    quotaTracking: boolean;
    responseFormat: boolean;
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
  testTimeout: 8000
};

export async function testToolInterface(
  toolInstance: ToolRunner,
  metadata: ToolMetadata,
  testInput: any,
  options: ValidationOptions = {}
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
      responseFormat: false
    },
    errors: [],
    quotaUsed: 0
  };

  try {
    // Test 1: Validate metadata
    result.tests.metadata = validateMetadata(metadata, result.errors);

    // Test 2: Check quota budget before execution
    if (!opts.skipQuotaCheck && !checkQuotaBudget(opts.maxQuotaPerTest || 10)) {
      result.errors.push('Insufficient quota budget for testing');
      result.success = false;
      return result;
    }

    // Test 3: Basic execution with valid input
    const executionResult = await executeWithRateLimit(
      () => toolInstance.run(testInput),
      opts.testTimeout || 8000
    );
    
    if (executionResult.success && executionResult.response) {
      result.tests.basicExecution = true;
      result.tests.responseFormat = validateToolResponse(executionResult.response, result.errors);
      result.tests.quotaTracking = validateQuotaTracking(executionResult.response, result.errors);
      
      if (executionResult.response.metadata?.quotaUsed) {
        result.quotaUsed += executionResult.response.metadata.quotaUsed;
        trackQuotaUsage(executionResult.response.metadata.quotaUsed);
      }
    } else {
      result.errors.push(`Basic execution failed: ${executionResult.error || 'No response'}`);
    }

    // Test 4: Error handling with invalid inputs
    result.tests.errorHandling = await testErrorHandling(toolInstance, metadata, result.errors);

    // Determine overall success
    result.success = Object.values(result.tests).every(test => test) && result.errors.length === 0;

  } catch (error) {
    result.errors.push(`Interface test failed: ${error instanceof Error ? error.message : String(error)}`);
    result.success = false;
  }

  return result;
}

export function validateMetadata(metadata: ToolMetadata, errors: string[]): boolean {
  let isValid = true;

  // Check required fields
  if (!metadata.name || typeof metadata.name !== 'string') {
    errors.push('Metadata missing or invalid name');
    isValid = false;
  }

  if (!metadata.description || typeof metadata.description !== 'string') {
    errors.push('Metadata missing or invalid description');
    isValid = false;
  }

  if (!metadata.inputSchema || typeof metadata.inputSchema !== 'object') {
    errors.push('Metadata missing or invalid inputSchema');
    isValid = false;
  }

  // Validate input schema structure
  if (metadata.inputSchema) {
    if (metadata.inputSchema.type !== 'object') {
      errors.push('Input schema type must be "object"');
      isValid = false;
    }

    if (!metadata.inputSchema.properties || typeof metadata.inputSchema.properties !== 'object') {
      errors.push('Input schema missing or invalid properties');
      isValid = false;
    }

    // Check if required fields are valid
    if (metadata.inputSchema.required) {
      if (!Array.isArray(metadata.inputSchema.required)) {
        errors.push('Input schema required field must be an array');
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
    if (typeof metadata.quotaCost !== 'number' || metadata.quotaCost < 0) {
      errors.push('Quota cost must be a non-negative number');
      isValid = false;
    }
  }

  return isValid;
}

export function validateToolResponse(response: ToolResponse, errors: string[]): boolean {
  let isValid = true;

  // Check required fields
  if (typeof response.success !== 'boolean') {
    errors.push('Response missing or invalid success field');
    isValid = false;
  }

  // If successful, should have data
  if (response.success && response.data === undefined) {
    errors.push('Successful response missing data field');
    isValid = false;
  }

  // If not successful, should have error
  if (!response.success && !response.error) {
    errors.push('Failed response missing error field');
    isValid = false;
  }

  // Validate metadata if present
  if (response.metadata) {
    if (typeof response.metadata.quotaUsed !== 'number' || response.metadata.quotaUsed < 0) {
      errors.push('Response metadata has invalid quotaUsed value');
      isValid = false;
    }

    if (typeof response.metadata.requestTime !== 'number' || response.metadata.requestTime < 0) {
      errors.push('Response metadata has invalid requestTime value');
      isValid = false;
    }

    if (!response.metadata.source || typeof response.metadata.source !== 'string') {
      errors.push('Response metadata missing or invalid source field');
      isValid = false;
    }
  }

  return isValid;
}

export async function testErrorHandling(
  toolInstance: ToolRunner,
  metadata: ToolMetadata,
  errors: string[]
): Promise<boolean> {
  let isValid = true;
  const errorTestCases = [
    { name: 'null input', input: null },
    { name: 'undefined input', input: undefined },
    { name: 'empty object', input: {} },
    { name: 'invalid string', input: INVALID_TEST_INPUTS.emptyString },
    { name: 'negative number', input: { maxResults: INVALID_TEST_INPUTS.negativeNumber } }
  ];

  for (const testCase of errorTestCases) {
    try {
      await interfaceTestDelay();
      
      const result = await executeWithRateLimit(
        () => toolInstance.run(testCase.input),
        5000
      );

      if (result.success && result.response) {
        if (result.response.success) {
          errors.push(`Tool should have failed with ${testCase.name} but succeeded`);
          isValid = false;
        } else {
          // This is expected - tool should return error response for invalid input
          if (!result.response.error) {
            errors.push(`Tool failed with ${testCase.name} but didn't provide error message`);
            isValid = false;
          }
        }
      }
      // If result.success is false or response is undefined, that means the tool threw an exception,
      // which is also acceptable error handling
      
    } catch (error) {
      // Tool throwing exceptions for invalid input is acceptable
      continue;
    }
  }

  return isValid;
}

export function validateQuotaTracking(response: ToolResponse, errors: string[]): boolean {
  if (!response.metadata) {
    errors.push('Response missing metadata for quota tracking');
    return false;
  }

  if (typeof response.metadata.quotaUsed !== 'number' || response.metadata.quotaUsed < 0) {
    errors.push('Invalid quota usage tracking');
    return false;
  }

  if (typeof response.metadata.requestTime !== 'number' || response.metadata.requestTime < 0) {
    errors.push('Invalid request time tracking');
    return false;
  }

  return true;
}

export async function executeWithRateLimit<T>(
  operation: () => Promise<T>,
  timeoutMs: number = 8000
): Promise<{ success: boolean; response?: T; error?: string }> {
  try {
    await interfaceTestDelay();
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Operation timeout')), timeoutMs);
    });

    const response = await Promise.race([operation(), timeoutPromise]);
    return { success: true, response };
    
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

export function getMinimalTestInputForTool(toolName: string): any {
  const inputMap: Record<string, any> = {
    'search_videos': MINIMAL_TEST_INPUTS.search,
    'search_channels': { query: 'test', maxResults: 1 },
    'search_playlists': { query: 'test', maxResults: 1 },
    'advanced_search': { query: 'test', maxResults: 1 },
    'get_video_details': MINIMAL_TEST_INPUTS.video,
    'get_channel_details': MINIMAL_TEST_INPUTS.channel,
    'get_playlist_details': MINIMAL_TEST_INPUTS.playlist,
    'get_trending_videos': { regionCode: 'US', maxResults: 1 },
    'extract_video_comments': { videoId: MINIMAL_TEST_INPUTS.video.videoId, maxResults: 1 },
    'extract_keywords_from_videos': MINIMAL_TEST_INPUTS.keywords,
    'extract_keywords_from_text': MINIMAL_TEST_INPUTS.text,
    'analyze_keywords': { keywords: ['test'], includeRelated: false },
    'generate_keyword_cloud': { keywords: ['test'] },
    'analyze_channel_videos': { channelId: MINIMAL_TEST_INPUTS.channel.channelId, maxVideos: 1 },
    'analyze_viral_videos': { query: 'test', maxResults: 1 },
    'analyze_competitor': { competitorChannelId: MINIMAL_TEST_INPUTS.channel.channelId, maxVideos: 1 },
    'find_content_gaps': { primaryChannel: MINIMAL_TEST_INPUTS.channel.channelId, competitorChannels: [MINIMAL_TEST_INPUTS.channel.channelId] },
    'analyze_keyword_opportunities': { seedKeywords: ['test'], maxResults: 1 },
    'discover_channel_network': { seedChannelId: MINIMAL_TEST_INPUTS.channel.channelId, maxDepth: 1 },
    'keyword_research_workflow': { topic: 'test', includeCompetitorAnalysis: false, maxResults: 1 }
  };

  return inputMap[toolName] || { query: 'test', maxResults: 1 };
}

export async function runBatchInterfaceTests(
  tools: Array<{ instance: ToolRunner; metadata: ToolMetadata }>,
  options: ValidationOptions = {}
): Promise<InterfaceTestResult[]> {
  const results: InterfaceTestResult[] = [];
  
  for (const { instance, metadata } of tools) {
    if (!checkQuotaBudget(options.maxQuotaPerTest || 10)) {
      console.warn(`Skipping ${metadata.name} - insufficient quota budget`);
      continue;
    }

    const testInput = getMinimalTestInputForTool(metadata.name);
    const result = await testToolInterface(instance, metadata, testInput, options);
    results.push(result);
    
    // Add delay between tool tests
    await interfaceTestDelay();
  }
  
  return results;
}
