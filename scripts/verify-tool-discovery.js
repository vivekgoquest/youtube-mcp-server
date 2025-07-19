#!/usr/bin/env node

/**
 * Tool Discovery Verification Script
 * Verifies that the tool discovery mechanism works correctly in both development and production environments
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

const log = (color, message) => {
  console.log(`${colors[color]}${message}${colors.reset}`);
};

const error = (message) => log('red', `ERROR: ${message}`);
const success = (message) => log('green', `SUCCESS: ${message}`);
const warning = (message) => log('yellow', `WARNING: ${message}`);
const info = (message) => log('blue', `INFO: ${message}`);

// Expected tools list
const EXPECTED_TOOLS = [
  'search_videos',
  'search_channels', 
  'search_playlists',
  'advanced_search',
  'get_trending_videos',
  'get_video_details',
  'get_channel_details',
  'get_playlist_details',
  'analyze_viral_videos',
  'analyze_competitor',
  'analyze_channel_videos',
  'discover_channel_network',
  'extract_video_comments',
  'find_content_gaps',
  'analyze_keyword_opportunities',
  'extract_keywords_from_text',
  'extract_keywords_from_videos',
  'analyze_keywords',
  'generate_keyword_cloud',
  'keyword_research_workflow'
];

// Main verification function
async function verifyToolDiscovery() {
  console.log('=== Tool Discovery Verification ===\n');
  
  const results = {
    development: null,
    production: null,
    comparison: null
  };

  try {
    // Test development mode
    info('Testing development mode...');
    results.development = await testDevelopmentMode();
    
    // Test production mode
    info('Testing production mode...');
    results.production = await testProductionMode();
    
    // Compare results
    info('Comparing development and production modes...');
    results.comparison = compareResults(results.development, results.production);
    
    // Generate report
    generateReport(results);
    
    // Return overall success
    return results.development.success && results.production.success && results.comparison.success;
    
  } catch (err) {
    error(`Verification failed: ${err.message}`);
    return false;
  }
}

// Test development mode (TypeScript source)
async function testDevelopmentMode() {
  try {
    info('Loading ToolRegistry from TypeScript source...');
    
    // Dynamic import from TypeScript source
    const { ToolRegistry } = await import('../src/registry/tool-registry.ts');
    const registry = new ToolRegistry();
    
    // Load tools
    await registry.loadAllTools();
    
    // Get tools list
    const tools = registry.listTools();
    const toolNames = tools.map(tool => tool.name).sort();
    
    // Validate discovery
    const validation = validateToolDiscovery(toolNames, 'development');
    
    return {
      mode: 'development',
      success: validation.success,
      toolCount: tools.length,
      toolNames: toolNames,
      tools: tools,
      errors: validation.errors,
      warnings: validation.warnings
    };
    
  } catch (err) {
    error(`Development mode test failed: ${err.message}`);
    return {
      mode: 'development',
      success: false,
      error: err.message,
      toolCount: 0,
      toolNames: [],
      tools: [],
      errors: [err.message],
      warnings: []
    };
  }
}

// Test production mode (compiled JavaScript)
async function testProductionMode() {
  try {
    info('Loading ToolRegistry from compiled JavaScript...');
    
    // Check if dist exists
    const distPath = join(process.cwd(), 'dist', 'src', 'registry', 'tool-registry.js');
    if (!fs.existsSync(distPath)) {
      throw new Error('Compiled registry not found. Run "npm run build" first.');
    }
    
    // Dynamic import from compiled source
    const { ToolRegistry } = await import('../dist/src/registry/tool-registry.js');
    const registry = new ToolRegistry();
    
    // Load tools
    await registry.loadAllTools();
    
    // Get tools list
    const tools = registry.listTools();
    const toolNames = tools.map(tool => tool.name).sort();
    
    // Validate discovery
    const validation = validateToolDiscovery(toolNames, 'production');
    
    return {
      mode: 'production',
      success: validation.success,
      toolCount: tools.length,
      toolNames: toolNames,
      tools: tools,
      errors: validation.errors,
      warnings: validation.warnings
    };
    
  } catch (err) {
    error(`Production mode test failed: ${err.message}`);
    return {
      mode: 'production',
      success: false,
      error: err.message,
      toolCount: 0,
      toolNames: [],
      tools: [],
      errors: [err.message],
      warnings: []
    };
  }
}

// Validate tool discovery results
function validateToolDiscovery(actualTools, mode) {
  const errors = [];
  const warnings = [];
  
  // Check tool count
  if (actualTools.length !== EXPECTED_TOOLS.length) {
    errors.push(`Expected ${EXPECTED_TOOLS.length} tools, found ${actualTools.length}`);
  } else {
    success(`Found expected ${actualTools.length} tools in ${mode} mode`);
  }
  
  // Check for missing tools
  const missingTools = EXPECTED_TOOLS.filter(tool => !actualTools.includes(tool));
  if (missingTools.length > 0) {
    errors.push(`Missing tools: ${missingTools.join(', ')}`);
  }
  
  // Check for extra tools
  const extraTools = actualTools.filter(tool => !EXPECTED_TOOLS.includes(tool));
  if (extraTools.length > 0) {
    warnings.push(`Extra tools found: ${extraTools.join(', ')}`);
  }
  
  // Check for duplicates
  const duplicates = actualTools.filter((tool, index) => actualTools.indexOf(tool) !== index);
  if (duplicates.length > 0) {
    errors.push(`Duplicate tools found: ${duplicates.join(', ')}`);
  }
  
  return {
    success: errors.length === 0,
    errors,
    warnings
  };
}

// Compare development and production results
function compareResults(devResults, prodResults) {
  const errors = [];
  const warnings = [];
  
  if (!devResults.success || !prodResults.success) {
    errors.push('One or both modes failed, cannot compare');
    return { success: false, errors, warnings };
  }
  
  // Compare tool counts
  if (devResults.toolCount !== prodResults.toolCount) {
    errors.push(`Tool count mismatch: dev=${devResults.toolCount}, prod=${prodResults.toolCount}`);
  }
  
  // Compare tool names
  const devNames = devResults.toolNames.sort();
  const prodNames = prodResults.toolNames.sort();
  
  if (JSON.stringify(devNames) !== JSON.stringify(prodNames)) {
    errors.push('Tool names differ between development and production modes');
    
    const devOnly = devNames.filter(name => !prodNames.includes(name));
    const prodOnly = prodNames.filter(name => !devNames.includes(name));
    
    if (devOnly.length > 0) {
      errors.push(`Tools only in development: ${devOnly.join(', ')}`);
    }
    
    if (prodOnly.length > 0) {
      errors.push(`Tools only in production: ${prodOnly.join(', ')}`);
    }
  } else {
    success('Tool names match between development and production modes');
  }
  
  // Compare tool metadata
  if (devResults.tools.length > 0 && prodResults.tools.length > 0) {
    const metadataMismatches = [];
    
    devResults.tools.forEach(devTool => {
      const prodTool = prodResults.tools.find(t => t.name === devTool.name);
      if (prodTool) {
        if (devTool.description !== prodTool.description) {
          metadataMismatches.push(`${devTool.name}: description differs`);
        }
        // Note: inputSchema comparison would require deep object comparison
      }
    });
    
    if (metadataMismatches.length > 0) {
      warnings.push(`Metadata mismatches: ${metadataMismatches.join(', ')}`);
    }
  }
  
  return {
    success: errors.length === 0,
    errors,
    warnings
  };
}

// Generate comprehensive report
function generateReport(results) {
  const report = {
    timestamp: new Date().toISOString(),
    expectedToolCount: EXPECTED_TOOLS.length,
    expectedTools: EXPECTED_TOOLS,
    development: results.development,
    production: results.production,
    comparison: results.comparison,
    overallSuccess: results.development?.success && results.production?.success && results.comparison?.success
  };
  
  // Save report to file
  const reportPath = join(process.cwd(), 'tool-discovery-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log('\n=== Verification Report ===');
  
  // Development results
  console.log('\nDevelopment Mode:');
  if (results.development?.success) {
    success(`✓ Found ${results.development.toolCount} tools`);
  } else {
    error(`✗ Failed: ${results.development?.error || 'Unknown error'}`);
  }
  
  if (results.development?.errors?.length > 0) {
    results.development.errors.forEach(err => error(`  - ${err}`));
  }
  
  if (results.development?.warnings?.length > 0) {
    results.development.warnings.forEach(warn => warning(`  - ${warn}`));
  }
  
  // Production results
  console.log('\nProduction Mode:');
  if (results.production?.success) {
    success(`✓ Found ${results.production.toolCount} tools`);
  } else {
    error(`✗ Failed: ${results.production?.error || 'Unknown error'}`);
  }
  
  if (results.production?.errors?.length > 0) {
    results.production.errors.forEach(err => error(`  - ${err}`));
  }
  
  if (results.production?.warnings?.length > 0) {
    results.production.warnings.forEach(warn => warning(`  - ${warn}`));
  }
  
  // Comparison results
  console.log('\nMode Comparison:');
  if (results.comparison?.success) {
    success('✓ Development and production modes are consistent');
  } else {
    error('✗ Modes are inconsistent');
  }
  
  if (results.comparison?.errors?.length > 0) {
    results.comparison.errors.forEach(err => error(`  - ${err}`));
  }
  
  if (results.comparison?.warnings?.length > 0) {
    results.comparison.warnings.forEach(warn => warning(`  - ${warn}`));
  }
  
  // Overall result
  console.log('\nOverall Result:');
  if (report.overallSuccess) {
    success('✓ Tool discovery verification PASSED');
  } else {
    error('✗ Tool discovery verification FAILED');
  }
  
  console.log(`\nDetailed report saved to: ${reportPath}`);
}

// Path resolution testing
function testPathResolution() {
  info('Testing path resolution...');
  
  const currentFile = fileURLToPath(import.meta.url);
  const currentDir = dirname(currentFile);
  const toolsDir = join(currentDir, '..', 'src', 'tools');
  
  console.log(`Current file: ${currentFile}`);
  console.log(`Current dir: ${currentDir}`);
  console.log(`Tools dir: ${toolsDir}`);
  
  if (fs.existsSync(toolsDir)) {
    success('Tools directory found');
    
    const files = fs.readdirSync(toolsDir);
    const toolFiles = files.filter(file => file.endsWith('.tool.ts'));
    
    info(`Found ${toolFiles.length} .tool.ts files:`);
    toolFiles.forEach(file => console.log(`  - ${file}`));
    
    return true;
  } else {
    error('Tools directory not found');
    return false;
  }
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('Tool Discovery Verification Script\n');
  
  // Test path resolution first
  if (!testPathResolution()) {
    process.exit(1);
  }
  
  // Run main verification
  verifyToolDiscovery()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(err => {
      error(`Script failed: ${err.message}`);
      process.exit(1);
    });
}