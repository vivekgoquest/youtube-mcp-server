import type { ToolResponse } from "../types.js";
import { ToolRegistry } from "../registry/tool-registry.js";
import { ErrorHandler } from "../utils/error-handler.js";

export interface ToolMetadata {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, any>;
    required?: string[];
  };
  version?: string;
  requiresRegistry?: boolean; // Indicates if tool needs registry for chaining
}

export interface ToolRunner<TInput = any, TOutput = any> {
  run(input: TInput): Promise<ToolResponse<TOutput>>;
}

/**
 * Interface for tools that can chain other tools
 */
export interface ChainableToolRunner<TInput = any, TOutput = any>
  extends ToolRunner<TInput, TOutput> {
  // Chainable tools receive the full context
}

export interface ToolModule<TInput = any, TOutput = any> {
  metadata: ToolMetadata;
  default: new (
    client: any,
    registry?: ToolRegistry,
  ) => ToolRunner<TInput, TOutput>;
}

export interface ToolConstructor<TInput = any, TOutput = any> {
  new (client: any): ToolRunner<TInput, TOutput>;
}

export interface ChainableToolConstructor<TInput = any, TOutput = any> {
  new (client: any, registry: ToolRegistry): ToolRunner<TInput, TOutput>;
}

/**
 * Abstract base class for all tools
 * Handles common functionality like error handling
 */
export abstract class Tool<TInput = any, TOutput = any> implements ToolRunner<TInput, TOutput> {
  protected abstract execute(input: TInput): Promise<ToolResponse<TOutput>>;

  async run(input: TInput): Promise<ToolResponse<TOutput>> {
    try {
      return await this.execute(input);
    } catch (error: any) {
      return ErrorHandler.handleToolError(error);
    }
  }
}
