import { describe, it, expect } from 'vitest';
import { Type } from '@sinclair/typebox';
import { createApiRoute } from '../../../src/createApiRoute';

describe('createApiRoute - Request/Response Schema Validation', () => {
  it('should validate TypeBox request body schema', () => {
    const bodySchema = Type.Object({
      name: Type.String(),
      age: Type.Number(),
      email: Type.String({ format: 'email' }),
      metadata: Type.Optional(Type.Object({
        tags: Type.Array(Type.String()),
        priority: Type.Union([Type.Literal('low'), Type.Literal('medium'), Type.Literal('high')])
      }))
    });

    const route = createApiRoute({
      path: '/api/users',
      method: 'POST',
      request: {
        body: bodySchema
      },
      response: {
        201: {
          contentType: 'application/json',
          body: Type.Object({
            id: Type.Number(),
            message: Type.String()
          })
        }
      },
      handler: async (_req) => {
        return {
          status: 201 as const,
          body: { id: 1, message: 'User created' }
        };
      }
    });

    expect(route.request?.body).toBe(bodySchema);
    expect(route.request?.body?.type).toBe('object');
    expect(route.request?.body?.properties).toBeDefined();
    expect(route.request?.body?.properties?.name).toBeDefined();
    expect(route.request?.body?.properties?.age).toBeDefined();
    expect(route.request?.body?.properties.email).toBeDefined();
  });

  it('should validate TypeBox query parameter schema', () => {
    const querySchema = Type.Object({
      search: Type.String(),
      page: Type.Optional(Type.Number({ minimum: 1 })),
      limit: Type.Optional(Type.Number({ minimum: 1, maximum: 100 })),
      sortBy: Type.Optional(Type.Union([
        Type.Literal('name'),
        Type.Literal('date'),
        Type.Literal('relevance')
      ])),
      filters: Type.Optional(Type.Array(Type.String()))
    });

    const route = createApiRoute({
      path: '/api/search',
      method: 'GET',
      request: {
        query: querySchema
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
      handler: async (_req) => {
        return {
          status: 200 as const,
          body: [{ id: 1, title: 'Result' }]
        };
      }
    });

    expect(route.request?.query).toBe(querySchema);
    expect(route.request?.query?.type).toBe('object');
    expect(route.request?.query?.properties.search).toBeDefined();
    expect(route.request?.query?.properties.page).toBeDefined();
    expect(route.request?.query?.properties.limit).toBeDefined();
  });

  it('should validate TypeBox header schema', () => {
    const headerSchema = Type.Object({
      authorization: Type.String({ pattern: '^Bearer .+' }),
      'x-api-version': Type.Union([Type.Literal('v1'), Type.Literal('v2')]),
      'x-request-id': Type.String({ format: 'uuid' }),
      'x-client-version': Type.Optional(Type.String()),
      'accept': Type.Optional(Type.Literal('application/json'))
    });

    const route = createApiRoute({
      path: '/api/protected',
      method: 'GET',
      request: {
        headers: headerSchema
      },
      response: {
        200: {
          contentType: 'application/json',
          body: Type.Object({
            message: Type.String()
          })
        }
      },
      handler: async (_req) => {
        return {
          status: 200 as const,
          body: { message: 'Access granted' }
        };
      }
    });

    expect(route.request?.headers).toBe(headerSchema);
    expect(route.request?.headers?.type).toBe('object');
    expect(route.request?.headers?.properties.authorization).toBeDefined();
    expect(route.request?.headers?.properties['x-api-version']).toBeDefined();
  });

  it('should validate TypeBox response body schema', () => {
    const responseSchema = Type.Object({
      user: Type.Object({
        id: Type.Number(),
        name: Type.String(),
        email: Type.String(),
        profile: Type.Object({
          avatar: Type.Optional(Type.String()),
          bio: Type.Optional(Type.String()),
          location: Type.Optional(Type.String())
        })
      }),
      metadata: Type.Object({
        createdAt: Type.String(),
        updatedAt: Type.String(),
        version: Type.Number()
      })
    });

    const route = createApiRoute({
      path: '/api/users/{id}',
      method: 'GET',
      response: {
        200: {
          contentType: 'application/json',
          body: responseSchema
        },
        404: {
          contentType: 'application/json',
          body: Type.Object({
            error: Type.String(),
            code: Type.Number(),
            details: Type.Optional(Type.Array(Type.String()))
          })
        }
      },
      handler: async (_req) => {
        return {
          status: 200 as const,
          body: {
            user: {
              id: 1,
              name: 'John Doe',
              email: 'john@example.com',
              profile: {
                avatar: 'https://example.com/avatar.png',
                bio: 'Software developer'
              }
            },
            metadata: {
              createdAt: '2023-01-01T00:00:00Z',
              updatedAt: '2023-01-01T00:00:00Z',
              version: 1
            }
          }
        };
      }
    });

    expect(route.response?.[200]?.body).toBe(responseSchema);
    expect(route.response?.[200]?.body.type).toBe('object');
    expect(route.response?.[200]?.body.properties.user).toBeDefined();
    expect(route.response?.[200]?.body.properties.metadata).toBeDefined();
  });

  it('should validate complex nested schemas', () => {
    const complexSchema = Type.Object({
      data: Type.Array(Type.Object({
        id: Type.Number(),
        attributes: Type.Object({
          name: Type.String(),
          tags: Type.Array(Type.String()),
          metadata: Type.Record(Type.String(), Type.Union([
            Type.String(),
            Type.Number(),
            Type.Boolean()
          ]))
        }),
        relationships: Type.Optional(Type.Object({
          parent: Type.Optional(Type.Object({
            id: Type.Number(),
            type: Type.String()
          })),
          children: Type.Array(Type.Object({
            id: Type.Number(),
            type: Type.String()
          }))
        }))
      })),
      meta: Type.Object({
        total: Type.Number(),
        page: Type.Number(),
        limit: Type.Number(),
        hasMore: Type.Boolean()
      })
    });

    const route = createApiRoute({
      path: '/api/complex',
      method: 'GET',
      response: {
        200: {
          contentType: 'application/json',
          body: complexSchema
        }
      },
      handler: async (_req) => {
        return {
          status: 200 as const,
          body: {
            data: [{
              id: 1,
              attributes: {
                name: 'Item 1',
                tags: ['tag1', 'tag2'],
                metadata: {
                  key1: 'string_value',
                  key2: 42,
                  key3: true
                }
              },
              relationships: {
                children: []
              }
            }],
            meta: {
              total: 1,
              page: 1,
              limit: 10,
              hasMore: false
            }
          }
        };
      }
    });

    expect(route.response?.[200]?.body).toBe(complexSchema);
    expect(route.response?.[200]?.body.type).toBe('object');
    expect(route.response?.[200]?.body.properties.data).toBeDefined();
    expect(route.response?.[200]?.body.properties.meta).toBeDefined();
  });

  it('should handle different JSON content types', () => {
    const jsonContentTypes = [
      'application/json',
      'application/vnd.api+json',
      'application/ld+json',
      'text/json'
    ];

    jsonContentTypes.forEach(contentType => {
      const route = createApiRoute({
        path: `/api/test-${contentType.replace(/[^a-zA-Z0-9]/g, '')}`,
        method: 'GET',
        response: {
          200: {
            contentType: contentType as any,
            body: Type.Object({
              message: Type.String(),
              contentType: Type.String()
            })
          }
        },
        handler: async (_req) => {
          return {
            status: 200 as const,
            body: { message: 'Success', contentType }
          };
        }
      });

      expect(route.response?.[200]?.contentType).toBe(contentType);
      expect(route.response?.[200]?.body).toBeDefined();
    });
  });

  it('should handle custom content types without body schema', () => {
    const customContentTypes = [
      'text/plain',
      'text/html',
      'application/octet-stream',
      'image/png',
      'application/pdf',
      'text/csv'
    ];

    customContentTypes.forEach(contentType => {
      const route = createApiRoute({
        path: `/api/custom-${contentType.replace(/[^a-zA-Z0-9]/g, '')}`,
        method: 'GET',
        response: {
          200: {
            contentType: contentType as any
          }
        },
        handler: async (_req) => {
          return {
            status: 200 as const,
            custom: (res) => {
              res.setHeader('Content-Type', contentType);
              res.send('Custom content');
            }
          };
        }
      });

      expect(route.response?.[200]?.contentType).toBe(contentType);
      expect(route.response?.[200]).not.toHaveProperty('body');
    });
  });

  it('should validate response headers schema', () => {
    const responseHeaderSchema = Type.Object({
      'x-rate-limit': Type.String(),
      'x-rate-limit-remaining': Type.String(),
      'x-rate-limit-reset': Type.String(),
      'cache-control': Type.Optional(Type.String()),
      'etag': Type.Optional(Type.String())
    });

    const route = createApiRoute({
      path: '/api/with-headers',
      method: 'GET',
      response: {
        200: {
          contentType: 'application/json',
          body: Type.Object({
            message: Type.String()
          }),
          headers: responseHeaderSchema
        }
      },
      handler: async (_req) => {
        return {
          status: 200 as const,
          body: { message: 'Success' },
          headers: {
            'x-rate-limit': '1000',
            'x-rate-limit-remaining': '999',
            'x-rate-limit-reset': '2023-01-01T00:00:00Z',
            'cache-control': 'no-cache'
          }
        };
      }
    });

    expect(route.response?.[200]?.headers).toBe(responseHeaderSchema);
    expect(route.response?.[200]?.headers?.type).toBe('object');
    expect(route.response?.[200]?.headers?.properties['x-rate-limit']).toBeDefined();
  });

  it('should validate multiple response status codes with different schemas', () => {
    const route = createApiRoute({
      path: '/api/multi-status',
      method: 'POST',
      request: {
        body: Type.Object({
          action: Type.Union([
            Type.Literal('success'),
            Type.Literal('not-found'),
            Type.Literal('error')
          ])
        })
      },
      response: {
        200: {
          contentType: 'application/json',
          body: Type.Object({
            result: Type.String(),
            data: Type.Object({
              id: Type.Number(),
              name: Type.String()
            })
          })
        },
        404: {
          contentType: 'application/json',
          body: Type.Object({
            error: Type.String(),
            resource: Type.String()
          })
        },
        500: {
          contentType: 'application/json',
          body: Type.Object({
            error: Type.String(),
            stack: Type.Optional(Type.String())
          })
        }
      },
      handler: async (req) => {
        switch (req.body.action) {
          case 'success':
            return {
              status: 200 as const,
              body: { result: 'success', data: { id: 1, name: 'Test' } }
            };
          case 'not-found':
            return {
              status: 404 as const,
              body: { error: 'Not found', resource: 'user' }
            };
          case 'error':
            return {
              status: 500 as const,
              body: { error: 'Internal server error' }
            };
          default:
            return {
              status: 500 as const,
              body: { error: 'Unknown action' }
            };
        }
      }
    });

    expect(route.response?.[200]?.body).toBeDefined();
    expect(route.response?.[404]?.body).toBeDefined();
    expect(route.response?.[500]?.body).toBeDefined();
    expect(route.response?.[200]?.body.properties.result).toBeDefined();
    expect(route.response?.[404]?.body.properties.error).toBeDefined();
    expect(route.response?.[500]?.body.properties.error).toBeDefined();
  });
});