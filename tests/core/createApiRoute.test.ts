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
        outputs: {
          body: Type.Object({
            message: Type.String()
          })
        },
        handler: (req, res) => {
          res.json({ message: 'Hello, World!' });
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
        inputs: {
          body: Type.Object({
            name: Type.String(),
            email: Type.String()
          })
        },
        outputs: {
          body: Type.Object({
            id: Type.Number(),
            name: Type.String(),
            email: Type.String()
          })
        },
        handler: (req, res) => {
          const { name, email } = req.body;
          res.json({ id: 1, name, email });
        }
      });

      expect(route.path).toBe('/api/users');
      expect(route.method).toBe('POST');
      expect(route.inputs?.body).toBeDefined();
      expect(route.outputs.body).toBeDefined();
    });

    it('should handle optional properties', () => {
      const route = createApiRoute({
        path: '/api/simple',
        method: 'GET',
        handler: (req, res) => {
          res.json({ status: 'ok' });
        }
      });

      expect(route.path).toBe('/api/simple');
      expect(route.method).toBe('GET');
      expect(route.inputs).toBeUndefined();
      expect(route.outputs).toBeUndefined();
      expect(route.auth).toBeUndefined();
    });
  });

  describe('schema validation', () => {
    it('should validate TypeBox schemas', () => {
      const route = createApiRoute({
        path: '/api/test',
        method: 'POST',
        inputs: {
          body: Type.Object({
            name: Type.String(),
            age: Type.Number()
          })
        },
        outputs: {
          body: Type.Object({
            id: Type.Number(),
            name: Type.String(),
            age: Type.Number()
          })
        },
        handler: (req, res) => {
          res.json({ id: 1, name: req.body.name, age: req.body.age });
        }
      });

      expect(route.inputs?.body).toBeDefined();
      expect(route.outputs?.body).toBeDefined();
    });
  });
});