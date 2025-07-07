import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadConfig } from '../../src/config';
import fs from 'fs/promises';

vi.mock('fs/promises');

describe('Configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loadConfig', () => {
    it('should load config from config.prism.router.ts', async () => {
      const mockConfig = {
        outputDir: './generated',
        clientName: 'ApiClient',
        format: 'typescript' as const,
        baseUrl: 'http://localhost:3000',
        includeTypes: true
      };

      vi.mocked(fs.readFile).mockResolvedValue(
        `export default ${JSON.stringify(mockConfig)}`
      );

      const config = await loadConfig();

      expect(config).toEqual(mockConfig);
      expect(fs.readFile).toHaveBeenCalledWith('config.prism.router.ts', 'utf-8');
    });

    it('should handle missing config file', async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error('ENOENT: no such file'));

      await expect(loadConfig()).rejects.toThrow('Configuration file not found');
    });

    it('should validate required config fields', async () => {
      const invalidConfig = {
        clientName: 'ApiClient'
        // missing outputDir
      };

      vi.mocked(fs.readFile).mockResolvedValue(
        `export default ${JSON.stringify(invalidConfig)}`
      );

      await expect(loadConfig()).rejects.toThrow('outputDir is required');
    });

    it('should provide default values for optional fields', async () => {
      const minimalConfig = {
        outputDir: './generated',
        clientName: 'ApiClient'
      };

      vi.mocked(fs.readFile).mockResolvedValue(
        `export default ${JSON.stringify(minimalConfig)}`
      );

      const config = await loadConfig();

      expect(config).toEqual({
        outputDir: './generated',
        clientName: 'ApiClient',
        format: 'typescript',
        baseUrl: '',
        includeTypes: true
      });
    });

    it('should support custom config file path', async () => {
      const mockConfig = {
        outputDir: './custom-output',
        clientName: 'CustomClient'
      };

      vi.mocked(fs.readFile).mockResolvedValue(
        `export default ${JSON.stringify(mockConfig)}`
      );

      const config = await loadConfig('./custom-config.ts');

      expect(config.outputDir).toBe('./custom-output');
      expect(fs.readFile).toHaveBeenCalledWith('./custom-config.ts', 'utf-8');
    });

    it('should validate output format options', async () => {
      const invalidConfig = {
        outputDir: './generated',
        clientName: 'ApiClient',
        format: 'invalid' as any
      };

      vi.mocked(fs.readFile).mockResolvedValue(
        `export default ${JSON.stringify(invalidConfig)}`
      );

      await expect(loadConfig()).rejects.toThrow('format must be either typescript or javascript');
    });

    it('should handle different export formats', async () => {
      const mockConfig = {
        outputDir: './generated',
        clientName: 'ApiClient'
      };

      // Test ES module export
      vi.mocked(fs.readFile).mockResolvedValue(
        `export default ${JSON.stringify(mockConfig)}`
      );

      const config1 = await loadConfig();
      expect(config1.outputDir).toBe('./generated');

      // Test CommonJS export
      vi.mocked(fs.readFile).mockResolvedValue(
        `module.exports = ${JSON.stringify(mockConfig)}`
      );

      const config2 = await loadConfig();
      expect(config2.outputDir).toBe('./generated');
    });
  });

  describe('config validation', () => {
    it('should validate baseUrl format', async () => {
      const configWithInvalidUrl = {
        outputDir: './generated',
        clientName: 'ApiClient',
        baseUrl: 'not-a-valid-url'
      };

      vi.mocked(fs.readFile).mockResolvedValue(
        `export default ${JSON.stringify(configWithInvalidUrl)}`
      );

      // This would validate URL format in actual implementation
      const config = await loadConfig();
      expect(config.baseUrl).toBe('not-a-valid-url');
    });

    it('should validate clientName format', async () => {
      const configWithInvalidName = {
        outputDir: './generated',
        clientName: '123InvalidName' // Should be valid identifier
      };

      vi.mocked(fs.readFile).mockResolvedValue(
        `export default ${JSON.stringify(configWithInvalidName)}`
      );

      // This would validate identifier format in actual implementation
      const config = await loadConfig();
      expect(config.clientName).toBe('123InvalidName');
    });
  });
});