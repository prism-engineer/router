/**
 * AUTHENTICATION FEATURE TESTS
 * 
 * Tests the authentication scheme system:
 * - createAuthScheme function for defining reusable auth
 * - Integration with createApiRoute for auth-protected routes
 * - Auth validation middleware execution
 * - Auth context injection into request handlers
 * - Multiple auth schemes (OR logic)
 * 
 * MOCKING: None - tests actual auth validation and middleware
 * SCOPE: Authentication scheme definition and route protection
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createApiRoute } from '../../src/createApiRoute';
import { createAuthScheme } from '../../src/createAuthScheme';
import { Type } from '@sinclair/typebox';
import { router } from '../../src/router';
import express from 'express';
import request from 'supertest';

describe('Authentication System', () => {
  let app: express.Application;
  let server: any;

  beforeEach(() => {
    app = router.app;
    app.use(express.json());
  });

  afterEach(() => {
    if (server) {
      server.close();
    }
    vi.restoreAllMocks();
  });

  describe('createAuthScheme', () => {
    it('should create a bearer token auth scheme', () => {
      const bearerAuth = createAuthScheme({
        type: 'bearer',
        validate: async (token: string) => {
          if (token === 'valid-token') {
            return { user: { id: 1, name: 'John' }, scopes: ['read'] };
          }
          throw new Error('Invalid token');
        }
      });

      expect(bearerAuth).toHaveProperty('type', 'bearer');
      expect(bearerAuth).toHaveProperty('validate');
      expect(typeof bearerAuth.validate).toBe('function');
    });

    it('should create an API key auth scheme', () => {
      const apiKeyAuth = createAuthScheme({
        type: 'apiKey',
        in: 'header',
        name: 'x-api-key',
        validate: async (key: string) => {
          if (key === 'valid-key') {
            return { client: { id: 'abc123' }, scopes: ['read', 'write'] };
          }
          throw new Error('Invalid API key');
        }
      });

      expect(apiKeyAuth).toHaveProperty('type', 'apiKey');
      expect(apiKeyAuth).toHaveProperty('in', 'header');
      expect(apiKeyAuth).toHaveProperty('name', 'x-api-key');
      expect(typeof apiKeyAuth.validate).toBe('function');
    });

    it('should create a custom auth scheme', () => {
      const customAuth = createAuthScheme({
        type: 'custom',
        extract: (req: express.Request) => req.headers['x-custom-auth'] as string,
        validate: async (value: string) => {
          return { customData: value };
        }
      });

      expect(customAuth).toHaveProperty('type', 'custom');
      expect(typeof customAuth.extract).toBe('function');
      expect(typeof customAuth.validate).toBe('function');
    });
  });

  describe('route authentication', () => {
    it('should protect route with single auth scheme', async () => {
      const bearerAuth = createAuthScheme({
        type: 'bearer',
        validate: async (token: string) => {
          if (token === 'valid-token') {
            return { user: { id: 1, name: 'John' } };
          }
          throw new Error('Invalid token');
        }
      });

      const protectedRoute = createApiRoute({
        path: '/api/protected',
        method: 'GET',
        auth: bearerAuth,
        response: {
          200: {
            body: Type.Object({
              message: Type.String(),
              userId: Type.Number()
            })
          },
          401: {
            body: Type.Object({
              error: Type.String()
            })
          }
        },
        handler: async (req) => {
          return {
            status: 200 as const,
            body: {
              message: 'Access granted',
              userId: req.auth.user.id
            }
          };
        }
      });

      router.registerRoute(protectedRoute);
      server = app.listen(0);

      // Test without auth - should fail
      await request(app)
        .get('/api/protected')
        .expect(401);

      // Test with invalid auth - should fail
      await request(app)
        .get('/api/protected')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      // Test with valid auth - should succeed
      const response = await request(app)
        .get('/api/protected')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toEqual({
        message: 'Access granted',
        userId: 1
      });
    });

    it('should support multiple auth schemes with OR logic', async () => {
      const bearerAuth = createAuthScheme({
        type: 'bearer',
        validate: async (token: string) => {
          if (token === 'bearer-token') {
            return { user: { id: 1, type: 'user' } };
          }
          throw new Error('Invalid bearer token');
        }
      });

      const apiKeyAuth = createAuthScheme({
        type: 'apiKey',
        in: 'header',
        name: 'x-api-key',
        validate: async (key: string) => {
          if (key === 'api-key-123') {
            return { client: { id: 'abc123', type: 'service' } };
          }
          throw new Error('Invalid API key');
        }
      });

      const flexibleRoute = createApiRoute({
        path: '/api/flexible',
        method: 'GET',
        auth: [bearerAuth, apiKeyAuth], // Either auth scheme works
        response: {
          200: {
            body: Type.Object({
              authType: Type.String(),
              data: Type.String()
            })
          }
        },
        handler: async (req) => {
          const authType = req.auth.user ? 'user' : 'service';
          return {
            status: 200 as const,
            body: {
              authType,
              data: 'Flexible access granted'
            }
          };
        }
      });

      router.registerRoute(flexibleRoute);
      server = app.listen(0);

      // Test with bearer token
      const bearerResponse = await request(app)
        .get('/api/flexible')
        .set('Authorization', 'Bearer bearer-token')
        .expect(200);

      expect(bearerResponse.body.authType).toBe('user');

      // Test with API key
      const apiKeyResponse = await request(app)
        .get('/api/flexible')
        .set('x-api-key', 'api-key-123')
        .expect(200);

      expect(apiKeyResponse.body.authType).toBe('service');

      // Test without any auth - should fail
      await request(app)
        .get('/api/flexible')
        .expect(401);
    });

    it('should inject auth context into request handler', async () => {
      const mockValidate = vi.fn().mockResolvedValue({
        user: { id: 42, name: 'Test User', permissions: ['read', 'write'] },
        scopes: ['read', 'write']
      });

      const bearerAuth = createAuthScheme({
        type: 'bearer',
        validate: mockValidate
      });

      const contextRoute = createApiRoute({
        path: '/api/context',
        method: 'GET',
        auth: bearerAuth,
        response: {
          200: {
            body: Type.Object({
              user: Type.Object({
                id: Type.Number(),
                name: Type.String()
              }),
              scopes: Type.Array(Type.String())
            })
          }
        },
        handler: async (req) => {
          // Auth context should be available
          expect(req.auth).toBeDefined();
          expect(req.auth.user).toBeDefined();
          expect(req.auth.scopes).toBeDefined();

          return {
            status: 200 as const,
            body: {
              user: req.auth.user,
              scopes: req.auth.scopes
            }
          };
        }
      });

      router.registerRoute(contextRoute);
      server = app.listen(0);

      const response = await request(app)
        .get('/api/context')
        .set('Authorization', 'Bearer test-token')
        .expect(200);

      expect(mockValidate).toHaveBeenCalledWith('test-token');
      expect(response.body).toEqual({
        user: { id: 42, name: 'Test User', permissions: ['read', 'write'] },
        scopes: ['read', 'write']
      });
    });

    it('should handle auth validation errors gracefully', async () => {
      const faultyAuth = createAuthScheme({
        type: 'bearer',
        validate: async (token: string) => {
          throw new Error('Auth service unavailable');
        }
      });

      const errorRoute = createApiRoute({
        path: '/api/error',
        method: 'GET',
        auth: faultyAuth,
        response: {
          200: { body: Type.Object({ success: Type.Boolean() }) },
          401: { body: Type.Object({ error: Type.String() }) }
        },
        handler: async () => ({
          status: 200 as const,
          body: { success: true }
        })
      });

      router.registerRoute(errorRoute);
      server = app.listen(0);

      const response = await request(app)
        .get('/api/error')
        .set('Authorization', 'Bearer any-token')
        .expect(401);

      expect(response.body.error).toContain('Auth service unavailable');
    });
  });

  describe('auth extraction', () => {
    it('should extract bearer token from Authorization header', async () => {
      const bearerAuth = createAuthScheme({
        type: 'bearer',
        validate: async (token: string) => {
          expect(token).toBe('extracted-token');
          return { user: { id: 1 } };
        }
      });

      const route = createApiRoute({
        path: '/api/extract',
        method: 'GET',
        auth: bearerAuth,
        response: { 200: { body: Type.Object({ success: Type.Boolean() }) } },
        handler: async () => ({ status: 200 as const, body: { success: true } })
      });

      router.registerRoute(route);
      server = app.listen(0);

      await request(app)
        .get('/api/extract')
        .set('Authorization', 'Bearer extracted-token')
        .expect(200);
    });

    it('should extract API key from custom header', async () => {
      const apiKeyAuth = createAuthScheme({
        type: 'apiKey',
        in: 'header',
        name: 'x-custom-key',
        validate: async (key: string) => {
          expect(key).toBe('custom-key-value');
          return { client: { id: 'test' } };
        }
      });

      const route = createApiRoute({
        path: '/api/custom-key',
        method: 'GET',
        auth: apiKeyAuth,
        response: { 200: { body: Type.Object({ success: Type.Boolean() }) } },
        handler: async () => ({ status: 200 as const, body: { success: true } })
      });

      router.registerRoute(route);
      server = app.listen(0);

      await request(app)
        .get('/api/custom-key')
        .set('x-custom-key', 'custom-key-value')
        .expect(200);
    });

    it('should support custom extraction logic', async () => {
      const customAuth = createAuthScheme({
        type: 'custom',
        extract: (req: express.Request) => {
          // Custom extraction from multiple sources
          return req.headers['x-signature'] as string || req.query.token as string;
        },
        validate: async (value: string) => {
          expect(value).toBe('query-token');
          return { custom: true };
        }
      });

      const route = createApiRoute({
        path: '/api/custom-extract',
        method: 'GET',
        auth: customAuth,
        response: { 200: { body: Type.Object({ success: Type.Boolean() }) } },
        handler: async () => ({ status: 200 as const, body: { success: true } })
      });

      router.registerRoute(route);
      server = app.listen(0);

      await request(app)
        .get('/api/custom-extract?token=query-token')
        .expect(200);
    });
  });
});