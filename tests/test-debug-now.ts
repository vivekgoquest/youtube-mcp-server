/**
 * Simple test script to demonstrate debugging system on existing logs
 */

import * as fs from 'fs';
import * as path from 'path';

// Simple log analyzer that demonstrates the debugging concept
async function analyzeExistingLogs() {
  console.log('🔍 MCP Server Debug Analysis - Scanning Existing Logs');
  console.log('=' .repeat(60));
  
  const logSources = [
    // Common log file locations
    './server.log',
    './mcp-server.log', 
    './debug.log',
    './error.log',
    // Cline MCP log locations (common paths)
    path.join(process.env.HOME || '', '.cline', 'logs', 'mcp.log'),
    path.join(process.env.HOME || '', 'Library', 'Application Support', 'Cline', 'logs', 'mcp.log'),
    // VSCode/Cline extension logs
    path.join(process.env.HOME || '', '.vscode', 'extensions', 'saoudrizwan.claude-dev-*', 'logs'),
  ];
  
  console.log('📊 Checking multiple log sources for errors...\n');
  
  let totalErrors = 0;
  let recommendations: string[] = [];
  const correlatedErrors: Array<{source: string, message: string, timestamp: string}> = [];
  
  // Check each potential log source
  for (const logPath of logSources) {
    try {
      if (fs.existsSync(logPath)) {
        console.log(`✅ Found log file: ${logPath}`);
        
        const logContent = fs.readFileSync(logPath, 'utf-8');
        const lines = logContent.split('\n').slice(-100); // Last 100 lines
        
        // Look for common error patterns
        const errorPatterns = [
          /error/i,
          /failed/i,
          /timeout/i,
          /connection.*refused/i,
          /econnrefused/i,
          /enotfound/i,
          /permission.*denied/i,
          /cannot.*find.*module/i,
          /unexpected.*token/i,
          /syntax.*error/i,
          /mcp.*error/i,
          /tool.*failed/i
        ];
        
        let fileErrors = 0;
        lines.forEach((line) => {
          errorPatterns.forEach(pattern => {
            if (pattern.test(line)) {
              fileErrors++;
              totalErrors++;
              correlatedErrors.push({
                source: path.basename(logPath),
                message: line.trim(),
                timestamp: new Date().toISOString() // Would extract real timestamp in production
              });
            }
          });
        });
        
        console.log(`   └─ Found ${fileErrors} potential error(s) in this file`);
        
      } else {
        console.log(`⚠️  Log file not found: ${logPath}`);
      }
    } catch (error) {
      console.log(`❌ Could not read ${logPath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  console.log('\n📋 Debug Analysis Results:');
  console.log(`📊 Total errors/issues found: ${totalErrors}`);
  console.log(`🔗 Correlated error entries: ${correlatedErrors.length}`);
  
  // Generate recommendations based on common error patterns
  if (totalErrors > 0) {
    console.log('\n🎯 Automated Recommendations:');
    
    const errorMessages = correlatedErrors.map(e => e.message.toLowerCase()).join(' ');
    
    if (errorMessages.includes('connection') || errorMessages.includes('econnrefused')) {
      recommendations.push('Check if MCP server is running and accessible');
      recommendations.push('Verify the correct port is being used (typically 3000)');
      recommendations.push('Check firewall settings and network connectivity');
    }
    
    if (errorMessages.includes('module') || errorMessages.includes('cannot find')) {
      recommendations.push('Run npm install to ensure all dependencies are installed');
      recommendations.push('Check if the project has been built (npm run build)');
      recommendations.push('Verify import paths and module resolution');
    }
    
    if (errorMessages.includes('permission')) {
      recommendations.push('Check file and directory permissions');
      recommendations.push('Ensure the user has access to required resources');
    }
    
    if (errorMessages.includes('timeout')) {
      recommendations.push('Increase timeout values for slow operations');
      recommendations.push('Check network connectivity and server responsiveness');
    }
    
    if (errorMessages.includes('mcp') || errorMessages.includes('tool')) {
      recommendations.push('Verify MCP server configuration and tool definitions');
      recommendations.push('Check MCP protocol compatibility');
      recommendations.push('Restart MCP server to refresh tool registry');
    }
    
    // Generic recommendations
    if (recommendations.length === 0) {
      recommendations.push('Review recent error messages for specific issues');
      recommendations.push('Check server startup logs for initialization problems');
      recommendations.push('Verify all required services are running');
    }
    
    recommendations.forEach((rec, index) => {
      console.log(`   ${index + 1}. ${rec}`);
    });
    
  } else {
    console.log('\n✅ No obvious errors detected in available logs');
    console.log('💡 This could mean:');
    console.log('   • System is running correctly');
    console.log('   • Log files are not in expected locations');
    console.log('   • Errors haven\'t occurred recently');
  }
  
  // Show sample correlated errors
  if (correlatedErrors.length > 0) {
    console.log('\n📋 Sample Correlated Errors:');
    correlatedErrors.slice(0, 5).forEach((error, index) => {
      console.log(`   ${index + 1}. [${error.source}] ${error.message}`);
    });
    
    if (correlatedErrors.length > 5) {
      console.log(`   ... and ${correlatedErrors.length - 5} more error(s)`);
    }
  }
  
  // System health checks
  console.log('\n🔍 Quick System Health Checks:');
  
  // Check if common ports are in use
  try {
    const net = await import('net');
    const server = net.createServer();
    server.listen(3000, () => {
      console.log('   ✅ Port 3000: Available');
      server.close();
    });
    server.on('error', () => {
      console.log('   ⚠️  Port 3000: Already in use (this may be expected if MCP server is running)');
    });
  } catch (error) {
    console.log('   ❌ Port check failed');
  }
  
  // Check if node_modules exists
  if (fs.existsSync('./node_modules')) {
    console.log('   ✅ Dependencies: node_modules directory exists');
  } else {
    console.log('   ❌ Dependencies: node_modules not found - run npm install');
    recommendations.push('Run npm install to install project dependencies');
  }
  
  // Check if dist directory exists
  if (fs.existsSync('./dist')) {
    console.log('   ✅ Build: dist directory exists');
  } else {
    console.log('   ⚠️  Build: dist directory not found - run npm run build');
    recommendations.push('Run npm run build to compile the project');
  }
  
  console.log('\n📊 Debug Session Summary:');
  console.log(`   • Scanned ${logSources.length} potential log locations`);
  console.log(`   • Found ${totalErrors} error/warning entries`);
  console.log(`   • Generated ${recommendations.length} specific recommendations`);
  console.log(`   • Completed analysis in ${Date.now() % 1000}ms (simulated)`);
  
  console.log('\n🎯 Next Steps:');
  console.log('   1. Address the recommendations above');
  console.log('   2. Integrate the full debug system into your MCP server');
  console.log('   3. Enable automatic debugging after builds and tool calls');
  console.log('   4. Set up continuous monitoring for real-time error detection');
  
  return {
    totalErrors,
    correlatedErrors,
    recommendations,
    debugSessionId: `debug_session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
  };
}

// Run the analysis
analyzeExistingLogs()
  .then((results) => {
    console.log('\n✅ Debug analysis completed successfully!');
    console.log(`📝 Session ID: ${results.debugSessionId}`);
    console.log('\n🚀 The comprehensive debugging system is ready for integration.');
    console.log('   See debug/docs/SETUP_GUIDE.md for full implementation details.');
  })
  .catch((error) => {
    console.error('\n❌ Debug analysis failed:', error);
    console.log('\n💡 This demonstrates why automated debugging is important!');
  });

export { analyzeExistingLogs };
