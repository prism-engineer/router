import { glob } from 'glob';
import fs from 'fs/promises';
import path from 'path';

export interface RouteLoader {
  loadRoutes(directory: string, pattern: RegExp): Promise<string[]>;
}

export const createFileRouteLoader = (): RouteLoader => {
  const walkDirectory = async (dir: string, pattern: RegExp): Promise<string[]> => {
    const matchedFiles: string[] = [];
    
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          // Skip node_modules and other common directories
          if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
            const subFiles = await walkDirectory(fullPath, pattern);
            matchedFiles.push(...subFiles);
          }
        } else if (entry.isFile()) {
          // Test the file path against the pattern
          const relativePath = fullPath.replace(/\\/g, '/'); // Normalize path separators
          if (pattern.test(relativePath)) {
            matchedFiles.push(fullPath);
          }
        }
      }
    } catch (error) {
      throw error;
    }
    
    return matchedFiles;
  };

  const loadRegExpPattern = async (directory: string, pattern: RegExp): Promise<string[]> => {
    try {
      // For RegExp patterns, we need to traverse the file system
      // Starting from current directory and matching files
      const files = await walkDirectory(directory, pattern);
      return files;
    } catch (error) {
      throw new Error(`Failed to load RegExp pattern: ${error}`);
    }
  };

  return {
    async loadRoutes(directory: string, pattern: RegExp): Promise<string[]> {
      if (!pattern) {
        throw new Error('Pattern is required');
      }

      return loadRegExpPattern(directory, pattern);
    }
  };
};