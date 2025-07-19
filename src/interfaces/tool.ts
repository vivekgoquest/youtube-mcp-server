import { ToolResponse } from '../types.js';

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
}

export interface ToolRunner<TInput = any, TOutput = any> {
  run(input: TInput): Promise<ToolResponse<TOutput>>;
}

export interface ToolModule<TInput = any, TOutput = any> {
  metadata: ToolMetadata;
  default: new (client: any) => ToolRunner<TInput, TOutput>;
}

export interface ToolConstructor<TInput = any, TOutput = any> {
  new (client: any): ToolRunner<TInput, TOutput>;
}