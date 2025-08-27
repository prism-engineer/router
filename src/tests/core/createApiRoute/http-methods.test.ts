import { describe, it, expect } from 'vitest';
import { Type } from '@sinclair/typebox';
import { createApiRoute } from '../../../createApiRoute.js';

describe('createApiRoute - HTTP Methods', () => {
  it('should create GET route', () => {
    const route = createApiRoute({
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
          contentType: 'application/json',
          body: Type.Array(Type.Object({
            id: Type.Number(),
            name: Type.String()
          }))
        }
      },
      handler: async (req) => {
        const page = req.query.page || 1;
        const limit = req.query.limit || 10;
        
        return {
          status: 200 as const,
          body: [{ id: 1, name: 'John Doe' }]
        };
      }
    });

    expect(route.method).toBe('GET');
    expect(route.path).toBe('/api/users');
    expect(route.request?.query).toBeDefined();
    expect(route.response?.[200]).toBeDefined();
  });

  it('should create POST route', () => {
    const route = createApiRoute({
      path: '/api/users',
      method: 'POST',
      request: {
        body: Type.Object({
          name: Type.String(),
          email: Type.String(),
          age: Type.Number()
        })
      },
      response: {
        201: {
          contentType: 'application/json',
          body: Type.Object({
            id: Type.Number(),
            name: Type.String(),
            email: Type.String(),
            created: Type.Boolean()
          })
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
        const { name, email, age } = req.body;
        
        if (!name || !email || age < 0) {
          return {
            status: 400 as const,
            body: {
              error: 'Validation failed',
              validationErrors: ['Name and email are required', 'Age must be positive']
            }
          };
        }
        
        return {
          status: 201 as const,
          body: {
            id: 1,
            name,
            email,
            created: true
          }
        };
      }
    });

    expect(route.method).toBe('POST');
    expect(route.path).toBe('/api/users');
    expect(route.request?.body).toBeDefined();
    expect(route.response?.[201]).toBeDefined();
    expect(route.response?.[400]).toBeDefined();
  });

  it('should create PUT route', () => {
    const route = createApiRoute({
      path: '/api/users/{id}',
      method: 'PUT',
      request: {
        body: Type.Object({
          name: Type.String(),
          email: Type.String(),
          age: Type.Number()
        })
      },
      response: {
        200: {
          contentType: 'application/json',
          body: Type.Object({
            id: Type.String(),
            name: Type.String(),
            email: Type.String(),
            updated: Type.Boolean()
          })
        },
        404: {
          contentType: 'application/json',
          body: Type.Object({
            error: Type.String(),
            id: Type.String()
          })
        }
      },
      handler: async (req) => {
        const id = req.params.id;
        const { name, email, age } = req.body;
        
        if (id === '999') {
          return {
            status: 404 as const,
            body: {
              error: 'User not found',
              id
            }
          };
        }
        
        return {
          status: 200 as const,
          body: {
            id,
            name,
            email,
            updated: true
          }
        };
      }
    });

    expect(route.method).toBe('PUT');
    expect(route.path).toBe('/api/users/{id}');
    expect(route.request?.body).toBeDefined();
    expect(route.response?.[200]).toBeDefined();
    expect(route.response?.[404]).toBeDefined();
  });

  it('should create DELETE route', () => {
    const route = createApiRoute({
      path: '/api/users/{id}',
      method: 'DELETE',
      response: {
        200: {
          contentType: 'application/json',
          body: Type.Object({
            id: Type.String(),
            deleted: Type.Boolean(),
            message: Type.String()
          })
        },
        404: {
          contentType: 'application/json',
          body: Type.Object({
            error: Type.String(),
            id: Type.String()
          })
        }
      },
      handler: async (req) => {
        const id = req.params.id;
        
        if (id === '999') {
          return {
            status: 404 as const,
            body: {
              error: 'User not found',
              id
            }
          };
        }
        
        return {
          status: 200 as const,
          body: {
            id,
            deleted: true,
            message: 'User deleted successfully'
          }
        };
      }
    });

    expect(route.method).toBe('DELETE');
    expect(route.path).toBe('/api/users/{id}');
    expect(route.response?.[200]).toBeDefined();
    expect(route.response?.[404]).toBeDefined();
  });

  it('should create PATCH route', () => {
    const route = createApiRoute({
      path: '/api/users/{id}',
      method: 'PATCH',
      request: {
        body: Type.Object({
          name: Type.Optional(Type.String()),
          email: Type.Optional(Type.String()),
          age: Type.Optional(Type.Number())
        })
      },
      response: {
        200: {
          contentType: 'application/json',
          body: Type.Object({
            id: Type.String(),
            name: Type.String(),
            email: Type.String(),
            age: Type.Number(),
            updated: Type.Boolean()
          })
        },
        404: {
          contentType: 'application/json',
          body: Type.Object({
            error: Type.String(),
            id: Type.String()
          })
        }
      },
      handler: async (req) => {
        const id = req.params.id;
        const updates = req.body;
        
        if (id === '999') {
          return {
            status: 404 as const,
            body: {
              error: 'User not found',
              id
            }
          };
        }
        
        // Simulate partial update
        const existingUser = { name: 'John Doe', email: 'john@example.com', age: 25 };
        const updatedUser = { ...existingUser, ...updates };
        
        return {
          status: 200 as const,
          body: {
            id,
            ...updatedUser,
            updated: true
          }
        };
      }
    });

    expect(route.method).toBe('PATCH');
    expect(route.path).toBe('/api/users/{id}');
    expect(route.request?.body).toBeDefined();
    expect(route.response?.[200]).toBeDefined();
    expect(route.response?.[404]).toBeDefined();
  });

  it('should create OPTIONS route', () => {
    const route = createApiRoute({
      path: '/api/users/{id}',
      method: 'OPTIONS',
      response: {
        200: {
          contentType: 'application/json',
          body: Type.Object({
            methods: Type.Array(Type.String()),
            headers: Type.Array(Type.String())
          }),
          headers: Type.Object({
            'Access-Control-Allow-Methods': Type.String(),
            'Access-Control-Allow-Headers': Type.String(),
            'Access-Control-Max-Age': Type.String()
          })
        }
      },
      handler: async (req) => {
        return {
          status: 200 as const,
          body: {
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
            headers: ['Content-Type', 'Authorization', 'X-API-Key']
          },
          headers: {
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
            'Access-Control-Max-Age': '86400'
          }
        };
      }
    });

    expect(route.method).toBe('OPTIONS');
    expect(route.path).toBe('/api/users/{id}');
    expect(route.response?.[200]).toBeDefined();
    expect(route.response?.[200]?.headers).toBeDefined();
  });

  it('should create HEAD route', () => {
    const route = createApiRoute({
      path: '/api/users/{id}',
      method: 'HEAD',
      response: {
        200: {
          contentType: 'application/json',
          body: Type.Object({
            exists: Type.Boolean()
          }),
          headers: Type.Object({
            'Content-Length': Type.String(),
            'Last-Modified': Type.String(),
            'ETag': Type.String()
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
        const id = req.params.id;
        
        if (id === '999') {
          return {
            status: 404 as const,
            body: {
              error: 'User not found'
            }
          };
        }
        
        return {
          status: 200 as const,
          body: {
            exists: true
          },
          headers: {
            'Content-Length': '0',
            'Last-Modified': new Date().toUTCString(),
            'ETag': `"${id}-${Date.now()}"`
          }
        };
      }
    });

    expect(route.method).toBe('HEAD');
    expect(route.path).toBe('/api/users/{id}');
    expect(route.response?.[200]).toBeDefined();
    expect(route.response?.[404]).toBeDefined();
  });

  it('should handle method-specific request requirements', () => {
    const postRoute = createApiRoute({
      path: '/api/posts',
      method: 'POST',
      request: {
        body: Type.Object({
          title: Type.String(),
          content: Type.String()
        }),
        headers: Type.Object({
          'content-type': Type.Literal('application/json')
        })
      },
      response: {
        201: {
          contentType: 'application/json',
          body: Type.Object({
            id: Type.Number(),
            title: Type.String(),
            created: Type.Boolean()
          })
        }
      },
      handler: async (req) => {
        return {
          status: 201 as const,
          body: {
            id: 1,
            title: req.body.title,
            created: true
          }
        };
      }
    });

    const getRoute = createApiRoute({
      path: '/api/posts',
      method: 'GET',
      request: {
        query: Type.Object({
          search: Type.Optional(Type.String()),
          category: Type.Optional(Type.String())
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
          body: [{ id: 1, title: 'Sample Post' }]
        };
      }
    });

    expect(postRoute.method).toBe('POST');
    expect(postRoute.request?.body).toBeDefined();
    expect(postRoute.request?.headers).toBeDefined();
    expect(postRoute.request?.query).toBeUndefined();

    expect(getRoute.method).toBe('GET');
    expect(getRoute.request?.query).toBeDefined();
    expect(getRoute.request?.body).toBeUndefined();
  });

  it('should handle all HTTP methods with same path', () => {
    const path = '/api/resource/{id}';
    const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'] as const;
    
    methods.forEach(method => {
      const route = createApiRoute({
        path,
        method,
        request: ['POST', 'PUT', 'PATCH'].includes(method) ? {
          body: Type.Object({
            data: Type.String()
          })
        } : undefined,
        response: {
          200: {
            contentType: 'application/json',
            body: Type.Object({
              id: Type.String(),
              method: Type.String(),
              success: Type.Boolean()
            })
          }
        },
        handler: async (req) => {
          return {
            status: 200 as const,
            body: {
              id: req.params.id,
              method,
              success: true
            }
          };
        }
      });

      expect(route.method).toBe(method);
      expect(route.path).toBe(path);
      expect(route.response?.[200]).toBeDefined();
      
      if (['POST', 'PUT', 'PATCH'].includes(method)) {
        expect(route.request?.body).toBeDefined();
      }
    });
  });

  it('should handle custom response codes for different methods', () => {
    const postRoute = createApiRoute({
      path: '/api/items',
      method: 'POST',
      request: {
        body: Type.Object({
          name: Type.String()
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

    const deleteRoute = createApiRoute({
      path: '/api/items/{id}',
      method: 'DELETE',
      response: {
        204: {
          contentType: 'application/json',
          body: Type.Object({
            deleted: Type.Boolean()
          })
        }
      },
      handler: async (req) => {
        return {
          status: 204 as const,
          body: { deleted: true }
        };
      }
    });

    expect(postRoute.method).toBe('POST');
    expect(postRoute.response?.[201]).toBeDefined();
    expect(postRoute.response?.[204 as never]).toBeUndefined();

    expect(deleteRoute.method).toBe('DELETE');
    expect(deleteRoute.response?.[204]).toBeDefined();
    expect(deleteRoute.response?.[201 as never]).toBeUndefined();
  });

  it('should handle method-specific content types', () => {
    const fileUploadRoute = createApiRoute({
      path: '/api/files',
      method: 'POST',
      request: {
        headers: Type.Object({
          'content-type': Type.String(),
          'content-length': Type.String()
        })
      },
      response: {
        201: {
          contentType: 'application/json',
          body: Type.Object({
            fileId: Type.String(),
            uploaded: Type.Boolean()
          })
        }
      },
      handler: async (req) => {
        return {
          status: 201 as const,
          body: {
            fileId: 'file-123',
            uploaded: true
          }
        };
      }
    });

    const fileDownloadRoute = createApiRoute({
      path: '/api/files/{id}',
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
      handler: async (req) => {
        const id = req.params.id;
        
        if (id === 'nonexistent') {
          return {
            status: 404 as const,
            body: { error: 'File not found' }
          };
        }
        
        return {
          status: 200 as const,
          custom: (res) => {
            res.setHeader('Content-Disposition', `attachment; filename="${id}"`);
            res.send('File content');
          }
        };
      }
    });

    expect(fileUploadRoute.method).toBe('POST');
    expect(fileUploadRoute.response?.[201]?.contentType).toBe('application/json');

    expect(fileDownloadRoute.method).toBe('GET');
    expect(fileDownloadRoute.response?.[200]?.contentType).toBe('application/octet-stream');
    expect(fileDownloadRoute.response?.[404]?.contentType).toBe('application/json');
  });
});