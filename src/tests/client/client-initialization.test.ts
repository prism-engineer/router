import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { router } from '../../router.js';
import path from 'path';
import fs from 'fs/promises';

describe('Frontend Client - Client Initialization', () => {
  let tempDir: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Create temporary directory for generated client
    tempDir = path.join(process.cwd(), 'temp-test-' + crypto.randomUUID());
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    // Cleanup temporary directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should generate client with custom base URL', async () => {
    await router.compile({
      outputDir: tempDir,
      name: 'CustomClient',
      baseUrl: 'https://api.example.com',
      routes: [{
        directory: path.resolve(__dirname, '../router/fixtures/api'),
        pattern: /.*\.ts$/
      }]
    });

    const clientPath = path.join(tempDir, 'CustomClient.generated.ts');
    const clientContent = await fs.readFile(clientPath, 'utf-8');
    
    expect(clientContent).toContain('https://api.example.com');
    expect(clientContent).toContain('createCustomClient');
  });

  it('should generate client with custom name', async () => {
    await router.compile({
      outputDir: tempDir,
      name: 'MyApiClient',
      baseUrl: 'http://localhost:3000',
      routes: [{
        directory: path.resolve(__dirname, '../router/fixtures/api'),
        pattern: /.*\.ts$/
      }]
    });

    const clientPath = path.join(tempDir, 'MyApiClient.generated.ts');
    const clientContent = await fs.readFile(clientPath, 'utf-8');
    
    expect(clientContent).toContain('createMyApiClient');
    // Check for actual generated content structure
    expect(clientContent).toContain('baseUrl');
  });

  it('should handle empty routes directory', async () => {
    const emptyDir = path.join(tempDir, 'empty');
    await fs.mkdir(emptyDir);

    await router.compile({
      outputDir: tempDir,
      name: 'EmptyClient',
      baseUrl: 'http://localhost:3000',
      routes: [{
        directory: emptyDir,
        pattern: /.*\.ts$/
      }]
    });

    const clientPath = path.join(tempDir, 'EmptyClient.generated.ts');
    const clientContent = await fs.readFile(clientPath, 'utf-8');
    
    expect(clientContent).toContain('createEmptyClient');
    // Should still generate a valid client structure even with no routes
    expect(clientContent).toContain('baseUrl');
  });

  it('should generate client with nested path structure', async () => {
    await router.compile({
      outputDir: tempDir,
      name: 'NestedClient',
      baseUrl: 'http://localhost:3000',
      routes: [{
        directory: path.resolve(__dirname, '../router/fixtures'),
        pattern: /.*\.ts$/
      }]
    });

    const clientPath = path.join(tempDir, 'NestedClient.generated.ts');
    const clientContent = await fs.readFile(clientPath, 'utf-8');
    
    // Should include nested structure for versioned routes
    expect(clientContent).toContain('api:');
    expect(clientContent).toContain('v1:');
    expect(clientContent).toContain('v2:');
  });

  it('should generate client with proper exports', async () => {
    await router.compile({
      outputDir: tempDir,
      name: 'ExportClient',
      baseUrl: 'http://localhost:3000',
      routes: [{
        directory: path.resolve(__dirname, '../router/fixtures/api'),
        pattern: /.*\.ts$/
      }]
    });

    const clientPath = path.join(tempDir, 'ExportClient.generated.ts');
    const clientContent = await fs.readFile(clientPath, 'utf-8');
    
    // Should have proper ES module exports
    expect(clientContent).toContain('export const createExportClient');
    expect(clientContent).toContain('export');
  });

  it('should handle invalid route directory gracefully', async () => {
    const invalidDir = path.join(tempDir, 'nonexistent');

    // Should throw an error for non-existent directory
    await expect(router.compile({
      outputDir: tempDir,
      name: 'InvalidClient',
      baseUrl: 'http://localhost:3000',
      routes: [{
        directory: invalidDir,
        pattern: /.*\.ts$/
      }]
    })).rejects.toThrow();
  });

  it('should generate client with custom output directory', async () => {
    const customOutputDir = path.join(tempDir, 'custom', 'output');
    
    await router.compile({
      outputDir: customOutputDir,
      name: 'CustomDirClient',
      baseUrl: 'http://localhost:3000',
      routes: [{
        directory: path.resolve(__dirname, '../router/fixtures/api'),
        pattern: /.*\.ts$/
      }]
    });

    const clientPath = path.join(customOutputDir, 'CustomDirClient.generated.ts');
    const clientExists = await fs.access(clientPath).then(() => true).catch(() => false);
    expect(clientExists).toBe(true);
  });

  it('should generate client with fetch options configuration', async () => {
    await router.compile({
      outputDir: tempDir,
      name: 'FetchClient',
      baseUrl: 'http://localhost:3000',
      routes: [{
        directory: path.resolve(__dirname, '../router/fixtures/api'),
        pattern: /.*\.ts$/
      }]
    });

    const clientPath = path.join(tempDir, 'FetchClient.generated.ts');
    const clientContent = await fs.readFile(clientPath, 'utf-8');
    
    // Should include fetch configuration options
    expect(clientContent).toContain('method:');
    expect(clientContent).toContain('headers:');
    expect(clientContent).toContain('body:');
  });

  it('should generate client with JSDoc comments', async () => {
    await router.compile({
      outputDir: tempDir,
      name: 'DocClient',
      baseUrl: 'http://localhost:3000',
      routes: [{
        directory: path.resolve(__dirname, '../router/fixtures/api'),
        pattern: /.*\.ts$/
      }]
    });

    const clientPath = path.join(tempDir, 'DocClient.generated.ts');
    const clientContent = await fs.readFile(clientPath, 'utf-8');
    
    // Should include documentation comments
    expect(clientContent).toContain('//');
    expect(clientContent).toContain('Generated');
  });

  it('should validate compilation options', async () => {
    // Test with invalid configuration
    await expect(router.compile({
      outputDir: '', // Invalid empty output directory
      name: 'TestClient',
      baseUrl: 'http://localhost:3000',
      routes: [{
        directory: path.resolve(__dirname, '../router/fixtures/api'),
        pattern: /.*\.ts$/
      }]
    })).rejects.toThrow();
  });

  it('should handle compilation with no routes found', async () => {
    const noRoutesDir = path.join(tempDir, 'no-routes');
    await fs.mkdir(noRoutesDir);
    await fs.writeFile(path.join(noRoutesDir, 'empty.js'), 'export const notARoute = {};');

    await router.compile({
      outputDir: tempDir,
      name: 'NoRoutesClient',
      baseUrl: 'http://localhost:3000',
      routes: [{
        directory: noRoutesDir,
        pattern: /.*\.ts$/
      }]
    });

    const clientPath = path.join(tempDir, 'NoRoutesClient.generated.ts');
    const clientContent = await fs.readFile(clientPath, 'utf-8');
    
    // Should still generate valid client structure
    expect(clientContent).toContain('createNoRoutesClient');
  });

  it('should generate client with route pattern filtering', async () => {
    await router.compile({
      outputDir: tempDir,
      name: 'FilteredClient',
      baseUrl: 'http://localhost:3000',
      routes: [{
        directory: path.resolve(__dirname, '../router/fixtures/api'),
        pattern: /hello\.js$/ // Only hello.ts file
      }]
    });

    const clientPath = path.join(tempDir, 'FilteredClient.generated.ts');
    const clientContent = await fs.readFile(clientPath, 'utf-8');
    
    // Should include hello route
    expect(clientContent).toContain('hello');
    // Should be a valid client with baseUrl
    expect(clientContent).toContain('baseUrl');
  });

  it('should handle concurrent compilation requests', async () => {
    const promises = Array(3).fill(null).map((_, i) => 
      router.compile({
        outputDir: path.join(tempDir, `concurrent-${i}`),
        name: `ConcurrentClient${i}`,
        baseUrl: 'http://localhost:3000',
        routes: [{
          directory: path.resolve(__dirname, '../router/fixtures/api'),
          pattern: /.*\.ts$/
        }]
      })
    );

    await expect(Promise.all(promises)).resolves.not.toThrow();

    // Verify all clients were generated
    for (let i = 0; i < 3; i++) {
      const clientPath = path.join(tempDir, `concurrent-${i}`, `ConcurrentClient${i}.generated.ts`);
      const clientExists = await fs.access(clientPath).then(() => true).catch(() => false);
      expect(clientExists).toBe(true);
    }
  });

  it('should preserve existing files in output directory', async () => {
    // Create existing file in output directory
    await fs.writeFile(path.join(tempDir, 'existing.txt'), 'existing content');

    await router.compile({
      outputDir: tempDir,
      name: 'PreserveClient',
      baseUrl: 'http://localhost:3000',
      routes: [{
        directory: path.resolve(__dirname, '../router/fixtures/api'),
        pattern: /.*\.ts$/
      }]
    });

    // Existing file should still exist
    const existingContent = await fs.readFile(path.join(tempDir, 'existing.txt'), 'utf-8');
    expect(existingContent).toBe('existing content');

    // New client should also exist
    const clientExists = await fs.access(path.join(tempDir, 'PreserveClient.generated.ts'))
      .then(() => true).catch(() => false);
    expect(clientExists).toBe(true);
  });
});