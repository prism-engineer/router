#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("path");
const router_1 = require("../router");
async function loadConfig() {
    const configPaths = [
        'config.prism.router.ts',
        'config.prism.router.js',
        'prism.config.ts',
        'prism.config.js'
    ];
    for (const configPath of configPaths) {
        try {
            const fullPath = (0, path_1.resolve)(process.cwd(), configPath);
            // For .ts files, we need to handle them differently
            if (configPath.endsWith('.ts')) {
                // Try to import using dynamic import for TypeScript files
                try {
                    const config = await Promise.resolve(`${fullPath}`).then(s => __importStar(require(s)));
                    return config.default || config;
                }
                catch (tsError) {
                    // If TypeScript import fails, try requiring it (in case it's been compiled)
                    try {
                        delete require.cache[fullPath];
                        const config = require(fullPath);
                        return config.default || config;
                    }
                    catch (requireError) {
                        continue; // Try next config file
                    }
                }
            }
            else {
                // For .js files, use require
                try {
                    delete require.cache[fullPath];
                    const config = require(fullPath);
                    return config.default || config;
                }
                catch (jsError) {
                    continue; // Try next config file
                }
            }
        }
        catch (error) {
            continue; // Try next config file
        }
    }
    throw new Error(`No configuration file found. Please create one of:\n` +
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
        `} as const;`);
}
async function runCompile() {
    try {
        console.log('🔍 Loading configuration...');
        const config = await loadConfig();
        console.log(`📁 Output directory: ${config.outputDir}`);
        console.log(`🏷️  Client name: ${config.name}`);
        console.log(`🌐 Base URL: ${config.baseUrl}`);
        console.log(`📂 Routes directory: ${config.routes.directory}`);
        console.log(`🔍 Pattern: ${config.routes.pattern}`);
        console.log('\n⚡ Compiling API client...');
        await router_1.router.compile(config);
        console.log(`\n✅ API client generated successfully!`);
        console.log(`📄 Generated file: ${config.outputDir}/${config.name}.generated.ts`);
        console.log(`\n💡 Usage:`);
        console.log(`import { create${config.name} } from './${config.outputDir}/${config.name}.generated';`);
        console.log(`const client = create${config.name}('${config.baseUrl}');`);
    }
    catch (error) {
        console.error('\n❌ Compilation failed:');
        console.error(error instanceof Error ? error.message : String(error));
        process.exit(1);
    }
}
async function runHelp() {
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
async function main() {
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
//# sourceMappingURL=index.js.map