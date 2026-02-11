import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { Type } from '@sinclair/typebox';
import { createApiRoute } from '../../createApiRoute.js';
import { createRouter } from '../../router.js';
import { createAuthScheme } from '../../createAuthScheme.js';

// ---------------------------------------------------------------------------
// Bug 1: Runtime request validation
// ---------------------------------------------------------------------------
describe('Request Validation', () => {
  let router: ReturnType<typeof createRouter>;
  let app: any;

  beforeEach(() => {
    router = createRouter();
    app = router.app;
  });

  // -- Body validation (strict mode, no coercion) --

  it('should reject request with missing required body fields', async () => {
    const route = createApiRoute({
      path: '/api/users',
      method: 'POST',
      request: {
        body: Type.Object({
          name: Type.String(),
          email: Type.String({ format: 'email' }),
        }),
      },
      response: {
        201: {
          contentType: 'application/json',
          body: Type.Object({ id: Type.Number() }),
        },
      },
      handler: async () => ({ status: 201 as const, body: { id: 1 } }),
    });

    router.registerRoute(route);

    const res = await request(app)
      .post('/api/users')
      .send({ name: 'Alice' }) // missing email
      .expect(400);

    expect(res.body.error).toBe('Validation Error');
    expect(res.body.details).toBeInstanceOf(Array);
    expect(res.body.details.length).toBeGreaterThan(0);
  });

  it('should reject request with invalid body field types', async () => {
    const route = createApiRoute({
      path: '/api/items',
      method: 'POST',
      request: {
        body: Type.Object({
          count: Type.Number(),
        }),
      },
      response: {
        201: {
          contentType: 'application/json',
          body: Type.Object({ ok: Type.Boolean() }),
        },
      },
      handler: async () => ({ status: 201 as const, body: { ok: true } }),
    });

    router.registerRoute(route);

    // Body uses strict mode — string "5" must NOT be coerced to number
    const res = await request(app)
      .post('/api/items')
      .send({ count: '5' })
      .expect(400);

    expect(res.body.error).toBe('Validation Error');
  });

  it('should accept valid body and reach the handler', async () => {
    const route = createApiRoute({
      path: '/api/items',
      method: 'POST',
      request: {
        body: Type.Object({
          name: Type.String(),
          count: Type.Number(),
        }),
      },
      response: {
        201: {
          contentType: 'application/json',
          body: Type.Object({ name: Type.String() }),
        },
      },
      handler: async (req) => ({
        status: 201 as const,
        body: { name: req.body.name },
      }),
    });

    router.registerRoute(route);

    const res = await request(app)
      .post('/api/items')
      .send({ name: 'Widget', count: 3 })
      .expect(201);

    expect(res.body.name).toBe('Widget');
  });

  it('should validate email format via ajv-formats', async () => {
    const route = createApiRoute({
      path: '/api/contact',
      method: 'POST',
      request: {
        body: Type.Object({
          email: Type.String({ format: 'email' }),
        }),
      },
      response: {
        200: {
          contentType: 'application/json',
          body: Type.Object({ ok: Type.Boolean() }),
        },
      },
      handler: async () => ({ status: 200 as const, body: { ok: true } }),
    });

    router.registerRoute(route);

    const bad = await request(app)
      .post('/api/contact')
      .send({ email: 'not-an-email' })
      .expect(400);

    expect(bad.body.error).toBe('Validation Error');
    expect(bad.body.details[0].keyword).toBe('format');

    await request(app)
      .post('/api/contact')
      .send({ email: 'alice@example.com' })
      .expect(200);
  });

  // -- Query validation (coercion mode) --

  it('should coerce query string values to the correct type', async () => {
    const route = createApiRoute({
      path: '/api/search',
      method: 'GET',
      request: {
        query: Type.Object({
          page: Type.Number(),
          q: Type.String(),
        }),
      },
      response: {
        200: {
          contentType: 'application/json',
          body: Type.Object({ page: Type.Number(), q: Type.String() }),
        },
      },
      handler: async (req) => ({
        status: 200 as const,
        body: { page: req.query.page, q: req.query.q },
      }),
    });

    router.registerRoute(route);

    // Express parses query values as strings; coercion should turn "2" → 2
    const res = await request(app)
      .get('/api/search?page=2&q=hello')
      .expect(200);

    expect(res.body.page).toBe(2);
    expect(res.body.q).toBe('hello');
  });

  it('should reject query that fails validation even after coercion', async () => {
    const route = createApiRoute({
      path: '/api/filter',
      method: 'GET',
      request: {
        query: Type.Object({
          limit: Type.Number({ minimum: 1, maximum: 100 }),
        }),
      },
      response: {
        200: {
          contentType: 'application/json',
          body: Type.Object({ ok: Type.Boolean() }),
        },
      },
      handler: async () => ({ status: 200 as const, body: { ok: true } }),
    });

    router.registerRoute(route);

    const res = await request(app)
      .get('/api/filter?limit=999')
      .expect(400);

    expect(res.body.error).toBe('Validation Error');
  });

  // -- Routes without schemas should skip validation --

  it('should pass through when no request schemas are defined', async () => {
    const route = createApiRoute({
      path: '/api/health',
      method: 'GET',
      response: {
        200: {
          contentType: 'application/json',
          body: Type.Object({ status: Type.String() }),
        },
      },
      handler: async () => ({ status: 200 as const, body: { status: 'ok' } }),
    });

    router.registerRoute(route);

    const res = await request(app).get('/api/health').expect(200);
    expect(res.body.status).toBe('ok');
  });

  // -- Structured error details --

  it('should return structured error details with path, message, keyword', async () => {
    const route = createApiRoute({
      path: '/api/register',
      method: 'POST',
      request: {
        body: Type.Object({
          age: Type.Number({ minimum: 0 }),
          name: Type.String({ minLength: 1 }),
        }),
      },
      response: {
        200: {
          contentType: 'application/json',
          body: Type.Object({ ok: Type.Boolean() }),
        },
      },
      handler: async () => ({ status: 200 as const, body: { ok: true } }),
    });

    router.registerRoute(route);

    const res = await request(app)
      .post('/api/register')
      .send({ age: -1, name: '' })
      .expect(400);

    expect(res.body.error).toBe('Validation Error');
    for (const detail of res.body.details) {
      expect(detail).toHaveProperty('path');
      expect(detail).toHaveProperty('message');
      expect(detail).toHaveProperty('keyword');
    }
  });
});

