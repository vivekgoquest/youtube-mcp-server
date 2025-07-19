import { ToolRegistry } from '../../src/registry/tool-registry';
import { readdirSync } from 'fs';
import { jest } from '@jest/globals';

// Mock fs module
jest.mock('fs');
const mockedReaddirSync = jest.mocked(readdirSync);

describe('ToolRegistry', () => {
  let registry: ToolRegistry;

  beforeEach(() => {
    registry = new ToolRegistry();
    jest.clearAllMocks();
  });

  describe('Tool Discovery', () => {
    test('should discover only .tool.ts and .tool.js files', () => {
      const mockFiles = [
        'search-videos.tool.ts',
        'get-channel-details.tool.ts',
        'analyze-keywords.tool.js',
        'helper.ts',
        'index.js',
        'search-videos.tool.d.ts',
        'config.json',
        'test.tool.js.map'
      ];

      mockedReaddirSync.mockReturnValue(mockFiles as any);

      const toolFiles = (registry as any).getToolFiles('/mock/path');

      expect(toolFiles).toHaveLength(3);
      expect(toolFiles).toContain('search-videos.tool.ts');
      expect(toolFiles).toContain('get-channel-details.tool.ts');
      expect(toolFiles).toContain('analyze-keywords.tool.js');
      expect(toolFiles).not.toContain('helper.ts');
      expect(toolFiles).not.toContain('search-videos.tool.d.ts');
      expect(toolFiles).not.toContain('test.tool.js.map');
    });

    test('should handle empty tools directory', () => {
      mockedReaddirSync.mockReturnValue([]);

      const toolFiles = (registry as any).getToolFiles('/mock/path');

      expect(toolFiles).toHaveLength(0);
    });

    test('should handle missing tools directory', () => {
      mockedReaddirSync.mockImplementation(() => {
        throw new Error('ENOENT: no such file or directory');
      });

      expect(() => {
        (registry as any).getToolFiles('/mock/path');
      }).toThrow('ENOENT: no such file or directory');
    });
  });

  describe('Tool Loading', () => {
    const mockValidTool = {
      metadata: {
        name: 'test_tool',
        description: 'Test tool description',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string' }
          },
          required: ['query']
        }
      },
      default: class TestTool {
        constructor(private client: any) {}
        async run() {
          return { 
            success: true, 
            data: 'test result',
            metadata: {
              quotaUsed: 1,
              requestTime: 0,
              source: 'test'
            }
          };
        }
      }
    };

    test('should load valid tool modules successfully', async () => {
      mockedReaddirSync.mockReturnValue(['test.tool.ts'] as any);
      
      // Mock dynamic import
      const originalImport = (global as any).import;
      (global as any).import = jest.fn().mockResolvedValue(mockValidTool);

      await registry.loadAllTools();

      expect(registry.hasTools()).toBe(true);
      expect(registry.getToolCount()).toBe(1);
      expect(registry.getTool('test_tool')).toEqual(mockValidTool.metadata);

      // Restore original import
      (global as any).import = originalImport;
    });

    test('should reject modules with missing metadata', async () => {
      const invalidTool = {
        default: class TestTool {
          constructor(client: any) {}
        }
        // Missing metadata
      };

      mockedReaddirSync.mockReturnValue(['invalid.tool.ts'] as any);
      
      const originalImport = (global as any).import;
      (global as any).import = jest.fn().mockResolvedValue(invalidTool);

      await registry.loadAllTools();

      expect(registry.getToolCount()).toBe(0);

      (global as any).import = originalImport;
    });

    test('should reject modules with invalid metadata types', async () => {
      const invalidTool = {
        metadata: 'invalid_metadata_type',
        default: class TestTool {
          constructor(client: any) {}
        }
      };

      mockedReaddirSync.mockReturnValue(['invalid.tool.ts'] as any);
      
      const originalImport = (global as any).import;
      (global as any).import = jest.fn().mockResolvedValue(invalidTool);

      await registry.loadAllTools();

      expect(registry.getToolCount()).toBe(0);

      (global as any).import = originalImport;
    });

    test('should reject modules with missing default class export', async () => {
      const invalidTool = {
        metadata: {
          name: 'test_tool',
          description: 'Test tool',
          inputSchema: { type: 'object' }
        }
        // Missing default export
      };

      mockedReaddirSync.mockReturnValue(['invalid.tool.ts'] as any);
      
      const originalImport = (global as any).import;
      (global as any).import = jest.fn().mockResolvedValue(invalidTool);

      await registry.loadAllTools();

      expect(registry.getToolCount()).toBe(0);

      (global as any).import = originalImport;
    });

    test('should handle dynamic import failures', async () => {
      mockedReaddirSync.mockReturnValue(['failing.tool.ts'] as any);
      
      const originalImport = (global as any).import;
      (global as any).import = jest.fn().mockRejectedValue(new Error('Import failed'));

      await registry.loadAllTools();

      expect(registry.getToolCount()).toBe(0);

      (global as any).import = originalImport;
    });

    test('should be idempotent (not reload tools)', async () => {
      mockedReaddirSync.mockReturnValue(['test.tool.ts'] as any);
      
      const originalImport = (global as any).import;
      const mockImportFn = jest.fn().mockResolvedValue(mockValidTool);
      (global as any).import = mockImportFn;

      await registry.loadAllTools();
      await registry.loadAllTools(); // Second call

      expect(mockImportFn).toHaveBeenCalledTimes(1);
      expect(registry.getToolCount()).toBe(1);

      (global as any).import = originalImport;
    });
  });

  describe('Tool Registry Management', () => {
    beforeEach(async () => {
      // Setup registry with mock tools
      const mockTool1 = {
        metadata: {
          name: 'tool1',
          description: 'First tool',
          inputSchema: { type: 'object' }
        },
        default: class Tool1 {
          constructor(client: any) {}
          async run() {
            return { success: true, metadata: { quotaUsed: 1, requestTime: 0, source: 'test' } };
          }
        }
      };

      const mockTool2 = {
        metadata: {
          name: 'tool2',
          description: 'Second tool',
          inputSchema: { type: 'object' }
        },
        default: class Tool2 {
          constructor(client: any) {}
          async run() {
            return { success: true, metadata: { quotaUsed: 1, requestTime: 0, source: 'test' } };
          }
        }
      };

      mockedReaddirSync.mockReturnValue(['tool1.tool.ts', 'tool2.tool.ts'] as any);
      
      const originalImport = (global as any).import;
      (global as any).import = jest.fn()
        .mockResolvedValueOnce(mockTool1)
        .mockResolvedValueOnce(mockTool2);

      await registry.loadAllTools();

      (global as any).import = originalImport;
    });

    test('should list all loaded tools', () => {
      const tools = registry.listTools();

      expect(tools).toHaveLength(2);
      expect(tools[0].name).toBe('tool1');
      expect(tools[1].name).toBe('tool2');
    });

    test('should get specific tool metadata', () => {
      const tool = registry.getTool('tool1');

      expect(tool).toBeDefined();
      expect(tool?.name).toBe('tool1');
      expect(tool?.description).toBe('First tool');
    });

    test('should return undefined for non-existent tool', () => {
      const tool = registry.getTool('nonexistent');

      expect(tool).toBeUndefined();
    });

    test('should check if tools are loaded', () => {
      expect(registry.hasTools()).toBe(true);
    });

    test('should return correct tool count', () => {
      expect(registry.getToolCount()).toBe(2);
    });
  });

  describe('Tool Execution', () => {
    const mockTool = {
      metadata: {
        name: 'executable_tool',
        description: 'Executable tool',
        inputSchema: {
          type: 'object',
          properties: { input: { type: 'string' } },
          required: ['input']
        }
      },
      default: class ExecutableTool {
        constructor(private client: any) {}
        
        async run(args: any) {
          return {
            success: true,
            data: `Processed: ${args.input}`,
            metadata: {
              quotaUsed: 1,
              requestTime: 0,
              source: 'test'
            }
          };
        }
      }
    };

    beforeEach(async () => {
      mockedReaddirSync.mockReturnValue(['executable.tool.ts'] as any);
      
      const originalImport = (global as any).import;
      (global as any).import = jest.fn().mockResolvedValue(mockTool);

      await registry.loadAllTools();

      (global as any).import = originalImport;
    });

    test('should execute tool successfully with valid inputs', async () => {
      const result = await registry.executeTool('executable_tool', { input: 'test data' }, {});

      expect(result.success).toBe(true);
      expect(result.data).toBe('Processed: test data');
      expect(result.metadata).toBeDefined();
      expect(result.metadata.source).toBe('executable_tool');
      expect(result.metadata.requestTime).toBeDefined();
    });

    test('should handle tool not found error', async () => {
      const result = await registry.executeTool('nonexistent_tool', {}, {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('Tool \'nonexistent_tool\' not found');
    });

    test('should handle tool execution errors', async () => {
      const failingTool = {
        metadata: {
          name: 'failing_tool',
          description: 'Failing tool',
          inputSchema: { type: 'object' }
        },
        default: class FailingTool {
          constructor(private client: any) {}
          async run() {
            throw new Error('Tool execution failed');
          }
        }
      };

      mockedReaddirSync.mockReturnValue(['failing.tool.ts'] as any);
      
      const originalImport = (global as any).import;
      (global as any).import = jest.fn().mockResolvedValue(failingTool);

      const newRegistry = new ToolRegistry();
      await newRegistry.loadAllTools();

      const result = await newRegistry.executeTool('failing_tool', {}, {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('Tool execution failed');

      (global as any).import = originalImport;
    });

    test('should handle tool constructor errors', async () => {
      const constructorFailingTool = {
        metadata: {
          name: 'constructor_failing_tool',
          description: 'Constructor failing tool',
          inputSchema: { type: 'object' }
        },
        default: class ConstructorFailingTool {
          constructor(client: any) {
            throw new Error('Constructor failed');
          }
          
          async run() {
            return { success: true, metadata: { quotaUsed: 1, requestTime: 0, source: 'test' } };
          }
        }
      };

      mockedReaddirSync.mockReturnValue(['constructor-failing.tool.ts'] as any);
      
      const originalImport = (global as any).import;
      (global as any).import = jest.fn().mockResolvedValue(constructorFailingTool);

      const newRegistry = new ToolRegistry();
      await newRegistry.loadAllTools();

      const result = await newRegistry.executeTool('constructor_failing_tool', {}, {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('Constructor failed');

      (global as any).import = originalImport;
    });

    test('should measure execution timing', async () => {
      const result = await registry.executeTool('executable_tool', { input: 'timing test' }, {});

      expect(result.metadata.requestTime).toBeDefined();
      expect(typeof result.metadata.requestTime).toBe('number');
      expect(result.metadata.requestTime).toBeGreaterThanOrEqual(0);
    });

    test('should include proper metadata in responses', async () => {
      const result = await registry.executeTool('executable_tool', { input: 'metadata test' }, {});

      expect(result.metadata).toMatchObject({
        source: 'executable_tool',
        requestTime: expect.any(Number),
        quotaUsed: expect.any(Number)
      });

      expect(result.metadata.requestTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle tools directory not existing', async () => {
      mockedReaddirSync.mockImplementation(() => {
        const error = new Error('ENOENT: no such file or directory');
        (error as any).code = 'ENOENT';
        throw error;
      });

      await registry.loadAllTools();

      expect(registry.getToolCount()).toBe(0);
      expect(registry.hasTools()).toBe(false);
    });

    test('should handle file system permission errors', async () => {
      mockedReaddirSync.mockImplementation(() => {
        const error = new Error('EACCES: permission denied');
        (error as any).code = 'EACCES';
        throw error;
      });

      await registry.loadAllTools();

      expect(registry.getToolCount()).toBe(0);
    });

    test('should continue loading other tools when one fails', async () => {
      const validTool = {
        metadata: {
          name: 'valid_tool',
          description: 'Valid tool',
          inputSchema: { type: 'object' }
        },
        default: class ValidTool {
          constructor(client: any) {}
          async run() {
            return { success: true, metadata: { quotaUsed: 1, requestTime: 0, source: 'test' } };
          }
        }
      };

      mockedReaddirSync.mockReturnValue(['valid.tool.ts', 'invalid.tool.ts'] as any);
      
      const originalImport = (global as any).import;
      (global as any).import = jest.fn()
        .mockResolvedValueOnce(validTool)
        .mockRejectedValueOnce(new Error('Import failed'));

      await registry.loadAllTools();

      expect(registry.getToolCount()).toBe(1);
      expect(registry.getTool('valid_tool')).toBeDefined();

      (global as any).import = originalImport;
    });
  });
});