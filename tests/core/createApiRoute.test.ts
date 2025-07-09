/**
 * UNIT TESTS for createApiRoute function
 * 
 * Tests the core route definition factory function that:
 * - Creates route configuration objects with proper typing
 * - Validates TypeScript type inference for request/response schemas
 * - Ensures route objects have correct structure and properties
 * 
 * MOCKING: None needed - pure function that returns config objects
 * SCOPE: Only tests the createApiRoute function, not actual HTTP handling
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createApiRoute } from '../../src/createApiRoute';
import { Type } from '@sinclair/typebox';

describe('createApiRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('basic route creation', () => {
    it('should create a simple GET route', () => {
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

      expect(route).toBeDefined();
      expect(route.path).toBe('/api/hello');
      expect(route.method).toBe('GET');
      expect(route.handler).toBeDefined();
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
          const { name, email } = req.body;
          return {
            status: 201 as const,
            body: { id: 1, name, email }
          };
        }
      });

      expect(route.path).toBe('/api/users');
      expect(route.method).toBe('POST');
      expect(route.request?.body).toBeDefined();
      expect(route.response?.[201]?.body).toBeDefined();
    });

    it('should handle optional properties', () => {
      const route = createApiRoute({
        path: '/api/simple',
        method: 'GET',
        handler: async (req) => {
          // Handler can return void for simple responses
        }
      });

      expect(route.path).toBe('/api/simple');
      expect(route.method).toBe('GET');
      expect(route.request).toBeUndefined();
      expect(route.response).toBeUndefined();
    });
  });

  describe('schema validation', () => {
    it('should validate TypeBox schemas', () => {
      const route = createApiRoute({
        path: '/api/test',
        method: 'POST',
        request: {
          body: Type.Object({
            name: Type.String(),
            age: Type.Number()
          })
        },
        response: {
          200: {
            contentType: 'application/json',
            body: Type.Object({
              id: Type.Number(),
              name: Type.String(),
              age: Type.Number()
            })
          }
        },
        handler: async (req) => {
          return {
            status: 200 as const,
            body: { id: 1, name: req.body.name, age: req.body.age }
          };
        }
      });

      expect(route.request?.body).toBeDefined();
      expect(route.response?.[200]?.body).toBeDefined();
    });
  });
});