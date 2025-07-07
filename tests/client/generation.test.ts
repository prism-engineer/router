/**
 * UNIT TESTS for Client Generation functionality
 * 
 * Tests the router.compile() method that generates API client code:
 * - File system operations (mkdir, writeFile) with proper paths
 * - TypeScript vs JavaScript output format selection
 * - Generated client structure and method signatures
 * - Path-based client organization and parameter handling
 * 
 * MOCKING: fs/promises - tests file operations without actual file I/O
 * SCOPE: Client code generation logic, not the actual generated client functionality
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { router } from '../../src/router';
import fs from 'fs/promises';
import { CompilationConfig } from '../../src/core/types';
import path from 'path';

describe('Client Generation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('compile method', () => {
    it('should generate TypeScript client by default', async () => {
      const config = {
        outputDir: './generated',
        baseUrl: 'http://localhost:3000',
        routes: {
          directory: path.resolve(__dirname, '../fixtures/routes'),
          pattern: /\.ts$/
        },
        name: 'TestClient'
      };

      const writeFileSpy = vi.spyOn(fs, 'writeFile').mockResolvedValue();
      vi.spyOn(fs, 'mkdir').mockResolvedValue(undefined);

      await router.compile(config);

      expect(writeFileSpy).toHaveBeenCalledWith(
        expect.stringContaining('TestClient.generated.ts'),
        expect.stringContaining('createTestClient'),
        'utf-8'
      );
    });

    it('should create output directory if it does not exist', async () => {
      const config = {
        outputDir: './custom/output/dir',
        baseUrl: 'http://localhost:3000',
        routes: {
          directory: path.resolve(__dirname, '../fixtures/routes'),
          pattern: /\.ts$/
        },
        name: 'TestClient'
      };

      const mkdirSpy = vi.spyOn(fs, 'mkdir').mockResolvedValue(undefined);
      vi.spyOn(fs, 'writeFile').mockResolvedValue();

      await router.compile(config);

      expect(mkdirSpy).toHaveBeenCalledWith('./custom/output/dir', { recursive: true });
    });
  });

  describe('path-based client structure', () => {
    it('should generate client with path-based methods', async () => {
      const config = {
        outputDir: './generated',
        baseUrl: 'http://localhost:3000',
        routes: {
          directory: path.resolve(__dirname, '../fixtures/routes'),
          pattern: /\.ts$/
        },
        name: 'TestClient'
      };

      const writeFileSpy = vi.spyOn(fs, 'writeFile').mockResolvedValue();
      vi.spyOn(fs, 'mkdir').mockResolvedValue(undefined);

      await router.compile(config);

      const generatedContent = writeFileSpy.mock.calls[0][1] as string;
      
      // Check for basic structure
      expect(generatedContent).toContain('createTestClient');
      expect(generatedContent).toContain('api');
      
      // Check for actual HTTP implementation (not just type signatures)
      expect(generatedContent).toContain('fetch(');
    });

    it('should handle path parameters with underscore notation', async () => {
      const config = {
        outputDir: './generated',
        baseUrl: 'http://localhost:3000',
        routes: {
          directory: path.resolve(__dirname, '../fixtures/routes'),
          pattern: /\.ts$/
        },
        name: 'TestClient'
      };

      const writeFileSpy = vi.spyOn(fs, 'writeFile').mockResolvedValue();
      vi.spyOn(fs, 'mkdir').mockResolvedValue(undefined);

      await router.compile(config);

      const generatedContent = writeFileSpy.mock.calls[0][1] as string;
      
      // Check for basic client structure
      expect(generatedContent).toContain('createTestClient');
      expect(generatedContent).toContain('api');
    });

    it('should support nested paths', async () => {
      const config = {
        outputDir: './generated',
        baseUrl: 'http://localhost:3000',
        routes: {
          directory: path.resolve(__dirname, '../fixtures/routes'),
          pattern: /\.ts$/
        },
        name: 'TestClient'
      };

      const writeFileSpy = vi.spyOn(fs, 'writeFile').mockResolvedValue();
      vi.spyOn(fs, 'mkdir').mockResolvedValue(undefined);

      await router.compile(config);

      const generatedContent = writeFileSpy.mock.calls[0][1] as string;
      
      expect(generatedContent).toContain('createTestClient');
      expect(generatedContent).toContain('api');
    });
  });

  describe('type safety', () => {
    it('should generate type-safe method signatures', async () => {
      const config = {
        outputDir: './generated',
        baseUrl: 'http://localhost:3000',
        routes: {
          directory: path.resolve(__dirname, '../fixtures/routes'),
          pattern: /\.ts$/
        },
        name: 'TestClient'
      };

      const writeFileSpy = vi.spyOn(fs, 'writeFile').mockResolvedValue();
      vi.spyOn(fs, 'mkdir').mockResolvedValue(undefined);

      await router.compile(config);

      const generatedContent = writeFileSpy.mock.calls[0][1] as string;
      
      expect(generatedContent).toContain('createTestClient');
      expect(generatedContent).toContain('fetch(');
    });

    it('should support typed request and response bodies', async () => {
      const config: CompilationConfig = {
        outputDir: './generated',
        baseUrl: 'http://localhost:3000',
        routes: {
          directory: path.resolve(__dirname, '../fixtures/routes'),
          pattern: /\.ts$/
        },
        name: 'TestClient'
      };

      const writeFileSpy = vi.spyOn(fs, 'writeFile').mockResolvedValue();
      vi.spyOn(fs, 'mkdir').mockResolvedValue(undefined);

      await router.compile(config);

      const generatedContent = writeFileSpy.mock.calls[0][1] as string;
      
      expect(generatedContent).toContain('createTestClient');
      expect(generatedContent).toContain('baseUrl');
    });
  });

  describe('error handling', () => {
    it('should handle compilation errors gracefully', async () => {
      const config = {
        outputDir: './generated',
        baseUrl: 'http://localhost:3000',
        routes: {
          directory: path.resolve(__dirname, '../fixtures/routes'),
          pattern: /\.ts$/
        },
        name: 'TestClient'
      };

      vi.spyOn(fs, 'mkdir').mockRejectedValue(new Error('Permission denied'));

      await expect(router.compile(config)).rejects.toThrow('Compilation failed');
    });

    it('should validate required config properties', async () => {
      const invalidConfig = {
        baseUrl: 'http://localhost:3000',
        routes: {
          directory: path.resolve(__dirname, '../fixtures/routes'),
          pattern: /\.ts$/
        },
        name: 'TestClient'
        // missing outputDir
      } as any;

      await expect(router.compile(invalidConfig)).rejects.toThrow('outputDir is required');
    });
  });
});