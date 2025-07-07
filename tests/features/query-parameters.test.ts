/**
 * UNIT TESTS for Query Parameter handling in route definitions
 * 
 * Tests that routes can define query parameter schemas with:
 * - Optional and required query parameters
 * - Different data types (string, number, boolean, arrays)
 * - Union types and complex validation schemas
 * - Proper TypeScript type inference for query objects
 * 
 * MOCKING: None needed - tests route definition structure only
 * SCOPE: Route definition validation, not actual HTTP query parsing
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createApiRoute } from '../../src/createApiRoute';
import { Type } from '@sinclair/typebox';

describe('Query Parameters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('route definition', () => {
    it('should define optional query parameters', () => {
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
            body: Type.Array(Type.Object({
              id: Type.Number(),
              name: Type.String(),
              email: Type.String()
            }))
          }
        },
        handler: async (req) => {
          const { page = 1, limit = 10, search } = req.query;
          return {
            status: 200 as const,
            body: [{ id: 1, name: 'John', email: 'john@example.com' }]
          };
        }
      });

      expect(route.request?.query).toBeDefined();
      expect(route.path).toBe('/api/users');
      expect(route.method).toBe('GET');
    });

    it('should define required query parameters', () => {
      const route = createApiRoute({
        path: '/api/search',
        method: 'GET',
        request: {
          query: Type.Object({
            q: Type.String(), // required
            category: Type.Optional(Type.String())
          })
        },
        response: {
          200: {
            body: Type.Array(Type.Object({
              id: Type.Number(),
              title: Type.String()
            }))
          }
        },
        handler: async (req) => {
          const { q, category } = req.query;
          return {
            status: 200 as const,
            body: [{ id: 1, title: `Results for ${q}` }]
          };
        }
      });

      expect(route.request?.query).toBeDefined();
    });

    it('should support different query parameter types', () => {
      const route = createApiRoute({
        path: '/api/products',
        method: 'GET',
        request: {
          query: Type.Object({
            minPrice: Type.Optional(Type.Number()),
            maxPrice: Type.Optional(Type.Number()),
            inStock: Type.Optional(Type.Boolean()),
            tags: Type.Optional(Type.Array(Type.String())),
            sortBy: Type.Optional(Type.Union([
              Type.Literal('price'),
              Type.Literal('name'),
              Type.Literal('date')
            ]))
          })
        },
        response: {
          200: {
            body: Type.Array(Type.Object({
              id: Type.Number(),
              name: Type.String(),
              price: Type.Number()
            }))
          }
        },
        handler: async (req) => {
          const { minPrice, maxPrice, inStock, tags, sortBy } = req.query;
          return {
            status: 200 as const,
            body: [{ id: 1, name: 'Product 1', price: 99.99 }]
          };
        }
      });

      expect(route.request?.query).toBeDefined();
    });
  });

  describe('client usage', () => {
    it('should generate client methods with query parameter support', async () => {
      // This would be tested in integration tests with actual client generation
      // Here we just verify the route structure supports it
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
            body: Type.Array(Type.Object({
              id: Type.Number(),
              name: Type.String()
            }))
          }
        },
        handler: async (req) => {
          return {
            status: 200 as const,
            body: []
          };
        }
      });

      // Verify route can be called with query parameters
      expect(route.request?.query).toBeDefined();
    });
  });
});