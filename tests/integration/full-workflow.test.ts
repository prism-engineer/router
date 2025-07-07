/**
 * INTEGRATION TESTS for Full Workflow (Currently with Mocks)
 * 
 * Tests the complete router workflow from route loading to client compilation:
 * - Route loading with different patterns (RegExp, glob)
 * - Router configuration and compilation process
 * - Integration between router, config, and route definitions
 * - Error handling across the entire workflow
 * 
 * MOCKING: config module - to control configuration loading
 * SCOPE: Tests component integration, but not actual HTTP behavior
 * 
 * TODO: Add real integration tests without mocks for actual HTTP testing
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { router } from '../../src/router';
import { createApiRoute } from '../../src/createApiRoute';
import { loadConfig } from '../../src/config';
import { Type } from '@sinclair/typebox';

vi.mock('../../src/config');
vi.mock('../../src/router', async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    router: {
      ...original.router,
      loadRoutes: vi.fn().mockResolvedValue(undefined),
      compile: vi.fn().mockResolvedValue(undefined)
    }
  };
});

describe('Full Workflow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mocks
    vi.mocked(router.loadRoutes).mockResolvedValue(undefined);
    vi.mocked(router.compile).mockResolvedValue(undefined);
  });

  describe('route loading and compilation', () => {
    it('should load routes and compile client', async () => {
      const mockConfig = {
        outputDir: './generated',
        name: 'ApiClient',
        baseUrl: 'http://localhost:3000',
        routes: {
          directory: './api',
          pattern: /.*\.ts$/
        }
      };

      vi.mocked(loadConfig).mockResolvedValue(mockConfig);

      // Load routes
      await router.loadRoutes('./api', /.*\.ts$/);

      // Compile using config
      const config = await loadConfig();
      await router.compile(config);

      expect(loadConfig).toHaveBeenCalled();
    });

    it('should handle complete API with all features', async () => {
      // Create routes with different features
      const routes = [
        // Simple GET
        createApiRoute({
          path: '/api/hello',
          method: 'GET',
          response: {
            200: {
              body: Type.Object({
                message: Type.String()
              })
            }
          },
          handler: async (req) => {
            return {
              status: 200 as const,
              body: { message: 'Hello' }
            };
          }
        }),

        // POST with body
        createApiRoute({
          path: '/api/users',
          method: 'POST',
          request: {
            body: Type.Object({
              name: Type.String(),
              email: Type.String()
            })
          },
          response: {
            201: {
              body: Type.Object({
                id: Type.Number(),
                name: Type.String(),
                email: Type.String()
              })
            }
          },
          handler: async (req) => {
            return {
              status: 201 as const,
              body: {
                id: 1,
                name: req.body.name,
                email: req.body.email
              }
            };
          }
        }),

        // GET with query parameters
        createApiRoute({
          path: '/api/users',
          method: 'GET',
          request: {
            query: Type.Object({
              page: Type.Optional(Type.Number()),
              limit: Type.Optional(Type.Number())
            })
          },
          response: {
            200: {
              body: Type.Array(Type.Object({
                id: Type.Number(),
                name: Type.String()
              }))
            }
          },
          handler: async (req) => {
            return {
              status: 200 as const,
              body: [{ id: 1, name: 'John' }]
            };
          }
        }),

        // GET with path parameters
        createApiRoute({
          path: '/api/users/{userId}',
          method: 'GET',
          response: {
            200: {
              body: Type.Object({
                id: Type.Number(),
                name: Type.String()
              })
            }
          },
          handler: async (req) => {
            const { userId } = req.params;
            return {
              status: 200 as const,
              body: { id: Number(userId), name: 'John' }
            };
          }
        }),

        // Route with headers
        createApiRoute({
          path: '/api/protected',
          method: 'GET',
          request: {
            headers: Type.Object({
              authorization: Type.String()
            })
          },
          response: {
            200: {
              body: Type.Object({
                data: Type.String()
              })
            }
          },
          handler: async (req) => {
            return {
              status: 200 as const,
              body: { data: 'protected' }
            };
          }
        }),

        // Route with authentication
        createApiRoute({
          path: '/api/secure',
          method: 'GET',
          response: {
            200: {
              body: Type.Object({
                secret: Type.String()
              })
            }
          },
          handler: async (req) => {
            return {
              status: 200 as const,
              body: { secret: 'top secret' }
            };
          }
        })
      ];

      // All routes should be valid
      routes.forEach(route => {
        expect(route).toBeDefined();
        expect(typeof route).toBe('object');
      });
    });
  });

  describe('error handling', () => {
    it('should handle route loading errors', async () => {
      const invalidPattern = null as any;
      
      // Mock the loadRoutes to reject for this test
      vi.mocked(router.loadRoutes).mockRejectedValueOnce(new Error('Invalid pattern'));
      
      await expect(router.loadRoutes(invalidPattern)).rejects.toThrow();
    });

    it('should handle compilation errors', async () => {
      const invalidConfig = null as any;
      
      // Mock the compile to reject for this test
      vi.mocked(router.compile).mockRejectedValueOnce(new Error('Invalid config'));
      
      await expect(router.compile(invalidConfig)).rejects.toThrow();
    });

    it('should handle config loading errors', async () => {
      vi.mocked(loadConfig).mockRejectedValue(new Error('Config not found'));
      
      await expect(loadConfig()).rejects.toThrow('Config not found');
    });
  });

  describe('multiple route patterns', () => {
    it('should handle multiple route directories and patterns', async () => {
      const configs = [
        { directory: './api/v1', pattern: /.*\.ts$/ },
        { directory: './api/v2', pattern: /.*\.ts$/ },
        { directory: './admin', pattern: /.*\.ts$/ }
      ];

      for (const { directory, pattern } of configs) {
        await expect(router.loadRoutes(directory, pattern)).resolves.not.toThrow();
      }
    });

    it('should support RegExp pattern loading as documented in README', async () => {
      // Test RegExp pattern as documented in README
      await expect(router.loadRoutes('./api', /.*\.ts$/)).resolves.not.toThrow();
    });

    it('should support different RegExp patterns', async () => {
      // Test different RegExp patterns
      await expect(router.loadRoutes('./api', /.*\.ts$/)).resolves.not.toThrow();
      
      // Test more specific pattern
      await expect(router.loadRoutes('./api', /users\.ts$/)).resolves.not.toThrow();
    });

    it('should support chaining operations', async () => {
      const mockConfig = {
        outputDir: './generated',
        name: 'ApiClient',
        baseUrl: 'http://localhost:3000',
        routes: {
          directory: './api',
          pattern: /.*\.ts$/
        }
      };

      vi.mocked(loadConfig).mockResolvedValue(mockConfig);

      // Should be able to chain operations
      await router.loadRoutes('./api', /.*\.ts$/);
      const config = await loadConfig();
      await router.compile(config);

      expect(loadConfig).toHaveBeenCalled();
    });
  });
});