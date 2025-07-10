import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createAuthScheme } from '../../src/createAuthScheme';
import { createApiRoute } from '../../src/createApiRoute';
import { Type } from '@sinclair/typebox';

describe('Authentication - Auth Failures', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle missing authorization header', async () => {
    const authScheme = createAuthScheme({
      name: 'bearer-required',
      validate: async (req) => {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
          throw new Error('Authorization header required');
        }
        return { user: { id: '1' } };
      }
    });

    const mockReq = {
      headers: {},
      body: {},
      query: {},
      params: {}
    };

    await expect(authScheme.validate(mockReq as any)).rejects.toThrow('Authorization header required');
  });

  it('should handle invalid authorization format', async () => {
    const authScheme = createAuthScheme({
      name: 'bearer-format',
      validate: async (req) => {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
          throw new Error('Invalid authorization format');
        }
        return { user: { id: '1' } };
      }
    });

    const mockReq = {
      headers: { authorization: 'Basic invalid' },
      body: {},
      query: {},
      params: {}
    };

    await expect(authScheme.validate(mockReq as any)).rejects.toThrow('Invalid authorization format');
  });

  it('should handle expired tokens', async () => {
    const authScheme = createAuthScheme({
      name: 'token-expiry',
      validate: async (req) => {
        const token = req.headers.authorization?.replace('Bearer ', '');
        
        // Simulate token expiry check
        if (token === 'expired-token') {
          throw new Error('Token has expired');
        }
        
        if (!token) {
          throw new Error('Token required');
        }
        
        return { user: { id: '1', token } };
      }
    });

    const mockReq = {
      headers: { authorization: 'Bearer expired-token' },
      body: {},
      query: {},
      params: {}
    };

    await expect(authScheme.validate(mockReq as any)).rejects.toThrow('Token has expired');
  });

  it('should handle invalid API keys', async () => {
    const authScheme = createAuthScheme({
      name: 'api-key-validation',
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
      headers: { 'x-api-key': 'invalid-key' },
      body: {},
      query: {},
      params: {}
    };

    await expect(authScheme.validate(mockReq as any)).rejects.toThrow('Invalid API key');
  });

  it('should handle missing required headers', async () => {
    const authScheme = createAuthScheme({
      name: 'required-headers',
      validate: async (req) => {
        const signature = req.headers['x-signature'];
        const timestamp = req.headers['x-timestamp'];
        
        if (!signature) {
          throw new Error('X-Signature header required');
        }
        
        if (!timestamp) {
          throw new Error('X-Timestamp header required');
        }
        
        return { client: { id: '1', signature, timestamp } };
      }
    });

    const mockReq = {
      headers: { 'x-signature': 'sig123' }, // Missing timestamp
      body: {},
      query: {},
      params: {}
    };

    await expect(authScheme.validate(mockReq as any)).rejects.toThrow('X-Timestamp header required');
  });

  it('should handle invalid session cookies', async () => {
    const authScheme = createAuthScheme({
      name: 'session-validation',
      validate: async (req) => {
        const cookie = req.headers.cookie;
        
        if (!cookie) {
          throw new Error('Session cookie required');
        }
        
        const sessionId = cookie.match(/sessionId=([^;]+)/)?.[1];
        
        if (!sessionId) {
          throw new Error('Session ID not found in cookie');
        }
        
        if (sessionId === 'invalid-session') {
          throw new Error('Invalid session');
        }
        
        return { session: { id: sessionId, userId: '1' } };
      }
    });

    const mockReq = {
      headers: { cookie: 'sessionId=invalid-session' },
      body: {},
      query: {},
      params: {}
    };

    await expect(authScheme.validate(mockReq as any)).rejects.toThrow('Invalid session');
  });

  it('should handle network timeout during validation', async () => {
    const authScheme = createAuthScheme({
      name: 'network-timeout',
      validate: async (req) => {
        const token = req.headers.authorization;
        
        // Simulate network timeout
        if (token === 'Bearer timeout-token') {
          await new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Network timeout')), 100);
          });
        }
        
        return { user: { id: '1' } };
      }
    });

    const mockReq = {
      headers: { authorization: 'Bearer timeout-token' },
      body: {},
      query: {},
      params: {}
    };

    await expect(authScheme.validate(mockReq as any)).rejects.toThrow('Network timeout');
  });

  it('should handle external service failures', async () => {
    const authScheme = createAuthScheme({
      name: 'external-service-failure',
      validate: async (req) => {
        const token = req.headers.authorization?.replace('Bearer ', '');
        
        // Simulate external service call
        const validateWithExternalService = async (token: string) => {
          if (token === 'service-down') {
            throw new Error('External service unavailable');
          }
          if (token === 'rate-limited') {
            throw new Error('Rate limit exceeded by external service');
          }
          throw new Error('Unknown external service error');
        };

        try {
          await validateWithExternalService(token);
          return { user: { id: '1' } };
        } catch (error) {
          throw new Error(`External validation failed: ${error.message}`);
        }
      }
    });

    const serviceDownReq = {
      headers: { authorization: 'Bearer service-down' },
      body: {},
      query: {},
      params: {}
    };

    await expect(authScheme.validate(serviceDownReq as any)).rejects.toThrow('External service unavailable');

    const rateLimitedReq = {
      headers: { authorization: 'Bearer rate-limited' },
      body: {},
      query: {},
      params: {}
    };

    await expect(authScheme.validate(rateLimitedReq as any)).rejects.toThrow('Rate limit exceeded by external service');
  });

  it('should handle insufficient permissions', async () => {
    const authScheme = createAuthScheme({
      name: 'permission-check',
      validate: async (req) => {
        const role = req.headers['x-user-role'];
        const requiredRole = req.headers['x-required-role'];
        
        if (!role) {
          throw new Error('User role required');
        }
        
        const roleHierarchy = ['viewer', 'editor', 'admin'];
        const userLevel = roleHierarchy.indexOf(role);
        const requiredLevel = roleHierarchy.indexOf(requiredRole);
        
        if (requiredLevel !== -1 && userLevel < requiredLevel) {
          throw new Error(`Insufficient permissions: ${requiredRole} required, got ${role}`);
        }
        
        return { user: { id: '1', role } };
      }
    });

    const mockReq = {
      headers: { 
        'x-user-role': 'viewer',
        'x-required-role': 'admin'
      },
      body: {},
      query: {},
      params: {}
    };

    await expect(authScheme.validate(mockReq as any)).rejects.toThrow('Insufficient permissions: admin required, got viewer');
  });

  it('should handle malformed tokens', async () => {
    const authScheme = createAuthScheme({
      name: 'token-format-validation',
      validate: async (req) => {
        const token = req.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          throw new Error('Token required');
        }
        
        // Check token format (should be base64-like)
        if (!/^[A-Za-z0-9+/=]+$/.test(token)) {
          throw new Error('Malformed token format');
        }
        
        // Check minimum length
        if (token.length < 20) {
          throw new Error('Token too short');
        }
        
        // Check if token is properly base64 encoded
        try {
          atob(token);
        } catch {
          throw new Error('Invalid token encoding');
        }
        
        return { user: { id: '1', token } };
      }
    });

    const malformedReq = {
      headers: { authorization: 'Bearer invalid@token!' },
      body: {},
      query: {},
      params: {}
    };

    await expect(authScheme.validate(malformedReq as any)).rejects.toThrow('Malformed token format');

    const shortTokenReq = {
      headers: { authorization: 'Bearer abc' },
      body: {},
      query: {},
      params: {}
    };

    await expect(authScheme.validate(shortTokenReq as any)).rejects.toThrow('Token too short');
  });

  it('should handle database connection failures', async () => {
    const authScheme = createAuthScheme({
      name: 'database-failure',
      validate: async (req) => {
        const userId = req.headers['x-user-id'];
        
        // Simulate database connection error
        if (userId === 'db-error') {
          throw new Error('Database connection failed');
        }
        
        // Simulate database timeout
        if (userId === 'db-timeout') {
          throw new Error('Database query timeout');
        }
        
        return { user: { id: userId || '1' } };
      }
    });

    const dbErrorReq = {
      headers: { 'x-user-id': 'db-error' },
      body: {},
      query: {},
      params: {}
    };

    await expect(authScheme.validate(dbErrorReq as any)).rejects.toThrow('Database connection failed');

    const dbTimeoutReq = {
      headers: { 'x-user-id': 'db-timeout' },
      body: {},
      query: {},
      params: {}
    };

    await expect(authScheme.validate(dbTimeoutReq as any)).rejects.toThrow('Database query timeout');
  });

  it('should handle rate limiting failures', async () => {
    const rateLimiter = new Map();

    const authScheme = createAuthScheme({
      name: 'rate-limiting',
      validate: async (req) => {
        const clientId = req.headers['x-client-id'] || req.ip || 'anonymous';
        const now = Date.now();
        const windowMs = 60000; // 1 minute
        const maxAttempts = 5;
        
        if (!rateLimiter.has(clientId)) {
          rateLimiter.set(clientId, { attempts: 0, resetTime: now + windowMs });
        }
        
        const limit = rateLimiter.get(clientId);
        
        if (now > limit.resetTime) {
          limit.attempts = 0;
          limit.resetTime = now + windowMs;
        }
        
        limit.attempts++;
        
        if (limit.attempts > maxAttempts) {
          throw new Error(`Rate limit exceeded: ${limit.attempts}/${maxAttempts} attempts in window`);
        }
        
        // Simulate auth failure to trigger rate limiting
        const token = req.headers.authorization;
        if (!token || token !== 'Bearer valid-token') {
          throw new Error('Invalid credentials');
        }
        
        return { user: { id: '1' } };
      }
    });

    const invalidReq = {
      headers: { 
        'x-client-id': 'rate-test-client',
        authorization: 'Bearer invalid'
      },
      body: {},
      query: {},
      params: {}
    };

    // Make multiple failed attempts
    for (let i = 0; i < 5; i++) {
      await expect(authScheme.validate(invalidReq as any)).rejects.toThrow('Invalid credentials');
    }

    // 6th attempt should be rate limited
    await expect(authScheme.validate(invalidReq as any)).rejects.toThrow('Rate limit exceeded');
  });

  it('should handle account lockout scenarios', async () => {
    const accountStatus = new Map();

    const authScheme = createAuthScheme({
      name: 'account-lockout',
      validate: async (req) => {
        const userId = req.headers['x-user-id'];
        
        if (!userId) {
          throw new Error('User ID required');
        }
        
        const status = accountStatus.get(userId) || { locked: false, failedAttempts: 0 };
        
        if (status.locked) {
          const lockExpiry = status.lockedUntil || 0;
          if (Date.now() < lockExpiry) {
            throw new Error(`Account locked until ${new Date(lockExpiry).toISOString()}`);
          } else {
            // Unlock account
            status.locked = false;
            status.failedAttempts = 0;
            accountStatus.set(userId, status);
          }
        }
        
        const password = req.headers['x-password'];
        if (password !== 'correct-password') {
          status.failedAttempts++;
          
          if (status.failedAttempts >= 3) {
            status.locked = true;
            status.lockedUntil = Date.now() + 300000; // 5 minutes
          }
          
          accountStatus.set(userId, status);
          throw new Error('Invalid credentials');
        }
        
        // Reset failed attempts on successful login
        status.failedAttempts = 0;
        accountStatus.set(userId, status);
        
        return { user: { id: userId } };
      }
    });

    const invalidReq = {
      headers: { 
        'x-user-id': 'lockout-test-user',
        'x-password': 'wrong-password'
      },
      body: {},
      query: {},
      params: {}
    };

    // Make 3 failed attempts
    for (let i = 0; i < 3; i++) {
      await expect(authScheme.validate(invalidReq as any)).rejects.toThrow('Invalid credentials');
    }

    // 4th attempt should show account locked
    await expect(authScheme.validate(invalidReq as any)).rejects.toThrow('Account locked until');
  });

  it('should handle token revocation scenarios', async () => {
    const revokedTokens = new Set(['revoked-token-1', 'revoked-token-2']);

    const authScheme = createAuthScheme({
      name: 'token-revocation',
      validate: async (req) => {
        const token = req.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          throw new Error('Token required');
        }
        
        if (revokedTokens.has(token)) {
          throw new Error('Token has been revoked');
        }
        
        return { user: { id: '1', token } };
      }
    });

    const revokedReq = {
      headers: { authorization: 'Bearer revoked-token-1' },
      body: {},
      query: {},
      params: {}
    };

    await expect(authScheme.validate(revokedReq as any)).rejects.toThrow('Token has been revoked');
  });

  it('should handle concurrent validation failures', async () => {
    let concurrentValidations = 0;
    const maxConcurrent = 3;

    const authScheme = createAuthScheme({
      name: 'concurrent-limit',
      validate: async (req) => {
        concurrentValidations++;
        
        if (concurrentValidations > maxConcurrent) {
          concurrentValidations--;
          throw new Error('Too many concurrent authentication attempts');
        }
        
        try {
          // Simulate validation work
          await new Promise(resolve => setTimeout(resolve, 10));
          
          const token = req.headers.authorization;
          if (!token) {
            throw new Error('Token required');
          }
          
          return { user: { id: '1' } };
        } finally {
          concurrentValidations--;
        }
      }
    });

    const mockReq = {
      headers: { authorization: 'Bearer valid-token' },
      body: {},
      query: {},
      params: {}
    };

    // Start multiple concurrent validations
    const promises = Array(5).fill(null).map(() => authScheme.validate(mockReq as any));
    
    const results = await Promise.allSettled(promises);
    const rejected = results.filter(r => r.status === 'rejected');
    
    // Some should be rejected due to concurrent limit
    expect(rejected.length).toBeGreaterThan(0);
  });

  it('should handle validation timeout scenarios', async () => {
    const authScheme = createAuthScheme({
      name: 'validation-timeout',
      validate: async (req) => {
        const timeout = parseInt(req.headers['x-timeout'] as string) || 0;
        
        if (timeout > 0) {
          await new Promise((resolve, reject) => {
            setTimeout(() => reject(new Error('Validation timeout')), timeout);
          });
        }
        
        return { user: { id: '1' } };
      }
    });

    const timeoutReq = {
      headers: { 'x-timeout': '50' }, // 50ms timeout
      body: {},
      query: {},
      params: {}
    };

    await expect(authScheme.validate(timeoutReq as any)).rejects.toThrow('Validation timeout');
  });

  it('should handle multiple auth schemes with all failures', async () => {
    const bearerAuth = createAuthScheme({
      name: 'bearer',
      validate: async (req) => {
        const auth = req.headers.authorization;
        if (!auth?.startsWith('Bearer ')) {
          throw new Error('Bearer token required');
        }
        throw new Error('Invalid bearer token');
      }
    });

    const apiKeyAuth = createAuthScheme({
      name: 'apiKey',
      validate: async (req) => {
        const apiKey = req.headers['x-api-key'];
        if (!apiKey) {
          throw new Error('API key required');
        }
        throw new Error('Invalid API key');
      }
    });

    const route = createApiRoute({
      path: '/api/all-auth-fail',
      method: 'GET',
      auth: [bearerAuth, apiKeyAuth],
      response: {
        200: {
          contentType: 'application/json',
          body: Type.Object({ message: Type.String() })
        }
      },
      handler: async () => {
        return {
          status: 200 as const,
          body: { message: 'Should not reach here' }
        };
      }
    });

    // Route creation should succeed even if auth will fail
    expect(route.auth).toHaveLength(2);
  });

  it('should handle auth scheme creation with invalid parameters', () => {
    // Test invalid auth scheme creation scenarios
    expect(() => {
      createAuthScheme({
        name: '', // Empty name
        validate: async () => ({ user: { id: '1' } })
      });
    }).toThrow();

    expect(() => {
      createAuthScheme({
        name: 'test',
        validate: null as any // Null validate function
      });
    }).toThrow();

    expect(() => {
      createAuthScheme({
        name: 'test',
        validate: 'not-a-function' as any // Invalid validate function
      });
    }).toThrow();
  });
});