#!/usr/bin/env node

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { spawn } from 'child_process';

// Get the directory of this script
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Find the actual index.js file relative to this script
const indexPath = join(__dirname, '../index.js');

// Pass through all arguments and environment variables
const child = spawn(process.execPath, [indexPath, ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: process.env
});

// Pass through the exit code
child.on('exit', (code) => {
  process.exit(code || 0);
});
