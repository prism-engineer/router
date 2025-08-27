import { describe, it, expect } from 'vitest';
import { Type } from '@sinclair/typebox';
import { createApiRoute } from '../../../createApiRoute.js';
import { createAuthScheme } from '../../../createAuthScheme.js';

describe('createApiRoute - Route Creation', () => {
  it('should create a basic GET route', () => {
    const route = createApiRoute({
      path: '/api/hello',
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
        return {
          status: 200 as const,
          body: { message: 'Hello, World!' }
        };
      }
    });

    expect(route.path).toBe('/api/hello');
    expect(route.method).toBe('GET');
    expect(route.response).toBeDefined();
    expect(route.handler).toBeInstanceOf(Function);
  });

  it('should create a POST route with request body', () => {
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
            name: Type.String(),
            email: Type.String()
          })
        }
      },
      handler: async (req) => {
        return {
          status: 201 as const,
          body: { id: 1, name: req.body.name, email: req.body.email }
        };
      }
    });

    expect(route.path).toBe('/api/users');
    expect(route.method).toBe('POST');
    expect(route.request?.body).toBeDefined();
    expect(route.response).toBeDefined();
  });

  it('should create route with query parameters', () => {
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
    });

    expect(route.request?.query).toBeDefined();
    expect(route.path).toBe('/api/users');
    expect(route.method).toBe('GET');
  });

  it('should create route with headers', () => {
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
            message: Type.String()
          })
        }
      },
      handler: async (req) => {
        return {
          status: 200 as const,
          body: { message: 'Access granted' }
        };
      }
    });

    expect(route.request?.headers).toBeDefined();
    expect(route.path).toBe('/api/protected');
  });

  it('should create route with authentication', () => {
    const authScheme = createAuthScheme({
      name: 'bearer',
      validate: async (req) => {
        return { user: { id: '1', name: 'John' } };
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
        return {
          status: 200 as const,
          body: { message: 'Authenticated!' }
        };
      }
    });

    expect(route.auth).toBeDefined();
    expect(route.auth).toBe(authScheme);
  });

  it('should create route with multiple auth schemes', () => {
    const bearerAuth = createAuthScheme({
      name: 'bearer',
      validate: async (req) => ({ user: { id: '1' } })
    });

    const apiKeyAuth = createAuthScheme({
      name: 'apiKey',
      validate: async (req) => ({ client: { id: '1' } })
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
        return {
          status: 200 as const,
          body: { message: 'Flexible auth!' }
        };
      }
    });

    expect(Array.isArray(route.auth)).toBe(true);
    expect(route.auth).toHaveLength(2);
  });

  it('should create route with custom content type', () => {
    const route = createApiRoute({
      path: '/api/download',
      method: 'GET',
      response: {
        200: {
          contentType: 'text/plain'
        },
        404: {
          contentType: 'application/json',
          body: Type.Object({
            error: Type.String()
          })
        }
      },
      handler: async (req) => {
        return {
          status: 200 as const,
          custom: (res) => {
            res.send('Hello, World!');
          }
        };
      }
    });

    expect(route.response?.[200]?.contentType).toBe('text/plain');
    expect(route.response?.[404]?.contentType).toBe('application/json');
  });

  it('should create route with response headers', () => {
    const route = createApiRoute({
      path: '/api/with-headers',
      method: 'GET',
      response: {
        200: {
          contentType: 'application/json',
          body: Type.Object({
            message: Type.String()
          }),
          headers: Type.Object({
            'x-custom-header': Type.String(),
            'x-optional-header': Type.Optional(Type.String())
          })
        }
      },
      handler: async (req) => {
        return {
          status: 200 as const,
          body: { message: 'Hello!' },
          headers: { 'x-custom-header': 'custom-value' }
        };
      }
    });

    expect(route.response?.[200]?.headers).toBeDefined();
  });

  it('should create route with all request and response options', () => {
    const authScheme = createAuthScheme({
      name: 'bearer',
      validate: async (req) => ({ user: { id: '1' } })
    });

    const route = createApiRoute({
      path: '/api/complex/{id}',
      method: 'PUT',
      request: {
        body: Type.Object({
          name: Type.String(),
          data: Type.Object({
            value: Type.Number()
          })
        }),
        query: Type.Object({
          version: Type.Optional(Type.String())
        }),
        headers: Type.Object({
          authorization: Type.String(),
          'content-type': Type.Literal('application/json')
        })
      },
      response: {
        200: {
          contentType: 'application/json',
          body: Type.Object({
            id: Type.String(),
            name: Type.String(),
            updated: Type.Boolean()
          }),
          headers: Type.Object({
            'x-updated-at': Type.String()
          })
        },
        400: {
          contentType: 'application/json',
          body: Type.Object({
            error: Type.String(),
            details: Type.Array(Type.String())
          })
        }
      },
      auth: authScheme,
      handler: async (req) => {
        return {
          status: 200 as const,
          body: { id: req.params.id, name: req.body.name, updated: true },
          headers: { 'x-updated-at': new Date().toISOString() }
        };
      }
    });

    expect(route.path).toBe('/api/complex/{id}');
    expect(route.method).toBe('PUT');
    expect(route.request?.body).toBeDefined();
    expect(route.request?.query).toBeDefined();
    expect(route.request?.headers).toBeDefined();
    expect(route.response?.[200]).toBeDefined();
    expect(route.response?.[400]).toBeDefined();
    expect(route.auth).toBeDefined();
  });
});