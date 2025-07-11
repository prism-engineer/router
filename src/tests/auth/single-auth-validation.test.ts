import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createAuthScheme } from '../../createAuthScheme';
import { createApiRoute } from '../../createApiRoute';
import { Type } from '@sinclair/typebox';

describe('Authentication - Single Auth Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should validate bearer token authentication successfully', async () => {
    const authScheme = createAuthScheme({
      name: 'bearer',
      validate: async (req) => {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
          throw new Error('Invalid authorization header');
        }
        const token = authHeader.slice(7);
        return { user: { id: '1', token } };
      }
    });

    const mockReq = {
      headers: { authorization: 'Bearer valid-token' },
      body: {},
      query: {},
      params: {}
    };

    const result = await authScheme.validate(mockReq as any);
    expect(result).toEqual({
      user: { id: '1', token: 'valid-token' }
    });
  });

  it('should validate API key authentication successfully', async () => {
    const authScheme = createAuthScheme({
      name: 'apiKey',
      validate: async (req) => {
        const apiKey = req.headers['x-api-key'];
        if (!apiKey) {
          throw new Error('API key required');
        }
        if (apiKey !== 'valid-api-key') {
          throw new Error('Invalid API key');
        }
        return { client: { id: '1', apiKey } };
      }
    });

    const mockReq = {
      headers: { 'x-api-key': 'valid-api-key' },
      body: {},
      query: {},
      params: {}
    };

    const result = await authScheme.validate(mockReq as any);
    expect(result).toEqual({
      client: { id: '1', apiKey: 'valid-api-key' }
    });
  });

  it('should validate session authentication successfully', async () => {
    const authScheme = createAuthScheme({
      name: 'session',
      validate: async (req) => {
        const sessionId = req.headers.cookie?.match(/sessionId=([^;]+)/)?.[1];
        if (!sessionId) {
          throw new Error('Session required');
        }
        return { session: { id: sessionId, userId: '1' } };
      }
    });

    const mockReq = {
      headers: { cookie: 'sessionId=abc123; otherCookie=value' },
      body: {},
      query: {},
      params: {}
    };

    const result = await authScheme.validate(mockReq as any);
    expect(result).toEqual({
      session: { id: 'abc123', userId: '1' }
    });
  });

  it('should validate custom authentication scheme', async () => {
    const authScheme = createAuthScheme({
      name: 'custom',
      validate: async (req) => {
        const signature = req.headers['x-signature'];
        const timestamp = req.headers['x-timestamp'];
        
        if (!signature || !timestamp) {
          throw new Error('Missing authentication headers');
        }
        
        if (signature !== 'valid-signature') {
          throw new Error('Invalid signature');
        }
        
        return { 
          client: { 
            id: '1', 
            verified: true,
            timestamp: parseInt(timestamp)
          } 
        };
      }
    });

    const mockReq = {
      headers: { 
        'x-signature': 'valid-signature',
        'x-timestamp': '1234567890'
      },
      body: {},
      query: {},
      params: {}
    };

    const result = await authScheme.validate(mockReq as any);
    expect(result).toEqual({
      client: { 
        id: '1', 
        verified: true,
        timestamp: 1234567890
      }
    });
  });

  it('should handle successful validation with minimal context', async () => {
    const authScheme = createAuthScheme({
      name: 'minimal',
      validate: async () => ({ authenticated: true })
    });

    const result = await authScheme.validate();
    expect(result).toEqual({ authenticated: true });
  });

  it('should handle validation with complex user context', async () => {
    const authScheme = createAuthScheme({
      name: 'complex',
      validate: async (req) => {
        const role = req.headers['x-user-role'] as string;
        return {
          user: {
            id: '1',
            name: 'John Doe',
            email: 'john@example.com',
            role: role || 'user',
            permissions: ['read', 'write'],
            metadata: {
              lastLogin: new Date().toISOString(),
              loginCount: 5
            }
          }
        };
      }
    });

    const mockReq = {
      headers: { 'x-user-role': 'admin' },
      body: {},
      query: {},
      params: {}
    };

    const result = await authScheme.validate(mockReq as any);
    expect(result.user.id).toBe('1');
    expect(result.user.role).toBe('admin');
    expect(result.user.permissions).toEqual(['read', 'write']);
    expect(result.user.metadata.loginCount).toBe(5);
  });

  it('should handle async validation with external service simulation', async () => {
    const authScheme = createAuthScheme({
      name: 'external',
      validate: async (req) => {
        const token = req.headers.authorization?.replace('Bearer ', '');
        
        // Simulate async external service call
        await new Promise(resolve => setTimeout(resolve, 1));
        
        if (token === 'external-valid-token') {
          return { 
            user: { 
              id: 'ext-1', 
              provider: 'external-service',
              verified: true 
            } 
          };
        }
        
        throw new Error('External validation failed');
      }
    });

    const mockReq = {
      headers: { authorization: 'Bearer external-valid-token' },
      body: {},
      query: {},
      params: {}
    };

    const result = await authScheme.validate(mockReq as any);
    expect(result).toEqual({
      user: { 
        id: 'ext-1', 
        provider: 'external-service',
        verified: true 
      }
    });
  });

  it('should handle validation with request context analysis', async () => {
    const authScheme = createAuthScheme({
      name: 'context-aware',
      validate: async (req) => {
        const userAgent = req.headers['user-agent'];
        const clientIp = req.ip || '127.0.0.1';
        
        return {
          user: { id: '1' },
          context: {
            userAgent,
            clientIp,
            timestamp: Date.now(),
            secure: req.headers['x-forwarded-proto'] === 'https'
          }
        };
      }
    });

    const mockReq = {
      headers: { 
        'user-agent': 'Mozilla/5.0',
        'x-forwarded-proto': 'https'
      },
      ip: '192.168.1.1',
      body: {},
      query: {},
      params: {}
    };

    const result = await authScheme.validate(mockReq as any);
    expect(result.user.id).toBe('1');
    expect(result.context.userAgent).toBe('Mozilla/5.0');
    expect(result.context.clientIp).toBe('192.168.1.1');
    expect(result.context.secure).toBe(true);
  });

  it('should handle validation with role-based permissions', async () => {
    const authScheme = createAuthScheme({
      name: 'role-based',
      validate: async (req) => {
        const token = req.headers.authorization?.replace('Bearer ', '');
        
        const roleMapping = {
          'admin-token': { role: 'admin', permissions: ['read', 'write', 'delete', 'manage'] },
          'editor-token': { role: 'editor', permissions: ['read', 'write'] },
          'viewer-token': { role: 'viewer', permissions: ['read'] }
        };

        const mapping = roleMapping[token as keyof typeof roleMapping];
        if (!mapping) {
          throw new Error('Invalid token');
        }

        return {
          user: {
            id: '1',
            role: mapping.role,
            permissions: mapping.permissions
          }
        };
      }
    });

    const mockReq = {
      headers: { authorization: 'Bearer admin-token' },
      body: {},
      query: {},
      params: {}
    };

    const result = await authScheme.validate(mockReq as any);
    expect(result.user.role).toBe('admin');
    expect(result.user.permissions).toEqual(['read', 'write', 'delete', 'manage']);
  });

  it('should handle validation with caching mechanism', async () => {
    const cache = new Map();
    let validationCount = 0;

    const authScheme = createAuthScheme({
      name: 'cached',
      validate: async (req) => {
        const token = req.headers.authorization;
        
        // Check cache first
        if (cache.has(token)) {
          return cache.get(token);
        }

        // Increment validation count for testing
        validationCount++;
        
        // Simulate expensive validation
        await new Promise(resolve => setTimeout(resolve, 1));
        
        const context = { 
          user: { id: '1', validationCount },
          cached: true 
        };
        
        // Cache result with TTL simulation
        cache.set(token, context);
        setTimeout(() => cache.delete(token), 100); // 100ms TTL
        
        return context;
      }
    });

    const mockReq = {
      headers: { authorization: 'Bearer cache-token' },
      body: {},
      query: {},
      params: {}
    };

    // First validation - should hit validation logic
    const result1 = await authScheme.validate(mockReq as any);
    expect(result1.user.validationCount).toBe(1);
    expect(validationCount).toBe(1);

    // Second validation - should hit cache
    const result2 = await authScheme.validate(mockReq as any);
    expect(result2.user.validationCount).toBe(1); // Same as cached
    expect(validationCount).toBe(1); // No additional validation
  });

  it('should handle validation with environment-specific logic', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const authScheme = createAuthScheme({
      name: 'env-aware',
      validate: async (req) => {
        const isDevelopment = process.env.NODE_ENV === 'development';
        
        if (isDevelopment) {
          // Relaxed validation for development
          return { 
            user: { 
              id: 'dev-user', 
              role: 'developer',
              environment: 'development' 
            } 
          };
        }
        
        // Strict validation for production
        const token = req.headers.authorization;
        if (!token?.startsWith('Bearer ')) {
          throw new Error('Valid bearer token required in production');
        }
        
        return { 
          user: { 
            id: '1', 
            role: 'user',
            environment: 'production' 
          } 
        };
      }
    });

    const mockReq = {
      headers: {},
      body: {},
      query: {},
      params: {}
    };

    const result = await authScheme.validate(mockReq as any);
    expect(result.user.environment).toBe('development');
    expect(result.user.role).toBe('developer');

    // Restore original environment
    process.env.NODE_ENV = originalEnv;
  });

  it('should handle validation with multi-step verification', async () => {
    const authScheme = createAuthScheme({
      name: 'multi-step',
      validate: async (req) => {
        // Step 1: Check basic auth header
        const authHeader = req.headers.authorization;
        if (!authHeader) {
          throw new Error('Authorization header required');
        }

        // Step 2: Validate format
        if (!authHeader.startsWith('Bearer ')) {
          throw new Error('Bearer token required');
        }

        // Step 3: Extract token
        const token = authHeader.slice(7);
        if (token.length < 10) {
          throw new Error('Token too short');
        }

        // Step 4: Validate token format (simple check)
        if (!/^[a-zA-Z0-9-_]+$/.test(token)) {
          throw new Error('Invalid token format');
        }

        // Step 5: Simulate token verification
        if (!token.includes('valid')) {
          throw new Error('Invalid token');
        }

        return { 
          user: { 
            id: '1', 
            token,
            validated: true,
            steps: 5
          } 
        };
      }
    });

    const mockReq = {
      headers: { authorization: 'Bearer valid-token-123' },
      body: {},
      query: {},
      params: {}
    };

    const result = await authScheme.validate(mockReq as any);
    expect(result.user.validated).toBe(true);
    expect(result.user.steps).toBe(5);
    expect(result.user.token).toBe('valid-token-123');
  });

  it('should handle validation with conditional requirements', async () => {
    const authScheme = createAuthScheme({
      name: 'conditional',
      validate: async (req) => {
        const method = req.method;
        const path = req.path;
        
        // Different auth requirements based on request
        if (method === 'GET' && path?.startsWith('/public')) {
          return { user: { id: 'anonymous', level: 'public' } };
        }
        
        if (method === 'POST' || method === 'PUT' || method === 'DELETE') {
          const token = req.headers.authorization;
          if (!token) {
            throw new Error('Authentication required for write operations');
          }
          return { user: { id: '1', level: 'authenticated' } };
        }
        
        return { user: { id: 'guest', level: 'guest' } };
      }
    });

    // Test public GET request
    const publicReq = {
      method: 'GET',
      path: '/public/data',
      headers: {},
      body: {},
      query: {},
      params: {}
    };

    const publicResult = await authScheme.validate(publicReq as any);
    expect(publicResult.user.level).toBe('public');

    // Test authenticated POST request
    const postReq = {
      method: 'POST',
      path: '/api/data',
      headers: { authorization: 'Bearer token' },
      body: {},
      query: {},
      params: {}
    };

    const postResult = await authScheme.validate(postReq as any);
    expect(postResult.user.level).toBe('authenticated');
  });

  it('should handle validation with retry logic', async () => {
    let attemptCount = 0;

    const authScheme = createAuthScheme({
      name: 'retry',
      validate: async (req) => {
        attemptCount++;
        
        // Simulate intermittent failure
        if (attemptCount === 1) {
          throw new Error('Temporary service unavailable');
        }
        
        return { 
          user: { 
            id: '1', 
            attempts: attemptCount 
          } 
        };
      }
    });

    const mockReq = {
      headers: { authorization: 'Bearer token' },
      body: {},
      query: {},
      params: {}
    };

    // First attempt should fail
    await expect(authScheme.validate(mockReq as any)).rejects.toThrow('Temporary service unavailable');
    
    // Second attempt should succeed
    const result = await authScheme.validate(mockReq as any);
    expect(result.user.attempts).toBe(2);
  });
});