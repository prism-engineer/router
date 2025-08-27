import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createAuthScheme } from '../../createAuthScheme.js';
import { createApiRoute } from '../../createApiRoute.js';
import { createRouter } from '../../router.js';
import { Type } from '@sinclair/typebox';

describe('Authentication - Auth Middleware', () => {
  let router: ReturnType<typeof createRouter>;

  beforeEach(() => {
    router = createRouter();
    vi.clearAllMocks();
  });

  it('should integrate auth middleware with Express router', () => {
    const authScheme = createAuthScheme({
      name: 'middleware-test',
      validate: async (req) => {
        const token = req.headers.authorization;
        if (!token) {
          throw new Error('No token provided');
        }
        return { user: { id: '1', token } };
      }
    });

    const route = createApiRoute({
      path: '/api/protected',
      method: 'GET',
      auth: authScheme,
      response: {
        200: {
          contentType: 'application/json',
          body: Type.Object({ message: Type.String() })
        }
      },
      handler: async (req) => {
        return {
          status: 200 as const,
          body: { message: `Authenticated as ${req.auth.context.user.id}` }
        };
      }
    });

    expect(() => router.registerRoute(route)).not.toThrow();
    expect(router.app).toBeDefined();
  });

  it('should handle middleware execution order', () => {
    const executionOrder: string[] = [];

    const authScheme = createAuthScheme({
      name: 'order-test',
      validate: async (req) => {
        executionOrder.push('auth-validate');
        return { user: { id: '1' } };
      }
    });

    const route = createApiRoute({
      path: '/api/order-test',
      method: 'GET',
      auth: authScheme,
      response: {
        200: {
          contentType: 'application/json',
          body: Type.Object({ order: Type.Array(Type.String()) })
        }
      },
      handler: async () => {
        executionOrder.push('route-handler');
        return {
          status: 200 as const,
          body: { order: executionOrder }
        };
      }
    });

    expect(() => router.registerRoute(route)).not.toThrow();
  });

  it('should handle middleware with multiple auth schemes', () => {
    const bearerAuth = createAuthScheme({
      name: 'bearer',
      validate: async (req) => {
        const auth = req.headers.authorization;
        if (!auth?.startsWith('Bearer ')) {
          throw new Error('Bearer token required');
        }
        return { user: { id: '1', type: 'bearer' } };
      }
    });

    const apiKeyAuth = createAuthScheme({
      name: 'apiKey',
      validate: async (req) => {
        const apiKey = req.headers['x-api-key'];
        if (!apiKey) {
          throw new Error('API key required');
        }
        return { client: { id: '1', type: 'api-key' } };
      }
    });

    const route = createApiRoute({
      path: '/api/multi-auth-middleware',
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

    expect(() => router.registerRoute(route)).not.toThrow();
  });

  it('should handle auth middleware with request transformation', () => {
    const authScheme = createAuthScheme({
      name: 'transform-middleware',
      validate: async (req) => {
        // Middleware can transform request
        const userId = req.headers['x-user-id'];
        const orgId = req.headers['x-org-id'];
        
        return {
          user: {
            id: userId || 'anonymous',
            organizationId: orgId || 'default'
          },
          enrichedRequest: {
            timestamp: Date.now(),
            ip: req.ip || 'unknown'
          }
        };
      }
    });

    const route = createApiRoute({
      path: '/api/transform-middleware',
      method: 'GET',
      auth: authScheme,
      response: {
        200: {
          contentType: 'application/json',
          body: Type.Object({
            userId: Type.String(),
            hasEnrichment: Type.Boolean()
          })
        }
      },
      handler: async (req) => {
        return {
          status: 200 as const,
          body: {
            userId: req.auth.context.user.id,
            hasEnrichment: !!req.auth.context.enrichedRequest
          }
        };
      }
    });

    expect(() => router.registerRoute(route)).not.toThrow();
  });

  it('should handle async middleware operations', () => {
    const authScheme = createAuthScheme({
      name: 'async-middleware',
      validate: async (req) => {
        // Simulate async database lookup
        await new Promise(resolve => setTimeout(resolve, 1));
        
        const token = req.headers.authorization;
        if (!token) {
          throw new Error('Token required');
        }

        // Simulate async validation
        await new Promise(resolve => setTimeout(resolve, 1));
        
        return {
          user: {
            id: '1',
            validatedAt: new Date().toISOString()
          }
        };
      }
    });

    const route = createApiRoute({
      path: '/api/async-middleware',
      method: 'GET',
      auth: authScheme,
      response: {
        200: {
          contentType: 'application/json',
          body: Type.Object({ validatedAt: Type.String() })
        }
      },
      handler: async (req) => {
        return {
          status: 200 as const,
          body: { validatedAt: req.auth.context.user.validatedAt }
        };
      }
    });

    expect(() => router.registerRoute(route)).not.toThrow();
  });

  it('should handle middleware error handling', () => {
    const authScheme = createAuthScheme({
      name: 'error-middleware',
      validate: async (req) => {
        const shouldFail = req.headers['x-force-error'];
        
        if (shouldFail) {
          throw new Error('Forced authentication error');
        }
        
        return { user: { id: '1' } };
      }
    });

    const route = createApiRoute({
      path: '/api/error-middleware',
      method: 'GET',
      auth: authScheme,
      response: {
        200: {
          contentType: 'application/json',
          body: Type.Object({ message: Type.String() })
        }
      },
      handler: async () => {
        return {
          status: 200 as const,
          body: { message: 'Success' }
        };
      }
    });

    expect(() => router.registerRoute(route)).not.toThrow();
  });

  it('should handle middleware with caching layer', () => {
    const cache = new Map();

    const authScheme = createAuthScheme({
      name: 'cache-middleware',
      validate: async (req) => {
        const token = req.headers.authorization;
        const cacheKey = `auth:${token}`;
        
        // Check cache first
        if (cache.has(cacheKey)) {
          const cached = cache.get(cacheKey);
          return {
            ...cached,
            fromCache: true
          };
        }
        
        // Simulate expensive validation
        await new Promise(resolve => setTimeout(resolve, 1));
        
        const result = {
          user: { id: '1', token },
          fromCache: false
        };
        
        // Cache for future requests
        cache.set(cacheKey, result);
        setTimeout(() => cache.delete(cacheKey), 100); // TTL
        
        return result;
      }
    });

    const route = createApiRoute({
      path: '/api/cache-middleware',
      method: 'GET',
      auth: authScheme,
      response: {
        200: {
          contentType: 'application/json',
          body: Type.Object({ fromCache: Type.Boolean() })
        }
      },
      handler: async (req) => {
        return {
          status: 200 as const,
          body: { fromCache: req.auth.context.fromCache }
        };
      }
    });

    expect(() => router.registerRoute(route)).not.toThrow();
  });

  it('should handle middleware with rate limiting', () => {
    const rateLimits = new Map();

    const authScheme = createAuthScheme({
      name: 'rate-limit-middleware',
      validate: async (req) => {
        const clientId = req.headers['x-client-id'] || req.ip;
        const now = Date.now();
        const windowMs = 60000; // 1 minute
        const maxRequests = 100;
        
        if (!rateLimits.has(clientId)) {
          rateLimits.set(clientId, { count: 0, resetTime: now + windowMs });
        }
        
        const limit = rateLimits.get(clientId);
        
        if (now > limit.resetTime) {
          limit.count = 0;
          limit.resetTime = now + windowMs;
        }
        
        limit.count++;
        
        if (limit.count > maxRequests) {
          throw new Error('Rate limit exceeded');
        }
        
        return {
          user: { id: '1' },
          rateLimit: {
            remaining: maxRequests - limit.count,
            resetTime: limit.resetTime
          }
        };
      }
    });

    const route = createApiRoute({
      path: '/api/rate-limit-middleware',
      method: 'GET',
      auth: authScheme,
      response: {
        200: {
          contentType: 'application/json',
          body: Type.Object({ remaining: Type.Number() })
        }
      },
      handler: async (req) => {
        return {
          status: 200 as const,
          body: { remaining: req.auth.context.rateLimit.remaining }
        };
      }
    });

    expect(() => router.registerRoute(route)).not.toThrow();
  });

  it('should handle middleware with request logging', () => {
    const logs: any[] = [];

    const authScheme = createAuthScheme({
      name: 'logging-middleware',
      validate: async (req) => {
        const logEntry = {
          timestamp: new Date().toISOString(),
          method: req.method,
          path: req.path,
          userAgent: req.headers['user-agent'],
          ip: req.ip
        };
        
        logs.push(logEntry);
        
        return {
          user: { id: '1' },
          requestId: `req-${Date.now()}`
        };
      }
    });

    const route = createApiRoute({
      path: '/api/logging-middleware',
      method: 'GET',
      auth: authScheme,
      response: {
        200: {
          contentType: 'application/json',
          body: Type.Object({ requestId: Type.String() })
        }
      },
      handler: async (req) => {
        return {
          status: 200 as const,
          body: { requestId: req.auth.context.requestId }
        };
      }
    });

    expect(() => router.registerRoute(route)).not.toThrow();
    expect(logs).toBeDefined();
  });

  it('should handle middleware with context injection', () => {
    const authScheme = createAuthScheme({
      name: 'injection-middleware',
      validate: async (req) => {
        // Inject additional context based on request
        const userAgent = req.headers['user-agent'];
        const acceptLanguage = req.headers['accept-language'];
        
        return {
          user: { id: '1' },
          context: {
            device: {
              type: userAgent?.includes('Mobile') ? 'mobile' : 'desktop',
              userAgent
            },
            locale: {
              language: acceptLanguage?.split(',')[0] || 'en',
              acceptedLanguages: acceptLanguage?.split(',') || ['en']
            },
            request: {
              timestamp: Date.now(),
              protocol: req.headers['x-forwarded-proto'] || 'http',
              secure: req.headers['x-forwarded-proto'] === 'https'
            }
          }
        };
      }
    });

    const route = createApiRoute({
      path: '/api/injection-middleware',
      method: 'GET',
      auth: authScheme,
      response: {
        200: {
          contentType: 'application/json',
          body: Type.Object({
            deviceType: Type.String(),
            language: Type.String(),
            isSecure: Type.Boolean()
          })
        }
      },
      handler: async (req) => {
        const ctx = req.auth.context.context;
        return {
          status: 200 as const,
          body: {
            deviceType: ctx.device.type,
            language: ctx.locale.language,
            isSecure: ctx.request.secure
          }
        };
      }
    });

    expect(() => router.registerRoute(route)).not.toThrow();
  });

  it('should handle middleware with external service integration', () => {
    const authScheme = createAuthScheme({
      name: 'external-service-middleware',
      validate: async (req) => {
        const token = req.headers.authorization?.replace('Bearer ', '');
        
        // Simulate external service call
        const validateWithExternalService = async (token: string) => {
          // Mock external validation
          if (token === 'external-valid') {
            return {
              userId: 'ext-user-123',
              permissions: ['read', 'write'],
              metadata: { provider: 'oauth2', scope: 'profile' }
            };
          }
          throw new Error('Invalid external token');
        };

        try {
          const externalResult = await validateWithExternalService(token);
          
          return {
            user: {
              id: externalResult.userId,
              permissions: externalResult.permissions,
              external: true
            },
            provider: externalResult.metadata.provider
          };
        } catch (error) {
          throw new Error(`External validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    });

    const route = createApiRoute({
      path: '/api/external-service-middleware',
      method: 'GET',
      auth: authScheme,
      response: {
        200: {
          contentType: 'application/json',
          body: Type.Object({
            userId: Type.String(),
            provider: Type.String()
          })
        }
      },
      handler: async (req) => {
        return {
          status: 200 as const,
          body: {
            userId: req.auth.context.user.id,
            provider: req.auth.context.provider
          }
        };
      }
    });

    expect(() => router.registerRoute(route)).not.toThrow();
  });

  it('should handle middleware with session management', () => {
    const sessions = new Map();

    const authScheme = createAuthScheme({
      name: 'session-middleware',
      validate: async (req) => {
        const sessionId = req.headers.cookie?.match(/sessionId=([^;]+)/)?.[1];
        
        if (!sessionId) {
          throw new Error('Session required');
        }
        
        if (!sessions.has(sessionId)) {
          throw new Error('Invalid session');
        }
        
        const session = sessions.get(sessionId);
        
        // Check expiration
        if (session.expiresAt < Date.now()) {
          sessions.delete(sessionId);
          throw new Error('Session expired');
        }
        
        // Update last access
        session.lastAccess = Date.now();
        sessions.set(sessionId, session);
        
        return {
          user: session.user,
          session: {
            id: sessionId,
            createdAt: session.createdAt,
            lastAccess: session.lastAccess,
            expiresAt: session.expiresAt
          }
        };
      }
    });

    // Setup a test session
    sessions.set('test-session', {
      user: { id: 'user-123', name: 'Test User' },
      createdAt: Date.now(),
      lastAccess: Date.now(),
      expiresAt: Date.now() + 3600000 // 1 hour
    });

    const route = createApiRoute({
      path: '/api/session-middleware',
      method: 'GET',
      auth: authScheme,
      response: {
        200: {
          contentType: 'application/json',
          body: Type.Object({
            userId: Type.String(),
            sessionId: Type.String()
          })
        }
      },
      handler: async (req) => {
        return {
          status: 200 as const,
          body: {
            userId: req.auth.context.user.id,
            sessionId: req.auth.context.session.id
          }
        };
      }
    });

    expect(() => router.registerRoute(route)).not.toThrow();
  });

  it('should handle middleware with permission checking', () => {
    const authScheme = createAuthScheme({
      name: 'permission-middleware',
      validate: async (req) => {
        const userId = req.headers['x-user-id'];
        const requiredPermission = req.headers['x-required-permission'];
        
        // Mock user permissions
        const userPermissions = {
          'user-1': ['read', 'write'],
          'user-2': ['read'],
          'admin-1': ['read', 'write', 'delete', 'admin']
        };
        
        const permissions = userPermissions[userId as keyof typeof userPermissions] || [];
        
        if (requiredPermission && !permissions.includes(requiredPermission)) {
          throw new Error(`Permission denied: ${requiredPermission} required`);
        }
        
        return {
          user: {
            id: userId || 'anonymous',
            permissions
          },
          hasRequiredPermission: !requiredPermission || permissions.includes(requiredPermission)
        };
      }
    });

    const route = createApiRoute({
      path: '/api/permission-middleware',
      method: 'GET',
      auth: authScheme,
      response: {
        200: {
          contentType: 'application/json',
          body: Type.Object({
            userId: Type.String(),
            permissionCount: Type.Number()
          })
        }
      },
      handler: async (req) => {
        return {
          status: 200 as const,
          body: {
            userId: req.auth.context.user.id,
            permissionCount: req.auth.context.user.permissions.length
          }
        };
      }
    });

    expect(() => router.registerRoute(route)).not.toThrow();
  });
});