import { describe, it, expect, vi, beforeEach } from 'vitest';
import { router } from '../../src/router';
import { createApiRoute } from '../../src/createApiRoute';
import { loadConfig } from '../../src/config';
import { Type } from '@sinclair/typebox';

vi.mock('../../src/config');

describe('Full Workflow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('route loading and compilation', () => {
    it('should load routes and compile client', async () => {
      const mockConfig = {
        outputDir: './generated',
        clientName: 'ApiClient',
        format: 'typescript' as const,
        baseUrl: 'http://localhost:3000',
        includeTypes: true
      };

      vi.mocked(loadConfig).mockResolvedValue(mockConfig);

      // Load routes
      await router.loadRoutes(/api\/.*\.ts$/);

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
          outputs: {
            body: Type.Object({
              message: Type.String()
            })
          },
          handler: (req, res) => res.json({ message: 'Hello' })
        }),

        // POST with body
        createApiRoute({
          path: '/api/users',
          method: 'POST',
          inputs: {
            body: Type.Object({
              name: Type.String(),
              email: Type.String()
            })
          },
          outputs: {
            body: Type.Object({
              id: Type.Number(),
              name: Type.String(),
              email: Type.String()
            })
          },
          handler: (req, res) => res.json({ id: 1, name: req.body.name, email: req.body.email })
        }),

        // GET with query parameters
        createApiRoute({
          path: '/api/users',
          method: 'GET',
          inputs: {
            query: Type.Object({
              page: Type.Optional(Type.Number()),
              limit: Type.Optional(Type.Number())
            })
          },
          outputs: {
            body: Type.Array(Type.Object({
              id: Type.Number(),
              name: Type.String()
            }))
          },
          handler: (req, res) => res.json([{ id: 1, name: 'John' }])
        }),

        // GET with path parameters
        createApiRoute({
          path: '/api/users/{userId}',
          method: 'GET',
          outputs: {
            body: Type.Object({
              id: Type.Number(),
              name: Type.String()
            })
          },
          handler: (req, res) => res.json({ id: 1, name: 'John' })
        }),

        // Route with headers
        createApiRoute({
          path: '/api/protected',
          method: 'GET',
          inputs: {
            headers: Type.Object({
              authorization: Type.String()
            })
          },
          outputs: {
            body: Type.Object({
              data: Type.String()
            })
          },
          handler: (req, res) => res.json({ data: 'protected' })
        }),

        // Route with authentication
        createApiRoute({
          path: '/api/secure',
          method: 'GET',
          outputs: {
            body: Type.Object({
              secret: Type.String()
            })
          },
          auth: { required: true, type: 'bearer' },
          handler: (req, res) => res.json({ secret: 'top secret' })
        })
      ];

      // All routes should be valid
      routes.forEach(route => {
        expect(route.path).toBeDefined();
        expect(route.method).toBeDefined();
        expect(route.handler).toBeDefined();
      });
    });
  });

  describe('error handling', () => {
    it('should handle route loading errors', async () => {
      const invalidPattern = null as any;
      
      await expect(router.loadRoutes(invalidPattern)).rejects.toThrow();
    });

    it('should handle compilation errors', async () => {
      const invalidConfig = null as any;
      
      await expect(router.compile(invalidConfig)).rejects.toThrow();
    });

    it('should handle config loading errors', async () => {
      vi.mocked(loadConfig).mockRejectedValue(new Error('Config not found'));
      
      await expect(loadConfig()).rejects.toThrow('Config not found');
    });
  });

  describe('multiple route patterns', () => {
    it('should handle multiple route patterns', async () => {
      const patterns = [
        /api\/v1\/.*\.ts$/,
        /api\/v2\/.*\.ts$/,
        /admin\/.*\.ts$/
      ];

      for (const pattern of patterns) {
        await expect(router.loadRoutes(pattern)).resolves.not.toThrow();
      }
    });

    it('should support chaining operations', async () => {
      const mockConfig = {
        outputDir: './generated',
        clientName: 'ApiClient',
        format: 'typescript' as const
      };

      vi.mocked(loadConfig).mockResolvedValue(mockConfig);

      // Should be able to chain operations
      await router.loadRoutes(/api\/.*\.ts$/);
      const config = await loadConfig();
      await router.compile(config);

      expect(loadConfig).toHaveBeenCalled();
    });
  });
});