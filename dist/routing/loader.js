"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createFileRouteLoader = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const createFileRouteLoader = () => {
    const walkDirectory = async (dir, pattern) => {
        const matchedFiles = [];
        try {
            console.log(`Reading directory ${dir}`);
            const entries = await promises_1.default.readdir(dir, { withFileTypes: true });
            console.log(`Found ${entries.length} entries in ${dir}`);
            for (const entry of entries) {
                const fullPath = path_1.default.join(dir, entry.name);
                if (entry.isDirectory()) {
                    // Skip node_modules and other common directories
                    if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
                        const subFiles = await walkDirectory(fullPath, pattern);
                        matchedFiles.push(...subFiles);
                    }
                }
                else if (entry.isFile()) {
                    // Test the file path against the pattern
                    const relativePath = fullPath.replace(/\\/g, '/'); // Normalize path separators
                    if (pattern.test(relativePath)) {
                        matchedFiles.push(fullPath);
                    }
                }
            }
        }
        catch (error) {
            // Handle permission errors or other filesystem issues
            console.warn(`Could not read directory ${dir}: ${error}`);
        }
        return matchedFiles;
    };
    const loadRegExpPattern = async (directory, pattern) => {
        try {
            // For RegExp patterns, we need to traverse the file system
            // Starting from current directory and matching files
            const files = await walkDirectory(directory, pattern);
            if (files.length === 0) {
                throw new Error(`No files found matching pattern: ${pattern}`);
            }
            return files;
        }
        catch (error) {
            throw new Error(`Failed to load RegExp pattern: ${error}`);
        }
    };
    return {
        async loadRoutes(directory, pattern) {
            if (!pattern) {
                throw new Error('Pattern is required');
            }
            return loadRegExpPattern(directory, pattern);
        }
    };
};
exports.createFileRouteLoader = createFileRouteLoader;
//# sourceMappingURL=loader.js.map