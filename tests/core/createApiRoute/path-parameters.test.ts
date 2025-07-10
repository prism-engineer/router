import { describe, it, expect } from 'vitest';
import { Type } from '@sinclair/typebox';
import { createApiRoute } from '../../../src/createApiRoute';

describe('createApiRoute - Path Parameters', () => {
  it('should extract single path parameter', () => {
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
        const id: string = req.params.id;
        
        return {
          status: 200 as const,
          body: { id, name: 'John Doe' }
        };
      }
    });

    expect(route.path).toBe('/api/users/{id}');
    expect(typeof route.handler).toBe('function');
  });

  it('should extract multiple path parameters', () => {
    const route = createApiRoute({
      path: '/api/users/{userId}/posts/{postId}',
      method: 'GET',
      response: {
        200: {
          contentType: 'application/json',
          body: Type.Object({
            userId: Type.String(),
            postId: Type.String(),
            title: Type.String()
          })
        }
      },
      handler: async (req) => {
        const userId: string = req.params.userId;
        const postId: string = req.params.postId;
        
        return {
          status: 200 as const,
          body: { userId, postId, title: 'Sample Post' }
        };
      }
    });

    expect(route.path).toBe('/api/users/{userId}/posts/{postId}');
    expect(typeof route.handler).toBe('function');
  });

  it('should handle complex path parameter patterns', () => {
    const route = createApiRoute({
      path: '/api/organizations/{orgId}/projects/{projectId}/issues/{issueId}',
      method: 'GET',
      response: {
        200: {
          contentType: 'application/json',
          body: Type.Object({
            orgId: Type.String(),
            projectId: Type.String(),
            issueId: Type.String(),
            issue: Type.Object({
              title: Type.String(),
              status: Type.String()
            })
          })
        }
      },
      handler: async (req) => {
        const orgId: string = req.params.orgId;
        const projectId: string = req.params.projectId;
        const issueId: string = req.params.issueId;
        
        return {
          status: 200 as const,
          body: {
            orgId,
            projectId,
            issueId,
            issue: {
              title: 'Sample Issue',
              status: 'open'
            }
          }
        };
      }
    });

    expect(route.path).toBe('/api/organizations/{orgId}/projects/{projectId}/issues/{issueId}');
    expect(typeof route.handler).toBe('function');
  });

  it('should handle mixed path parameters with static segments', () => {
    const route = createApiRoute({
      path: '/api/v1/users/{userId}/settings/profile/{profileId}',
      method: 'PUT',
      request: {
        body: Type.Object({
          displayName: Type.String(),
          bio: Type.Optional(Type.String())
        })
      },
      response: {
        200: {
          contentType: 'application/json',
          body: Type.Object({
            userId: Type.String(),
            profileId: Type.String(),
            updated: Type.Boolean()
          })
        }
      },
      handler: async (req) => {
        const userId: string = req.params.userId;
        const profileId: string = req.params.profileId;
        
        return {
          status: 200 as const,
          body: { userId, profileId, updated: true }
        };
      }
    });

    expect(route.path).toBe('/api/v1/users/{userId}/settings/profile/{profileId}');
    expect(route.request?.body).toBeDefined();
  });

  it('should handle path parameters with query parameters', () => {
    const route = createApiRoute({
      path: '/api/users/{userId}/posts',
      method: 'GET',
      request: {
        query: Type.Object({
          page: Type.Optional(Type.Number()),
          limit: Type.Optional(Type.Number()),
          status: Type.Optional(Type.Union([
            Type.Literal('draft'),
            Type.Literal('published'),
            Type.Literal('archived')
          ]))
        })
      },
      response: {
        200: {
          contentType: 'application/json',
          body: Type.Object({
            userId: Type.String(),
            posts: Type.Array(Type.Object({
              id: Type.String(),
              title: Type.String(),
              status: Type.String()
            })),
            pagination: Type.Object({
              page: Type.Number(),
              limit: Type.Number(),
              total: Type.Number()
            })
          })
        }
      },
      handler: async (req) => {
        const userId: string = req.params.userId;
        const page: number | undefined = req.query.page;
        const limit: number | undefined = req.query.limit;
        const status: 'draft' | 'published' | 'archived' | undefined = req.query.status;
        
        return {
          status: 200 as const,
          body: {
            userId,
            posts: [{
              id: '1',
              title: 'Sample Post',
              status: status || 'published'
            }],
            pagination: {
              page: page || 1,
              limit: limit || 10,
              total: 1
            }
          }
        };
      }
    });

    expect(route.path).toBe('/api/users/{userId}/posts');
    expect(route.request?.query).toBeDefined();
  });

  it('should handle path parameters with request body', () => {
    const route = createApiRoute({
      path: '/api/users/{userId}/posts/{postId}',
      method: 'PUT',
      request: {
        body: Type.Object({
          title: Type.String(),
          content: Type.String(),
          tags: Type.Array(Type.String()),
          metadata: Type.Optional(Type.Object({
            category: Type.String(),
            priority: Type.Number()
          }))
        })
      },
      response: {
        200: {
          contentType: 'application/json',
          body: Type.Object({
            userId: Type.String(),
            postId: Type.String(),
            updated: Type.Boolean(),
            updatedAt: Type.String()
          })
        }
      },
      handler: async (req) => {
        const userId: string = req.params.userId;
        const postId: string = req.params.postId;
        const title: string = req.body.title;
        const content: string = req.body.content;
        
        return {
          status: 200 as const,
          body: {
            userId,
            postId,
            updated: true,
            updatedAt: new Date().toISOString()
          }
        };
      }
    });

    expect(route.path).toBe('/api/users/{userId}/posts/{postId}');
    expect(route.request?.body).toBeDefined();
  });

  it('should handle path parameters with headers', () => {
    const route = createApiRoute({
      path: '/api/users/{userId}/avatar',
      method: 'POST',
      request: {
        headers: Type.Object({
          'content-type': Type.String(),
          'content-length': Type.String(),
          'x-upload-session': Type.Optional(Type.String())
        })
      },
      response: {
        200: {
          contentType: 'application/json',
          body: Type.Object({
            userId: Type.String(),
            avatarUrl: Type.String(),
            uploaded: Type.Boolean()
          })
        }
      },
      handler: async (req) => {
        const userId: string = req.params.userId;
        const contentType: string = req.headers['content-type'];
        const contentLength: string = req.headers['content-length'];
        
        return {
          status: 200 as const,
          body: {
            userId,
            avatarUrl: `https://example.com/avatars/${userId}.jpg`,
            uploaded: true
          }
        };
      }
    });

    expect(route.path).toBe('/api/users/{userId}/avatar');
    expect(route.request?.headers).toBeDefined();
  });

  it('should handle path parameters with different HTTP methods', () => {
    const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] as const;
    
    methods.forEach(method => {
      const route = createApiRoute({
        path: `/api/resources/{id}`,
        method,
        request: method === 'GET' || method === 'DELETE' ? undefined : {
          body: Type.Object({
            name: Type.String(),
            value: Type.String()
          })
        },
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
          const id: string = req.params.id;
          
          return {
            status: 200 as const,
            body: { id, method, success: true }
          };
        }
      });

      expect(route.path).toBe('/api/resources/{id}');
      expect(route.method).toBe(method);
    });
  });

  it('should handle numeric-looking path parameters as strings', () => {
    const route = createApiRoute({
      path: '/api/users/{userId}/orders/{orderId}',
      method: 'GET',
      response: {
        200: {
          contentType: 'application/json',
          body: Type.Object({
            userId: Type.String(),
            orderId: Type.String(),
            userIdAsNumber: Type.Number(),
            orderIdAsNumber: Type.Number()
          })
        }
      },
      handler: async (req) => {
        // Path parameters are always strings, but can be converted
        const userId: string = req.params.userId;
        const orderId: string = req.params.orderId;
        const userIdAsNumber = parseInt(userId);
        const orderIdAsNumber = parseInt(orderId);
        
        return {
          status: 200 as const,
          body: {
            userId,
            orderId,
            userIdAsNumber,
            orderIdAsNumber
          }
        };
      }
    });

    expect(route.path).toBe('/api/users/{userId}/orders/{orderId}');
    expect(typeof route.handler).toBe('function');
  });

  it('should handle UUID-style path parameters', () => {
    const route = createApiRoute({
      path: '/api/sessions/{sessionId}/tokens/{tokenId}',
      method: 'DELETE',
      response: {
        200: {
          contentType: 'application/json',
          body: Type.Object({
            sessionId: Type.String(),
            tokenId: Type.String(),
            revoked: Type.Boolean()
          })
        },
        404: {
          contentType: 'application/json',
          body: Type.Object({
            error: Type.String(),
            sessionId: Type.String(),
            tokenId: Type.String()
          })
        }
      },
      handler: async (req) => {
        const sessionId: string = req.params.sessionId;
        const tokenId: string = req.params.tokenId;
        
        // Simulate UUID validation
        const isValidUUID = (str: string) => str.length === 36 && str.includes('-');
        
        if (!isValidUUID(sessionId) || !isValidUUID(tokenId)) {
          return {
            status: 404 as const,
            body: { error: 'Invalid ID format', sessionId, tokenId }
          };
        }
        
        return {
          status: 200 as const,
          body: { sessionId, tokenId, revoked: true }
        };
      }
    });

    expect(route.path).toBe('/api/sessions/{sessionId}/tokens/{tokenId}');
    expect(route.response?.[200]).toBeDefined();
    expect(route.response?.[404]).toBeDefined();
  });

  it('should handle path parameters with special characters in route names', () => {
    const route = createApiRoute({
      path: '/api/files/{fileId}/versions/{versionId}',
      method: 'GET',
      response: {
        200: {
          contentType: 'application/json',
          body: Type.Object({
            fileId: Type.String(),
            versionId: Type.String(),
            fileName: Type.String(),
            version: Type.String()
          })
        }
      },
      handler: async (req) => {
        const fileId: string = req.params.fileId;
        const versionId: string = req.params.versionId;
        
        return {
          status: 200 as const,
          body: {
            fileId,
            versionId,
            fileName: `file-${fileId}`,
            version: `v${versionId}`
          }
        };
      }
    });

    expect(route.path).toBe('/api/files/{fileId}/versions/{versionId}');
    expect(typeof route.handler).toBe('function');
  });
});