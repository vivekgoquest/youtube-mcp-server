import fs from 'fs';
import path from 'path';
import {
  REAL_CLIENT,
  apiDelay,
  trackQuotaUsage,
  checkQuotaBudget,
  getQuotaUsed,
  resetQuotaTracking,
  QUOTA_BUDGET_LIMIT,
  getComplianceTestMode
} from './setup.js';
import { testToolInterface, InterfaceTestResult, ValidationOptions } from './utils/interface-tester.js';
import { TOOL_TEST_INPUTS } from './fixtures/test-inputs.js';
import { ToolMetadata, ToolRunner, ChainableToolConstructor, ToolConstructor } from '../src/interfaces/tool.js';
import { ToolRegistry } from '../src/registry/tool-registry.js';

interface ToolModule {
  default: new (client: any, registry?: any) => ToolRunner<any, any>;
  metadata: ToolMetadata;
}

interface TestReport {
  totalTools: number;
  testedTools: number;
  skippedTools: number;
  passedTools: number;
  failedTools: number;
  quotaUsed: number;
  quotaBudget: number;
  toolResults: InterfaceTestResult[];
  skippedDueToQuota: string[];
  errors: Array<{ tool: string; error: string }>;
}

// Group tools by quota cost for efficient testing
const QUOTA_GROUPS = {
  free: [], // 0 quota
  low: [],  // 1-50 quota
  medium: [], // 51-150 quota
  high: [] // 151+ quota
} as Record<string, Array<{ name: string; module: ToolModule; quotaCost: number }>>;

