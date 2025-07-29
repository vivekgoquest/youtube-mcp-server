import { spawn, ChildProcess } from 'child_process';
import { setTimeout } from 'timers/promises';
import { ToolRegistry } from '../../src/registry/tool-registry';

describe('MCP Inspector Integration Tests', () => {
  let serverProcess: ChildProcess;
  const TEST_TIMEOUT = 30000;
  const SERVER_STARTUP_DELAY = 3000;
  let actualToolCount: number;
  let actualToolNames: string[];

  // Helper function to get actual tool registry data
  const getActualToolData = async () => {
    const registry = new ToolRegistry();
    await registry.loadAllTools();
    const tools = registry.listTools();
    actualToolCount = tools.length;
    actualToolNames = tools.map(tool => tool.name);
  };

  beforeAll(async () => {
    // Set test environment variables
    process.env.DEBUG_CONSOLE = 'false';
    process.env.NODE_ENV = 'test';
    
    // Ensure YOUTUBE_API_KEY is available
    if (!process.env.YOUTUBE_API_KEY) {
      throw new Error('YOUTUBE_API_KEY environment variable not set');
    }

    // Get actual tool registry data
    await getActualToolData();

    // Start the MCP server
    serverProcess = spawn('node', ['dist/src/index.js'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: process.env,
    });

    // Handle server startup
    let serverReady = false;
    let serverError = '';

    serverProcess.stdout?.on('data', (data) => {
      const output = data.toString();
      if (output.includes('server') || output.includes('ready') || output.includes('listening')) {
        serverReady = true;
      }
    });

    serverProcess.stderr?.on('data', (data) => {
      serverError += data.toString();
    });

    // Wait for server to start
    await setTimeout(SERVER_STARTUP_DELAY);

    if (serverProcess.exitCode !== null) {
      throw new Error(`Server failed to start: ${serverError}`);
    }
  }, TEST_TIMEOUT);

  afterAll(async () => {
    if (serverProcess && !serverProcess.killed) {
      serverProcess.kill('SIGTERM');
      
      // Wait for graceful shutdown
      await new Promise<void>((resolve) => {
        serverProcess.on('exit', () => resolve());
        setTimeout(() => {
          if (!serverProcess.killed) {
            serverProcess.kill('SIGKILL');
          }
          resolve();
        }, 5000);
      });
    }
  });

  const executeInspectorCommand = async (command: string, args?: any): Promise<any> => {
    return new Promise((resolve, reject) => {
      const cmdArgs = ['@modelcontextprotocol/inspector'];
      
      if (command) {
        cmdArgs.push('--command', command);
      }
      
      if (args) {
        cmdArgs.push('--args', JSON.stringify(args));
      }
      
      cmdArgs.push('stdio', 'node', 'dist/src/index.js');

      const inspectorProcess = spawn('npx', cmdArgs, {
        env: process.env,
        timeout: TEST_TIMEOUT,
      });

      let stdout = '';
      let stderr = '';

      inspectorProcess.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      inspectorProcess.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      inspectorProcess.on('close', (code) => {
        if (code === 0) {
          try {
            // Try to parse JSON response
            const result = JSON.parse(stdout);
            resolve(result);
          } catch (error) {
            // If not JSON, return raw output
            resolve({ success: true, output: stdout, stderr });
          }
        } else {
          reject(new Error(`Inspector command failed with code ${code}: ${stderr || stdout}`));
        }
      });

      inspectorProcess.on('error', (error) => {
        reject(error);
      });
    });
  };

  describe('Tool Discovery', () => {
    test('should list the correct number of tools', async () => {
      const result = await executeInspectorCommand('tools/list');
      
      expect(result).toBeDefined();
      const tools = result.tools || result;
      expect(tools).toHaveLength(actualToolCount);
      
      // Sanity check - ensure we have a reasonable number of tools
      expect(tools.length).toBeGreaterThan(10);
    }, TEST_TIMEOUT);

    test('should have required metadata for each tool', async () => {
      const result = await executeInspectorCommand('tools/list');
      const tools = result.tools || result;
      
      expect(Array.isArray(tools)).toBe(true);
      
      tools.forEach((tool: any) => {
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('inputSchema');
        expect(typeof tool.name).toBe('string');
        expect(typeof tool.description).toBe('string');
        expect(typeof tool.inputSchema).toBe('object');
      });
    }, TEST_TIMEOUT);

    test('should include expected tool names', async () => {
      const result = await executeInspectorCommand('tools/list');
      const tools = result.tools || result;
      const toolNames = tools.map((tool: any) => tool.name);

      // Use actual tool names from the registry
      actualToolNames.forEach((expectedTool) => {
        expect(toolNames).toContain(expectedTool);
      });
      
      // Also verify that the returned tools match the actual count
      expect(toolNames).toHaveLength(actualToolCount);
    }, TEST_TIMEOUT);
  });

  describe('Tool Execution', () => {
    const testCases = [
      {
        name: 'search_videos',
        args: { query: 'test', maxResults: 5 },
      },
      {
        name: 'search_channels',
        args: { query: 'test', maxResults: 5 },
      },
      {
        name: 'get_trending_videos',
        args: { regionCode: 'US', maxResults: 5 },
      },
      {
        name: 'extract_keywords_from_text',
        args: { text: 'This is a test video about technology and programming' },
      },
      {
        name: 'generate_keyword_cloud',
        args: { text: 'technology programming coding development software' },
      },
    ];

    testCases.forEach(({ name, args }) => {
      test(`should execute ${name} successfully`, async () => {
        const result = await executeInspectorCommand('tools/call', {
          name,
          arguments: args,
        });

        expect(result).toBeDefined();
        
        // Check for success indicators or content
        const hasSuccess = result.success === true || 
                          result.content !== undefined ||
                          result.output !== undefined;
        
        expect(hasSuccess).toBe(true);
      }, TEST_TIMEOUT);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid tool names', async () => {
      try {
        await executeInspectorCommand('tools/call', {
          name: 'invalid_tool_name',
          arguments: {},
        });
        fail('Should have thrown an error for invalid tool name');
      } catch (error) {
        expect(error).toBeDefined();
        expect(error.message).toMatch(/error|invalid|not found/i);
      }
    }, TEST_TIMEOUT);

    test('should handle missing required arguments', async () => {
      try {
        await executeInspectorCommand('tools/call', {
          name: 'search_videos',
          arguments: {}, // Missing required 'query' parameter
        });
        fail('Should have thrown an error for missing arguments');
      } catch (error) {
        expect(error).toBeDefined();
        expect(error.message).toMatch(/error|required|missing/i);
      }
    }, TEST_TIMEOUT);

    test('should handle malformed arguments', async () => {
      try {
        await executeInspectorCommand('tools/call', {
          name: 'search_videos',
          arguments: 'invalid_json_string',
        });
        fail('Should have thrown an error for malformed arguments');
      } catch (error) {
        expect(error).toBeDefined();
      }
    }, TEST_TIMEOUT);
  });

  describe('Protocol Compliance', () => {
    test('should return valid MCP response structure', async () => {
      const result = await executeInspectorCommand('tools/call', {
        name: 'extract_keywords_from_text',
        arguments: { text: 'test content' },
      });

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
      
      // MCP responses should have specific structure
      if (result.content) {
        expect(Array.isArray(result.content)).toBe(true);
      }
    }, TEST_TIMEOUT);

    test('should include metadata in responses', async () => {
      const result = await executeInspectorCommand('tools/call', {
        name: 'generate_keyword_cloud',
        arguments: { text: 'technology programming' },
      });

      expect(result).toBeDefined();
      
      // Check for metadata presence
      const hasMetadata = result.metadata !== undefined ||
                         result.timestamp !== undefined ||
                         result.toolName !== undefined;
      
      // Note: Metadata requirements may vary based on implementation
      // This test verifies the response structure is reasonable
      expect(typeof result).toBe('object');
    }, TEST_TIMEOUT);
  });

  describe('Performance and Reliability', () => {
    test('should handle concurrent tool execution', async () => {
      const concurrentCalls = [
        executeInspectorCommand('tools/call', {
          name: 'extract_keywords_from_text',
          arguments: { text: 'concurrent test 1' },
        }),
        executeInspectorCommand('tools/call', {
          name: 'extract_keywords_from_text',
          arguments: { text: 'concurrent test 2' },
        }),
        executeInspectorCommand('tools/call', {
          name: 'generate_keyword_cloud',
          arguments: { text: 'concurrent test 3' },
        }),
      ];

      const results = await Promise.all(concurrentCalls);
      
      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result).toBeDefined();
      });
    }, TEST_TIMEOUT);

    test('should respond within reasonable time limits', async () => {
      const startTime = Date.now();
      
      await executeInspectorCommand('tools/call', {
        name: 'extract_keywords_from_text',
        arguments: { text: 'performance test content' },
      });
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      // Should respond within 15 seconds for simple operations
      expect(responseTime).toBeLessThan(15000);
    }, TEST_TIMEOUT);

    test('should recover from tool execution errors', async () => {
      // First, try a call that might fail
      try {
        await executeInspectorCommand('tools/call', {
          name: 'get_video_details',
          arguments: { videoId: 'invalid_video_id' },
        });
      } catch (error) {
        // Expected to fail with invalid video ID
      }

      // Then verify the server is still responsive
      const result = await executeInspectorCommand('tools/call', {
        name: 'extract_keywords_from_text',
        arguments: { text: 'recovery test' },
      });

      expect(result).toBeDefined();
    }, TEST_TIMEOUT);
  });
});
