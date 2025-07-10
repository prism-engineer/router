import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createAuthScheme } from '../../src/createAuthScheme';
import { createApiRoute } from '../../src/createApiRoute';
import { Type } from '@sinclair/typebox';

describe('Authentication - Multiple Auth Schemes', () => {
  let bearerAuth: ReturnType<typeof createAuthScheme>;
  let apiKeyAuth: ReturnType<typeof createAuthScheme>;
  let sessionAuth: ReturnType<typeof createAuthScheme>;

  beforeEach(() => {
    vi.clearAllMocks();

    bearerAuth = createAuthScheme({
      name: 'bearer',
      validate: async (req) => {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
          throw new Error('Invalid bearer token');
        }
        return { user: { id: '1', type: 'bearer', token: authHeader.slice(7) } };
      }
    });

    apiKeyAuth = createAuthScheme({
      name: 'apiKey',
      validate: async (req) => {
        const apiKey = req.headers['x-api-key'];
        if (!apiKey || apiKey !== 'valid-api-key') {
          throw new Error('Invalid API key');
        }
        return { client: { id: '1', type: 'api-key', key: apiKey } };
      }
    });

    sessionAuth = createAuthScheme({
      name: 'session',
      validate: async (req) => {
        const sessionId = req.headers.cookie?.match(/sessionId=([^;]+)/)?.[1];
        if (!sessionId || sessionId !== 'valid-session') {
          throw new Error('Invalid session');
        }
        return { session: { id: sessionId, userId: '1', type: 'session' } };
      }
    });
  });

  it('should create route with multiple auth schemes (OR logic)', () => {
    const route = createApiRoute({
      path: '/api/flexible-auth',
      method: 'GET',
      auth: [bearerAuth, apiKeyAuth, sessionAuth],
      response: {
        200: {
          contentType: 'application/json',
          body: Type.Object({
            message: Type.String(),
            authType: Type.String()
          })
        }
      },
      handler: async (req) => {
        return {
          status: 200 as const,
          body: {
            message: 'Authenticated successfully',
            authType: req.auth.name
          }
        };
      }
    });

    expect(route).toBeDefined();
    expect(Array.isArray(route.auth)).toBe(true);
    expect(route.auth).toHaveLength(3);
  });

  it('should handle bearer auth success in multiple auth context', () => {
    const route = createApiRoute({
      path: '/api/multi-auth',
      method: 'GET',
      auth: [bearerAuth, apiKeyAuth],
      response: {
        200: {
          contentType: 'application/json',
          body: Type.Object({ authType: Type.String() })
        }
      },
      handler: async (req) => {
        return {
          status: 200 as const,
          body: { authType: req.auth.name }
        };
      }
    });

    expect(route.auth).toContain(bearerAuth);
    expect(route.auth).toContain(apiKeyAuth);
  });

  it('should handle API key auth success in multiple auth context', () => {
    const route = createApiRoute({
      path: '/api/multi-auth',
      method: 'GET',
      auth: [bearerAuth, apiKeyAuth],
      response: {
        200: {
          contentType: 'application/json',
          body: Type.Object({ authType: Type.String() })
        }
      },
      handler: async (req) => {
        return {
          status: 200 as const,
          body: { authType: req.auth.name }
        };
      }
    });

    expect(route.auth).toContain(apiKeyAuth);
    expect(route.auth).toContain(bearerAuth);
  });

  it('should test different auth scheme validation scenarios', async () => {
    // Test bearer auth validation
    const bearerReq = {
      headers: { authorization: 'Bearer valid-token' },
      body: {},
      query: {},
      params: {}
    };

    const bearerResult = await bearerAuth.validate(bearerReq as any);
    expect(bearerResult.user.type).toBe('bearer');

    // Test API key validation
    const apiKeyReq = {
      headers: { 'x-api-key': 'valid-api-key' },
      body: {},
      query: {},
      params: {}
    };

    const apiKeyResult = await apiKeyAuth.validate(apiKeyReq as any);
    expect(apiKeyResult.client.type).toBe('api-key');

    // Test session validation
    const sessionReq = {
      headers: { cookie: 'sessionId=valid-session' },
      body: {},
      query: {},
      params: {}
    };

    const sessionResult = await sessionAuth.validate(sessionReq as any);
    expect(sessionResult.session.type).toBe('session');
  });

  it('should handle priority-based auth schemes', () => {
    // Higher priority schemes should be tested first
    const highPriorityAuth = createAuthScheme({
      name: 'high-priority',
      validate: async () => ({ user: { id: '1', priority: 'high' } })
    });

    const lowPriorityAuth = createAuthScheme({
      name: 'low-priority',  
      validate: async () => ({ user: { id: '1', priority: 'low' } })
    });

    const route = createApiRoute({
      path: '/api/priority-auth',
      method: 'GET',
      auth: [highPriorityAuth, lowPriorityAuth], // Order matters
      response: {
        200: {
          contentType: 'application/json',
          body: Type.Object({ priority: Type.String() })
        }
      },
      handler: async (req) => {
        return {
          status: 200 as const,
          body: { priority: req.auth.name }
        };
      }
    });

    expect(route.auth[0]).toBe(highPriorityAuth);
    expect(route.auth[1]).toBe(lowPriorityAuth);
  });

  it('should handle fallback auth schemes', () => {
    const primaryAuth = createAuthScheme({
      name: 'primary',
      validate: async (req) => {
        const token = req.headers.authorization;
        if (!token?.startsWith('Primary ')) {
          throw new Error('Primary auth failed');
        }
        return { user: { id: '1', source: 'primary' } };
      }
    });

    const fallbackAuth = createAuthScheme({
      name: 'fallback',
      validate: async (req) => {
        const token = req.headers.authorization;
        if (!token?.startsWith('Fallback ')) {
          throw new Error('Fallback auth failed');
        }
        return { user: { id: '1', source: 'fallback' } };
      }
    });

    const route = createApiRoute({
      path: '/api/fallback-auth',
      method: 'GET',
      auth: [primaryAuth, fallbackAuth],
      response: {
        200: {
          contentType: 'application/json',
          body: Type.Object({ source: Type.String() })
        }
      },
      handler: async (req) => {
        return {
          status: 200 as const,
          body: { source: req.auth.name }
        };
      }
    });

    expect(route.auth).toHaveLength(2);
    expect(route.auth[0].name).toBe('primary');
    expect(route.auth[1].name).toBe('fallback');
  });

  it('should handle role-based auth schemes', () => {
    const adminAuth = createAuthScheme({
      name: 'admin',
      validate: async (req) => {
        const role = req.headers['x-user-role'];
        if (role !== 'admin') {
          throw new Error('Admin role required');
        }
        return { user: { id: '1', role: 'admin', permissions: ['all'] } };
      }
    });

    const userAuth = createAuthScheme({
      name: 'user',
      validate: async (req) => {
        const role = req.headers['x-user-role'];
        if (!['user', 'admin'].includes(role)) {
          throw new Error('User role required');
        }
        return { user: { id: '1', role: role || 'user', permissions: ['read'] } };
      }
    });

    const route = createApiRoute({
      path: '/api/role-based',
      method: 'GET',
      auth: [adminAuth, userAuth], // Admin first, then user
      response: {
        200: {
          contentType: 'application/json',
          body: Type.Object({ role: Type.String() })
        }
      },
      handler: async (req) => {
        return {
          status: 200 as const,
          body: { role: req.auth.name }
        };
      }
    });

    expect(route.auth).toHaveLength(2);
    expect(route.auth[0].name).toBe('admin');
    expect(route.auth[1].name).toBe('user');
  });

  it('should handle environment-specific auth schemes', () => {
    const prodAuth = createAuthScheme({
      name: 'production',
      validate: async (req) => {
        if (process.env.NODE_ENV !== 'production') {
          throw new Error('Production auth only');
        }
        const token = req.headers.authorization;
        if (!token?.startsWith('Bearer ')) {
          throw new Error('Bearer token required in production');
        }
        return { user: { id: '1', env: 'production' } };
      }
    });

    const devAuth = createAuthScheme({
      name: 'development',
      validate: async () => {
        if (process.env.NODE_ENV === 'production') {
          throw new Error('Development auth not allowed in production');
        }
        return { user: { id: 'dev-user', env: 'development' } };
      }
    });

    const route = createApiRoute({
      path: '/api/env-auth',
      method: 'GET',
      auth: [prodAuth, devAuth],
      response: {
        200: {
          contentType: 'application/json',
          body: Type.Object({ env: Type.String() })
        }
      },
      handler: async (req) => {
        return {
          status: 200 as const,
          body: { env: req.auth.name }
        };
      }
    });

    expect(route.auth).toHaveLength(2);
  });

  it('should handle service-specific auth schemes', () => {
    const internalServiceAuth = createAuthScheme({
      name: 'internal-service',
      validate: async (req) => {
        const serviceKey = req.headers['x-service-key'];
        if (!serviceKey || !serviceKey.startsWith('internal-')) {
          throw new Error('Internal service key required');
        }
        return { service: { id: serviceKey, type: 'internal' } };
      }
    });

    const externalServiceAuth = createAuthScheme({
      name: 'external-service',
      validate: async (req) => {
        const serviceKey = req.headers['x-service-key'];
        if (!serviceKey || !serviceKey.startsWith('external-')) {
          throw new Error('External service key required');
        }
        return { service: { id: serviceKey, type: 'external' } };
      }
    });

    const route = createApiRoute({
      path: '/api/service-auth',
      method: 'GET',
      auth: [internalServiceAuth, externalServiceAuth],
      response: {
        200: {
          contentType: 'application/json',
          body: Type.Object({ serviceType: Type.String() })
        }
      },
      handler: async (req) => {
        return {
          status: 200 as const,
          body: { serviceType: req.auth.name }
        };
      }
    });

    expect(route.auth).toHaveLength(2);
  });

  it('should handle auth schemes with different context types', () => {
    const userAuth = createAuthScheme({
      name: 'user-auth',
      validate: async () => ({ 
        user: { id: '1', name: 'John' } 
      })
    });

    const clientAuth = createAuthScheme({
      name: 'client-auth',
      validate: async () => ({ 
        client: { id: 'client-1', name: 'Mobile App' } 
      })
    });

    const serviceAuth = createAuthScheme({
      name: 'service-auth',
      validate: async () => ({ 
        service: { id: 'service-1', name: 'Background Service' } 
      })
    });

    const route = createApiRoute({
      path: '/api/mixed-context',
      method: 'GET',
      auth: [userAuth, clientAuth, serviceAuth],
      response: {
        200: {
          contentType: 'application/json',
          body: Type.Object({ contextType: Type.String() })
        }
      },
      handler: async (req) => {
        return {
          status: 200 as const,
          body: { contextType: req.auth.name }
        };
      }
    });

    expect(route.auth).toHaveLength(3);
  });

  it('should handle auth schemes with validation timeouts', () => {
    const fastAuth = createAuthScheme({
      name: 'fast-auth',
      validate: async () => {
        // Immediate validation
        return { user: { id: '1', speed: 'fast' } };
      }
    });

    const slowAuth = createAuthScheme({
      name: 'slow-auth',
      validate: async () => {
        // Simulate slow validation
        await new Promise(resolve => setTimeout(resolve, 10));
        return { user: { id: '1', speed: 'slow' } };
      }
    });

    const route = createApiRoute({
      path: '/api/timeout-auth',
      method: 'GET',
      auth: [fastAuth, slowAuth], // Fast auth should be tried first
      response: {
        200: {
          contentType: 'application/json',
          body: Type.Object({ speed: Type.String() })
        }
      },
      handler: async (req) => {
        return {
          status: 200 as const,
          body: { speed: req.auth.name }
        };
      }
    });

    expect(route.auth[0].name).toBe('fast-auth');
    expect(route.auth[1].name).toBe('slow-auth');
  });

  it('should handle auth schemes with conditional logic', () => {
    const conditionalAuth = createAuthScheme({
      name: 'conditional',
      validate: async (req) => {
        const userAgent = req.headers['user-agent'];
        const acceptsJson = req.headers.accept?.includes('application/json');
        
        if (userAgent?.includes('Bot') && !acceptsJson) {
          throw new Error('Bots must accept JSON');
        }
        
        return { 
          user: { 
            id: '1', 
            userAgent: userAgent || 'unknown',
            acceptsJson: !!acceptsJson 
          } 
        };
      }
    });

    const fallbackAuth = createAuthScheme({
      name: 'fallback-conditional',
      validate: async () => ({ user: { id: 'fallback', type: 'basic' } })
    });

    const route = createApiRoute({
      path: '/api/conditional-auth',
      method: 'GET',
      auth: [conditionalAuth, fallbackAuth],
      response: {
        200: {
          contentType: 'application/json',
          body: Type.Object({ type: Type.String() })
        }
      },
      handler: async (req) => {
        return {
          status: 200 as const,
          body: { type: req.auth.name }
        };
      }
    });

    expect(route.auth).toHaveLength(2);
  });

  it('should handle auth schemes with different error types', () => {
    const strictAuth = createAuthScheme({
      name: 'strict',
      validate: async (req) => {
        const token = req.headers.authorization;
        if (!token) {
          throw new Error('MISSING_TOKEN');
        }
        if (!token.startsWith('Bearer ')) {
          throw new Error('INVALID_FORMAT');
        }
        if (token.slice(7).length < 10) {
          throw new Error('TOKEN_TOO_SHORT');
        }
        return { user: { id: '1', validation: 'strict' } };
      }
    });

    const relaxedAuth = createAuthScheme({
      name: 'relaxed',
      validate: async (req) => {
        const token = req.headers.authorization || req.query.token;
        if (!token) {
          throw new Error('NO_AUTH_PROVIDED');
        }
        return { user: { id: '1', validation: 'relaxed' } };
      }
    });

    const route = createApiRoute({
      path: '/api/error-types',
      method: 'GET',
      auth: [strictAuth, relaxedAuth],
      response: {
        200: {
          contentType: 'application/json',
          body: Type.Object({ validation: Type.String() })
        }
      },
      handler: async (req) => {
        return {
          status: 200 as const,
          body: { validation: req.auth.name }
        };
      }
    });

    expect(route.auth).toHaveLength(2);
  });

  it('should handle auth schemes with caching strategies', () => {
    const globalCache = new Map();
    const userCache = new Map();

    const globalCacheAuth = createAuthScheme({
      name: 'global-cache',
      validate: async (req) => {
        const token = req.headers.authorization;
        if (globalCache.has(token)) {
          return globalCache.get(token);
        }
        
        const context = { user: { id: '1', cache: 'global' } };
        globalCache.set(token, context);
        return context;
      }
    });

    const userCacheAuth = createAuthScheme({
      name: 'user-cache',
      validate: async (req) => {
        const userId = req.headers['x-user-id'];
        if (userCache.has(userId)) {
          return userCache.get(userId);
        }
        
        const context = { user: { id: userId || '1', cache: 'user-specific' } };
        userCache.set(userId, context);
        return context;
      }
    });

    const route = createApiRoute({
      path: '/api/cache-strategies',
      method: 'GET',
      auth: [globalCacheAuth, userCacheAuth],
      response: {
        200: {
          contentType: 'application/json',
          body: Type.Object({ cache: Type.String() })
        }
      },
      handler: async (req) => {
        return {
          status: 200 as const,
          body: { cache: req.auth.name }
        };
      }
    });

    expect(route.auth).toHaveLength(2);
  });
});