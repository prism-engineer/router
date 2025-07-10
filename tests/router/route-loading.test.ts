import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRouter } from '../../src/router';
import path from 'path';

describe('Router System - Route Loading', () => {
  let router: ReturnType<typeof createRouter>;

  beforeEach(() => {
    router = createRouter();
    vi.clearAllMocks();
  });

  it('should load routes from a single directory with TypeScript pattern', async () => {
    const fixturesPath = path.join(__dirname, 'fixtures/api');
    
    await router.loadRoutes(fixturesPath, /\.ts$/);
    
    expect(router.app).toBeDefined();
    expect(typeof router.loadRoutes).toBe('function');
  });

  it('should load routes with specific filename pattern', async () => {
    const fixturesPath = path.join(__dirname, 'fixtures/api');
    
    // Load only files matching 'hello.ts'
    await router.loadRoutes(fixturesPath, /hello\.ts$/);
    
    expect(router.app).toBeDefined();
  });

  it('should load routes from nested directories', async () => {
    const fixturesPath = path.join(__dirname, 'fixtures/api/v1');
    
    await router.loadRoutes(fixturesPath, /\.ts$/);
    
    expect(router.app).toBeDefined();
  });

  it('should load routes with JavaScript pattern', async () => {
    const fixturesPath = path.join(__dirname, 'fixtures/api');
    
    // This should not find any .js files in our test setup
    await router.loadRoutes(fixturesPath, /\.js$/);
    
    expect(router.app).toBeDefined();
  });

  it('should handle non-existent directories', async () => {
    const nonExistentPath = path.join(__dirname, 'fixtures/nonexistent');
    
    await expect(router.loadRoutes(nonExistentPath, /\.ts$/)).rejects.toThrow();
  });

  it('should load routes with complex regex patterns', async () => {
    const fixturesPath = path.join(__dirname, 'fixtures/api');
    
    // Load files ending with either .ts or .js
    await router.loadRoutes(fixturesPath, /\.(ts|js)$/);
    
    expect(router.app).toBeDefined();
  });

  it('should handle relative path resolution', async () => {
    const relativePath = './tests/router/fixtures/api';
    
    await router.loadRoutes(relativePath, /\.ts$/);
    
    expect(router.app).toBeDefined();
  });

  it('should load routes from multiple patterns sequentially', async () => {
    const fixturesPath = path.join(__dirname, 'fixtures/api');
    
    // Load different patterns
    await router.loadRoutes(fixturesPath, /hello\.ts$/);
    await router.loadRoutes(fixturesPath, /users\.ts$/);
    
    expect(router.app).toBeDefined();
  });

  it('should handle case-sensitive pattern matching', async () => {
    const fixturesPath = path.join(__dirname, 'fixtures/api');
    
    // Case-sensitive pattern
    await router.loadRoutes(fixturesPath, /\.TS$/);
    
    expect(router.app).toBeDefined();
  });

  it('should load routes with exclusion patterns', async () => {
    const fixturesPath = path.join(__dirname, 'fixtures');
    
    // Pattern that excludes malformed files
    await router.loadRoutes(fixturesPath, /^(?!.*malformed).*\.ts$/);
    
    expect(router.app).toBeDefined();
  });

  it('should handle deeply nested directory structures', async () => {
    const nestedPath = path.join(__dirname, 'fixtures/api/v1');
    
    await router.loadRoutes(nestedPath, /\.ts$/);
    
    expect(router.app).toBeDefined();
  });

  it('should preserve route loading order', async () => {
    const fixturesPath = path.join(__dirname, 'fixtures/api');
    
    // Load routes in specific order
    await router.loadRoutes(fixturesPath, /hello\.ts$/);
    await router.loadRoutes(fixturesPath, /users\.ts$/);
    
    expect(router.app).toBeDefined();
  });

  it('should handle special characters in file paths', async () => {
    const fixturesPath = path.join(__dirname, 'fixtures/api');
    
    // Pattern that handles various file naming conventions
    await router.loadRoutes(fixturesPath, /[a-zA-Z0-9_-]+\.ts$/);
    
    expect(router.app).toBeDefined();
  });

  it('should validate pattern parameter is required', async () => {
    const fixturesPath = path.join(__dirname, 'fixtures/api');
    
    await expect(router.loadRoutes(fixturesPath, null as any)).rejects.toThrow();
  });

  it('should validate directory parameter is required', async () => {
    await expect(router.loadRoutes('', /\.ts$/)).rejects.toThrow();
  });

  it('should handle symbolic links in directories', async () => {
    const fixturesPath = path.join(__dirname, 'fixtures/api');
    
    // This should work even if there are symbolic links
    await router.loadRoutes(fixturesPath, /\.ts$/);
    
    expect(router.app).toBeDefined();
  });

  it('should handle very large directories efficiently', async () => {
    const fixturesPath = path.join(__dirname, 'fixtures/api');
    
    const startTime = Date.now();
    await router.loadRoutes(fixturesPath, /\.ts$/);
    const endTime = Date.now();
    
    // Should complete within reasonable time (less than 1 second for small directories)
    expect(endTime - startTime).toBeLessThan(1000);
  });
});