#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

// Patterns to replace
const replacements = [
  // Pattern: $amount.toLocaleString() -> formatRupees(amount)
  {
    pattern: /\$\{([^}]*?\.(?:toLocaleString|toFixed)\([^)]*\))\}/g,
    replacement: '${formatRupees($1)}',
    description: 'Template string amounts'
  },
  // Pattern: `$${value.toFixed(2)}` -> `${formatRupees(value)}`
  {
    pattern: /`\$\$\{([^}]*)\}/g,
    replacement: '`${formatRupees($1)}',
    description: 'Backtick dollar amounts'
  },
  // Pattern: ${amount.toFixed(2)} -> ${formatRupees(amount)}
  {
    pattern: /\$\{([^}]*)\}/g,
    replacement: '${formatRupees($1)}',
    description: 'Template dollar amounts',
    condition: (line) => !line.includes('formatRupees')
  },
  // Pattern: "${amount.toLocaleString()}" -> formatRupees(amount)
  {
    pattern: /"\$\{([^}]*)\}"/g,
    replacement: 'formatRupees($1)',
    description: 'Quoted amounts'
  },
  // Pattern: + `$${Math.abs(value).toFixed(2)}` 
  {
    pattern: /\$\{Math\.abs\(([^)]*)\)\.toFixed\(2\)\}/g,
    replacement: '${formatRupees(Math.abs($1))}',
    description: 'Math.abs amounts'
  }
];

async function convertFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    let modified = false;
    let replacementCount = 0;

    // Check if file already has formatRupees import
    const hasImport = content.includes('formatRupees');

    // Apply replacements
    for (const { pattern, replacement, description } of replacements) {
      const newContent = content.replace(pattern, (match, ...args) => {
        replacementCount++;
        modified = true;
        return replacement;
      });
      
      if (newContent !== content) {
        content = newContent;
      }
    }

    // Add import if needed and modifications were made
    if (modified && !hasImport) {
      const importLine = 'import { formatRupees } from "@/lib/format-utils"\n';
      
      // Find the right place to add import (after other imports)
      if (content.includes('import ')) {
        const lastImportMatch = content.lastIndexOf('import ');
        if (lastImportMatch !== -1) {
          const endOfLine = content.indexOf('\n', lastImportMatch);
          if (endOfLine !== -1) {
            content = content.slice(0, endOfLine + 1) + importLine + content.slice(endOfLine + 1);
          }
        }
      } else {
        // No imports, add at the beginning
        content = importLine + content;
      }
    }

    // Write back if modified
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf-8');
      console.log(`✓ ${path.relative(projectRoot, filePath)} (${replacementCount} replacements)`);
      return replacementCount;
    }

  } catch (error) {
    console.error(`✗ Error processing ${filePath}:`, error.message);
  }
  return 0;
}

async function main() {
  console.log('🔄 Converting dollar signs to rupees...\n');

  // Target components
  const patterns = [
    'components/**/*.tsx',
    'app/**/*.tsx',
    '!**/node_modules/**'
  ];

  try {
    const files = await glob(patterns, {
      cwd: projectRoot,
      ignore: ['**/node_modules/**', '**/.next/**']
    });

    let totalReplacements = 0;
    let totalFiles = 0;

    for (const file of files) {
      const fullPath = path.join(projectRoot, file);
      const content = fs.readFileSync(fullPath, 'utf-8');
      
      // Only process files with $ and amounts
      if (content.includes('$') && (content.includes('toLocaleString') || content.includes('toFixed'))) {
        const count = await convertFile(fullPath);
        totalReplacements += count;
        totalFiles++;
      }
    }

    console.log(`\n✅ Conversion complete!`);
    console.log(`📊 Files modified: ${totalFiles}`);
    console.log(`💰 Total replacements: ${totalReplacements}`);

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
