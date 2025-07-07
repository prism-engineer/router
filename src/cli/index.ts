#!/usr/bin/env node

import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { router } from '../router';

interface CliConfig {
  outputDir: string;
  name: string;
  baseUrl: string;
  routes: {
    directory: string;
    pattern: RegExp;
  };
}

async function loadConfig(): Promise<CliConfig> {
  const configPaths = [
    'config.prism.router.ts',
    'config.prism.router.js',
    'prism.config.ts',
    'prism.config.js'
  ];

  for (const configPath of configPaths) {
    try {
      const fullPath = resolve(process.cwd(), configPath);
      
      // For .ts files, we need to handle them differently
      if (configPath.endsWith('.ts')) {
        // Try to import using dynamic import for TypeScript files
        try {
          const config = await import(fullPath);
          return config.default || config;
        } catch (tsError) {
          // If TypeScript import fails, try requiring it (in case it's been compiled)
          try {
            delete require.cache[fullPath];
            const config = require(fullPath);
            return config.default || config;
          } catch (requireError) {
            continue; // Try next config file
          }
        }
      } else {
        // For .js files, use require
        try {
          delete require.cache[fullPath];
          const config = require(fullPath);
          return config.default || config;
        } catch (jsError) {
          continue; // Try next config file
        }
      }
    } catch (error) {
      continue; // Try next config file
    }
  }

  throw new Error(
    `No configuration file found. Please create one of:\n` +
    configPaths.map(p => `  - ${p}`).join('\n') +
    `\n\nExample config.prism.router.ts:\n` +
    `export default {\n` +
    `  outputDir: './generated',\n` +
    `  name: 'ApiClient',\n` +
    `  baseUrl: 'http://localhost:3000',\n` +
    `  routes: {\n` +
    `    directory: './api',\n` +
    `    pattern: /.*\\.ts$/\n` +
    `  }\n` +
    `} as const;`
  );
}

async function runCompile(): Promise<void> {
  try {
    console.log('🔍 Loading configuration...');
    const config = await loadConfig();
    
    console.log(`📁 Output directory: ${config.outputDir}`);
    console.log(`🏷️  Client name: ${config.name}`);
    console.log(`🌐 Base URL: ${config.baseUrl}`);
    console.log(`📂 Routes directory: ${config.routes.directory}`);
    console.log(`🔍 Pattern: ${config.routes.pattern}`);
    
    console.log('\n⚡ Compiling API client...');
    await router.compile(config);
    
    console.log(`\n✅ API client generated successfully!`);
    console.log(`📄 Generated file: ${config.outputDir}/${config.name}.generated.ts`);
    console.log(`\n💡 Usage:`);
    console.log(`import { create${config.name} } from './${config.outputDir}/${config.name}.generated';`);
    console.log(`const client = create${config.name}('${config.baseUrl}');`);
    
  } catch (error) {
    console.error('\n❌ Compilation failed:');
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

async function runHelp(): Promise<void> {
  console.log(`
🚀 @prism-engineer/router CLI

USAGE:
  npx @prism-engineer/router <command>
  npx prism-router <command>

COMMANDS:
  compile     Generate API client from route definitions
  help        Show this help message

EXAMPLES:
  npx @prism-engineer/router compile
  npx prism-router compile
  npx prism-router help

CONFIGURATION:
  Create a config file in your project root:

  config.prism.router.ts:
  export default {
    outputDir: './generated',
    name: 'ApiClient', 
    baseUrl: 'http://localhost:3000',
    routes: {
      directory: './api',
      pattern: /.*\\.ts$/
    }
  } as const;

For more information, visit: https://github.com/prism-engineer/router
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'compile':
      await runCompile();
      break;
    case 'help':
    case '--help':
    case '-h':
      await runHelp();
      break;
    case undefined:
      console.log('❌ No command specified. Use "compile" or "help".');
      console.log('Run "npx @prism-engineer/router help" for usage information.');
      process.exit(1);
      break;
    default:
      console.log(`❌ Unknown command: ${command}`);
      console.log('Available commands: compile, help');
      console.log('Run "npx @prism-engineer/router help" for usage information.');
      process.exit(1);
  }
}

// Run the CLI
main().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});