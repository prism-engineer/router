import { describe, it, expect } from 'vitest';
import { Type } from '@sinclair/typebox';
import { createApiRoute } from '../../../createApiRoute.js';
import { createAuthScheme } from '../../../createAuthScheme.js';

describe('createApiRoute - Type Safety', () => {
  it('should infer correct path parameter types', () => {
    const route = createApiRoute({
      path: '/api/users/{userId}/posts/{postId}',
      method: 'GET',
      response: {
        200: {
          contentType: 'application/json',
          body: Type.Object({
            userId: Type.String(),
            postId: Type.String()
          })
        }
      },
      handler: async (req) => {
        // Type assertion to verify TypeScript inference
        const userId: string = req.params.userId;
        const postId: string = req.params.postId;
        
        return {
          status: 200 as const,
          body: { userId, postId }
        };
      }
    });

    expect(route.path).toBe('/api/users/{userId}/posts/{postId}');
    expect(typeof route.handler).toBe('function');
  });

  it('should infer correct request body types', () => {
    const route = createApiRoute({
      path: '/api/users',
      method: 'POST',
      request: {
        body: Type.Object({
          name: Type.String(),
          age: Type.Number(),
          email: Type.String(),
          isActive: Type.Boolean()
        })
      },
      response: {
        201: {
          contentType: 'application/json',
          body: Type.Object({
            id: Type.Number(),
            name: Type.String()
          })
        }
      },
      handler: async (req) => {
        // Type assertions to verify TypeScript inference
        const name: string = req.body.name;
        const age: number = req.body.age;
        const email: string = req.body.email;
        const isActive: boolean = req.body.isActive;
        
        return {
          status: 201 as const,
          body: { id: 1, name }
        };
      }
    });

    expect(route.request?.body).toBeDefined();
  });

  it('should infer correct query parameter types', () => {
    const route = createApiRoute({
      path: '/api/search',
      method: 'GET',
      request: {
        query: Type.Object({
          q: Type.String(),
          page: Type.Optional(Type.Number()),
          limit: Type.Optional(Type.Number()),
          sortBy: Type.Optional(Type.Union([
            Type.Literal('name'),
            Type.Literal('date'),
            Type.Literal('relevance')
          ]))
        })
      },
      response: {
        200: {
          contentType: 'application/json',
          body: Type.Array(Type.Object({
            id: Type.Number(),
            title: Type.String()
          }))
        }
      },
      handler: async (req) => {
        // Type assertions to verify TypeScript inference
        const q: string = req.query.q;
        const page: number | undefined = req.query.page;
        const limit: number | undefined = req.query.limit;
        const sortBy: 'name' | 'date' | 'relevance' | undefined = req.query.sortBy;
        
        return {
          status: 200 as const,
          body: [{ id: 1, title: 'Test' }]
        };
      }
    });

    expect(route.request?.query).toBeDefined();
  });

  it('should infer correct header types', () => {
    const route = createApiRoute({
      path: '/api/protected',
      method: 'GET',
      request: {
        headers: Type.Object({
          authorization: Type.String(),
          'x-api-version': Type.Literal('v1'),
          'x-custom-header': Type.Optional(Type.String())
        })
      },
      response: {
        200: {
          contentType: 'application/json',
          body: Type.Object({
            message: Type.String()
          })
        }
      },
      handler: async (req) => {
        // Type assertions to verify TypeScript inference
        const authorization: string = req.headers.authorization;
        const apiVersion: 'v1' = req.headers['x-api-version'];
        const customHeader: string | undefined = req.headers['x-custom-header'];
        
        return {
          status: 200 as const,
          body: { message: 'Success' }
        };
      }
    });

    expect(route.request?.headers).toBeDefined();
  });

  it('should infer correct auth context types with single auth scheme', () => {
    const authScheme = createAuthScheme({
      name: 'bearer',
      validate: async (req) => {
        return { 
          user: { id: 'user123', name: 'John Doe', permissions: ['read', 'write'] },
          scopes: ['api:read', 'api:write']
        };
      }
    });

    const route = createApiRoute({
      path: '/api/secure',
      method: 'GET',
      auth: authScheme,
      response: {
        200: {
          contentType: 'application/json',
          body: Type.Object({
            message: Type.String()
          })
        }
      },
      handler: async (req) => {
        // Type assertions to verify TypeScript inference
        const schemeName: 'bearer' = req.auth.name;
        const userId: string = req.auth.context.user.id;
        const userName: string = req.auth.context.user.name;
        const permissions: string[] = req.auth.context.user.permissions;
        const scopes: string[] = req.auth.context.scopes;
        
        return {
          status: 200 as const,
          body: { message: `Hello, ${userName}!` }
        };
      }
    });

    expect(route.auth).toBeDefined();
  });

  it('should infer correct auth context types with multiple auth schemes', () => {
    const bearerAuth = createAuthScheme({
      name: 'bearer',
      validate: async (req) => ({ user: { id: 'user123', role: 'admin' } })
    });

    const apiKeyAuth = createAuthScheme({
      name: 'apiKey',
      validate: async (req) => ({ client: { id: 'client456', permissions: ['read'] } })
    });

    const route = createApiRoute({
      path: '/api/flexible',
      method: 'GET',
      auth: [bearerAuth, apiKeyAuth],
      response: {
        200: {
          contentType: 'application/json',
          body: Type.Object({
            message: Type.String()
          })
        }
      },
      handler: async (req) => {
        // Type assertions to verify TypeScript inference with union types
        if (req.auth.name === 'bearer') {
          const userId: string = req.auth.context.user.id;
          const role: string = req.auth.context.user.role;
        } else if (req.auth.name === 'apiKey') {
          const clientId: string = req.auth.context.client.id;
          const permissions: string[] = req.auth.context.client.permissions;
        }
        
        return {
          status: 200 as const,
          body: { message: 'Flexible auth success!' }
        };
      }
    });

    expect(Array.isArray(route.auth)).toBe(true);
  });

  it('should infer correct response types for different status codes', () => {
    const route = createApiRoute({
      path: '/api/users/{id}',
      method: 'GET',
      response: {
        200: {
          contentType: 'application/json',
          body: Type.Object({
            id: Type.Number(),
            name: Type.String(),
            email: Type.String()
          })
        },
        404: {
          contentType: 'application/json',
          body: Type.Object({
            error: Type.String(),
            code: Type.Number()
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
        const id = parseInt(req.params.id);
        
        if (id === 404) {
          return {
            status: 404 as const,
            body: { error: 'User not found', code: 404 }
          };
        }
        
        if (id === 500) {
          return {
            status: 500 as const,
            body: { error: 'Internal server error' }
          };
        }
        
        return {
          status: 200 as const,
          body: { id, name: 'John Doe', email: 'john@example.com' }
        };
      }
    });

    expect(route.response?.[200]).toBeDefined();
    expect(route.response?.[404]).toBeDefined();
    expect(route.response?.[500]).toBeDefined();
  });

  it('should handle empty request types when no request schema is provided', () => {
    const route = createApiRoute({
      path: '/api/simple',
      method: 'GET',
      response: {
        200: {
          contentType: 'application/json',
          body: Type.Object({
            message: Type.String()
          })
        }
      },
      handler: async (req) => {
        // Type assertions to verify empty types
        const body: {} = req.body;
        const query: {} = req.query;
        const headers: {} = req.headers;
        const params: {} = req.params;
        
        return {
          status: 200 as const,
          body: { message: 'Simple route' }
        };
      }
    });

    expect(route.request).toBeUndefined();
  });

  it('should handle custom response types', () => {
    const route = createApiRoute({
      path: '/api/download',
      method: 'GET',
      response: {
        200: {
          contentType: 'application/octet-stream'
        },
        404: {
          contentType: 'application/json',
          body: Type.Object({
            error: Type.String()
          })
        }
      },
      handler: async () => {
        return {
          status: 200 as const,
          custom: (res) => {
            res.setHeader('Content-Disposition', 'attachment; filename="test.txt"');
            res.send('File content');
          }
        };
      }
    });

    expect(route.response?.[200]?.contentType).toBe('application/octet-stream');
    expect(route.response?.[404]?.contentType).toBe('application/json');
  });
});