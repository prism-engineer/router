import { describe, it, expect, beforeEach } from 'vitest';
import { Type } from '@sinclair/typebox';
import { createRouter } from '../../src/router';
import { createApiRoute } from '../../src/createApiRoute';
import express from 'express';
import request from 'supertest';

describe('Content-Type Header Fix', () => {
  let router: ReturnType<typeof createRouter>;
  let app: express.Express;

  beforeEach(() => {
    router = createRouter();
    app = router.app;
    app.use(express.json());
  });

  it('should use JSON serialization for application/json content type', async () => {
    const route = createApiRoute({
      path: '/api/json-test',
      method: 'GET',
      response: {
        200: {
          contentType: 'application/json',
          body: Type.Object({
            message: Type.String()
          })
        }
      },
      handler: async () => {
        return { 
          status: 200 as const, 
          body: { message: 'JSON response' } 
        };
      }
    });

    router.registerRoute(route);

    const response = await request(app)
      .get('/api/json-test')
      .expect(200);

    expect(response.headers['content-type']).toMatch(/^application\/json/);
    expect(response.body).toEqual({ message: 'JSON response' });
  });

  it('should use JSON serialization for application/vnd.api+json content type', async () => {
    const route = createApiRoute({
      path: '/api/jsonapi-test',
      method: 'GET',
      response: {
        200: {
          contentType: 'application/vnd.api+json',
          body: Type.Object({
            data: Type.Object({
              type: Type.String(),
              id: Type.String()
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
              id: '123' 
            } 
          } 
        };
      }
    });

    router.registerRoute(route);

    const response = await request(app)
      .get('/api/jsonapi-test')
      .expect(200);

    expect(response.headers['content-type']).toMatch(/^application\/vnd\.api\+json/);
    expect(response.body).toEqual({ 
      data: { 
        type: 'users', 
        id: '123' 
      } 
    });
  });

  it('should use custom handler for non-JSON content types', async () => {
    const route = createApiRoute({
      path: '/api/text-test',
      method: 'GET',
      response: {
        200: {
          contentType: 'text/plain'
        }
      },
      handler: async () => {
        return { 
          status: 200 as const, 
          custom: (res) => {
            res.setHeader('Content-Type', 'text/plain');
            res.send('Plain text response');
          }
        };
      }
    });

    router.registerRoute(route);

    const response = await request(app)
      .get('/api/text-test')
      .expect(200);

    expect(response.headers['content-type']).toMatch(/^text\/plain/);
    expect(response.text).toBe('Plain text response');
  });
});