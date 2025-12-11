/**
 * Script to find remaining console.log statements
 * Run with: node scripts/find-console-logs.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function findConsoleLogs(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Skip node_modules and dist
      if (file !== 'node_modules' && file !== 'dist' && file !== '.git') {
        findConsoleLogs(filePath, fileList);
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx')) {
      // Skip the logger file itself (it's allowed to use console)
      if (filePath.includes('logger.ts')) {
        return;
      }
      
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      
      lines.forEach((line, index) => {
        if (line.match(/console\.(log|error|warn|debug|info)/)) {
          fileList.push({
            file: filePath,
            line: index + 1,
            content: line.trim(),
          });
        }
      });
    }
  });

  return fileList;
}

const srcDir = path.join(__dirname, '..', 'src');
const consoleLogs = findConsoleLogs(srcDir);

if (consoleLogs.length > 0) {
  console.log(`\n⚠️  Found ${consoleLogs.length} console.log statements:\n`);
  consoleLogs.forEach(({ file, line, content }) => {
    console.log(`${file}:${line}`);
    console.log(`  ${content}\n`);
  });
  process.exit(1);
} else {
  console.log('✅ No console.log statements found!');
  process.exit(0);
}