// ---------------------------------------------------------------------------
// Bug 2: Auth middleware error handling
// ---------------------------------------------------------------------------
describe('Auth Error Handling', () => {
  let router: ReturnType<typeof createRouter>;
  let app: any;

  beforeEach(() => {
    router = createRouter();
    app = router.app;
  });

  it('should return 401 when auth validation fails', async () => {
    const authScheme = createAuthScheme({
      name: 'bearer',
      validate: async (req) => {
        const header = req.headers.authorization;
        if (!header?.startsWith('Bearer ')) {
          throw new Error('Missing or invalid bearer token');
        }
        return { user: { id: '1' } };
      },
    });

    const route = createApiRoute({
      path: '/api/protected',
      method: 'GET',
      auth: authScheme,
      response: {
        200: {
          contentType: 'application/json',
          body: Type.Object({ message: Type.String() }),
        },
      },
      handler: async () => ({
        status: 200 as const,
        body: { message: 'secret' },
      }),
    });

    router.registerRoute(route);

    const res = await request(app)
      .get('/api/protected')
      // no Authorization header
      .expect(401);

    expect(res.body.error).toBe('Unauthorized');
    expect(res.body.message).toBe('Missing or invalid bearer token');
  });

  it('should respect custom statusCode on auth errors', async () => {
    const authScheme = createAuthScheme({
      name: 'custom-status',
      validate: async () => {
        const err: any = new Error('Forbidden resource');
        err.statusCode = 403;
        throw err;
      },
    });

    const route = createApiRoute({
      path: '/api/forbidden',
      method: 'GET',
      auth: authScheme,
      response: {
        200: {
          contentType: 'application/json',
          body: Type.Object({ ok: Type.Boolean() }),
        },
      },
      handler: async () => ({ status: 200 as const, body: { ok: true } }),
    });

    router.registerRoute(route);

    const res = await request(app)
      .get('/api/forbidden')
      .expect(403);

    expect(res.body.error).toBe('Unauthorized');
    expect(res.body.message).toBe('Forbidden resource');
  });

  it('should pass through when auth succeeds', async () => {
    const authScheme = createAuthScheme({
      name: 'bearer',
      validate: async (req) => {
        if (!req.headers.authorization) {
          throw new Error('No token');
        }
        return { user: { id: '42' } };
      },
    });

    const route = createApiRoute({
      path: '/api/me',
      method: 'GET',
      auth: authScheme,
      response: {
        200: {
          contentType: 'application/json',
          body: Type.Object({ userId: Type.String() }),
        },
      },
      handler: async (req) => ({
        status: 200 as const,
        body: { userId: req.auth.context.user.id },
      }),
    });

    router.registerRoute(route);

    const res = await request(app)
      .get('/api/me')
      .set('Authorization', 'Bearer valid-token')
      .expect(200);

    expect(res.body.userId).toBe('42');
  });
});

// ---------------------------------------------------------------------------
// Bug 3: next() not called after response
// ---------------------------------------------------------------------------
describe('No next() After Response', () => {
  let router: ReturnType<typeof createRouter>;
  let app: any;

  beforeEach(() => {
    router = createRouter();
    app = router.app;
  });

  it('should not trigger downstream middleware after response is sent', async () => {
    const route = createApiRoute({
      path: '/api/done',
      method: 'GET',
      response: {
        200: {
          contentType: 'application/json',
          body: Type.Object({ done: Type.Boolean() }),
        },
      },
      handler: async () => ({ status: 200 as const, body: { done: true } }),
    });

    router.registerRoute(route);

    // Add a catch-all 404 handler after the route
    let catchAllReached = false;
    app.use((_req: any, _res: any, next: any) => {
      catchAllReached = true;
      next();
    });

    await request(app).get('/api/done').expect(200);

    // The catch-all should NOT have been reached because the handler
    // no longer calls next() after sending the response
    expect(catchAllReached).toBe(false);
  });

  it('should still return proper responses for custom content types', async () => {
    const route = createApiRoute({
      path: '/api/download',
      method: 'GET',
      response: {
        200: {
          contentType: 'text/plain',
        },
      },
      handler: async () => ({
        status: 200 as const,
        custom: (res: any) => {
          res.send('file contents');
        },
      }),
    });

    router.registerRoute(route);

    const res = await request(app).get('/api/download').expect(200);
    expect(res.text).toBe('file contents');
  });
});
