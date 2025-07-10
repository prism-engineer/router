import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createAuthScheme } from '../../src/createAuthScheme';
import { Type } from '@sinclair/typebox';

describe('Authentication - Auth Scheme Creation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a basic auth scheme with name and validate function', () => {
    const authScheme = createAuthScheme({
      name: 'basic',
      validate: async (req) => {
        return { user: { id: '1', name: 'John' } };
      }
    });

    expect(authScheme).toBeDefined();
    expect(authScheme.name).toBe('basic');
    expect(typeof authScheme.validate).toBe('function');
  });

  it('should create a bearer token auth scheme', () => {
    const authScheme = createAuthScheme({
      name: 'bearer',
      validate: async (req) => {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
          throw new Error('Invalid authorization header');
        }
        return { user: { id: '1', token: authHeader.slice(7) } };
      }
    });

    expect(authScheme.name).toBe('bearer');
    expect(typeof authScheme.validate).toBe('function');
  });

  it('should create an API key auth scheme', () => {
    const authScheme = createAuthScheme({
      name: 'apiKey',
      validate: async (req) => {
        const apiKey = req.headers['x-api-key'];
        if (!apiKey) {
          throw new Error('API key required');
        }
        return { client: { id: '1', apiKey } };
      }
    });

    expect(authScheme.name).toBe('apiKey');
    expect(typeof authScheme.validate).toBe('function');
  });

  it('should create a session-based auth scheme', () => {
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

    expect(authScheme.name).toBe('session');
    expect(typeof authScheme.validate).toBe('function');
  });

  it('should create a custom auth scheme with complex validation', () => {
    const authScheme = createAuthScheme({
      name: 'custom',
      validate: async (req) => {
        const signature = req.headers['x-signature'];
        const timestamp = req.headers['x-timestamp'];
        
        if (!signature || !timestamp) {
          throw new Error('Missing authentication headers');
        }
        
        // Simulate signature validation
        if (signature !== 'valid-signature') {
          throw new Error('Invalid signature');
        }
        
        return { 
          client: { 
            id: '1', 
            verified: true,
            timestamp: parseInt(timestamp   as string)
          } 
        };
      }
    });

    expect(authScheme.name).toBe('custom');
    expect(typeof authScheme.validate).toBe('function');
  });

  it('should create auth scheme with typed context', () => {
    interface UserContext {
      user: {
        id: string;
        role: 'admin' | 'user';
        permissions: string[];
      };
    }

    const authScheme = createAuthScheme({
      name: 'typed',
      validate: async (req): Promise<UserContext> => {
        return {
          user: {
            id: '1',
            role: 'admin',
            permissions: ['read', 'write', 'delete']
          }
        };
      }
    });

    expect(authScheme.name).toBe('typed');
    expect(typeof authScheme.validate).toBe('function');
  });

  it('should create auth scheme with minimal configuration', () => {
    const authScheme = createAuthScheme({
      name: 'minimal',
      validate: async () => ({ authenticated: true })
    });

    expect(authScheme.name).toBe('minimal');
    expect(typeof authScheme.validate).toBe('function');
  });

  it('should create auth scheme with async validation', () => {
    const authScheme = createAuthScheme({
      name: 'async',
      validate: async (req) => {
        // Simulate async database lookup
        await new Promise(resolve => setTimeout(resolve, 1));
        
        const token = req.headers.authorization;
        if (!token) {
          throw new Error('Token required');
        }
        
        return { user: { id: '1', verified: true } };
      }
    });

    expect(authScheme.name).toBe('async');
    expect(typeof authScheme.validate).toBe('function');
  });

  it('should create auth scheme with promise-based validation', () => {
    const authScheme = createAuthScheme({
      name: 'promise',
      validate: (req) => {
        return Promise.resolve({ user: { id: '1' } });
      }
    });

    expect(authScheme.name).toBe('promise');
    expect(typeof authScheme.validate).toBe('function');
  });

  it('should create auth scheme with error handling', () => {
    const authScheme = createAuthScheme({
      name: 'error-handling',
      validate: async (req) => {
        try {
          const auth = req.headers.authorization;
          if (!auth) {
            throw new Error('No authorization header');
          }
          return { user: { id: '1' } };
        } catch (error: any) {
          throw new Error(`Authentication failed: ${error.message}`);
        }
      }
    });

    expect(authScheme.name).toBe('error-handling');
    expect(typeof authScheme.validate).toBe('function');
  });

  it('should create auth scheme with multiple validation steps', () => {
    const authScheme = createAuthScheme({
      name: 'multi-step',
      validate: async (req) => {
        // Step 1: Check header presence
        const authHeader = req.headers.authorization;
        if (!authHeader) {
          throw new Error('Authorization header required');
        }

        // Step 2: Validate format
        if (!authHeader.startsWith('Bearer ')) {
          throw new Error('Invalid authorization format');
        }

        // Step 3: Extract and validate token
        const token = authHeader.slice(7);
        if (token.length < 10) {
          throw new Error('Invalid token length');
        }

        // Step 4: Return context
        return { 
          user: { 
            id: '1', 
            token,
            validated: true 
          } 
        };
      }
    });

    expect(authScheme.name).toBe('multi-step');
    expect(typeof authScheme.validate).toBe('function');
  });

  it('should create auth scheme with environment-based validation', () => {
    const authScheme = createAuthScheme({
      name: 'env-based',
      validate: async (req) => {
        const isDevelopment = process.env.NODE_ENV === 'development';
        
        if (isDevelopment) {
          // Relaxed validation for development
          return { user: { id: 'dev-user', role: 'developer' } };
        }
        
        // Strict validation for production
        const token = req.headers.authorization;
        if (!token || !token.startsWith('Bearer ')) {
          throw new Error('Valid bearer token required');
        }
        
        return { user: { id: '1', role: 'user' } };
      }
    });

    expect(authScheme.name).toBe('env-based');
    expect(typeof authScheme.validate).toBe('function');
  });

  it('should create auth scheme with request context validation', () => {
    const authScheme = createAuthScheme({
      name: 'context-aware',
      validate: async (req) => {
        const userAgent = req.headers['user-agent'];
        const clientIp = req.ip || req.connection?.remoteAddress;
        
        return {
          user: { id: '1' },
          context: {
            userAgent,
            clientIp,
            timestamp: Date.now()
          }
        };
      }
    });

    expect(authScheme.name).toBe('context-aware');
    expect(typeof authScheme.validate).toBe('function');
  });

  it('should create auth scheme with role-based context', () => {
    const authScheme = createAuthScheme({
      name: 'role-based',
      validate: async (req) => {
        const role = req.headers['x-user-role'] as string;
        
        const permissions = {
          admin: ['read', 'write', 'delete', 'manage'],
          editor: ['read', 'write'],
          viewer: ['read']
        };

        return {
          user: {
            id: '1',
            role: role || 'viewer',
            permissions: permissions[role as keyof typeof permissions] || permissions.viewer
          }
        };
      }
    });

    expect(authScheme.name).toBe('role-based');
    expect(typeof authScheme.validate).toBe('function');
  });

  it('should create auth scheme with external service validation', () => {
    const authScheme = createAuthScheme({
      name: 'external-service',
      validate: async (req) => {
        const token = req.headers.authorization?.replace('Bearer ', '');
        
        // Simulate external service call
        const mockExternalValidation = async (token: string | undefined) => {
          if (token === 'valid-external-token') {
            return { userId: '1', scope: 'read:profile' };
          }

          throw new Error('Invalid token');
        };

        try {
          const result = await mockExternalValidation(token);
          return { 
            user: { 
              id: result.userId, 
              scope: result.scope,
              provider: 'external' 
            } 
          };
        } catch {
          throw new Error('External validation failed');
        }
      }
    });

    expect(authScheme.name).toBe('external-service');
    expect(typeof authScheme.validate).toBe('function');
  });

  it('should create auth scheme with caching logic', () => {
    const cache = new Map();

    const authScheme = createAuthScheme({
      name: 'cached',
      validate: async (req) => {
        const token = req.headers.authorization;
        
        // Check cache first
        if (cache.has(token)) {
          return cache.get(token);
        }

        // Simulate expensive validation
        await new Promise(resolve => setTimeout(resolve, 1));
        
        const context = { user: { id: '1', cached: true } };
        
        // Cache result
        cache.set(token, context);
        
        return context;
      }
    });

    expect(authScheme.name).toBe('cached');
    expect(typeof authScheme.validate).toBe('function');
  });

  it('should handle auth scheme creation with undefined name', () => {
    expect(() => {
      createAuthScheme({
        name: undefined as any,
        validate: async () => ({ user: { id: '1' } })
      });
    }).toThrow();
  });

  it('should handle auth scheme creation with empty name', () => {
    expect(() => {
      createAuthScheme({
        name: '',
        validate: async () => ({ user: { id: '1' } })
      });
    }).toThrow();
  });

  it('should handle auth scheme creation with undefined validate function', () => {
    expect(() => {
      createAuthScheme({
        name: 'test',
        validate: undefined as any
      });
    }).toThrow();
  });

  it('should handle auth scheme creation with non-function validate', () => {
    expect(() => {
      createAuthScheme({
        name: 'test',
        validate: 'not a function' as any
      });
    }).toThrow();
  });
});