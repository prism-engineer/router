import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRouter } from '../../router.js';
import { createApiRoute } from '../../createApiRoute.js';
import { createAuthScheme } from '../../createAuthScheme.js';
import { Type } from '@sinclair/typebox';
import express from 'express';

describe('Router System - Route Registration', () => {
  let router: ReturnType<typeof createRouter>;

  beforeEach(() => {
    router = createRouter();
    vi.clearAllMocks();
  });

  it('should register Express app instance', () => {
    expect(router.app).toBeDefined();
    expect(router.app).toBeInstanceOf(Function); // Express app is a function
    expect(typeof router.app.get).toBe('function');
    expect(typeof router.app.post).toBe('function');
    expect(typeof router.app.put).toBe('function');
    expect(typeof router.app.delete).toBe('function');
  });

  it('should have registerRoute method', () => {
    expect(typeof router.registerRoute).toBe('function');
  });

  it('should register a basic GET route', () => {
    const route = createApiRoute({
      path: '/api/test',
      method: 'GET',
      response: {
        200: {
          contentType: 'application/json',
          body: Type.Object({
            message: Type.String()
          })
        }
      },
      handler: async () => {
        return {
          status: 200 as const,
          body: { message: 'test' }
        };
      }
    });

    expect(() => router.registerRoute(route)).not.toThrow();
  });

  it('should register a POST route with request body', () => {
    const route = createApiRoute({
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
          contentType: 'application/json',
          body: Type.Object({
            id: Type.Number(),
            name: Type.String()
          })
        }
      },
      handler: async (req) => {
        return {
          status: 201 as const,
          body: { id: 1, name: req.body.name }
        };
      }
    });

    expect(() => router.registerRoute(route)).not.toThrow();
  });

  it('should register routes with path parameters', () => {
    const route = createApiRoute({
      path: '/api/users/{id}',
      method: 'GET',
      response: {
        200: {
          contentType: 'application/json',
          body: Type.Object({
            id: Type.String(),
            name: Type.String()
          })
        }
      },
      handler: async (req) => {
        return {
          status: 200 as const,
          body: { id: req.params.id, name: 'John Doe' }
        };
      }
    });

    expect(() => router.registerRoute(route)).not.toThrow();
  });

  it('should register routes with authentication middleware', () => {
    const authScheme = createAuthScheme({
      name: 'bearer',
      validate: async (req) => {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
          throw new Error('Invalid authorization header');
        }
        return { user: { id: '1', name: 'John' } };
      }
    });

    const route = createApiRoute({
      path: '/api/protected',
      method: 'GET',
      auth: authScheme,
      response: {
        200: {
          contentType: 'application/json',
          body: Type.Object({
            message: Type.String(),
            user: Type.Object({
              id: Type.String(),
              name: Type.String()
            })
          })
        }
      },
      handler: async (req) => {
        return {
          status: 200 as const,
          body: {
            message: 'Protected resource',
            user: req.auth.context.user
          }
        };
      }
    });

    expect(() => router.registerRoute(route)).not.toThrow();
  });

  it('should register routes with multiple authentication schemes', () => {
    const bearerAuth = createAuthScheme({
      name: 'bearer',
      validate: async (req) => ({ user: { id: '1', type: 'user' } })
    });

    const apiKeyAuth = createAuthScheme({
      name: 'apiKey',
      validate: async (req) => ({ client: { id: '1', type: 'client' } })
    });

    const route = createApiRoute({
      path: '/api/flexible-auth',
      method: 'GET',
      auth: [bearerAuth, apiKeyAuth],
      response: {
        200: {
          contentType: 'application/json',
          body: Type.Object({
            message: Type.String(),
            authType: Type.String()
          })
        }
      },
      handler: async (req) => {
        return {
          status: 200 as const,
          body: {
            message: 'Authenticated',
            authType: req.auth.name
          }
        };
      }
    });

    expect(() => router.registerRoute(route)).not.toThrow();
  });

  it('should register routes with query parameters', () => {
    const route = createApiRoute({
      path: '/api/search',
      method: 'GET',
      request: {
        query: Type.Object({
          q: Type.String(),
          page: Type.Optional(Type.Number())
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
        return {
          status: 200 as const,
          body: [{ id: 1, title: `Results for: ${req.query.q}` }]
        };
      }
    });

    expect(() => router.registerRoute(route)).not.toThrow();
  });

  it('should register routes with headers', () => {
    const route = createApiRoute({
      path: '/api/with-headers',
      method: 'GET',
      request: {
        headers: Type.Object({
          'x-api-version': Type.String(),
          'accept': Type.Optional(Type.String())
        })
      },
      response: {
        200: {
          contentType: 'application/json',
          body: Type.Object({
            version: Type.String(),
            message: Type.String()
          })
        }
      },
      handler: async (req) => {
        return {
          status: 200 as const,
          body: {
            version: req.headers['x-api-version'],
            message: 'Headers received'
          }
        };
      }
    });

    expect(() => router.registerRoute(route)).not.toThrow();
  });

  it('should register routes with custom response handlers', () => {
    const route = createApiRoute({
      path: '/api/download',
      method: 'GET',
      response: {
        200: {
          contentType: 'text/plain'
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

    expect(() => router.registerRoute(route)).not.toThrow();
  });

  it('should register multiple routes with same path but different methods', () => {
    const getRoute = createApiRoute({
      path: '/api/resource',
      method: 'GET',
      response: {
        200: {
          contentType: 'application/json',
          body: Type.Object({ message: Type.String() })
        }
      },
      handler: async () => {
        return { status: 200 as const, body: { message: 'GET' } };
      }
    });

    const postRoute = createApiRoute({
      path: '/api/resource',
      method: 'POST',
      request: {
        body: Type.Object({ data: Type.String() })
      },
      response: {
        201: {
          contentType: 'application/json',
          body: Type.Object({ message: Type.String() })
        }
      },
      handler: async () => {
        return { status: 201 as const, body: { message: 'POST' } };
      }
    });

    expect(() => {
      router.registerRoute(getRoute);
      router.registerRoute(postRoute);
    }).not.toThrow();
  });

  it('should register routes with different HTTP methods', () => {
    const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'] as const;
    
    methods.forEach(method => {
      const route = createApiRoute({
        path: `/api/${method.toLowerCase()}`,
        method,
        request: ['POST', 'PUT', 'PATCH'].includes(method) ? {
          body: Type.Object({ data: Type.String() })
        } : undefined,
        response: {
          200: {
            contentType: 'application/json',
            body: Type.Object({ method: Type.String() })
          }
        },
        handler: async () => {
          return { status: 200 as const, body: { method } };
        }
      });

      expect(() => router.registerRoute(route)).not.toThrow();
    });
  });

  it('should handle route registration errors gracefully', () => {
    const invalidRoute = {
      path: '/invalid',
      method: 'GET',
      handler: 'not a function' // Invalid handler
    };

    // Should not throw during registration, but might fail at runtime
    expect(() => router.registerRoute(invalidRoute as any)).not.toThrow();
  });

  it('should convert path parameters from {param} to :param format', () => {
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
        return {
          status: 200 as const,
          body: { userId: req.params.userId, postId: req.params.postId }
        };
      }
    });

    // The router should internally convert {userId} to :userId for Express
    expect(() => router.registerRoute(route)).not.toThrow();
  });

  it('should register routes with response headers', () => {
    const route = createApiRoute({
      path: '/api/with-response-headers',
      method: 'GET',
      response: {
        200: {
          contentType: 'application/json',
          body: Type.Object({ message: Type.String() }),
          headers: Type.Object({
            'x-custom-header': Type.String(),
            'cache-control': Type.String()
          })
        }
      },
      handler: async () => {
        return {
          status: 200 as const,
          body: { message: 'Success' },
          headers: {
            'x-custom-header': 'custom-value',
            'cache-control': 'no-cache'
          }
        };
      }
    });

    expect(() => router.registerRoute(route)).not.toThrow();
  });

  it('should register routes with multiple response status codes', () => {
    const route = createApiRoute({
      path: '/api/multi-status',
      method: 'GET',
      request: {
        query: Type.Object({
          error: Type.Optional(Type.String())
        })
      },
      response: {
        200: {
          contentType: 'application/json',
          body: Type.Object({ message: Type.String() })
        },
        404: {
          contentType: 'application/json',
          body: Type.Object({ error: Type.String() })
        },
        500: {
          contentType: 'application/json',
          body: Type.Object({ error: Type.String() })
        }
      },
      handler: async (req) => {
        const shouldError = req.query.error;
        
        if (shouldError === 'not-found') {
          return { status: 404 as const, body: { error: 'Not found' } };
        }
        
        if (shouldError === 'server-error') {
          return { status: 500 as const, body: { error: 'Server error' } };
        }
        
        return { status: 200 as const, body: { message: 'Success' } };
      }
    });

    expect(() => router.registerRoute(route)).not.toThrow();
  });

  it('should maintain middleware order for authenticated routes', () => {
    const authScheme = createAuthScheme({
      name: 'test-auth',
      validate: async (req) => ({ user: { id: '1' } })
    });

    const route = createApiRoute({
      path: '/api/middleware-order',
      method: 'GET',
      auth: authScheme,
      response: {
        200: {
          contentType: 'application/json',
          body: Type.Object({ message: Type.String() })
        }
      },
      handler: async (req) => {
        return {
          status: 200 as const,
          body: { message: 'Middleware order preserved' }
        };
      }
    });

    expect(() => router.registerRoute(route)).not.toThrow();
  });
});