import { readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import type {
  ToolMetadata,
  ToolModule,
  ToolConstructor,
  ChainableToolConstructor,
  ToolRunner,
} from "../interfaces/tool.js";
import type { ToolResponse } from "../types.js";
import { ErrorHandler } from "../utils/error-handler.js";

export class ToolRegistry {
  private tools: Map<
    string,
    {
      metadata: ToolMetadata;
      constructor: ToolConstructor | ChainableToolConstructor;
    }
  > = new Map();
  private loaded = false;

  constructor(private toolsDir?: string) {
    // Tools will be loaded explicitly via loadAllTools()
  }

  async loadAllTools(): Promise<void> {
    if (this.loaded) return;

    try {
      const currentDir = dirname(fileURLToPath(import.meta.url));
      const toolsDir = this.toolsDir ?? join(currentDir, "..", "tools");

      const files = readdirSync(toolsDir).filter(
        (file) => file.endsWith(".tool.ts") || file.endsWith(".tool.js"),
      );

      for (const file of files) {
        try {
          const toolPath = join(toolsDir, file);
          const module = (await import(toolPath)) as ToolModule;

          if (!module.metadata || !module.default) {
            console.warn(
              `Tool file ${file} is missing required exports (metadata and default class)`,
            );
            continue;
          }

          this.validateToolModule(module);
          this.tools.set(module.metadata.name, {
            metadata: module.metadata,
            constructor: module.default,
          });
        } catch (error) {
          ErrorHandler.handleSystemError(error, {
            component: "tool-registry",
            operation: "load-tool",
            critical: false,
          });
        }
      }

      this.loaded = true;
    } catch (error) {
      ErrorHandler.handleSystemError(error, {
        component: "tool-registry",
        operation: "load-all-tools",
        critical: true,
      });
    }
  }

  private validateToolModule(module: ToolModule): void {
    const { metadata } = module;

    if (!metadata.name || typeof metadata.name !== "string") {
      throw new Error("Tool metadata must have a valid name");
    }

    if (!metadata.description || typeof metadata.description !== "string") {
      throw new Error("Tool metadata must have a valid description");
    }

    if (!metadata.inputSchema || typeof metadata.inputSchema !== "object") {
      throw new Error("Tool metadata must have a valid inputSchema");
    }

    if (!module.default || typeof module.default !== "function") {
      throw new Error("Tool module must export a default class constructor");
    }
  }

  listTools(): ToolMetadata[] {
    return Array.from(this.tools.values()).map((tool) => tool.metadata);
  }

  getTool(name: string): ToolMetadata | undefined {
    return this.tools.get(name)?.metadata;
  }

  async executeTool<T = any>(
    name: string,
    input: any,
    client: any,
  ): Promise<ToolResponse<T>> {
    const tool = this.tools.get(name);

    if (!tool) {
      return {
        success: false,
        error: `Tool '${name}' not found`,
      };
    }

    try {
      // Check if tool requires registry for chaining
      let toolInstance: ToolRunner<any, T>;
      if (tool.metadata.requiresRegistry) {
        // Pass registry for chainable tools - cast to ChainableToolConstructor
        const ChainableConstructor =
          tool.constructor as ChainableToolConstructor;
        toolInstance = new ChainableConstructor(client, this);
      } else {
        // Regular tools only get the client - cast to ToolConstructor
        const RegularConstructor = tool.constructor as ToolConstructor;
        toolInstance = new RegularConstructor(client);
      }

      const result = await toolInstance.run(input);
      return result;
    } catch (error) {
      return ErrorHandler.handleToolError(error, {
        source: name,
      });
    }
  }

  hasTools(): boolean {
    return this.tools.size > 0;
  }

  getToolCount(): number {
    return this.tools.size;
  }
}
