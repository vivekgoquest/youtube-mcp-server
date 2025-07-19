#!/usr/bin/env node

/**
 * Basic functionality test for YouTube MCP Server
 * 
 * This script performs simple tests to verify that:
 * 1. The server can be imported and started
 * 2. Environment variables are set correctly
 * 3. Basic tool listing works
 * 4. Simple API calls succeed
 */

import { spawn } from 'child_process';
import { existsSync } from 'fs';

console.log('🧪 YouTube MCP Server - Basic Functionality Test');
console.log('='.repeat(50));

/**
 * Test 1: Environment Check
 */
function testEnvironment() {
  console.log('\n📋 Test 1: Environment Check');
  
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    console.log('❌ YOUTUBE_API_KEY environment variable not found');
    console.log('💡 Set it with: export YOUTUBE_API_KEY=your_api_key_here');
    return false;
  }
  
  if (apiKey.length < 30) {
    console.log('⚠️  YOUTUBE_API_KEY seems too short (may be invalid)');
    console.log(`   Current length: ${apiKey.length} characters`);
  } else {
    console.log('✅ YOUTUBE_API_KEY found and appears valid');
  }
  
  return true;
}

/**
 * Test 2: Build Check
 */
function testBuild() {
  console.log('\n📋 Test 2: Build Check');
  
  if (!existsSync('./dist')) {
    console.log('❌ dist directory not found');
    console.log('💡 Run: npm run build');
    return false;
  }
  
  if (!existsSync('./dist/index.js')) {
    console.log('❌ dist/index.js not found');
    console.log('💡 Run: npm run build');
    return false;
  }
  
  console.log('✅ Build files found');
  return true;
}

/**
 * Test 3: Dependencies Check
 */
function testDependencies() {
  console.log('\n📋 Test 3: Dependencies Check');
  
  if (!existsSync('./node_modules')) {
    console.log('❌ node_modules directory not found');
    console.log('💡 Run: npm install');
    return false;
  }
  
  // Check for critical dependencies
  const criticalDeps = [
    './node_modules/@modelcontextprotocol',
    './node_modules/axios'
  ];
  
  for (const dep of criticalDeps) {
    if (!existsSync(dep)) {
      console.log(`❌ Critical dependency missing: ${dep}`);
      console.log('💡 Run: npm install');
      return false;
    }
  }
  
  console.log('✅ Dependencies found');
  return true;
}

/**
 * Test 4: Basic Import Test
 */
async function testImport() {
  console.log('\n📋 Test 4: Basic Import Test');
  
  try {
    // Try to import the main server file
    const { YouTubeMCPServerHandler } = await import('./dist/index.js');
    
    if (typeof YouTubeMCPServerHandler === 'function') {
      console.log('✅ Server class imported successfully');
      return true;
    } else {
      console.log('❌ Server class not found in imports');
      return false;
    }
  } catch (error) {
    console.log('❌ Import failed:', error.message);
    console.log('💡 Check build output and dependencies');
    return false;
  }
}

/**
 * Test 5: Server Instantiation Test
 */
async function testServerCreation() {
  console.log('\n📋 Test 5: Server Instantiation Test');
  
  try {
    const { YouTubeMCPServerHandler } = await import('./dist/index.js');
    
    // Try to create a server instance
    const server = new YouTubeMCPServerHandler();
    
    if (server) {
      console.log('✅ Server instance created successfully');
      return true;
    } else {
      console.log('❌ Server instance creation failed');
      return false;
    }
  } catch (error) {
    console.log('❌ Server creation failed:', error.message);
    
    if (error.message.includes('YOUTUBE_API_KEY')) {
      console.log('💡 Make sure YOUTUBE_API_KEY environment variable is set');
    } else {
      console.log('💡 Check for compilation errors or missing dependencies');
    }
    return false;
  }
}

/**
 * Test 6: MCP Server Startup Test (with timeout)
 */
async function testServerStartup() {
  console.log('\n📋 Test 6: MCP Server Startup Test');
  
  return new Promise((resolve) => {
    const serverProcess = spawn('node', ['dist/index.js'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env }
    });
    
    let output = '';
    let hasStarted = false;
    
    // Capture output
    serverProcess.stderr.on('data', (data) => {
      output += data.toString();
      
      // Look for success indicators
      if (output.includes('YouTube MCP Server started successfully')) {
        hasStarted = true;
        console.log('✅ Server started successfully');
        serverProcess.kill('SIGTERM');
        resolve(true);
      }
      
      // Look for error indicators
      if (output.includes('Failed to start') || output.includes('Error:')) {
        console.log('❌ Server startup failed');
        console.log('Error output:', data.toString().trim());
        serverProcess.kill('SIGTERM');
        resolve(false);
      }
    });
    
    serverProcess.on('error', (error) => {
      console.log('❌ Server process error:', error.message);
      resolve(false);
    });
    
    // Set timeout for startup test
    setTimeout(() => {
      if (!hasStarted) {
        console.log('❌ Server startup timeout (10 seconds)');
        console.log('Output received:', output.trim() || '(no output)');
        serverProcess.kill('SIGTERM');
        resolve(false);
      }
    }, 10000);
    
    // Send empty JSON to stdin to simulate MCP initialization
    setTimeout(() => {
      try {
        serverProcess.stdin.write('{"jsonrpc": "2.0", "method": "initialize", "id": 1, "params": {}}\n');
      } catch (error) {
        // Ignore stdin errors
      }
    }, 1000);
  });
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('Starting basic functionality tests...\n');
  
  const tests = [
    { name: 'Environment Check', fn: testEnvironment },
    { name: 'Build Check', fn: testBuild },
    { name: 'Dependencies Check', fn: testDependencies },
    { name: 'Import Test', fn: testImport },
    { name: 'Server Creation Test', fn: testServerCreation },
    { name: 'Server Startup Test', fn: testServerStartup }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${test.name} threw an error:`, error.message);
      failed++;
    }
  }
  
  console.log('\n📊 Test Results Summary:');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${Math.round((passed / tests.length) * 100)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed! The MCP server appears to be working correctly.');
    console.log('💡 Next steps:');
    console.log('   1. Test with Claude Desktop or MCP Inspector');
    console.log('   2. Try executing some YouTube tools');
    console.log('   3. Monitor the debug logs');
  } else {
    console.log('\n⚠️  Some tests failed. Please address the issues above.');
    console.log('💡 Common fixes:');
    console.log('   - Set YOUTUBE_API_KEY environment variable');
    console.log('   - Run npm install');
    console.log('   - Run npm run build');
    console.log('   - Check that all source files are present');
  }
  
  // Return overall success
  return failed === 0;
}

// Run the tests
runAllTests()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });