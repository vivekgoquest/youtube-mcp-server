import { ToolResponse } from '../types.js';
import { ToolRegistry } from '../registry/tool-registry.js';

export interface ToolMetadata {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
  version?: string;
  quotaCost?: number;
  requiresRegistry?: boolean; // Indicates if tool needs registry for chaining
}

export interface ToolRunner<TInput = any, TOutput = any> {
  run(input: TInput): Promise<ToolResponse<TOutput>>;
}

/**
 * Context provided to chainable tools
 */
export interface ToolContext {
  client: any; // YouTubeClient
  registry: ToolRegistry;
}

/**
 * Interface for tools that can chain other tools
 */
export interface ChainableToolRunner<TInput = any, TOutput = any> extends ToolRunner<TInput, TOutput> {
  // Chainable tools receive the full context
}

export interface ToolModule<TInput = any, TOutput = any> {
  metadata: ToolMetadata;
  default: new (client: any, registry?: ToolRegistry) => ToolRunner<TInput, TOutput>;
}

export interface ToolConstructor<TInput = any, TOutput = any> {
  new (client: any): ToolRunner<TInput, TOutput>;
}

export interface ChainableToolConstructor<TInput = any, TOutput = any> {
  new (client: any, registry: ToolRegistry): ToolRunner<TInput, TOutput>;
}
