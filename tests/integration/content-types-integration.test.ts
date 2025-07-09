import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Type } from '@sinclair/typebox';
import { createRouter } from '../../src/router';
import { createApiRoute } from '../../src/createApiRoute';
import express from 'express';
import request from 'supertest';

describe('Content Types Integration', () => {
  let router: ReturnType<typeof createRouter>;
  let app: express.Express;

  beforeEach(() => {
    router = createRouter();
    app = router.app;
    app.use(express.json());
  });

  afterEach(() => {
    // Clean up any server instances if needed
  });

  describe('JSON Content Type Handling', () => {
    it('should handle application/json responses correctly', async () => {
      const route = createApiRoute({
        path: '/api/json-response',
        method: 'GET',
        response: {
          200: {
            contentType: 'application/json',
            body: Type.Object({
              message: Type.String(),
              timestamp: Type.Number()
            })
          }
        },
        handler: async () => {
          return { 
            status: 200 as const, 
            body: { 
              message: 'Success', 
              timestamp: Date.now() 
            } 
          };
        }
      });

      router.registerRoute(route);

      const response = await request(app)
        .get('/api/json-response')
        .expect(200);

      expect(response.headers['content-type']).toMatch(/^application\/json/);
      expect(response.body).toMatchObject({
        message: 'Success',
        timestamp: expect.any(Number)
      });
    });

    it('should handle application/vnd.api+json responses', async () => {
      const route = createApiRoute({
        path: '/api/jsonapi-response',
        method: 'GET',
        response: {
          200: {
            contentType: 'application/vnd.api+json',
            body: Type.Object({
              data: Type.Object({
                type: Type.String(),
                id: Type.String(),
                attributes: Type.Object({
                  name: Type.String()
                })
              })
            })
          }
        },
        handler: async () => {
          return { 
            status: 200 as const, 
            body: { 
              data: {
                type: 'users',
                id: '123',
                attributes: {
                  name: 'John Doe'
                }
              }
            } 
          };
        }
      });

      router.registerRoute(route);

      const response = await request(app)
        .get('/api/jsonapi-response')
        .expect(200);

      expect(response.headers['content-type']).toMatch(/^application\/vnd\.api\+json/);
      expect(response.body).toMatchObject({
        data: {
          type: 'users',
          id: '123',
          attributes: {
            name: 'John Doe'
          }
        }
      });
    });
  });

  describe('Custom Content Type Handling', () => {
    it('should handle text/plain responses using custom handler', async () => {
      const route = createApiRoute({
        path: '/api/text-response',
        method: 'GET',
        response: {
          200: {
            contentType: 'text/plain'
          }
        },
        handler: async () => {
          return { 
            status: 200 as const, 
            custom: (res: express.Response) => {
              res.setHeader('Content-Type', 'text/plain');
              res.send('Hello, World!');
            }
          };
        }
      });

      router.registerRoute(route);

      const response = await request(app)
        .get('/api/text-response')
        .expect(200);

      expect(response.headers['content-type']).toMatch(/^text\/plain/);
      expect(response.text).toBe('Hello, World!');
    });

    it('should handle binary content types', async () => {
      const route = createApiRoute({
        path: '/api/binary-response',
        method: 'GET',
        response: {
          200: {
            contentType: 'application/octet-stream'
          }
        },
        handler: async () => {
          return { 
            status: 200 as const, 
            custom: (res: express.Response) => {
              res.setHeader('Content-Type', 'application/octet-stream');
              res.setHeader('Content-Disposition', 'attachment; filename="data.bin"');
              res.send(Buffer.from([0x48, 0x65, 0x6c, 0x6c, 0x6f])); // "Hello" in bytes
            }
          };
        }
      });

      router.registerRoute(route);

      const response = await request(app)
        .get('/api/binary-response')
        .expect(200);

      expect(response.headers['content-type']).toBe('application/octet-stream');
      expect(response.headers['content-disposition']).toBe('attachment; filename="data.bin"');
      expect(response.body).toEqual(Buffer.from([0x48, 0x65, 0x6c, 0x6c, 0x6f]));
    });

    it('should handle CSV responses', async () => {
      const route = createApiRoute({
        path: '/api/csv-export',
        method: 'GET',
        response: {
          200: {
            contentType: 'text/csv'
          }
        },
        handler: async () => {
          return { 
            status: 200 as const, 
            custom: (res: express.Response) => {
              res.setHeader('Content-Type', 'text/csv');
              res.setHeader('Content-Disposition', 'attachment; filename="export.csv"');
              res.send('Name,Email,Age\nJohn Doe,john@example.com,30\nJane Smith,jane@example.com,25');
            }
          };
        }
      });

      router.registerRoute(route);

      const response = await request(app)
        .get('/api/csv-export')
        .expect(200);

      expect(response.headers['content-type']).toMatch(/^text\/csv/);
      expect(response.headers['content-disposition']).toBe('attachment; filename="export.csv"');
      expect(response.text).toBe('Name,Email,Age\nJohn Doe,john@example.com,30\nJane Smith,jane@example.com,25');
    });
  });

  describe('Mixed Response Types', () => {
    it('should handle routes with both JSON and custom content types', async () => {
      const route = createApiRoute({
        path: '/api/mixed-response/{id}',
        method: 'GET',
        response: {
          200: {
            contentType: 'application/json',
            body: Type.Object({
              id: Type.String(),
              data: Type.Any()
            })
          },
          404: {
            contentType: 'application/json',
            body: Type.Object({
              error: Type.String()
            })
          },
          500: {
            contentType: 'text/plain'
          }
        },
        handler: async (req) => {
          const id = req.params.id;
          
          if (id === 'error') {
            return { 
              status: 500 as const, 
              custom: (res: express.Response) => {
                res.setHeader('Content-Type', 'text/plain');
                res.status(500).send('Internal Server Error');
              }
            };
          }
          
          if (id === 'notfound') {
            return { 
              status: 404 as const, 
              body: { 
                error: 'Resource not found' 
              } 
            };
          }
          
          return { 
            status: 200 as const, 
            body: { 
              id: id,
              data: { message: 'Found resource' }
            } 
          };
        }
      });

      router.registerRoute(route);

      // Test 200 JSON response
      const successResponse = await request(app)
        .get('/api/mixed-response/123')
        .expect(200);

      expect(successResponse.headers['content-type']).toMatch(/^application\/json/);
      expect(successResponse.body).toMatchObject({
        id: '123',
        data: { message: 'Found resource' }
      });

      // Test 404 JSON response
      const notFoundResponse = await request(app)
        .get('/api/mixed-response/notfound')
        .expect(404);

      expect(notFoundResponse.headers['content-type']).toMatch(/^application\/json/);
      expect(notFoundResponse.body).toMatchObject({
        error: 'Resource not found'
      });

      // Test 500 custom text response
      const errorResponse = await request(app)
        .get('/api/mixed-response/error')
        .expect(500);

      expect(errorResponse.headers['content-type']).toMatch(/^text\/plain/);
      expect(errorResponse.text).toBe('Internal Server Error');
    });
  });

  describe('Error Handling', () => {
    it('should handle errors in custom response handlers gracefully', async () => {
      const route = createApiRoute({
        path: '/api/error-custom',
        method: 'GET',
        response: {
          200: {
            contentType: 'text/plain'
          }
        },
        handler: async () => {
          return { 
            status: 200 as const, 
            custom: async (res: express.Response) => {
              throw new Error('Custom handler error');
            }
          };
        }
      });

      router.registerRoute(route);

      const response = await request(app)
        .get('/api/error-custom')
        .expect(500);

      expect(response.body).toMatchObject({
        error: 'Internal server error'
      });
    });

    it('should handle JSON serialization errors gracefully', async () => {
      const route = createApiRoute({
        path: '/api/error-json',
        method: 'GET',
        response: {
          200: {
            contentType: 'application/json',
            body: Type.Object({
              data: Type.Any()
            })
          }
        },
        handler: async () => {
          // Create circular reference that can't be JSON serialized
          const obj: any = {};
          obj.circular = obj;
          
          return { 
            status: 200 as const, 
            body: { 
              data: obj 
            } 
          };
        }
      });

      router.registerRoute(route);

      const response = await request(app)
        .get('/api/error-json')
        .expect(500);

      expect(response.body).toMatchObject({
        error: 'Internal server error'
      });
    });
  });
});