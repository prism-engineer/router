import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createApiRoute } from '../../src/createApiRoute';
import { Type } from '@sinclair/typebox';

describe('Headers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('route definition', () => {
    it('should define required headers', () => {
      const route = createApiRoute({
        path: '/api/protected',
        method: 'GET',
        inputs: {
          headers: Type.Object({
            authorization: Type.String(),
            'content-type': Type.String()
          })
        },
        outputs: {
          body: Type.Object({
            message: Type.String()
          })
        },
        handler: (req, res) => {
          const { authorization } = req.headers;
          res.json({ message: 'Access granted' });
        }
      });

      expect(route.inputs?.headers).toBeDefined();
      expect(route.path).toBe('/api/protected');
    });

    it('should define optional headers', () => {
      const route = createApiRoute({
        path: '/api/data',
        method: 'GET',
        inputs: {
          headers: Type.Object({
            authorization: Type.String(),
            'x-api-version': Type.Optional(Type.String()),
            'x-request-id': Type.Optional(Type.String())
          })
        },
        outputs: {
          body: Type.Object({
            data: Type.Array(Type.Any())
          })
        },
        handler: (req, res) => {
          const { authorization, 'x-api-version': version } = req.headers;
          res.json({ data: [] });
        }
      });

      expect(route.inputs?.headers).toBeDefined();
    });

    it('should support different header types', () => {
      const route = createApiRoute({
        path: '/api/upload',
        method: 'POST',
        inputs: {
          headers: Type.Object({
            'content-type': Type.Literal('multipart/form-data'),
            'content-length': Type.Number(),
            'x-upload-type': Type.Union([
              Type.Literal('image'),
              Type.Literal('document'),
              Type.Literal('video')
            ]),
            'x-compress': Type.Optional(Type.Boolean())
          }),
          body: Type.Object({
            file: Type.String()
          })
        },
        outputs: {
          body: Type.Object({
            fileId: Type.String(),
            url: Type.String()
          })
        },
        handler: (req, res) => {
          const headers = req.headers;
          res.json({ fileId: '123', url: '/files/123' });
        }
      });

      expect(route.inputs?.headers).toBeDefined();
      expect(route.inputs?.body).toBeDefined();
    });

    it('should support response headers', () => {
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
          })),
          headers: Type.Object({
            'x-total-count': Type.String(),
            'x-page': Type.String(),
            'x-per-page': Type.String()
          })
        },
        handler: (req, res) => {
          const { page = 1, limit = 10 } = req.query;
          res.set('x-total-count', '100');
          res.set('x-page', page.toString());
          res.set('x-per-page', limit.toString());
          res.json([{ id: 1, name: 'John' }]);
        }
      });

      expect(route.outputs?.headers).toBeDefined();
    });
  });

  describe('header validation', () => {
    it('should validate authorization headers', () => {
      const route = createApiRoute({
        path: '/api/secure',
        method: 'GET',
        inputs: {
          headers: Type.Object({
            authorization: Type.String({ pattern: '^Bearer .+' })
          })
        },
        outputs: {
          body: Type.Object({
            message: Type.String()
          })
        },
        handler: (req, res) => {
          res.json({ message: 'Authorized' });
        }
      });

      expect(route.inputs?.headers).toBeDefined();
    });

    it('should validate custom headers', () => {
      const route = createApiRoute({
        path: '/api/webhook',
        method: 'POST',
        inputs: {
          headers: Type.Object({
            'x-webhook-signature': Type.String(),
            'x-webhook-timestamp': Type.String(),
            'user-agent': Type.Optional(Type.String())
          }),
          body: Type.Object({
            event: Type.String(),
            data: Type.Any()
          })
        },
        outputs: {
          body: Type.Object({
            received: Type.Boolean()
          })
        },
        handler: (req, res) => {
          const { 'x-webhook-signature': signature } = req.headers;
          res.json({ received: true });
        }
      });

      expect(route.inputs?.headers).toBeDefined();
    });
  });
});