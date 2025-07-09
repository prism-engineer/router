/**
 * INTEGRATION TESTS for Handler Execution
 * 
 * Tests that route handlers execute correctly with proper:
 * - Request parsing (body, query, params, headers)
 * - Response formatting and status codes
 * - Error handling and edge cases
 * - TypeScript type safety in handler functions
 * 
 * MOCKING: None - tests actual handler function execution
 * SCOPE: Handler function behavior and request/response processing
 */
import { describe, it, expect, beforeEach, expectTypeOf } from 'vitest';
import { createApiRoute } from '../../src/createApiRoute';
import { Type } from '@sinclair/typebox';
import assert from 'node:assert';

describe('Handler Execution', () => {
  describe('request object processing', () => {
    it('should provide correctly typed request body to handlers', async () => {
      const route = createApiRoute({
        path: '/api/test',
        method: 'POST',
        request: {
          body: Type.Object({
            name: Type.String(),
            age: Type.Number(),
            email: Type.String()
          })
        },
        response: {
          200: {
            contentType: 'application/json',
            body: Type.Object({
              processed: Type.Boolean(),
              data: Type.Object({
                name: Type.String(),
                age: Type.Number(),
                email: Type.String()
              })
            })
          }
        },
        handler: async (req) => {
          // Test that TypeScript types are working correctly
          const { name, age, email } = req.body;
          
          // These should be typed correctly
          expect(typeof name).toBe('string');
          expect(typeof age).toBe('number'); 
          expect(typeof email).toBe('string');
          
          return {
            status: 200 as const,
            body: {
              processed: true,
              data: { name, age, email }
            }
          };
        }
      });

      // Simulate request object
      const mockRequest = {
        body: {
          name: 'John Doe',
          age: 30,
          email: 'john@example.com'
        },
        query: {},
        headers: {},
        params: {}
      };

      const result = await route.handler(mockRequest);
      
      expect(result).toEqual({
        status: 200,
        body: {
          processed: true,
          data: {
            name: 'John Doe',
            age: 30,
            email: 'john@example.com'
          }
        }
      });
    });

    it('should provide correctly typed query parameters to handlers', async () => {
      const route = createApiRoute({
        path: '/api/search',
        method: 'GET',
        request: {
          query: Type.Object({
            q: Type.String(),
            page: Type.Optional(Type.Number()),
            limit: Type.Optional(Type.Number()),
            active: Type.Optional(Type.Boolean())
          })
        },
        response: {
          200: {
            contentType: 'application/json',
            body: Type.Object({
              query: Type.String(),
              page: Type.Number(),
              limit: Type.Number(),
              active: Type.Boolean(),
              results: Type.Array(Type.String())
            })
          }
        },
        handler: async (req) => {
          const { q, page = 1, limit = 10, active = true } = req.query;
          
          // Verify types are working
          expect(typeof q).toBe('string');
          expect(typeof page).toBe('number');
          expect(typeof limit).toBe('number');
          expect(typeof active).toBe('boolean');
          
          return {
            status: 200 as const,
            body: {
              query: q,
              page,
              limit,
              active,
              results: [`Result for "${q}"`]
            }
          };
        }
      });

      const mockRequest = {
        body: {},
        query: {
          q: 'test search',
          page: 2,
          limit: 5,
          active: false
        },
        headers: {},
        params: {}
      };

      const result = await route.handler(mockRequest);
      
      expect(result).toEqual({
        status: 200,
        body: {
          query: 'test search',
          page: 2,
          limit: 5,
          active: false,
          results: ['Result for "test search"']
        }
      });
    });

    it('should extract path parameters correctly', async () => {
      const route = createApiRoute({
        path: '/api/users/{userId}/posts/{postId}',
        method: 'GET',
        response: {
          200: {
            contentType: 'application/json',
            body: Type.Object({
              userId: Type.String(),
              postId: Type.String(),
              message: Type.String()
            })
          }
        },
        handler: async (req) => {
          const { userId, postId } = req.params;
          
          // Test that params are extracted correctly
          expect(typeof userId).toBe('string');
          expect(typeof postId).toBe('string');
          
          return {
            status: 200 as const,
            body: {
              userId,
              postId,
              message: `Post ${postId} by user ${userId}`
            }
          };
        }
      });

      const mockRequest = {
        body: {},
        query: {},
        headers: {},
        params: {
          userId: '123',
          postId: '456'
        }
      };

      const result = await route.handler(mockRequest);
      
      expect(result).toEqual({
        status: 200,
        body: {
          userId: '123',
          postId: '456',
          message: 'Post 456 by user 123'
        }
      });
    });

    it('should provide typed headers to handlers', async () => {
      const route = createApiRoute({
        path: '/api/protected',
        method: 'GET',
        request: {
          headers: Type.Object({
            authorization: Type.String(),
            'x-api-version': Type.Optional(Type.String()),
            'x-request-id': Type.String()
          })
        },
        response: {
          200: {
            contentType: 'application/json',
            body: Type.Object({
              authorized: Type.Boolean(),
              version: Type.String(),
              requestId: Type.String()
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
          const { 
            authorization, 
            'x-api-version': apiVersion = 'v1',
            'x-request-id': requestId 
          } = req.headers;
          
          expect(typeof authorization).toBe('string');
          expect(typeof apiVersion).toBe('string');
          expect(typeof requestId).toBe('string');
          
          if (!authorization.startsWith('Bearer ')) {
            return {
              status: 401 as const,
              body: {
                error: 'Invalid authorization'
              }
            };
          }
          
          return {
            status: 200 as const,
            body: {
              authorized: true,
              version: apiVersion,
              requestId
            }
          };
        }
      });

      // Test with valid headers
      const validRequest = {
        body: {},
        query: {},
        params: {},
        headers: {
          authorization: 'Bearer token123',
          'x-api-version': 'v2',
          'x-request-id': 'req-123'
        }
      };

      const validResult = await route.handler(validRequest);
      expect(validResult).toEqual({
        status: 200,
        body: {
          authorized: true,
          version: 'v2',
          requestId: 'req-123'
        }
      });

      // Test with invalid headers
      const invalidRequest = {
        body: {},
        query: {},
        params: {},
        headers: {
          authorization: 'Invalid token',
          'x-request-id': 'req-456'
        }
      };

      const invalidResult = await route.handler(invalidRequest);
      expect(invalidResult).toEqual({
        status: 401,
        body: {
          error: 'Invalid authorization'
        }
      });
    });
  });

  describe('response object formatting', () => {
    it('should return responses with correct status codes', async () => {
      const route = createApiRoute({
        path: '/api/status-test',
        method: 'POST',
        request: {
          body: Type.Object({
            action: Type.Union([
              Type.Literal('create'),
              Type.Literal('update'),
              Type.Literal('delete'),
              Type.Literal('error')
            ])
          })
        },
        response: {
          200: {
            contentType: 'application/json',
            body: Type.Object({ message: Type.String() })
          },
          201: {
            contentType: 'application/json',
            body: Type.Object({ message: Type.String(), id: Type.Number() })
          },
          204: {
            contentType: 'application/json',
            body: Type.Object({})
          },
          400: {
            contentType: 'application/json',
            body: Type.Object({ error: Type.String() })
          }
        },
        handler: async (req) => {
          const { action } = req.body;
          
          switch (action) {
            case 'create':
              return {
                status: 201 as const,
                body: {
                  message: 'Created successfully',
                  id: 123
                }
              };
              
            case 'update':
              return {
                status: 200 as const,
                body: {
                  message: 'Updated successfully'
                }
              };
              
            case 'delete':
              return {
                status: 204 as const,
                body: {}
              };
              
            case 'error':
              return {
                status: 400 as const,
                body: {
                  error: 'Invalid action'
                }
              };
              
            default:
              return {
                status: 400 as const,
                body: {
                  error: 'Unknown action'
                }
              };
          }
        }
      });

      // Test different status codes
      const testCases = [
        {
          action: 'create',
          expected: {
            status: 201 as const,
            body: { message: 'Created successfully', id: 123 }
          }
        },
        {
          action: 'update',
          expected: {
            status: 200 as const,
            body: { message: 'Updated successfully' }
          }
        },
        {
          action: 'delete',
          expected: {
            status: 204 as const,
            body: {}
          }
        },
        {
          action: 'error',
          expected: {
            status: 400 as const,
            body: { error: 'Invalid action' }
          }
        }
      ] as const;

      testCases.forEach(async ({ action, expected }) => {
        const mockRequest = {
          body: { action },
          query: {},
          headers: {},
          params: {}
        };

        const result = await route.handler(mockRequest);
        expect(result).toEqual(expected);
      });
    });

    it('should handle response headers correctly', async () => {
      const route = createApiRoute({
        path: '/api/with-headers',
        method: 'GET',
        response: {
          200: {
            contentType: 'application/json',
            body: Type.Object({
              data: Type.String()
            }),
            headers: Type.Object({
              'x-custom-header': Type.String(),
              'x-timestamp': Type.String(),
              'cache-control': Type.String()
            })
          }
        },
        handler: async (req) => {
          return {
            status: 200 as const,
            body: {
              data: 'Some data'
            },
            headers: {
              'x-custom-header': 'custom-value',
              'x-timestamp': new Date().toISOString(),
              'cache-control': 'no-cache'
            }
          };
        }
      });

      const mockRequest = {
        body: {},
        query: {},
        headers: {},
        params: {}
      };

      const result = await route.handler(mockRequest);
      
      expect(result.status).toBe(200);
      expect(result.body).toEqual({ data: 'Some data' });
      expect(result.headers).toBeDefined();
      expect(result.headers!['x-custom-header']).toBe('custom-value');
      expect(result.headers!['cache-control']).toBe('no-cache');
      expect(result.headers!['x-timestamp']).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe('error handling in handlers', () => {
    it('should handle synchronous errors in handlers', () => {
      const route = createApiRoute({
        path: '/api/sync-error',
        method: 'GET',
        response: {
          200: {
            contentType: 'application/json',
            body: Type.Object({ message: Type.String() })
          },
          500: {
            contentType: 'application/json',
            body: Type.Object({ error: Type.String() })
          }
        },
        handler: (req) => {
          throw new Error('Synchronous error occurred');
        }
      });

      const mockRequest = {
        body: {},
        query: {},
        headers: {},
        params: {}
      };

      // Handler should throw when executed directly
      expect(() => {
        route.handler(mockRequest);
      }).toThrow('Synchronous error occurred');
    });

    it('should handle conditional error responses', async () => {
      const route = createApiRoute({
        path: '/api/conditional-error',
        method: 'POST',
        request: {
          body: Type.Object({
            value: Type.Number()
          })
        },
        response: {
          200: {
            contentType: 'application/json',
            body: Type.Object({
              result: Type.Number()
            })
          },
          400: {
            contentType: 'application/json',
            body: Type.Object({
              error: Type.String(),
              details: Type.String()
            })
          }
        },
        handler: async (req) => {
          const { value } = req.body;
          
          if (value < 0) {
            return {
              status: 400 as const,
              body: {
                error: 'Invalid input',
                details: 'Value must be non-negative'
              }
            };
          }
          
          if (value > 100) {
            return {
              status: 400 as const,
              body: {
                error: 'Invalid input',
                details: 'Value must not exceed 100'
              }
            };
          }
          
          return {
            status: 200 as const,
            body: {
              result: value * 2
            }
          };
        }
      });

      // Test valid input
      const validRequest = {
        body: { value: 50 },
        query: {},
        headers: {},
        params: {}
      };

      const validResult = await route.handler(validRequest);
      expect(validResult).toEqual({
        status: 200,
        body: { result: 100 }
      });

      // Test negative input
      const negativeRequest = {
        body: { value: -10 },
        query: {},
        headers: {},
        params: {}
      };

      const negativeResult = await route.handler(negativeRequest);
      expect(negativeResult).toEqual({
        status: 400,
        body: {
          error: 'Invalid input',
          details: 'Value must be non-negative'
        }
      });

      // Test too large input
      const largeRequest = {
        body: { value: 150 },
        query: {},
        headers: {},
        params: {}
      };

      const largeResult = await route.handler(largeRequest);
      expect(largeResult).toEqual({
        status: 400,
        body: {
          error: 'Invalid input',
          details: 'Value must not exceed 100'
        }
      });
    });
  });

  describe('complex handler scenarios', () => {
    it('should handle handlers with complex business logic', async () => {
      const route = createApiRoute({
        path: '/api/complex-processing',
        method: 'POST',
        request: {
          body: Type.Object({
            items: Type.Array(Type.Object({
              id: Type.Number(),
              quantity: Type.Number(),
              price: Type.Number()
            })),
            discountCode: Type.Optional(Type.String()),
            userId: Type.String()
          }),
          headers: Type.Object({
            'x-currency': Type.String()
          })
        },
        response: {
          200: {
            contentType: 'application/json',
            body: Type.Object({
              orderId: Type.String(),
              total: Type.Number(),
              discountApplied: Type.Number(),
              currency: Type.String(),
              itemCount: Type.Number()
            })
          },
          400: {
            contentType: 'application/json',
            body: Type.Object({
              error: Type.String()
            })
          }
        },
        handler: async (req) => {
          const { items, discountCode, userId } = req.body;
          const { 'x-currency': currency } = req.headers;

          // Validate items
          if (!items || items.length === 0) {
            return {
              status: 400 as const,
              body: {
                error: 'No items provided'
              }
            };
          }

          // Calculate subtotal
          const subtotal = items.reduce((sum, item) => {
            return sum + (item.quantity * item.price);
          }, 0);

          // Apply discount
          let discountApplied = 0;
          if (discountCode === 'SAVE10') {
            discountApplied = subtotal * 0.1;
          } else if (discountCode === 'SAVE20') {
            discountApplied = subtotal * 0.2;
          }

          const total = subtotal - discountApplied;
          const orderId = `${userId}-${Date.now()}`;

          return {
            status: 200 as const,
            body: {
              orderId,
              total: Math.round(total * 100) / 100, // Round to 2 decimal places
              discountApplied: Math.round(discountApplied * 100) / 100,
              currency,
              itemCount: items.length
            }
          };
        }
      });

      const mockRequest = {
        body: {
          items: [
            { id: 1, quantity: 2, price: 10.50 },
            { id: 2, quantity: 1, price: 25.00 }
          ],
          discountCode: 'SAVE10',
          userId: 'user123'
        },
        query: {},
        headers: {
          'x-currency': 'USD'
        },
        params: {}
      };

      const result = await route.handler(mockRequest);
      
      assert(result.status === 200);
      expect(result.body.total).toBe(41.4); // (21 + 25) * 0.9 = 41.4
      expect(result.body.discountApplied).toBe(4.6); // 46 * 0.1 = 4.6
      expect(result.body.currency).toBe('USD');
      expect(result.body.itemCount).toBe(2);
      expect(result.body.orderId).toContain('user123-');
    });
  });
});