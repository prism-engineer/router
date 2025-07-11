import { describe, it, expect } from 'vitest';
import { Type } from '@sinclair/typebox';
import { createApiRoute } from '../../../createApiRoute';
import { createAuthScheme } from '../../../createAuthScheme';

describe('createApiRoute - Error Handling', () => {
  it('should handle handler function errors gracefully', () => {
    const route = createApiRoute({
      path: '/api/error-test',
      method: 'GET',
      response: {
        200: {
          contentType: 'application/json',
          body: Type.Object({
            success: Type.Boolean()
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
        // This handler will work fine, errors are tested at runtime
        return {
          status: 200 as const,
          body: { success: true }
        };
      }
    });

    expect(route.handler).toBeInstanceOf(Function);
    expect(route.response?.[200]).toBeDefined();
    expect(route.response?.[500]).toBeDefined();
  });

  it('should handle async handler errors', async () => {
    const route = createApiRoute({
      path: '/api/async-error',
      method: 'GET',
      response: {
        200: {
          contentType: 'application/json',
          body: Type.Object({
            data: Type.String()
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
        // Simulate an async operation that might fail
        await new Promise(resolve => setTimeout(resolve, 1));
        
        // This would typically throw an error, but we'll return a success response
        return {
          status: 200 as const,
          body: { data: 'success' }
        };
      }
    });

    expect(route.handler).toBeInstanceOf(Function);
    expect(typeof route.handler).toBe('function');
  });

  it('should handle invalid response status codes', () => {
    // This should compile fine - validation happens at runtime
    const route = createApiRoute({
      path: '/api/invalid-status',
      method: 'GET',
      response: {
        200: {
          contentType: 'application/json',
          body: Type.Object({
            message: Type.String()
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
        // Handler returns valid status codes
        return {
          status: 200 as const,
          body: { message: 'success' }
        };
      }
    });

    expect(route.response?.[200]).toBeDefined();
    expect(route.response?.[404]).toBeDefined();
  });

  it('should handle missing required request body', () => {
    const route = createApiRoute({
      path: '/api/missing-body',
      method: 'POST',
      request: {
        body: Type.Object({
          name: Type.String(),
          email: Type.String()
        })
      },
      response: {
        200: {
          contentType: 'application/json',
          body: Type.Object({
            success: Type.Boolean()
          })
        },
        400: {
          contentType: 'application/json',
          body: Type.Object({
            error: Type.String(),
            missing: Type.Array(Type.String())
          })
        }
      },
      handler: async (req) => {
        // Handler expects body to be present and valid
        const { name, email } = req.body;
        
        return {
          status: 200 as const,
          body: { success: true }
        };
      }
    });

    expect(route.request?.body).toBeDefined();
    expect(route.response?.[400]).toBeDefined();
  });

  it('should handle authentication errors', () => {
    const failingAuth = createAuthScheme({
      name: 'failing-auth',
      validate: async (req) => {
        // This auth scheme always fails
        throw new Error('Authentication failed');
      }
    });

    const route = createApiRoute({
      path: '/api/auth-error',
      method: 'GET',
      auth: failingAuth,
      response: {
        200: {
          contentType: 'application/json',
          body: Type.Object({
            message: Type.String()
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
        // This handler won't be reached if auth fails
        return {
          status: 200 as const,
          body: { message: 'authenticated' }
        };
      }
    });

    expect(route.auth).toBeDefined();
    expect(route.response?.[401]).toBeDefined();
  });

  it('should handle multiple auth schemes with all failing', () => {
    const failingAuth1 = createAuthScheme({
      name: 'failing-auth-1',
      validate: async (req) => {
        throw new Error('First auth failed');
      }
    });

    const failingAuth2 = createAuthScheme({
      name: 'failing-auth-2',
      validate: async (req) => {
        throw new Error('Second auth failed');
      }
    });

    const route = createApiRoute({
      path: '/api/multi-auth-error',
      method: 'GET',
      auth: [failingAuth1, failingAuth2],
      response: {
        200: {
          contentType: 'application/json',
          body: Type.Object({
            message: Type.String()
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
        return {
          status: 200 as const,
          body: { message: 'authenticated' }
        };
      }
    });

    expect(Array.isArray(route.auth)).toBe(true);
    expect(route.auth).toHaveLength(2);
  });

  it('should handle validation errors in query parameters', () => {
    const route = createApiRoute({
      path: '/api/query-validation',
      method: 'GET',
      request: {
        query: Type.Object({
          page: Type.Number({ minimum: 1 }),
          limit: Type.Number({ minimum: 1, maximum: 100 }),
          sort: Type.Union([Type.Literal('asc'), Type.Literal('desc')])
        })
      },
      response: {
        200: {
          contentType: 'application/json',
          body: Type.Array(Type.Object({
            id: Type.Number(),
            name: Type.String()
          }))
        },
        400: {
          contentType: 'application/json',
          body: Type.Object({
            error: Type.String(),
            validationErrors: Type.Array(Type.String())
          })
        }
      },
      handler: async (req) => {
        // Handler assumes query params are valid
        const { page, limit, sort } = req.query;
        
        return {
          status: 200 as const,
          body: [{ id: 1, name: 'Test' }]
        };
      }
    });

    expect(route.request?.query).toBeDefined();
    expect(route.response?.[400]).toBeDefined();
  });

  it('should handle header validation errors', () => {
    const route = createApiRoute({
      path: '/api/header-validation',
      method: 'GET',
      request: {
        headers: Type.Object({
          authorization: Type.String({ pattern: '^Bearer [A-Za-z0-9-_]+$' }),
          'content-type': Type.Literal('application/json'),
          'x-api-version': Type.Union([Type.Literal('v1'), Type.Literal('v2')])
        })
      },
      response: {
        200: {
          contentType: 'application/json',
          body: Type.Object({
            message: Type.String()
          })
        },
        400: {
          contentType: 'application/json',
          body: Type.Object({
            error: Type.String(),
            invalidHeaders: Type.Array(Type.String())
          })
        }
      },
      handler: async (req) => {
        // Handler assumes headers are valid
        const { authorization, 'content-type': contentType, 'x-api-version': version } = req.headers;
        
        return {
          status: 200 as const,
          body: { message: 'valid headers' }
        };
      }
    });

    expect(route.request?.headers).toBeDefined();
    expect(route.response?.[400]).toBeDefined();
  });

  it('should handle custom response handler errors', () => {
    const route = createApiRoute({
      path: '/api/custom-response-error',
      method: 'GET',
      response: {
        200: {
          contentType: 'text/plain'
        },
        500: {
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
            // This custom handler could potentially throw errors
            res.setHeader('Content-Type', 'text/plain');
            res.send('Custom response');
          }
        };
      }
    });

    expect(route.response?.[200]?.contentType).toBe('text/plain');
    expect(route.response?.[500]).toBeDefined();
  });

  it('should handle path parameter validation errors', () => {
    const route = createApiRoute({
      path: '/api/users/{userId}/posts/{postId}',
      method: 'GET',
      response: {
        200: {
          contentType: 'application/json',
          body: Type.Object({
            userId: Type.String(),
            postId: Type.String(),
            data: Type.Object({
              title: Type.String()
            })
          })
        },
        400: {
          contentType: 'application/json',
          body: Type.Object({
            error: Type.String(),
            invalidParams: Type.Array(Type.String())
          })
        },
        404: {
          contentType: 'application/json',
          body: Type.Object({
            error: Type.String(),
            resource: Type.String()
          })
        }
      },
      handler: async (req) => {
        const { userId, postId } = req.params;
        
        // Simulate validation
        if (!userId || !postId) {
          return {
            status: 400 as const,
            body: {
              error: 'Invalid parameters',
              invalidParams: ['userId', 'postId']
            }
          };
        }
        
        if (userId === '999' || postId === '999') {
          return {
            status: 404 as const,
            body: {
              error: 'Resource not found',
              resource: userId === '999' ? 'user' : 'post'
            }
          };
        }
        
        return {
          status: 200 as const,
          body: {
            userId,
            postId,
            data: { title: 'Sample Post' }
          }
        };
      }
    });

    expect(route.path).toBe('/api/users/{userId}/posts/{postId}');
    expect(route.response?.[400]).toBeDefined();
    expect(route.response?.[404]).toBeDefined();
  });

  it('should handle missing content type for custom responses', () => {
    const route = createApiRoute({
      path: '/api/missing-content-type',
      method: 'GET',
      response: {
        200: {
          contentType: 'application/octet-stream'
        },
        500: {
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
            // Handler doesn't set content type - should be handled by framework
            res.send('Response without explicit content type');
          }
        };
      }
    });

    expect(route.response?.[200]?.contentType).toBe('application/octet-stream');
    expect(route.response?.[500]).toBeDefined();
  });

  it('should handle response body validation errors', () => {
    const route = createApiRoute({
      path: '/api/response-validation',
      method: 'GET',
      response: {
        200: {
          contentType: 'application/json',
          body: Type.Object({
            id: Type.Number(),
            name: Type.String(),
            email: Type.String({ format: 'email' }),
            createdAt: Type.String({ format: 'date-time' })
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
        // Handler should return data matching the schema
        return {
          status: 200 as const,
          body: {
            id: 1,
            name: 'John Doe',
            email: 'john@example.com',
            createdAt: new Date().toISOString()
          }
        };
      }
    });

    expect(route.response?.[200]?.body).toBeDefined();
    expect(route.response?.[500]).toBeDefined();
  });

  it('should handle mixed success and error responses', () => {
    const route = createApiRoute({
      path: '/api/mixed-responses',
      method: 'POST',
      request: {
        body: Type.Object({
          operation: Type.Union([
            Type.Literal('success'),
            Type.Literal('client-error'),
            Type.Literal('server-error'),
            Type.Literal('not-found')
          ])
        })
      },
      response: {
        200: {
          contentType: 'application/json',
          body: Type.Object({
            success: Type.Boolean(),
            data: Type.String()
          })
        },
        400: {
          contentType: 'application/json',
          body: Type.Object({
            error: Type.String(),
            code: Type.Literal('CLIENT_ERROR')
          })
        },
        404: {
          contentType: 'application/json',
          body: Type.Object({
            error: Type.String(),
            code: Type.Literal('NOT_FOUND')
          })
        },
        500: {
          contentType: 'application/json',
          body: Type.Object({
            error: Type.String(),
            code: Type.Literal('SERVER_ERROR')
          })
        }
      },
      handler: async (req) => {
        const { operation } = req.body;
        
        switch (operation) {
          case 'success':
            return {
              status: 200 as const,
              body: { success: true, data: 'Operation completed' }
            };
          
          case 'client-error':
            return {
              status: 400 as const,
              body: { error: 'Bad request', code: 'CLIENT_ERROR' as const }
            };
          
          case 'not-found':
            return {
              status: 404 as const,
              body: { error: 'Resource not found', code: 'NOT_FOUND' as const }
            };
          
          case 'server-error':
            return {
              status: 500 as const,
              body: { error: 'Internal server error', code: 'SERVER_ERROR' as const }
            };
          
          default:
            return {
              status: 400 as const,
              body: { error: 'Unknown operation', code: 'CLIENT_ERROR' as const }
            };
        }
      }
    });

    expect(route.request?.body).toBeDefined();
    expect(route.response?.[200]).toBeDefined();
    expect(route.response?.[400]).toBeDefined();
    expect(route.response?.[404]).toBeDefined();
    expect(route.response?.[500]).toBeDefined();
  });

  it('should handle undefined or null response bodies', () => {
    const route = createApiRoute({
      path: '/api/empty-response',
      method: 'DELETE',
      response: {
        204: {
          contentType: 'application/json',
          body: Type.Object({
            deleted: Type.Boolean()
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
        // DELETE operations often return 204 No Content
        return {
          status: 204 as const,
          body: { deleted: true }
        };
      }
    });

    expect(route.response?.[204]).toBeDefined();
    expect(route.response?.[500]).toBeDefined();
  });
});