import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { Type } from '@sinclair/typebox';
import { createApiRoute } from '../../createApiRoute.js';
import { createRouter } from '../../router.js';

describe('Response Header Validation', () => {
  let router: any;
  let app: any;

  beforeEach(() => {
    router = createRouter();
    app = router.app;
  });

  it('should validate response headers match the schema', async () => {
    const responseHeaderSchema = Type.Object({
      'x-rate-limit': Type.String({ pattern: '^\\d+$' }),
      'x-rate-limit-remaining': Type.String({ pattern: '^\\d+$' }),
      'x-rate-limit-reset': Type.String(),
      'cache-control': Type.Optional(Type.String()),
      'x-custom-header': Type.String({ minLength: 5 })
    });

    const route = createApiRoute({
      path: '/api/with-headers',
      method: 'GET',
      response: {
        200: {
          contentType: 'application/json',
          body: Type.Object({
            message: Type.String()
          }),
          headers: responseHeaderSchema
        }
      },
      handler: async (_req) => {
        return {
          status: 200 as const,
          body: { message: 'Success' },
          headers: {
            'x-rate-limit': '1000',
            'x-rate-limit-remaining': '999',
            'x-rate-limit-reset': '2023-01-01T00:00:00Z',
            'cache-control': 'no-cache',
            'x-custom-header': 'valid-value'
          }
        };
      }
    });

    router.registerRoute(route);

    const response = await request(app)
      .get('/api/with-headers')
      .expect(200);

    expect(response.headers['x-rate-limit']).toBe('1000');
    expect(response.headers['x-rate-limit-remaining']).toBe('999');
    expect(response.headers['x-rate-limit-reset']).toBe('2023-01-01T00:00:00Z');
    expect(response.headers['cache-control']).toBe('no-cache');
    expect(response.headers['x-custom-header']).toBe('valid-value');
  });

  it('should handle missing optional response headers', async () => {
    const responseHeaderSchema = Type.Object({
      'x-required-header': Type.String(),
      'x-optional-header': Type.Optional(Type.String()),
      'x-version': Type.Union([Type.Literal('v1'), Type.Literal('v2')])
    });

    const route = createApiRoute({
      path: '/api/partial-headers',
      method: 'GET',
      response: {
        200: {
          contentType: 'application/json',
          body: Type.Object({
            data: Type.String()
          }),
          headers: responseHeaderSchema
        }
      },
      handler: async (_req) => {
        return {
          status: 200 as const,
          body: { data: 'test' },
          headers: {
            'x-required-header': 'present',
            'x-version': 'v2' as const
            // x-optional-header is intentionally omitted
          }
        };
      }
    });

    router.registerRoute(route);

    const response = await request(app)
      .get('/api/partial-headers')
      .expect(200);

    expect(response.headers['x-required-header']).toBe('present');
    expect(response.headers['x-version']).toBe('v2');
    expect(response.headers['x-optional-header']).toBeUndefined();
  });

  it('should validate response headers with complex constraints', async () => {
    const complexHeaderSchema = Type.Object({
      'content-range': Type.String({ pattern: '^bytes \\d+-\\d+/\\d+$' }),
      'x-api-version': Type.Union([Type.Literal('v1'), Type.Literal('v2'), Type.Literal('v3')]),
      'x-request-id': Type.String({ format: 'uuid' }),
      'expires': Type.String(),
      'x-total-count': Type.String({ pattern: '^\\d+$' }),
      'link': Type.Optional(Type.String())
    });

    const route = createApiRoute({
      path: '/api/paginated',
      method: 'GET',
      response: {
        206: {
          contentType: 'application/json',
          body: Type.Array(Type.Object({
            id: Type.Number(),
            name: Type.String()
          })),
          headers: complexHeaderSchema
        }
      },
      handler: async (_req) => {
        return {
          status: 206 as const,
          body: [
            { id: 1, name: 'Item 1' },
            { id: 2, name: 'Item 2' }
          ],
          headers: {
            'content-range': 'bytes 0-99/200',
            'x-api-version': 'v2' as const,
            'x-request-id': '123e4567-e89b-12d3-a456-426614174000',
            'expires': 'Thu, 01 Dec 2023 16:00:00 GMT',
            'x-total-count': '200',
            'link': '<https://api.example.com/items?page=2>; rel="next"'
          }
        };
      }
    });

    router.registerRoute(route);

    const response = await request(app)
      .get('/api/paginated')
      .expect(206);

    expect(response.headers['content-range']).toBe('bytes 0-99/200');
    expect(response.headers['x-api-version']).toBe('v2');
    expect(response.headers['x-request-id']).toBe('123e4567-e89b-12d3-a456-426614174000');
    expect(response.headers['expires']).toBe('Thu, 01 Dec 2023 16:00:00 GMT');
    expect(response.headers['x-total-count']).toBe('200');
    expect(response.headers['link']).toBe('<https://api.example.com/items?page=2>; rel="next"');
  });
});