describe('Tool Interface Compliance Tests', () => {
  let allTools: Array<{ name: string; module: ToolModule; quotaCost: number }> = [];
  let testReport: TestReport;

  beforeAll(async () => {
    // Reset quota tracking at start
    resetQuotaTracking();
    
    // List all tool files from the source directory
    const toolsDir = path.join(process.cwd(), 'src/tools');
    const toolFiles = fs.readdirSync(toolsDir)
      .filter(file => file.endsWith('.tool.ts'))
      .sort(); // Ensure consistent order
    
    // Import all tools and organize by quota cost
    for (const file of toolFiles) {
      const toolName = file.replace('.tool.ts', '').replace(/-/g, '_');
      const modulePath = `../src/tools/${file}`;
      
      try {
        console.log(`Attempting to import ${toolName} from ${modulePath}`);
        const module = await import(modulePath) as ToolModule;
        
        if (!module.default || !module.metadata) {
          console.error(`Tool ${toolName} missing default export or metadata`);
          continue;
        }
        
        console.log(`Successfully imported ${toolName}, quota cost: ${module.metadata.quotaCost}`);
        
        const quotaCost = module.metadata.quotaCost || 0;
        
        const toolInfo = {
          name: toolName,
          module,
          quotaCost
        };
        
        allTools.push(toolInfo);
        
        // Group by quota cost for efficient testing
        if (quotaCost === 0) {
          QUOTA_GROUPS.free.push(toolInfo);
          console.log(`Added ${toolName} to free group`);
        } else if (quotaCost <= 50) {
          QUOTA_GROUPS.low.push(toolInfo);
          console.log(`Added ${toolName} to low group`);
        } else if (quotaCost <= 150) {
          QUOTA_GROUPS.medium.push(toolInfo);
          console.log(`Added ${toolName} to medium group`);
        } else {
          QUOTA_GROUPS.high.push(toolInfo);
          console.log(`Added ${toolName} to high group`);
        }
      } catch (error) {
        console.error(`Failed to import tool ${toolName} from ${modulePath}:`, error);
        console.error('Stack trace:', (error as Error).stack);
      }
    }

    // Initialize test report
    testReport = {
      totalTools: allTools.length,
      testedTools: 0,
      skippedTools: 0,
      passedTools: 0,
      failedTools: 0,
      quotaUsed: 0,
      quotaBudget: QUOTA_BUDGET_LIMIT,
      toolResults: [],
      skippedDueToQuota: [],
      errors: []
    };

    console.log(`\n🔍 Discovered ${allTools.length} tools for interface compliance testing`);
    console.log(`📊 Quota groups: Free(${QUOTA_GROUPS.free.length}), Low(${QUOTA_GROUPS.low.length}), Medium(${QUOTA_GROUPS.medium.length}), High(${QUOTA_GROUPS.high.length})`);
    console.log(`💰 Quota budget: ${QUOTA_BUDGET_LIMIT} units\n`);
  });

  afterAll(async () => {
    // Generate comprehensive test report
    testReport.quotaUsed = getQuotaUsed();
    
    console.log('\n' + '='.repeat(80));
    console.log('📋 TOOL INTERFACE COMPLIANCE TEST REPORT');
    console.log('='.repeat(80));
    console.log(`Total Tools Discovered: ${testReport.totalTools}`);
    console.log(`Tools Tested: ${testReport.testedTools}`);
    console.log(`Tools Passed: ${testReport.passedTools}`);
    console.log(`Tools Failed: ${testReport.failedTools}`);
    console.log(`Tools Skipped: ${testReport.skippedTools}`);
    console.log(`Quota Used: ${testReport.quotaUsed}/${testReport.quotaBudget} units`);
    console.log(`Success Rate: ${testReport.testedTools > 0 ? ((testReport.passedTools / testReport.testedTools) * 100).toFixed(1) : 0}%`);
    
    if (testReport.skippedDueToQuota.length > 0) {
      console.log('\n⚠️  Tools Skipped Due to Quota Budget:');
      testReport.skippedDueToQuota.forEach(tool => console.log(`  - ${tool}`));
    }
    
    if (testReport.errors.length > 0) {
      console.log('\n❌ Errors Encountered:');
      testReport.errors.forEach(({ tool, error }) => {
        console.log(`  - ${tool}: ${error}`);
      });
    }
    
    console.log('\n📊 Detailed Results by Tool:');
    testReport.toolResults.forEach(result => {
      const status = result.success ? '✅' : '❌';
      const tests = Object.entries(result.tests)
        .map(([test, passed]) => `${test}:${passed ? '✓' : '✗'}`)
        .join(' ');
      console.log(`  ${status} ${result.tool} (${tests})`);
    });
    
    console.log('='.repeat(80));
    
    // Force exit timers to prevent open handles
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  // Test free quota tools first (no quota cost)
  describe('Free Quota Tools (0 units)', () => {
    test('should test all free quota tools', async () => {
      if (QUOTA_GROUPS.free.length === 0) {
        console.log('No free quota tools found');
        return;
      }
      
      for (const toolInfo of QUOTA_GROUPS.free) {
        await testSingleTool(toolInfo);
      }
    });
  });

  // Test low quota tools
  describe('Low Quota Tools (1-50 units)', () => {
    test('should test low quota tools', async () => {
      const testMode = getComplianceTestMode();
      const toolsToTest = testMode === 'minimal' ? QUOTA_GROUPS.low.slice(0, 2) : QUOTA_GROUPS.low;
      
      if (toolsToTest.length === 0) {
        console.log('No low quota tools to test');
        return;
      }
      
      for (const toolInfo of toolsToTest) {
        if (!checkQuotaBudget(toolInfo.quotaCost)) {
          testReport.skippedTools++;
          testReport.skippedDueToQuota.push(toolInfo.name);
          console.log(`⚠️  Skipping ${toolInfo.name} due to quota budget (${toolInfo.quotaCost} units)`);
          continue;
        }
        
        await testSingleTool(toolInfo);
      }
    });
  });

  // Test medium quota tools
  describe('Medium Quota Tools (51-150 units)', () => {
    test('should test medium quota tools', async () => {
      const testMode = getComplianceTestMode();
      const toolsToTest = testMode === 'minimal' ? QUOTA_GROUPS.medium.slice(0, 1) : QUOTA_GROUPS.medium;
      
      if (toolsToTest.length === 0) {
        console.log('No medium quota tools to test');
        return;
      }
      
      for (const toolInfo of toolsToTest) {
        if (!checkQuotaBudget(toolInfo.quotaCost)) {
          testReport.skippedTools++;
          testReport.skippedDueToQuota.push(toolInfo.name);
          console.log(`⚠️  Skipping ${toolInfo.name} due to quota budget (${toolInfo.quotaCost} units)`);
          continue;
        }
        
        await testSingleTool(toolInfo);
      }
    });
  });

  // Test high quota tools (only in full mode)
  describe('High Quota Tools (151+ units)', () => {
    const testMode = getComplianceTestMode();
    
    if (testMode === 'minimal') {
      test('should skip high quota tools in minimal mode', () => {
        console.log(`⚠️  Skipping ${QUOTA_GROUPS.high.length} high quota tools in minimal mode`);
        testReport.skippedTools += QUOTA_GROUPS.high.length;
        QUOTA_GROUPS.high.forEach(tool => testReport.skippedDueToQuota.push(tool.name));
        expect(true).toBe(true);
      });
    } else {
      test('should test high quota tools', async () => {
        if (QUOTA_GROUPS.high.length === 0) {
          console.log('No high quota tools to test');
          return;
        }
        
        for (const toolInfo of QUOTA_GROUPS.high) {
          if (!checkQuotaBudget(toolInfo.quotaCost)) {
            testReport.skippedTools++;
            testReport.skippedDueToQuota.push(toolInfo.name);
            console.log(`⚠️  Skipping ${toolInfo.name} due to quota budget (${toolInfo.quotaCost} units)`);
            continue;
          }
          
          await testSingleTool(toolInfo);
        }
      });
    }
  });

  // Helper function to test a single tool
  async function testSingleTool(toolInfo: { name: string; module: ToolModule; quotaCost: number }) {
    const { name: toolName, module, quotaCost } = toolInfo;
    
    try {
      console.log(`🧪 Testing ${toolName} (quota: ${quotaCost} units)`);
      
      // Get test inputs for this tool
      const testInputs = TOOL_TEST_INPUTS[toolName as keyof typeof TOOL_TEST_INPUTS];
      if (!testInputs) {
        throw new Error(`No test inputs found for tool: ${toolName}`);
      }

      // Create tool instance - check if it requires registry
      let toolInstance;
      if (module.metadata.requiresRegistry) {
        // For chainable tools, create a minimal registry
        const registry = new ToolRegistry();
        toolInstance = new module.default(REAL_CLIENT, registry);
      } else {
        toolInstance = new module.default(REAL_CLIENT);
      }

      // Run interface compliance test
      const options: ValidationOptions = {
        skipQuotaCheck: false,
        maxQuotaPerTest: quotaCost,
        testTimeout: 10000
      };
      
      const result = await testToolInterface(
        toolInstance,
        module.metadata,
        testInputs.minimal,
        options
      );

      // Track results
      testReport.testedTools++;
      testReport.toolResults.push(result);
      
      if (result.success) {
        testReport.passedTools++;
        console.log(`✅ ${toolName} passed all interface compliance tests`);
      } else {
        testReport.failedTools++;
        const failedTests = Object.entries(result.tests)
          .filter(([, passed]) => !passed)
          .map(([test]) => test);
        console.log(`❌ ${toolName} failed tests: ${failedTests.join(', ')}`);
      }

      // Track quota usage
      if (result.quotaUsed) {
        trackQuotaUsage(result.quotaUsed);
      }

      // Add delay between tests to respect rate limits
      await apiDelay(300);

      expect(result.success).toBe(true);
      
    } catch (error) {
      testReport.testedTools++;
      testReport.failedTools++;
      const errorMessage = error instanceof Error ? error.message : String(error);
      testReport.errors.push({ tool: toolName, error: errorMessage });
      
      console.error(`❌ Error testing ${toolName}:`, errorMessage);
      throw error;
    }
  }

  // Validate tool discovery and setup
  describe('Tool Discovery', () => {
    test('should discover all expected tools', () => {
      expect(allTools.length).toBeGreaterThan(15); // Expect at least 15 tools
      expect(allTools.length).toBeLessThan(25); // But not more than 25
    });

    test('should have valid metadata for all tools', () => {
      allTools.forEach(({ name, module }) => {
        expect(module.metadata).toBeDefined();
        expect(module.metadata.name).toBe(name);
        expect(module.metadata.description).toBeTruthy();
        expect(module.metadata.inputSchema).toBeDefined();
        expect(typeof module.metadata.quotaCost).toBe('number');
      });
    });

    test('should have test inputs for all tools', () => {
      allTools.forEach(({ name }) => {
        const testInputs = TOOL_TEST_INPUTS[name as keyof typeof TOOL_TEST_INPUTS];
        expect(testInputs).toBeDefined();
        expect(testInputs.minimal).toBeDefined();
      });
    });
  });

  // Quota budget validation
  describe('Quota Budget Management', () => {
    test('should respect quota budget limits', () => {
      const totalQuotaIfAllRun = allTools.reduce((sum, tool) => sum + tool.quotaCost, 0);
      console.log(`📊 Total quota if all tools run: ${totalQuotaIfAllRun} units`);
      
      // In minimal mode, we should be able to test at least the free tools
      if (getComplianceTestMode() === 'minimal') {
        const freeToolsQuota = QUOTA_GROUPS.free.reduce((sum, tool) => sum + tool.quotaCost, 0);
        expect(freeToolsQuota).toBeLessThanOrEqual(QUOTA_BUDGET_LIMIT);
      }
    });

    test('should track quota usage correctly', () => {
      expect(getQuotaUsed()).toBeGreaterThanOrEqual(0);
      expect(getQuotaUsed()).toBeLessThanOrEqual(QUOTA_BUDGET_LIMIT);
    });
  });
});
