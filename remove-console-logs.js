#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

function removeConsoleLogs(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Remove console.log, console.error, console.warn, console.info, console.debug
  // But keep console.error in error handlers and debugging files
  const consoleMethods = ['log', 'warn', 'info', 'debug'];
  
  // Only remove console.error from non-debug/non-error files
  const isDebugFile = filePath.includes('debug') || filePath.includes('error') || filePath.includes('Error');
  if (!isDebugFile) {
    consoleMethods.push('error');
  }
  
  for (const method of consoleMethods) {
    // Match console.method(...) statements - handle multiline calls
    const regex = new RegExp(`console\\.${method}\\s*\\([^;]*?\\)(?:\\s*;?)`, 'gs');
    const matches = content.match(regex);
    
    if (matches) {
      console.log(`Removing ${matches.length} console.${method} statements from ${filePath}`);
      content = content.replace(regex, '');
      modified = true;
    }
  }
  
  // Clean up empty lines left behind
  if (modified) {
    content = content.replace(/\n\s*\n\s*\n/g, '\n\n'); // Remove triple+ newlines
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Cleaned ${filePath}`);
  }
}

// Find all tsx files in app and components directories
const appFiles = glob.sync('app/**/*.tsx', { cwd: process.cwd() });
const componentFiles = glob.sync('components/**/*.tsx', { cwd: process.cwd() });

// Exclude debug and error files from console.error removal
const allFiles = [...appFiles, ...componentFiles];

console.log(`Found ${allFiles.length} TSX files to clean...`);

allFiles.forEach(removeConsoleLogs);

console.log('🎉 Console log cleanup complete!');
