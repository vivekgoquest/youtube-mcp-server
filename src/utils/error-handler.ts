import type { ToolResponse } from "../types.js";

// Context interfaces for different error types
export interface ToolErrorContext {
  source?: string;
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

export class ErrorHandler {
  /**
   * Handles validation errors
   */
  static handleValidationError<T = any>(
    errorMessage: string,
    _source: string,
  ): ToolResponse<T> {
    return {
      success: false,
      error: errorMessage,
    };
  }

  /**
   * Handles tool execution errors and returns standardized ToolResponse
   */
  static handleToolError<T = any>(
    error: unknown,
    context?: ToolErrorContext,
  ): ToolResponse<T> {
    const errorMessage = this.formatErrorMessage(error);

    return {
      success: false,
      error: context?.defaultMessage
        ? `${context.defaultMessage}: ${errorMessage}`
        : errorMessage,
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
}
