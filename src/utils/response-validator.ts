import { Ajv, type ErrorObject } from "ajv";
import { default as addFormats } from "ajv-formats";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { ErrorHandler } from "./error-handler.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  performance: {
    validationTime: number;
    schemaLoadTime?: number;
  };
  summary: string;
}

export interface ValidationError {
  field: string;
  message: string;
  value: any;
  expectedType?: string;
  line?: number;
}

export class ResponseValidator {
  private ajv: Ajv;
  private schemaCache: Map<string, any> = new Map();
  private schemaDir: string;

  constructor() {
    this.ajv = new Ajv({
      allErrors: true,
      verbose: true,
      strict: false,
      removeAdditional: false,
    });
    (addFormats as any)(this.ajv);

    // Set schema directory path
    this.schemaDir = join(__dirname, "../../dist/schemas");
  }

  /**
   * Load and cache a JSON schema
   */
  private loadSchema(schemaName: string): any {
    if (this.schemaCache.has(schemaName)) {
      return this.schemaCache.get(schemaName);
    }

    const schemaPath = join(this.schemaDir, `${schemaName}.json`);

    if (!existsSync(schemaPath)) {
      throw new Error(
        `Schema not found: ${schemaPath}. Run 'npm run generate:schemas' first.`,
      );
    }

    try {
      const schemaContent = readFileSync(schemaPath, "utf8");
      const schema = JSON.parse(schemaContent);
      this.schemaCache.set(schemaName, schema);
      return schema;
    } catch (error) {
      ErrorHandler.handleUtilityError(error, {
        operation: "loadSchema",
        details: `Schema name: ${schemaName}, path: ${schemaPath}`,
      });
    }
  }

  /**
   * Convert AJV errors to our ValidationError format
   */
  private formatErrors(
    errors: ErrorObject[] | null | undefined,
  ): ValidationError[] {
    if (!errors) return [];

    return errors.map((error) => ({
      field: error.instancePath || error.schemaPath,
      message: error.message || "Validation error",
      value: error.data,
      expectedType: (error.params as any)?.type || (error.schema as any)?.type,
    }));
  }

  /**
   * Validate MCP Tool Result structure
   */
  async validateMCPToolResult(response: any): Promise<ValidationResult> {
    const startTime = Date.now();

    try {
      const schemaLoadStart = Date.now();
      const schema = this.loadSchema("MCPToolResult");
      const schemaLoadTime = Date.now() - schemaLoadStart;

      const validate = this.ajv.compile(schema);
      const valid = validate(response);

      const validationTime = Date.now() - startTime;
      const errors = this.formatErrors(validate.errors);

      return {
        valid,
        errors,
        performance: { validationTime, schemaLoadTime },
        summary: valid
          ? "MCP protocol validation passed"
          : `MCP protocol validation failed: ${errors.length} errors`,
      };
    } catch (error) {
      return {
        valid: false,
        errors: [
          {
            field: "schema",
            message: `Schema validation error: ${error}`,
            value: response,
          },
        ],
        performance: { validationTime: Date.now() - startTime },
        summary: `Schema loading failed: ${error}`,
      };
    }
  }

  /**
   * Validate tool-specific response data
   */
  async validateToolResponse(
    response: any,
    toolName: string,
  ): Promise<ValidationResult> {
    const startTime = Date.now();

    try {
      const schemaLoadStart = Date.now();
      const schema = this.loadSchema("ToolResponse");
      const schemaLoadTime = Date.now() - schemaLoadStart;

      const validate = this.ajv.compile(schema);
      const valid = validate(response);

      const validationTime = Date.now() - startTime;
      const errors = this.formatErrors(validate.errors);

      // Additional tool-specific validations
      if (valid && (response as any).success) {
        const toolSpecificErrors = this.validateToolSpecificData(
          response,
          toolName,
        );
        errors.push(...toolSpecificErrors);
      }

      const finalValid = valid && errors.length === 0;

      return {
        valid: finalValid,
        errors,
        performance: { validationTime, schemaLoadTime },
        summary: finalValid
          ? `Tool response validation passed for ${toolName}`
          : `Tool response validation failed for ${toolName}: ${errors.length} errors`,
      };
    } catch (error) {
      return {
        valid: false,
        errors: [
          {
            field: "schema",
            message: `Tool response schema validation error: ${error}`,
            value: response,
          },
        ],
        performance: { validationTime: Date.now() - startTime },
        summary: `Tool response schema loading failed: ${error}`,
      };
    }
  }

  /**
   * Validate YouTube API response structure
   */
  async validateYouTubeApiResponse(
    response: any,
    responseType: string,
  ): Promise<ValidationResult> {
    const startTime = Date.now();

    try {
      const schemaLoadStart = Date.now();
      const schema = this.loadSchema("YouTubeApiResponse");
      const schemaLoadTime = Date.now() - schemaLoadStart;

      const validate = this.ajv.compile(schema);
      const valid = validate(response);

      const validationTime = Date.now() - startTime;
      const errors = this.formatErrors(validate.errors);

      return {
        valid,
        errors,
        performance: { validationTime, schemaLoadTime },
        summary: valid
          ? `YouTube API response validation passed for ${responseType}`
          : `YouTube API response validation failed for ${responseType}: ${errors.length} errors`,
      };
    } catch (error) {
      return {
        valid: false,
        errors: [
          {
            field: "schema",
            message: `YouTube API schema validation error: ${error}`,
            value: response,
          },
        ],
        performance: { validationTime: Date.now() - startTime },
        summary: `YouTube API schema loading failed: ${error}`,
      };
    }
  }

