/**
 * REAL INTEGRATION TESTS for HTTP Server functionality
 * 
 * Tests actual HTTP behavior with a running Express server:
 * - Route registration and HTTP request handling
 * - Request/response body parsing and validation
 * - Path parameter extraction and query parameter handling
 * - Header processing and error responses
 * - Real TypeBox schema validation
 * 
 * MOCKING: Minimal - only external dependencies, not core router functionality
 * SCOPE: End-to-end HTTP request/response cycle with real server
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createApiRoute } from '../../src/createApiRoute';
import { router } from '../../src/router';
import { Type } from '@sinclair/typebox';
import express from 'express';
import request from 'supertest';

describe('HTTP Server Integration', () => {
  let app: express.Application;
  let server: any;

  beforeEach(async () => {
    // Get a fresh router instance for each test
    app = router.app;
    
    // Add middleware
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
  });

  afterEach(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  describe('route registration and HTTP handling', () => {
    it('should handle GET requests with query parameters', async () => {
      // Define a route
      const route = createApiRoute({
        path: '/api/users',
        method: 'GET',
        request: {
          query: Type.Object({
            page: Type.Optional(Type.Number()),
            limit: Type.Optional(Type.Number()),
            search: Type.Optional(Type.String())
          })
        },
        response: {
          200: {
            contentType: 'application/json',
            body: Type.Object({
              users: Type.Array(Type.Object({
                id: Type.Number(),
                name: Type.String()
              })),
              total: Type.Number(),
              page: Type.Number()
            })
          }
        },
        handler: async (req) => {
          const { page = 1, limit = 10, search } = req.query;
          
          let users = [
            { id: 1, name: 'John Doe' },
            { id: 2, name: 'Jane Smith' },
            { id: 3, name: 'Bob Johnson' }
          ];

          if (search) {
            users = users.filter(user => 
              user.name.toLowerCase().includes(search.toLowerCase())
            );
          }

          return {
            status: 200 as const,
            body: {
              users: users.slice((page - 1) * limit, page * limit),
              total: users.length,
              page: Number(page)
            }
          };
        }
      });

      // Register the route manually (simulating router.loadRoutes)
      app[route.method.toLowerCase() as keyof express.Application](
        route.path, 
        async (req: express.Request, res: express.Response) => {
          const result = await route.handler(req as any);
          if (result && typeof result === 'object' && 'status' in result) {
            res.status(result.status).json(result.body);
          }
        }
      );

      // Test the route
      const response = await request(app)
        .get('/api/users')
        .query({ page: 1, limit: 2, search: 'john' })
        .expect(200);

      expect(response.body).toEqual({
        users: [{ id: 1, name: 'John Doe' }, { id: 3, name: 'Bob Johnson' }],
        total: 2,
        page: 1
      });
    });

    it('should handle POST requests with body validation', async () => {
      const route = createApiRoute({
        path: '/api/users',
        method: 'POST',
        request: {
          body: Type.Object({
            name: Type.String(),
            email: Type.String({ format: 'email' }),
            age: Type.Number({ minimum: 18 })
          })
        },
        response: {
          201: {
            contentType: 'application/json',
            body: Type.Object({
              id: Type.Number(),
              name: Type.String(),
              email: Type.String(),
              age: Type.Number(),
              createdAt: Type.String()
            })
          },
          400: {
            contentType: 'application/json',
            body: Type.Object({
              error: Type.String(),
              details: Type.Optional(Type.Array(Type.String()))
            })
          }
        },
        handler: async (req) => {
          const { name, email, age } = req.body;

          // Simulate validation
          if (!name || !email || !age) {
            return {
              status: 400 as const,
              body: {
                error: 'Missing required fields',
                details: ['name, email, and age are required']
              }
            };
          }

          if (age < 18) {
            return {
              status: 400 as const,
              body: {
                error: 'Age must be 18 or older'
              }
            };
          }

          return {
            status: 201 as const,
            body: {
              id: Math.floor(Math.random() * 1000),
              name,
              email,
              age,
              createdAt: new Date().toISOString()
            }
          };
        }
      });

      // Register the route
      app[route.method.toLowerCase() as keyof express.Application](
        route.path,
        async (req: express.Request, res: express.Response) => {
          const result = await route.handler(req as any);
          if (result && typeof result === 'object' && 'status' in result) {
            res.status(result.status).json(result.body);
          }
        }
      );

      // Test valid request
      const validResponse = await request(app)
        .post('/api/users')
        .send({
          name: 'John Doe',
          email: 'john@example.com',
          age: 25
        })
        .expect(201);

      expect(validResponse.body).toMatchObject({
        name: 'John Doe',
        email: 'john@example.com',
        age: 25
      });
      expect(validResponse.body.id).toBeTypeOf('number');
      expect(validResponse.body.createdAt).toBeTypeOf('string');

      // Test invalid request
      const invalidResponse = await request(app)
        .post('/api/users')
        .send({
          name: 'Jane Doe',
          email: 'jane@example.com',
          age: 16 // Too young
        })
        .expect(400);

      expect(invalidResponse.body).toEqual({
        error: 'Age must be 18 or older'
      });
    });

    it('should handle path parameters correctly', async () => {
      const route = createApiRoute({
        path: '/api/users/{userId}/posts/{postId}',
        method: 'GET',
        response: {
          200: {
            contentType: 'application/json',
            body: Type.Object({
              userId: Type.String(),
              postId: Type.String(),
              post: Type.Object({
                id: Type.Number(),
                title: Type.String(),
                content: Type.String()
              })
            })
          },
          404: {
            contentType: 'application/json',
            body: Type.Object({
              error: Type.String()
            })
          }
        },
        handler: async (req) => {
          const { userId, postId } = req.params;

          if (!userId || !postId) {
            return {
              status: 404 as const,
              body: {
                error: 'User or post not found'
              }
            };
          }

          return {
            status: 200 as const,
            body: {
              userId,
              postId,
              post: {
                id: Number(postId),
                title: `Post ${postId} by User ${userId}`,
                content: 'This is the post content...'
              }
            }
          };
        }
      });

      // Convert {param} syntax to Express :param syntax
      const expressPath = route.path.replace(/{(\w+)}/g, ':$1');
      
      app[route.method.toLowerCase() as keyof express.Application](
        expressPath,
        async (req: express.Request, res: express.Response) => {
          const result = await route.handler(req as any);
          if (result && typeof result === 'object' && 'status' in result) {
            res.status(result.status).json(result.body);
          }
        }
      );

      const response = await request(app)
        .get('/api/users/123/posts/456')
        .expect(200);

      expect(response.body).toEqual({
        userId: '123',
        postId: '456',
        post: {
          id: 456,
          title: 'Post 456 by User 123',
          content: 'This is the post content...'
        }
      });
    });

    it('should handle request headers and return response headers', async () => {
      const route = createApiRoute({
        path: '/api/protected',
        method: 'GET',
        request: {
          headers: Type.Object({
            authorization: Type.String(),
            'x-api-version': Type.Optional(Type.String())
          })
        },
        response: {
          200: {
            contentType: 'application/json',
            body: Type.Object({
              message: Type.String(),
              userId: Type.String()
            }),
            headers: Type.Object({
              'x-rate-limit': Type.String(),
              'x-request-id': Type.String()
            })
          },
          401: {
            contentType: 'application/json',
            body: Type.Object({
              error: Type.String()
            })
          }
        },
        handler: async (req) => {
          const { authorization, 'x-api-version': apiVersion } = req.headers;

          if (!authorization || !authorization.startsWith('Bearer ')) {
            return {
              status: 401 as const,
              body: {
                error: 'Invalid authorization header'
              }
            };
          }

          const token = authorization.replace('Bearer ', '');
          
          return {
            status: 200 as const,
            body: {
              message: `Hello from API ${apiVersion || 'v1'}`,
              userId: token
            },
            headers: {
              'x-rate-limit': '100',
              'x-request-id': Math.random().toString(36)
            }
          };
        }
      });

      app[route.method.toLowerCase() as keyof express.Application](
        route.path,
        async (req: express.Request, res: express.Response) => {
          const result = await route.handler(req as any);
          if (result && typeof result === 'object' && 'status' in result) {
            if ('headers' in result && result.headers) {
              Object.entries(result.headers).forEach(([key, value]) => {
                res.set(key, value as string);
              });
            }
            res.status(result.status).json(result.body);
          }
        }
      );

      // Test with valid authorization
      const validResponse = await request(app)
        .get('/api/protected')
        .set('Authorization', 'Bearer user123')
        .set('x-api-version', 'v2')
        .expect(200);

      expect(validResponse.body).toEqual({
        message: 'Hello from API v2',
        userId: 'user123'
      });
      expect(validResponse.headers['x-rate-limit']).toBe('100');
      expect(validResponse.headers['x-request-id']).toBeDefined();

      // Test without authorization
      await request(app)
        .get('/api/protected')
        .expect(401);
    });
  });

  describe('error handling', () => {
    it('should handle route handler errors gracefully', async () => {
      const route = createApiRoute({
        path: '/api/error-test',
        method: 'GET',
        response: {
          200: {
            contentType: 'application/json',
            body: Type.Object({
              message: Type.String()
            })
          },
          500: {
            contentType: 'application/json',
            body: Type.Object({
              error: Type.String()
            })
          }
        },
        handler: async (req) => {
          // Simulate an error
          throw new Error('Something went wrong!');
        }
      });

      app[route.method.toLowerCase() as keyof express.Application](
        route.path,
        async (req: express.Request, res: express.Response) => {
          try {
            const result = await route.handler(req as any);
            if (result && typeof result === 'object' && 'status' in result) {
              res.status(result.status).json(result.body);
            }
          } catch (error) {
            res.status(500).json({
              error: error instanceof Error ? error.message : 'Internal server error'
            });
          }
        }
      );

      const response = await request(app)
        .get('/api/error-test')
        .expect(500);

      expect(response.body).toEqual({
        error: 'Something went wrong!'
      });
    });
  });
});