import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { router } from '../router.js';

export interface PrismCliConfig {
  outputDir: string;
  name: string;
  baseUrl: string;
  routes: {
    directory: string;
    pattern: RegExp;
    options?: {
      prefix?: string;
    }
  }[];
}

async function loadConfig(): Promise<PrismCliConfig> {
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
          continue; // Try next config file
        }
      } else {
        // For .js files, use dynamic import
        try {
          const config = await import(fullPath);
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
    `\n\nExample config.prism.router.js:\n` +
    `export default {\n` +
    `  outputDir: './generated',\n` +
    `  name: 'ApiClient',\n` +
    `  baseUrl: 'http://localhost:3000',\n` +
    `  routes: [\n` +
    `    {\n` +
    `      directory: './api',\n` +
    `      pattern: /.*\\.ts$/\n` +
    `    }\n` +
    `  ]\n` +
    `};`
  );
}

async function runCompile(): Promise<void> {
  try {
    console.log('🔍 Loading configuration...');
    const config = await loadConfig();
    
    console.log(`📁 Output directory: ${config.outputDir}`);
    console.log(`🏷️  Client name: ${config.name}`);
    console.log(`🌐 Base URL: ${config.baseUrl}`);
    for(const routeConfig of config.routes) {
      console.log(`📂 Routes directory: ${routeConfig.directory}`);
      console.log(`🔍 Pattern: ${routeConfig.pattern}`);
      if(routeConfig.options?.prefix) {
        console.log(`🔍 Prefix: ${routeConfig.options.prefix}`);
      }
    }
    
    console.log('\n⚡ Compiling API client...');
    await router.compile(config);
    
    console.log(`\n✅ API client generated successfully!`);
    console.log(`📄 Generated file: ${config.outputDir}/${config.name}.generated.ts`);
    console.log(`\n💡 Usage:`);
    const importPath = config.outputDir.startsWith('./') 
      ? config.outputDir 
      : `./${config.outputDir}`;
    console.log(`import { create${config.name} } from '${importPath}/${config.name}.generated';`);
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
  Create a config file in your project root (supports .ts or .js):
  - config.prism.router.ts
  - config.prism.router.js
  - prism.config.ts
  - prism.config.js

  Example config.prism.router.js:
  export default {
    outputDir: './generated',
    name: 'ApiClient',
    baseUrl: 'http://localhost:3000',
    routes: [
      {
        directory: './api',
        pattern: /.*\\.ts$/,
        options: {
          prefix: '/v1'  // optional
        }
      }
    ]
  };

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