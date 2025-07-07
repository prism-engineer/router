import { describe, it, expect, vi, beforeEach } from 'vitest';
import { router } from '../../src/router';
import fs from 'fs/promises';

vi.mock('fs/promises');

describe('Client Generation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('compile method', () => {
    it('should generate TypeScript client by default', async () => {
      const config = {
        outputDir: './generated',
        clientName: 'ApiClient'
      };

      vi.mocked(fs.writeFile).mockResolvedValue();
      vi.mocked(fs.mkdir).mockResolvedValue();

      await router.compile(config);

      expect(fs.mkdir).toHaveBeenCalledWith('./generated', { recursive: true });
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('ApiClient.ts'),
        expect.stringContaining('export class ApiClient'),
        'utf-8'
      );
    });

    it('should generate JavaScript client when specified', async () => {
      const config = {
        outputDir: './generated',
        clientName: 'ApiClient',
        format: 'javascript' as const
      };

      vi.mocked(fs.writeFile).mockResolvedValue();
      vi.mocked(fs.mkdir).mockResolvedValue();

      await router.compile(config);

      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('ApiClient.js'),
        expect.stringContaining('class ApiClient'),
        'utf-8'
      );
    });

    it('should create output directory if it does not exist', async () => {
      const config = {
        outputDir: './custom/output/dir',
        clientName: 'MyClient'
      };

      vi.mocked(fs.writeFile).mockResolvedValue();
      vi.mocked(fs.mkdir).mockResolvedValue();

      await router.compile(config);

      expect(fs.mkdir).toHaveBeenCalledWith('./custom/output/dir', { recursive: true });
    });
  });

  describe('path-based client structure', () => {
    it('should generate client with path-based methods', async () => {
      const config = {
        outputDir: './generated',
        clientName: 'ApiClient'
      };

      vi.mocked(fs.writeFile).mockResolvedValue();
      vi.mocked(fs.mkdir).mockResolvedValue();

      await router.compile(config);

      const writeCall = vi.mocked(fs.writeFile).mock.calls[0];
      const generatedContent = writeCall[1] as string;

      // Should generate path-based structure
      expect(generatedContent).toContain('api');
      expect(generatedContent).toContain('.get(');
      expect(generatedContent).toContain('.post(');
      expect(generatedContent).toContain('.put(');
      expect(generatedContent).toContain('.delete(');
    });

    it('should handle path parameters with underscore notation', async () => {
      const config = {
        outputDir: './generated',
        clientName: 'ApiClient'
      };

      vi.mocked(fs.writeFile).mockResolvedValue();
      vi.mocked(fs.mkdir).mockResolvedValue();

      await router.compile(config);

      const writeCall = vi.mocked(fs.writeFile).mock.calls[0];
      const generatedContent = writeCall[1] as string;

      // Should generate underscore notation for path parameters
      expect(generatedContent).toContain('_');
    });

    it('should support nested paths', async () => {
      const config = {
        outputDir: './generated',
        clientName: 'ApiClient'
      };

      vi.mocked(fs.writeFile).mockResolvedValue();
      vi.mocked(fs.mkdir).mockResolvedValue();

      await router.compile(config);

      const writeCall = vi.mocked(fs.writeFile).mock.calls[0];
      const generatedContent = writeCall[1] as string;

      // Should support nested API structure
      expect(generatedContent).toContain('api');
    });
  });

  describe('request options', () => {
    it('should generate RequestOptions interface', async () => {
      const config = {
        outputDir: './generated',
        clientName: 'ApiClient'
      };

      vi.mocked(fs.writeFile).mockResolvedValue();
      vi.mocked(fs.mkdir).mockResolvedValue();

      await router.compile(config);

      const writeCall = vi.mocked(fs.writeFile).mock.calls[0];
      const generatedContent = writeCall[1] as string;

      expect(generatedContent).toContain('interface RequestOptions');
      expect(generatedContent).toContain('query?');
      expect(generatedContent).toContain('body?');
      expect(generatedContent).toContain('headers?');
    });

    it('should support typed request and response bodies', async () => {
      const config = {
        outputDir: './generated',
        clientName: 'ApiClient'
      };

      vi.mocked(fs.writeFile).mockResolvedValue();
      vi.mocked(fs.mkdir).mockResolvedValue();

      await router.compile(config);

      const writeCall = vi.mocked(fs.writeFile).mock.calls[0];
      const generatedContent = writeCall[1] as string;

      // Should include TypeScript types
      expect(generatedContent).toContain('Promise<');
    });
  });

  describe('error handling', () => {
    it('should handle compilation errors gracefully', async () => {
      const config = {
        outputDir: './generated',
        clientName: 'ApiClient'
      };

      vi.mocked(fs.mkdir).mockRejectedValue(new Error('Permission denied'));

      await expect(router.compile(config)).rejects.toThrow('Permission denied');
    });

    it('should validate required config properties', async () => {
      const invalidConfig = {
        clientName: 'ApiClient'
        // missing outputDir
      } as any;

      await expect(router.compile(invalidConfig)).rejects.toThrow();
    });
  });
});