import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createApiRoute } from '../../src/createApiRoute';
import { Type } from '@sinclair/typebox';

describe('Authentication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('auth configuration', () => {
    it('should create route without auth (default)', () => {
      const route = createApiRoute({
        path: '/api/public',
        method: 'GET',
        outputs: {
          body: Type.Object({
            message: Type.String()
          })
        },
        handler: (req, res) => {
          res.json({ message: 'Public endpoint' });
        }
      });

      expect(route.auth).toBeUndefined();
    });

    it('should create route with bearer token auth', () => {
      const route = createApiRoute({
        path: '/api/secure',
        method: 'GET',
        outputs: {
          body: Type.Object({
            data: Type.String()
          })
        },
        auth: { required: true, type: 'bearer' },
        handler: (req, res) => {
          res.json({ data: 'Secret information' });
        }
      });

      expect(route.auth).toEqual({ required: true, type: 'bearer' });
    });

    it('should create route with API key auth', () => {
      const route = createApiRoute({
        path: '/api/data',
        method: 'GET',
        outputs: {
          body: Type.Object({
            results: Type.Array(Type.Any())
          })
        },
        auth: { 
          required: true, 
          type: 'apikey', 
          location: 'header', 
          name: 'x-api-key' 
        },
        handler: (req, res) => {
          res.json({ results: [] });
        }
      });

      expect(route.auth).toEqual({
        required: true,
        type: 'apikey',
        location: 'header',
        name: 'x-api-key'
      });
    });

    it('should create route with basic auth', () => {
      const route = createApiRoute({
        path: '/api/admin',
        method: 'GET',
        outputs: {
          body: Type.Object({
            adminData: Type.String()
          })
        },
        auth: { required: true, type: 'basic' },
        handler: (req, res) => {
          res.json({ adminData: 'Admin only' });
        }
      });

      expect(route.auth).toEqual({ required: true, type: 'basic' });
    });

    it('should create route with custom auth validator', () => {
      const customValidator = vi.fn().mockReturnValue(true);
      
      const route = createApiRoute({
        path: '/api/custom',
        method: 'GET',
        outputs: {
          body: Type.Object({
            message: Type.String()
          })
        },
        auth: { 
          required: true, 
          type: 'custom', 
          validator: customValidator 
        },
        handler: (req, res) => {
          res.json({ message: 'Custom auth passed' });
        }
      });

      expect(route.auth?.type).toBe('custom');
      expect(route.auth?.validator).toBe(customValidator);
    });
  });

  describe('auth types', () => {
    it('should support optional auth', () => {
      const route = createApiRoute({
        path: '/api/optional-auth',
        method: 'GET',
        outputs: {
          body: Type.Object({
            message: Type.String(),
            user: Type.Optional(Type.Object({
              id: Type.Number(),
              name: Type.String()
            }))
          })
        },
        auth: { required: false },
        handler: (req, res) => {
          // User might or might not be authenticated
          res.json({ message: 'Works for all users' });
        }
      });

      expect(route.auth).toEqual({ required: false });
    });

    it('should support role-based auth', () => {
      const route = createApiRoute({
        path: '/api/admin/users',
        method: 'DELETE',
        inputs: {
          body: Type.Object({
            userId: Type.Number()
          })
        },
        outputs: {
          body: Type.Object({
            success: Type.Boolean()
          })
        },
        auth: { 
          required: true, 
          type: 'bearer',
          roles: ['admin', 'moderator']
        },
        handler: (req, res) => {
          res.json({ success: true });
        }
      });

      expect(route.auth?.roles).toEqual(['admin', 'moderator']);
    });
  });

  describe('auth integration', () => {
    it('should work with headers for token validation', () => {
      const route = createApiRoute({
        path: '/api/profile',
        method: 'GET',
        inputs: {
          headers: Type.Object({
            authorization: Type.String()
          })
        },
        outputs: {
          body: Type.Object({
            id: Type.Number(),
            name: Type.String(),
            email: Type.String()
          })
        },
        auth: { required: true, type: 'bearer' },
        handler: (req, res) => {
          // req.user would be populated by auth middleware
          res.json({ id: 1, name: 'John', email: 'john@example.com' });
        }
      });

      expect(route.inputs?.headers).toBeDefined();
      expect(route.auth).toEqual({ required: true, type: 'bearer' });
    });
  });
});