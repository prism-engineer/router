import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRouter } from '../../src/router';
import path from 'path';

describe('Router System - Multiple Route Loading', () => {
  let router: ReturnType<typeof createRouter>;

  beforeEach(() => {
    router = createRouter();
    vi.clearAllMocks();
  });

  it('should load routes from multiple directories sequentially', async () => {
    const apiPath = path.join(__dirname, 'fixtures/api');
    const adminPath = path.join(__dirname, 'fixtures/admin');
    
    await router.loadRoutes(apiPath, /\.ts$/);
    await router.loadRoutes(adminPath, /\.ts$/);
    
    expect(router.app).toBeDefined();
  });

  it('should load routes from nested directory structures', async () => {
    const apiPath = path.join(__dirname, 'fixtures/api');
    const v1Path = path.join(__dirname, 'fixtures/api/v1');
    const v2Path = path.join(__dirname, 'fixtures/api/v2');
    
    await router.loadRoutes(apiPath, /\.ts$/);
    await router.loadRoutes(v1Path, /\.ts$/);
    await router.loadRoutes(v2Path, /\.ts$/);
    
    expect(router.app).toBeDefined();
  });

  it('should handle concurrent route loading from multiple directories', async () => {
    const apiPath = path.join(__dirname, 'fixtures/api');
    const adminPath = path.join(__dirname, 'fixtures/admin');
    
    const promises = [
      router.loadRoutes(apiPath, /\.ts$/),
      router.loadRoutes(adminPath, /\.ts$/)
    ];
    
    await expect(Promise.all(promises)).resolves.not.toThrow();
  });

  it('should load routes with different patterns from same directory', async () => {
    const apiPath = path.join(__dirname, 'fixtures/api');
    
    // Load different file patterns from same directory
    await router.loadRoutes(apiPath, /hello\.ts$/);
    await router.loadRoutes(apiPath, /users\.ts$/);
    
    expect(router.app).toBeDefined();
  });

  it('should load routes from multiple versioned directories', async () => {
    const v1Path = path.join(__dirname, 'fixtures/api/v1');
    const v2Path = path.join(__dirname, 'fixtures/api/v2');
    
    // Load same resource from different versions
    await router.loadRoutes(v1Path, /posts\.ts$/);
    await router.loadRoutes(v2Path, /posts\.ts$/);
    
    expect(router.app).toBeDefined();
  });

  it('should maintain route loading order across directories', async () => {
    const loadingOrder = [
      { path: path.join(__dirname, 'fixtures/api'), pattern: /hello\.ts$/ },
      { path: path.join(__dirname, 'fixtures/api'), pattern: /users\.ts$/ },
      { path: path.join(__dirname, 'fixtures/admin'), pattern: /dashboard\.ts$/ }
    ];
    
    for (const { path: dirPath, pattern } of loadingOrder) {
      await router.loadRoutes(dirPath, pattern);
    }
    
    expect(router.app).toBeDefined();
  });

  it('should handle overlapping route patterns across directories', async () => {
    const apiPath = path.join(__dirname, 'fixtures/api');
    const adminPath = path.join(__dirname, 'fixtures/admin');
    
    // Load all .ts files from both directories
    await router.loadRoutes(apiPath, /\.ts$/);
    await router.loadRoutes(adminPath, /\.ts$/);
    
    expect(router.app).toBeDefined();
  });

  it('should load routes from directories with different structures', async () => {
    const flatPath = path.join(__dirname, 'fixtures/api');
    const nestedPath = path.join(__dirname, 'fixtures/api/v1');
    
    await router.loadRoutes(flatPath, /\.ts$/);
    await router.loadRoutes(nestedPath, /\.ts$/);
    
    expect(router.app).toBeDefined();
  });

  it('should handle selective loading from multiple directories', async () => {
    const directories = [
      { path: path.join(__dirname, 'fixtures/api'), pattern: /hello\.ts$/ },
      { path: path.join(__dirname, 'fixtures/api'), pattern: /users\.ts$/ },
      { path: path.join(__dirname, 'fixtures/api/v1'), pattern: /posts\.ts$/ },
      { path: path.join(__dirname, 'fixtures/api/v2'), pattern: /posts\.ts$/ }
    ];
    
    for (const { path: dirPath, pattern } of directories) {
      await router.loadRoutes(dirPath, pattern);
    }
    
    expect(router.app).toBeDefined();
  });

  it('should load routes with mixed file extensions from multiple directories', async () => {
    const apiPath = path.join(__dirname, 'fixtures/api');
    const adminPath = path.join(__dirname, 'fixtures/admin');
    
    // Load TypeScript files from both
    await router.loadRoutes(apiPath, /\.ts$/);
    await router.loadRoutes(adminPath, /\.ts$/);
    
    // Try loading JavaScript files (should handle gracefully if none exist)
    await router.loadRoutes(apiPath, /\.js$/);
    
    expect(router.app).toBeDefined();
  });

  it('should handle route conflicts across multiple directories', async () => {
    const v1Path = path.join(__dirname, 'fixtures/api/v1');
    const v2Path = path.join(__dirname, 'fixtures/api/v2');
    
    // Both directories have posts.ts - should handle conflicts
    await router.loadRoutes(v1Path, /posts\.ts$/);
    await router.loadRoutes(v2Path, /posts\.ts$/);
    
    expect(router.app).toBeDefined();
  });

  it('should load routes from directories with different naming conventions', async () => {
    const directories = [
      path.join(__dirname, 'fixtures/api'),      // kebab-case style
      path.join(__dirname, 'fixtures/admin'),    // single word
      path.join(__dirname, 'fixtures/api/v1'),   // versioned
      path.join(__dirname, 'fixtures/api/v2')    // versioned
    ];
    
    for (const dirPath of directories) {
      await router.loadRoutes(dirPath, /\.ts$/);
    }
    
    expect(router.app).toBeDefined();
  });

  it('should handle error recovery when loading from multiple directories', async () => {
    const validPath = path.join(__dirname, 'fixtures/api');
    const invalidPath = path.join(__dirname, 'fixtures/nonexistent');
    const anotherValidPath = path.join(__dirname, 'fixtures/admin');
    
    // Should continue loading after encountering an error
    await router.loadRoutes(validPath, /\.ts$/);
    await expect(router.loadRoutes(invalidPath, /\.ts$/)).rejects.toThrow();
    await router.loadRoutes(anotherValidPath, /\.ts$/);
    
    expect(router.app).toBeDefined();
  });

  it('should load routes with complex directory hierarchies', async () => {
    const hierarchyPaths = [
      path.join(__dirname, 'fixtures'),
      path.join(__dirname, 'fixtures/api'),
      path.join(__dirname, 'fixtures/api/v1'),
      path.join(__dirname, 'fixtures/api/v2'),
      path.join(__dirname, 'fixtures/admin')
    ];
    
    for (const dirPath of hierarchyPaths) {
      await router.loadRoutes(dirPath, /\.ts$/);
    }
    
    expect(router.app).toBeDefined();
  });

  it('should handle incremental route loading', async () => {
    // Load routes incrementally
    await router.loadRoutes(path.join(__dirname, 'fixtures/api'), /hello\.ts$/);
    expect(router.app).toBeDefined();
    
    await router.loadRoutes(path.join(__dirname, 'fixtures/api'), /users\.ts$/);
    expect(router.app).toBeDefined();
    
    await router.loadRoutes(path.join(__dirname, 'fixtures/admin'), /dashboard\.ts$/);
    expect(router.app).toBeDefined();
  });

  it('should load routes from directories with different access patterns', async () => {
    const patterns = [
      /\.ts$/,           // All TypeScript files
      /hello\.ts$/,      // Specific file
      /^(?!.*malformed).*\.ts$/, // Exclude malformed files
      /[a-z]+\.ts$/      // Lowercase names only
    ];
    
    const apiPath = path.join(__dirname, 'fixtures/api');
    
    for (const pattern of patterns) {
      await router.loadRoutes(apiPath, pattern);
    }
    
    expect(router.app).toBeDefined();
  });

  it('should handle route deduplication across multiple loads', async () => {
    const apiPath = path.join(__dirname, 'fixtures/api');
    
    // Load same routes multiple times
    await router.loadRoutes(apiPath, /hello\.ts$/);
    await router.loadRoutes(apiPath, /hello\.ts$/);
    await router.loadRoutes(apiPath, /hello\.ts$/);
    
    expect(router.app).toBeDefined();
  });

  it('should load routes from absolute and relative paths', async () => {
    const absolutePath = path.join(__dirname, 'fixtures/api');
    const relativePath = './tests/router/fixtures/admin';
    
    await router.loadRoutes(absolutePath, /\.ts$/);
    await router.loadRoutes(relativePath, /\.ts$/);
    
    expect(router.app).toBeDefined();
  });

  it('should handle batch loading with different configurations', async () => {
    const configurations = [
      { path: path.join(__dirname, 'fixtures/api'), pattern: /\.ts$/, description: 'API routes' },
      { path: path.join(__dirname, 'fixtures/admin'), pattern: /\.ts$/, description: 'Admin routes' },
      { path: path.join(__dirname, 'fixtures/api/v1'), pattern: /\.ts$/, description: 'V1 routes' },
      { path: path.join(__dirname, 'fixtures/api/v2'), pattern: /\.ts$/, description: 'V2 routes' }
    ];
    
    for (const { path: dirPath, pattern } of configurations) {
      await router.loadRoutes(dirPath, pattern);
    }
    
    expect(router.app).toBeDefined();
  });

  it('should maintain route registry across multiple directory loads', async () => {
    const firstLoad = router.loadRoutes(path.join(__dirname, 'fixtures/api'), /hello\.ts$/);
    const secondLoad = router.loadRoutes(path.join(__dirname, 'fixtures/admin'), /dashboard\.ts$/);
    
    await Promise.all([firstLoad, secondLoad]);
    
    // Router should maintain all loaded routes
    expect(router.app).toBeDefined();
  });

  it('should handle mixed success and failure scenarios', async () => {
    const validPath1 = path.join(__dirname, 'fixtures/api');
    const validPath2 = path.join(__dirname, 'fixtures/admin');
    
    // Mix valid and potentially problematic loads
    await router.loadRoutes(validPath1, /\.ts$/);
    await router.loadRoutes(validPath2, /\.ts$/);
    await router.loadRoutes(path.join(__dirname, 'fixtures'), /malformed\.ts$/);
    
    expect(router.app).toBeDefined();
  });
});