  /**
   * Deep data integrity validation
   */
  async validateResponseIntegrity(response: any): Promise<ValidationResult> {
    const startTime = Date.now();
    const errors: ValidationError[] = [];

    // Check for required MCP structure
    if (!response.hasOwnProperty("success")) {
      errors.push({
        field: "success",
        message: "Missing required field: success",
        value: response,
      });
    }

    if (!response.hasOwnProperty("content")) {
      errors.push({
        field: "content",
        message: "Missing required field: content",
        value: response,
      });
    } else if (!Array.isArray(response.content)) {
      errors.push({
        field: "content",
        message: "Content must be an array",
        value: response.content,
        expectedType: "array",
      });
    } else {
      // Validate content array structure
      response.content.forEach((item: any, index: number) => {
        if (!item || typeof item !== "object") {
          errors.push({
            field: `content[${index}]`,
            message: "Content item must be an object",
            value: item,
            expectedType: "object",
          });
        } else {
          if (item.type !== "text") {
            errors.push({
              field: `content[${index}].type`,
              message: 'Content type must be "text"',
              value: item.type,
              expectedType: "text",
            });
          }
          if (typeof item.text !== "string") {
            errors.push({
              field: `content[${index}].text`,
              message: "Content text must be a string",
              value: item.text,
              expectedType: "string",
            });
          }
        }
      });
    }


    const validationTime = Date.now() - startTime;
    const valid = errors.length === 0;

    return {
      valid,
      errors,
      performance: { validationTime },
      summary: valid
        ? "Response integrity validation passed"
        : `Response integrity validation failed: ${errors.length} errors`,
    };
  }

  /**
   * Tool-specific data validation
   */
  private validateToolSpecificData(
    response: any,
    toolName: string,
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    // Validate YouTube ID formats based on tool type
    if (toolName.includes("video") && response.data?.items) {
      response.data.items.forEach((item: any, index: number) => {
        if (item.id && !/^[a-zA-Z0-9_-]{11}$/.test(item.id)) {
          errors.push({
            field: `data.items[${index}].id`,
            message: "Invalid YouTube video ID format",
            value: item.id,
          });
        }
      });
    }

    if (toolName.includes("channel") && response.data?.items) {
      response.data.items.forEach((item: any, index: number) => {
        if (item.id && !/^UC[a-zA-Z0-9_-]{22}$/.test(item.id)) {
          errors.push({
            field: `data.items[${index}].id`,
            message: "Invalid YouTube channel ID format",
            value: item.id,
          });
        }
      });
    }

    if (toolName.includes("playlist") && response.data?.items) {
      response.data.items.forEach((item: any, index: number) => {
        if (
          item.id &&
          !/^PL[a-zA-Z0-9_-]{32}$/.test(item.id) &&
          !/^UU[a-zA-Z0-9_-]{22}$/.test(item.id)
        ) {
          errors.push({
            field: `data.items[${index}].id`,
            message: "Invalid YouTube playlist ID format",
            value: item.id,
          });
        }
      });
    }

    return errors;
  }

  /**
   * Assertion helpers for validation
   */
  async assertValidMcpResult(response: any): Promise<void> {
    const result = await this.validateMCPToolResult(response);
    if (!result.valid) {
      const errorDetails = result.errors
        .map((e) => `${e.field}: ${e.message}`)
        .join("; ");
      throw new Error(`MCP result validation failed: ${errorDetails}`);
    }
  }

  async assertValidToolResponse(
    response: any,
    toolName: string,
  ): Promise<void> {
    const result = await this.validateToolResponse(response, toolName);
    if (!result.valid) {
      const errorDetails = result.errors
        .map((e) => `${e.field}: ${e.message}`)
        .join("; ");
      throw new Error(
        `Tool response validation failed for ${toolName}: ${errorDetails}`,
      );
    }
  }

  /**
   * Get validation summary from multiple results
   */
  getValidationSummary(results: ValidationResult[]): {
    totalTests: number;
    passed: number;
    failed: number;
    totalErrors: number;
    avgValidationTime: number;
    summary: string;
  } {
    const totalTests = results.length;
    const passed = results.filter((r) => r.valid).length;
    const failed = totalTests - passed;
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
    const avgValidationTime =
      results.reduce((sum, r) => sum + r.performance.validationTime, 0) /
      totalTests;

    return {
      totalTests,
      passed,
      failed,
      totalErrors,
      avgValidationTime,
      summary: `Validation Summary: ${passed}/${totalTests} passed, ${failed} failed, ${totalErrors} total errors, avg ${avgValidationTime.toFixed(2)}ms`,
    };
  }

  /**
   * Clear schema cache
   */
  clearCache(): void {
    this.schemaCache.clear();
  }
}

// Export singleton instance
export const responseValidator = new ResponseValidator();

// Export helper functions
export async function validateMCPToolResult(
  response: any,
): Promise<ValidationResult> {
  return responseValidator.validateMCPToolResult(response);
}

export async function validateToolResponse(
  response: any,
  toolName: string,
): Promise<ValidationResult> {
  return responseValidator.validateToolResponse(response, toolName);
}

export async function validateYouTubeApiResponse(
  response: any,
  responseType: string,
): Promise<ValidationResult> {
  return responseValidator.validateYouTubeApiResponse(response, responseType);
}

export async function validateResponseIntegrity(
  response: any,
): Promise<ValidationResult> {
  return responseValidator.validateResponseIntegrity(response);
}

export async function assertValidMcpResult(response: any): Promise<void> {
  return responseValidator.assertValidMcpResult(response);
}

export async function assertValidToolResponse(
  response: any,
  toolName: string,
): Promise<void> {
  return responseValidator.assertValidToolResponse(response, toolName);
}

export function getValidationSummary(results: ValidationResult[]): any {
  return responseValidator.getValidationSummary(results);
}
