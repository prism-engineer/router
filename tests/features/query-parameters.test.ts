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
        inputs: {
          query: Type.Object({
            page: Type.Optional(Type.Number()),
            limit: Type.Optional(Type.Number()),
            search: Type.Optional(Type.String())
          })
        },
        outputs: {
          body: Type.Array(Type.Object({
            id: Type.Number(),
            name: Type.String(),
            email: Type.String()
          }))
        },
        handler: (req, res) => {
          const { page = 1, limit = 10, search } = req.query;
          res.json([{ id: 1, name: 'John', email: 'john@example.com' }]);
        }
      });

      expect(route.inputs?.query).toBeDefined();
      expect(route.path).toBe('/api/users');
      expect(route.method).toBe('GET');
    });

    it('should define required query parameters', () => {
      const route = createApiRoute({
        path: '/api/search',
        method: 'GET',
        inputs: {
          query: Type.Object({
            q: Type.String(), // required
            category: Type.Optional(Type.String())
          })
        },
        outputs: {
          body: Type.Array(Type.Object({
            id: Type.Number(),
            title: Type.String()
          }))
        },
        handler: (req, res) => {
          const { q, category } = req.query;
          res.json([{ id: 1, title: `Results for ${q}` }]);
        }
      });

      expect(route.inputs?.query).toBeDefined();
    });

    it('should support different query parameter types', () => {
      const route = createApiRoute({
        path: '/api/products',
        method: 'GET',
        inputs: {
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
        outputs: {
          body: Type.Array(Type.Object({
            id: Type.Number(),
            name: Type.String(),
            price: Type.Number()
          }))
        },
        handler: (req, res) => {
          const { minPrice, maxPrice, inStock, tags, sortBy } = req.query;
          res.json([{ id: 1, name: 'Product 1', price: 99.99 }]);
        }
      });

      expect(route.inputs?.query).toBeDefined();
    });
  });

  describe('client usage', () => {
    it('should generate client methods with query parameter support', async () => {
      // This would be tested in integration tests with actual client generation
      // Here we just verify the route structure supports it
      const route = createApiRoute({
        path: '/api/users',
        method: 'GET',
        inputs: {
          query: Type.Object({
            page: Type.Optional(Type.Number()),
            limit: Type.Optional(Type.Number())
          })
        },
        outputs: {
          body: Type.Array(Type.Object({
            id: Type.Number(),
            name: Type.String()
          }))
        },
        handler: (req, res) => {
          res.json([]);
        }
      });

      // Verify route can be called with query parameters
      expect(route.inputs?.query).toBeDefined();
    });
  });
});