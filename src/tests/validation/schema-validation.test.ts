import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { Type } from '@sinclair/typebox';
import { createApiRoute } from '../../createApiRoute';
import { createRouter } from '../../router';

describe('Schema Validation Middleware', () => {
  let router: any;
  let app: any;

  beforeEach(() => {
    router = createRouter();
    app = router.app;
  });

  describe('Query Parameter Validation', () => {
    it('should validate required query parameters', async () => {
      const route = createApiRoute({
        path: '/api/search',
        method: 'GET',
        request: {
          query: Type.Object({
            q: Type.String({ minLength: 1 }),
            page: Type.Optional(Type.Number({ minimum: 1 }))
          })
        },
        response: {
          200: {
            contentType: 'application/json',
            body: Type.Object({ results: Type.Array(Type.String()) })
          }
        },
        handler: async () => ({
          status: 200 as const,
          body: { results: ['test'] }
        })
      });

      router.registerRoute(route);

      // Valid request
      const validResponse = await request(app)
        .get('/api/search?q=test&page=1')
        .expect(200);

      expect(validResponse.body.results).toEqual(['test']);

      // Missing required query parameter
      await request(app)
        .get('/api/search')
        .expect(400)
        .then(response => {
          expect(response.body.error).toBe('Validation failed');
          expect(response.body.details[0].type).toBe('query');
        });

      // Invalid query parameter type
      await request(app)
        .get('/api/search?q=test&page=invalid')
        .expect(400)
        .then(response => {
          expect(response.body.error).toBe('Validation failed');
          expect(response.body.details[0].type).toBe('query');
        });
    });

    it('should validate string constraints in query parameters', async () => {
      const route = createApiRoute({
        path: '/api/validate-string',
        method: 'GET',
        request: {
          query: Type.Object({
            email: Type.String({ format: 'email' }),
            name: Type.String({ minLength: 2, maxLength: 50 }),
            code: Type.String({ pattern: '^[A-Z]{3}$' })
          })
        },
        response: {
          200: {
            contentType: 'application/json',
            body: Type.Object({ valid: Type.Boolean() })
          }
        },
        handler: async () => ({
          status: 200 as const,
          body: { valid: true }
        })
      });

      router.registerRoute(route);

      // Valid request
      await request(app)
        .get('/api/validate-string?email=test@example.com&name=John&code=ABC')
        .expect(200);

      // Invalid email format
      await request(app)
        .get('/api/validate-string?email=invalid-email&name=John&code=ABC')
        .expect(400);

      // Name too short
      await request(app)
        .get('/api/validate-string?email=test@example.com&name=A&code=ABC')
        .expect(400);

      // Invalid pattern
      await request(app)
        .get('/api/validate-string?email=test@example.com&name=John&code=abc')
        .expect(400);
    });
  });

  describe('Request Body Validation', () => {
    it('should validate request body schema', async () => {
      const route = createApiRoute({
        path: '/api/users',
        method: 'POST',
        request: {
          body: Type.Object({
            name: Type.String({ minLength: 1 }),
            age: Type.Number({ minimum: 0, maximum: 120 }),
            email: Type.String({ format: 'email' }),
            preferences: Type.Optional(Type.Object({
              theme: Type.Union([Type.Literal('light'), Type.Literal('dark')]),
              notifications: Type.Boolean()
            }))
          })
        },
        response: {
          201: {
            contentType: 'application/json',
            body: Type.Object({
              id: Type.Number(),
              message: Type.String()
            })
          }
        },
        handler: async () => ({
          status: 201 as const,
          body: { id: 1, message: 'User created' }
        })
      });

      router.registerRoute(route);

      // Valid request
      const validBody = {
        name: 'John Doe',
        age: 30,
        email: 'john@example.com',
        preferences: {
          theme: 'dark',
          notifications: true
        }
      };

      await request(app)
        .post('/api/users')
        .send(validBody)
        .expect(201);

      // Missing required field
      await request(app)
        .post('/api/users')
        .send({ age: 30, email: 'john@example.com' })
        .expect(400)
        .then(response => {
          expect(response.body.error).toBe('Validation failed');
          expect(response.body.details[0].type).toBe('body');
        });

      // Invalid email format
      await request(app)
        .post('/api/users')
        .send({ name: 'John', age: 30, email: 'invalid-email' })
        .expect(400);

      // Age out of range
      await request(app)
        .post('/api/users')
        .send({ name: 'John', age: 150, email: 'john@example.com' })
        .expect(400);

      // Invalid union type
      await request(app)
        .post('/api/users')
        .send({
          name: 'John',
          age: 30,
          email: 'john@example.com',
          preferences: { theme: 'invalid', notifications: true }
        })
        .expect(400);
    });

    it('should validate nested objects and arrays', async () => {
      const route = createApiRoute({
        path: '/api/complex',
        method: 'POST',
        request: {
          body: Type.Object({
            data: Type.Array(Type.Object({
              id: Type.Number(),
              tags: Type.Array(Type.String({ minLength: 1 })),
              metadata: Type.Record(Type.String(), Type.Union([
                Type.String(),
                Type.Number(),
                Type.Boolean()
              ]))
            }), { minItems: 1 }),
            config: Type.Object({
              version: Type.String(),
              features: Type.Array(Type.String())
            })
          })
        },
        response: {
          200: {
            contentType: 'application/json',
            body: Type.Object({ success: Type.Boolean() })
          }
        },
        handler: async () => ({
          status: 200 as const,
          body: { success: true }
        })
      });

      router.registerRoute(route);

      // Valid complex request
      const validBody = {
        data: [{
          id: 1,
          tags: ['tag1', 'tag2'],
          metadata: {
            key1: 'string',
            key2: 42,
            key3: true
          }
        }],
        config: {
          version: '1.0.0',
          features: ['feature1', 'feature2']
        }
      };

      await request(app)
        .post('/api/complex')
        .send(validBody)
        .expect(200);

      // Empty array (violates minItems)
      await request(app)
        .post('/api/complex')
        .send({
          data: [],
          config: { version: '1.0.0', features: [] }
        })
        .expect(400);

      // Invalid metadata type
      await request(app)
        .post('/api/complex')
        .send({
          data: [{
            id: 1,
            tags: ['tag1'],
            metadata: { key1: { invalid: 'object' } }
          }],
          config: { version: '1.0.0', features: [] }
        })
        .expect(400);
    });
  });

  describe('Header Validation', () => {
    it('should validate request headers', async () => {
      const route = createApiRoute({
        path: '/api/protected',
        method: 'GET',
        request: {
          headers: Type.Object({
            authorization: Type.String({ pattern: '^Bearer .+' }),
            'x-api-version': Type.Union([Type.Literal('v1'), Type.Literal('v2')]),
            'x-request-id': Type.String({ format: 'uuid' }),
            'user-agent': Type.Optional(Type.String())
          })
        },
        response: {
          200: {
            contentType: 'application/json',
            body: Type.Object({ message: Type.String() })
          }
        },
        handler: async () => ({
          status: 200 as const,
          body: { message: 'Access granted' }
        })
      });

      router.registerRoute(route);

      // Valid headers
      await request(app)
        .get('/api/protected')
        .set('Authorization', 'Bearer token123')
        .set('X-API-Version', 'v1')
        .set('X-Request-ID', '123e4567-e89b-12d3-a456-426614174000')
        .expect(200);

      // Missing required header
      await request(app)
        .get('/api/protected')
        .set('X-API-Version', 'v1')
        .set('X-Request-ID', '123e4567-e89b-12d3-a456-426614174000')
        .expect(400)
        .then(response => {
          expect(response.body.error).toBe('Validation failed');
          expect(response.body.details[0].type).toBe('headers');
        });

      // Invalid authorization pattern
      await request(app)
        .get('/api/protected')
        .set('Authorization', 'Invalid token')
        .set('X-API-Version', 'v1')
        .set('X-Request-ID', '123e4567-e89b-12d3-a456-426614174000')
        .expect(400);

      // Invalid API version
      await request(app)
        .get('/api/protected')
        .set('Authorization', 'Bearer token123')
        .set('X-API-Version', 'v3')
        .set('X-Request-ID', '123e4567-e89b-12d3-a456-426614174000')
        .expect(400);

      // Invalid UUID format
      await request(app)
        .get('/api/protected')
        .set('Authorization', 'Bearer token123')
        .set('X-API-Version', 'v1')
        .set('X-Request-ID', 'invalid-uuid')
        .expect(400);
    });
  });

  describe('Combined Validation', () => {
    it('should validate query, body, and headers together', async () => {
      const route = createApiRoute({
        path: '/api/complete',
        method: 'POST',
        request: {
          query: Type.Object({
            format: Type.Union([Type.Literal('json'), Type.Literal('xml')])
          }),
          body: Type.Object({
            data: Type.String({ minLength: 1 })
          }),
          headers: Type.Object({
            'content-type': Type.Literal('application/json')
          })
        },
        response: {
          200: {
            contentType: 'application/json',
            body: Type.Object({ processed: Type.Boolean() })
          }
        },
        handler: async () => ({
          status: 200 as const,
          body: { processed: true }
        })
      });

      router.registerRoute(route);

      // All validations pass
      await request(app)
        .post('/api/complete?format=json')
        .set('Content-Type', 'application/json')
        .send({ data: 'test data' })
        .expect(200);

      // Multiple validation failures
      await request(app)
        .post('/api/complete?format=invalid')
        .set('Content-Type', 'application/json')
        .send({ data: '' })
        .expect(400)
        .then(response => {
          expect(response.body.error).toBe('Validation failed');
          expect(response.body.details.length).toBeGreaterThanOrEqual(2); // at least query and body
          const types = response.body.details.map((d: any) => d.type);
          expect(types).toContain('query');
          expect(types).toContain('body');
        });
    });
  });

  describe('Error Handling', () => {
    it('should handle validation errors gracefully', async () => {
      const route = createApiRoute({
        path: '/api/error-handling',
        method: 'POST',
        request: {
          body: Type.Object({
            requiredField: Type.String(),
            numberField: Type.Number({ minimum: 10 }),
            arrayField: Type.Array(Type.String(), { minItems: 2 })
          })
        },
        response: {
          200: {
            contentType: 'application/json',
            body: Type.Object({ success: Type.Boolean() })
          }
        },
        handler: async () => ({
          status: 200 as const,
          body: { success: true }
        })
      });

      router.registerRoute(route);

      await request(app)
        .post('/api/error-handling')
        .send({
          numberField: 5,
          arrayField: ['one']
        })
        .expect(400)
        .then(response => {
          expect(response.body.error).toBe('Validation failed');
          expect(response.body.details[0].type).toBe('body');
          expect(response.body.details[0].errors).toHaveLength(3); // Missing required field, number too small, array too small
        });
    });
  });
});