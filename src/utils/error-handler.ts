import { ToolResponse, ToolRequestMetadata } from "../types.js";

// Context interfaces for different error types
export interface ToolErrorContext {
  quotaUsed: number;
  estimatedQuota?: number;
  startTime: number;
  source: string;
  defaultMessage?: string;
}

export interface UtilityErrorContext {
  operation: string;
  details?: string;
}

export interface SystemErrorContext {
  component: string;
  operation: string;
  critical?: boolean;
}

export interface TestErrorContext {
  testName: string;
  operation: string;
  expectation?: string;
}

export class ErrorHandler {
  /**
   * Handles validation errors with minimal quota cost
   */
  static handleValidationError<T = any>(
    errorMessage: string,
    source: string,
  ): ToolResponse<T> {
    return {
      success: false,
      error: errorMessage,
      data: null as unknown as T,
      metadata: {
        quotaUsed: 0, // Validation errors don't consume API quota
        requestTime: 0, // No actual request was made
        source: source,
      },
    };
  }

  /**
   * Handles tool execution errors and returns standardized ToolResponse
   */
  static handleToolError<T = any>(
    error: unknown,
    context: ToolErrorContext,
  ): ToolResponse<T> {
    const errorMessage = this.formatErrorMessage(error);
    const requestTime = this.calculateRequestTime(context.startTime);

    const metadata: ToolRequestMetadata = {
      quotaUsed: context.quotaUsed,
      requestTime,
      source: context.source,
    };

    if (context.estimatedQuota !== undefined) {
      metadata.estimatedQuota = context.estimatedQuota;
    }

    return {
      success: false,
      error: context.defaultMessage
        ? `${context.defaultMessage}: ${errorMessage}`
        : errorMessage,
      data: null as unknown as T,
      metadata,
    };
  }

  /**
   * Handles utility function errors and throws standardized Error
   */
  static handleUtilityError(
    error: unknown,
    context: UtilityErrorContext,
  ): never {
    const errorMessage = this.formatErrorMessage(error);
    const details = context.details ? ` (${context.details})` : "";

    throw new Error(`${context.operation} failed${details}: ${errorMessage}`);
  }

  /**
   * Handles system errors with logging and optional process exit
   */
  static handleSystemError(
    error: unknown,
    context: SystemErrorContext,
  ): void | never {
    const errorMessage = this.formatErrorMessage(error);
    const logMessage = `[${context.component}] ${context.operation} error: ${errorMessage}`;

    console.error(logMessage);

    if (context.critical) {
      process.exit(1);
    }
  }

  /**
   * Handles test errors with context-aware formatting
   */
  static handleTestError(error: unknown, context: TestErrorContext): never {
    const errorMessage = this.formatErrorMessage(error);
    const expectation = context.expectation
      ? ` (expected: ${context.expectation})`
      : "";

    throw new Error(
      `[${context.testName}] ${context.operation} failed${expectation}: ${errorMessage}`,
    );
  }

  /**
   * Formats error messages consistently
   */
  private static formatErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    if (typeof error === "string") {
      return error;
    }

    if (error && typeof error === "object" && "message" in error) {
      return String(error.message);
    }

    return "Unknown error occurred";
  }

  /**
   * Calculates request time from start time
   */
  private static calculateRequestTime(startTime: number): number {
    return Date.now() - startTime;
  }

  /**
   * Creates standardized metadata object
   */
  private static createMetadata(
    context: Pick<ToolErrorContext, "quotaUsed" | "estimatedQuota" | "source">,
    requestTime: number,
  ): ToolRequestMetadata {
    const metadata: ToolRequestMetadata = {
      quotaUsed: context.quotaUsed,
      requestTime,
      source: context.source,
    };

    if (context.estimatedQuota !== undefined) {
      metadata.estimatedQuota = context.estimatedQuota;
    }

    return metadata;
  }

  /**
   * Detects if error is from YouTube API
   */
  static isApiError(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return (
        message.includes("api") ||
        message.includes("quota") ||
        message.includes("youtube") ||
        message.includes("unauthorized") ||
        message.includes("forbidden")
      );
    }
    return false;
  }
}
