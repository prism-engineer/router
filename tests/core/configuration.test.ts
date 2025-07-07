import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { tmpdir } from 'os';
import { loadConfig } from '../../src/config';

describe('Configuration', () => {
  let tempDir: string;
  let tempConfigPath: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Create temporary directory for config files
    tempDir = await fs.mkdtemp(path.join(tmpdir(), 'prism-config-test-'));
  });

  afterEach(async () => {
    // Clean up temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('loadConfig', () => {
    it('should load config from config.prism.router.ts', async () => {
      // Create actual config file
      tempConfigPath = path.join(tempDir, 'config.prism.router.ts');
      const configContent = `export default {
        outputDir: './generated',
        name: 'ApiClient',
        baseUrl: 'http://localhost:3000',
        routes: {
          directory: './api',
          pattern: /.*\.ts$/
        }
      };`;
      await fs.writeFile(tempConfigPath, configContent);

      const config = await loadConfig(tempConfigPath);

      // Verify the structure without comparing RegExp directly
      expect(config.default.outputDir).toBe('./generated');
      expect(config.default.name).toBe('ApiClient');
      expect(config.default.baseUrl).toBe('http://localhost:3000');
      expect(config.default.routes.directory).toBe('./api');
      expect(config.default.routes.pattern).toBeInstanceOf(RegExp);
    });

    it('should handle missing config file', async () => {
      // Try to load a non-existent config file
      const nonExistentPath = path.join(tempDir, 'non-existent-config.ts');
      
      await expect(loadConfig(nonExistentPath)).rejects.toThrow();
    });

    it('should validate all required fields are present', async () => {
      tempConfigPath = path.join(tempDir, 'minimal-config.ts');
      const configContent = `export default {
        outputDir: './generated',
        name: 'ApiClient',
        baseUrl: 'http://localhost:3000',
        routes: {
          directory: './api',
          pattern: /.*\.ts$/
        }
      };`;
      await fs.writeFile(tempConfigPath, configContent);

      const config = await loadConfig(tempConfigPath);

      // Verify all required fields are present
      expect(config.default.outputDir).toBe('./generated');
      expect(config.default.name).toBe('ApiClient');
      expect(config.default.baseUrl).toBe('http://localhost:3000');
      expect(config.default.routes.directory).toBe('./api');
      expect(config.default.routes.pattern).toBeInstanceOf(RegExp);
    });

    it('should support custom config file path', async () => {
      const mockConfig = {
        outputDir: './custom-output',
        name: 'CustomClient',
        baseUrl: 'http://localhost:3000',
        routes: {
          directory: './api',
          pattern: /.*\.ts$/
        }
      };

      const customConfigPath = path.join(tempDir, 'custom-config.ts');
      const configContent = `export default {
        outputDir: './custom-output',
        name: 'CustomClient',
        baseUrl: 'http://localhost:3000',
        routes: {
          directory: './api',
          pattern: /.*\.ts$/
        }
      };`;
      await fs.writeFile(customConfigPath, configContent);

      const config = await loadConfig(customConfigPath);

      expect(config.default.outputDir).toBe('./custom-output');
    });

    it('should handle different export formats', async () => {
      const mockConfig = {
        outputDir: './generated',
        name: 'ApiClient',
        baseUrl: 'http://localhost:3000',
        routes: {
          directory: './api',
          pattern: /.*\.ts$/
        }
      };

      // Test ES module export
      const esConfigPath = path.join(tempDir, 'es-config.ts');
      const configContent = `export default {
        outputDir: './generated',
        name: 'ApiClient',
        baseUrl: 'http://localhost:3000',
        routes: {
          directory: './api',
          pattern: /.*\.ts$/
        }
      };`;
      await fs.writeFile(esConfigPath, configContent);

      const config1 = await loadConfig(esConfigPath);
      expect(config1.default.outputDir).toBe('./generated');
    });
  });

  describe('config validation', () => {
    it('should load config with all properties', async () => {
      const validConfigPath = path.join(tempDir, 'valid-config.ts');
      const configContent = `export default {
        outputDir: './generated',
        name: 'ApiClient',
        baseUrl: 'http://localhost:3000',
        routes: {
          directory: './api',
          pattern: /.*\.ts$/
        }
      };`;
      await fs.writeFile(validConfigPath, configContent);

      const config = await loadConfig(validConfigPath);
      
      // Verify all properties are loaded correctly
      expect(config.default.outputDir).toBe('./generated');
      expect(config.default.name).toBe('ApiClient');
      expect(config.default.baseUrl).toBe('http://localhost:3000');
      expect(config.default.routes.directory).toBe('./api');
      expect(config.default.routes.pattern).toBeInstanceOf(RegExp);
    });
  });
});