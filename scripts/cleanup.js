#!/usr/bin/env node

/**
 * Cleanup Script for YouTube MCP Server
 * 
 * This script removes temporary files, debug artifacts, and other contamination
 * from the project root and subdirectories. It can be run manually or automatically
 * to prevent accumulation of temporary files during development.
 */

import { readdirSync, statSync, unlinkSync, rmSync, existsSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');

// Patterns for files and directories to clean up
const CLEANUP_PATTERNS = {
  // Temporary test files
  files: [
    /^\.write-test-.*$/,
    /^write-test-.*$/,
    /^debug-test-.*$/,
    /^temp-log-.*$/,
    /^synthetic-log-.*$/,
    /^test-output-.*$/,
    /^debug-session-.*\.json$/,
    /^comprehensive-debug-.*$/,
    /^debug-monitor-.*$/,
    /.*\.tmp$/,
    /.*\.temp$/,
    /^\.temp-.*$/,
    /^\.test-.*$/,
    /^\.debug-.*$/,
    /.*\.lock$/,
    /.*\.pid\.lock$/,
    /^\.process-.*$/,
    /.*\.log\.analysis$/,
    /.*\.temp\.log$/,
    /.*\.synthetic\.log$/
  ],
  
  // Temporary directories
  directories: [
    /^test-artifacts$/,
    /^synthetic-data$/,
    /^temp-test-files$/,
    /^test-logs$/,
    /^debug-session-.*$/
  ]
};

// Configuration options
const CONFIG = {
  dryRun: process.argv.includes('--dry-run') || process.argv.includes('-n'),
  verbose: process.argv.includes('--verbose') || process.argv.includes('-v'),
  help: process.argv.includes('--help') || process.argv.includes('-h'),
  force: process.argv.includes('--force') || process.argv.includes('-f')
};

function showHelp() {
  console.log(`
YouTube MCP Server Cleanup Script

Usage: node scripts/cleanup.js [options]

Options:
  --dry-run, -n    Show what would be cleaned without actually removing files
  --verbose, -v    Show detailed output of cleanup operations
  --force, -f      Remove files without confirmation prompts
  --help, -h       Show this help message

Examples:
  node scripts/cleanup.js --dry-run     # Preview what would be cleaned
  node scripts/cleanup.js --verbose     # Clean with detailed output
  npm run cleanup                       # Run via npm script
  npm run cleanup -- --dry-run          # Pass arguments via npm

This script removes:
  - Temporary test files (.write-test-*, debug-test-*, etc.)
  - Debug session files (debug-session-*.json)
  - Synthetic log files (synthetic-log-*, temp-log-*)
  - Test artifacts and temporary directories
  - Lock files and process files
  - Other development artifacts that may accumulate

Safe to run: This script only removes temporary files and artifacts,
never source code or important configuration files.
`);
}

function log(message, force = false) {
  if (CONFIG.verbose || force) {
    console.log(message);
  }
}

function error(message) {
  console.error(`❌ Error: ${message}`);
}

function success(message) {
  console.log(`✅ ${message}`);
}

function warning(message) {
  console.log(`⚠️  ${message}`);
}

function matchesPattern(name, patterns) {
  return patterns.some(pattern => pattern.test(name));
}

function getFileSize(filePath) {
  try {
    const stats = statSync(filePath);
    return stats.size;
  } catch (e) {
    return 0;
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function scanDirectory(dirPath, stats = { files: [], directories: [], totalSize: 0 }) {
  try {
    const items = readdirSync(dirPath);
    
    for (const item of items) {
      const fullPath = join(dirPath, item);
      
      try {
        const stat = statSync(fullPath);
        
        if (stat.isDirectory()) {
          // Check if directory matches cleanup patterns
          if (matchesPattern(item, CLEANUP_PATTERNS.directories)) {
            stats.directories.push(fullPath);
            // Calculate directory size recursively
            try {
              const dirSize = getDirSize(fullPath);
              stats.totalSize += dirSize;
            } catch (e) {
              log(`Warning: Could not calculate size for directory ${fullPath}`);
            }
          } else {
            // Recursively scan subdirectories
            scanDirectory(fullPath, stats);
          }
        } else if (stat.isFile()) {
          // Check if file matches cleanup patterns
          if (matchesPattern(item, CLEANUP_PATTERNS.files)) {
            stats.files.push(fullPath);
            stats.totalSize += stat.size;
          }
        }
      } catch (e) {
        log(`Warning: Could not access ${fullPath}: ${e.message}`);
      }
    }
  } catch (e) {
    log(`Warning: Could not scan directory ${dirPath}: ${e.message}`);
  }
  
  return stats;
}

function getDirSize(dirPath) {
  let totalSize = 0;
  
  try {
    const items = readdirSync(dirPath);
    
    for (const item of items) {
      const fullPath = join(dirPath, item);
      
      try {
        const stat = statSync(fullPath);
        
        if (stat.isDirectory()) {
          totalSize += getDirSize(fullPath);
        } else {
          totalSize += stat.size;
        }
      } catch (e) {
        // Ignore inaccessible files
      }
    }
  } catch (e) {
    // Ignore inaccessible directories
  }
  
  return totalSize;
}

function removeFile(filePath) {
  try {
    unlinkSync(filePath);
    log(`Removed file: ${filePath}`);
    return true;
  } catch (e) {
    error(`Failed to remove file ${filePath}: ${e.message}`);
    return false;
  }
}

function removeDirectory(dirPath) {
  try {
    rmSync(dirPath, { recursive: true, force: true });
    log(`Removed directory: ${dirPath}`);
    return true;
  } catch (e) {
    error(`Failed to remove directory ${dirPath}: ${e.message}`);
    return false;
  }
}

async function promptConfirmation(message) {
  if (CONFIG.force) {
    return true;
  }
  
  // Simple confirmation for Node.js
  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question(`${message} (y/N): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

async function performCleanup(stats) {
  let removedFiles = 0;
  let removedDirs = 0;
  let failedOperations = 0;
  let freedSpace = 0;
  
  // Remove files
  for (const filePath of stats.files) {
    if (!CONFIG.dryRun) {
      const size = getFileSize(filePath);
      if (removeFile(filePath)) {
        removedFiles++;
        freedSpace += size;
      } else {
        failedOperations++;
      }
    } else {
      log(`Would remove file: ${filePath}`);
      removedFiles++;
    }
  }
  
  // Remove directories
  for (const dirPath of stats.directories) {
    if (!CONFIG.dryRun) {
      if (removeDirectory(dirPath)) {
        removedDirs++;
      } else {
        failedOperations++;
      }
    } else {
      log(`Would remove directory: ${dirPath}`);
      removedDirs++;
    }
  }
  
  return { removedFiles, removedDirs, failedOperations, freedSpace };
}

async function main() {
  console.log('🧹 YouTube MCP Server Cleanup Script\\n');
  
  if (CONFIG.help) {
    showHelp();
    return;
  }
  
  if (CONFIG.dryRun) {
    console.log('🔍 Running in DRY RUN mode - no files will actually be removed\\n');
  }
  
  log('Scanning project directory for temporary files and artifacts...');
  
  // Scan the project directory
  const stats = scanDirectory(projectRoot);
  
  console.log('\\n📊 Cleanup Summary:');
  console.log(`   Files to remove: ${stats.files.length}`);
  console.log(`   Directories to remove: ${stats.directories.length}`);
  console.log(`   Total size: ${formatBytes(stats.totalSize)}`);
  
  if (stats.files.length === 0 && stats.directories.length === 0) {
    success('No temporary files or artifacts found. Project directory is clean!');
    return;
  }
  
  if (CONFIG.verbose) {
    console.log('\\n📁 Files to be removed:');
    stats.files.forEach(file => console.log(`   ${file}`));
    
    if (stats.directories.length > 0) {
      console.log('\\n📂 Directories to be removed:');
      stats.directories.forEach(dir => console.log(`   ${dir}`));
    }
  }
  
  // Confirm before proceeding (unless force mode or dry run)
  if (!CONFIG.dryRun && !CONFIG.force) {
    console.log('');
    const confirmed = await promptConfirmation('Proceed with cleanup?');
    if (!confirmed) {
      console.log('Cleanup cancelled.');
      return;
    }
  }
  
  console.log('\\n🗑️  Performing cleanup...');
  
  const results = await performCleanup(stats);
  
  console.log('\\n✨ Cleanup completed:');
  console.log(`   Files removed: ${results.removedFiles}`);
  console.log(`   Directories removed: ${results.removedDirs}`);
  
  if (!CONFIG.dryRun) {
    console.log(`   Space freed: ${formatBytes(results.freedSpace)}`);
  }
  
  if (results.failedOperations > 0) {
    warning(`${results.failedOperations} operations failed. Check file permissions.`);
  }
  
  if (CONFIG.dryRun) {
    console.log('\\n💡 Run without --dry-run to actually perform the cleanup.');
  } else {
    success('Project cleanup completed successfully!');
  }
}

// Run the cleanup script
const isMainModule = import.meta.url.includes('cleanup.js');
if (isMainModule) {
  main().catch(error => {
    console.error('❌ Cleanup script failed:', error);
    process.exit(1);
  });
}

export { main as cleanup };