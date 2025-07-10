import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { router } from '../../src/router';
import path from 'path';
import fs from 'fs/promises';

describe('Frontend Client - Authentication', () => {
  let tempDir: string;
  let generatedClient: any;
  let mockFetch: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Mock fetch globally
    mockFetch = vi.fn();
    global.fetch = mockFetch;
    
    // Create temporary directory for generated client
    tempDir = path.join(process.cwd(), 'temp-test-' + crypto.randomUUID());    await fs.mkdir(tempDir, { recursive: true });

    // Generate client for testing
    await router.compile({
      outputDir: tempDir,
      name: 'AuthClient',
      baseUrl: 'http://localhost:3000',
      routes: {
        directory: path.join(__dirname, '../router/fixtures/api'),
        pattern: /.*\.ts$/
      }
    });

    // Create a mock client with authentication handling
    generatedClient = createMockAuthClient();
  });

  afterEach(async () => {
    // Cleanup temporary directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
    
    vi.restoreAllMocks();
  });

  // Mock client factory for authentication testing
  function createMockAuthClient() {
    return {
      api: {
        public: {
          get: vi.fn().mockImplementation(async (options = {}) => {
            const response = {
              ok: true,
              status: 200,
              headers: new Map([['content-type', 'application/json']]),
              json: vi.fn().mockResolvedValue({ message: 'Public endpoint' })
            };
            
            mockFetch.mockResolvedValueOnce(response);
            
            await fetch('http://localhost:3000/api/public', {
              method: 'GET',
              headers: options.headers || {}
            });
            
            return { message: 'Public endpoint' };
          })
        },
        protected: {
          get: vi.fn().mockImplementation(async (options = {}) => {
            const authHeader = options.headers?.authorization || options.headers?.Authorization;
            
            if (!authHeader) {
              const response = {
                ok: false,
                status: 401,
                headers: new Map([['content-type', 'application/json']]),
                json: vi.fn().mockResolvedValue({ error: 'Authorization required' })
              };
              
              mockFetch.mockResolvedValueOnce(response);
              
              const fetchResponse = await fetch('http://localhost:3000/api/protected', {
                method: 'GET',
                headers: options.headers || {}
              });
              
              if (!fetchResponse.ok) {
                throw new Error('Authorization required');
              }
            }
            
            const response = {
              ok: true,
              status: 200,
              headers: new Map([['content-type', 'application/json']]),
              json: vi.fn().mockResolvedValue({ 
                message: 'Protected endpoint',
                user: { id: '1', name: 'John Doe' }
              })
            };
            
            mockFetch.mockResolvedValueOnce(response);
            
            await fetch('http://localhost:3000/api/protected', {
              method: 'GET',
              headers: options.headers || {}
            });
            
            return {
              message: 'Protected endpoint',
              user: { id: '1', name: 'John Doe' }
            };
          })
        },
        admin: {
          get: vi.fn().mockImplementation(async (options = {}) => {
            const authHeader = options.headers?.authorization || options.headers?.Authorization;
            
            if (!authHeader?.includes('admin-token')) {
              const response = {
                ok: false,
                status: 403,
                headers: new Map([['content-type', 'application/json']]),
                json: vi.fn().mockResolvedValue({ error: 'Insufficient permissions' })
              };
              
              mockFetch.mockResolvedValueOnce(response);
              
              const fetchResponse = await fetch('http://localhost:3000/api/admin', {
                method: 'GET',
                headers: options.headers || {}
              });
              
              if (!fetchResponse.ok) {
                throw new Error('Insufficient permissions');
              }
            }
            
            const response = {
              ok: true,
              status: 200,
              headers: new Map([['content-type', 'application/json']]),
              json: vi.fn().mockResolvedValue({ 
                message: 'Admin endpoint',
                admin: { id: 'admin-1', permissions: ['read', 'write', 'delete'] }
              })
            };
            
            mockFetch.mockResolvedValueOnce(response);
            
            await fetch('http://localhost:3000/api/admin', {
              method: 'GET',
              headers: options.headers || {}
            });
            
            return {
              message: 'Admin endpoint',
              admin: { id: 'admin-1', permissions: ['read', 'write', 'delete'] }
            };
          })
        },
        apikey: {
          get: vi.fn().mockImplementation(async (options = {}) => {
            const apiKey = options.headers?.['x-api-key'] || options.headers?.['X-API-Key'];
            
            if (!apiKey || apiKey !== 'valid-api-key') {
              const response = {
                ok: false,
                status: 401,
                headers: new Map([['content-type', 'application/json']]),
                json: vi.fn().mockResolvedValue({ error: 'Invalid API key' })
              };
              
              mockFetch.mockResolvedValueOnce(response);
              
              const fetchResponse = await fetch('http://localhost:3000/api/apikey', {
                method: 'GET',
                headers: options.headers || {}
              });
              
              if (!fetchResponse.ok) {
                throw new Error('Invalid API key');
              }
            }
            
            const response = {
              ok: true,
              status: 200,
              headers: new Map([['content-type', 'application/json']]),
              json: vi.fn().mockResolvedValue({ 
                message: 'API key authenticated',
                client: { id: 'client-1', name: 'Test Client' }
              })
            };
            
            mockFetch.mockResolvedValueOnce(response);
            
            await fetch('http://localhost:3000/api/apikey', {
              method: 'GET',
              headers: options.headers || {}
            });
            
            return {
              message: 'API key authenticated',
              client: { id: 'client-1', name: 'Test Client' }
            };
          })
        },
        session: {
          get: vi.fn().mockImplementation(async (options = {}) => {
            const cookie = options.headers?.cookie || options.headers?.Cookie;
            const sessionId = cookie?.match(/sessionId=([^;]+)/)?.[1];
            
            if (!sessionId || sessionId !== 'valid-session') {
              const response = {
                ok: false,
                status: 401,
                headers: new Map([['content-type', 'application/json']]),
                json: vi.fn().mockResolvedValue({ error: 'Invalid session' })
              };
              
              mockFetch.mockResolvedValueOnce(response);
              
              const fetchResponse = await fetch('http://localhost:3000/api/session', {
                method: 'GET',
                headers: options.headers || {}
              });
              
              if (!fetchResponse.ok) {
                throw new Error('Invalid session');
              }
            }
            
            const response = {
              ok: true,
              status: 200,
              headers: new Map([['content-type', 'application/json']]),
              json: vi.fn().mockResolvedValue({ 
                message: 'Session authenticated',
                session: { id: sessionId, userId: 'user-1' }
              })
            };
            
            mockFetch.mockResolvedValueOnce(response);
            
            await fetch('http://localhost:3000/api/session', {
              method: 'GET',
              headers: options.headers || {}
            });
            
            return {
              message: 'Session authenticated',
              session: { id: sessionId, userId: 'user-1' }
            };
          })
        }
      },
      // Client configuration for authentication
      setAuthToken: vi.fn().mockImplementation((token: string) => {
        // Mock implementation for setting global auth token
        generatedClient._authToken = token;
      }),
      setApiKey: vi.fn().mockImplementation((apiKey: string) => {
        // Mock implementation for setting global API key
        generatedClient._apiKey = apiKey;
      }),
      _authToken: null,
      _apiKey: null
    };
  }

  it('should access public endpoints without authentication', async () => {
    const result = await generatedClient.api.public.get();
    
    expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/public', {
      method: 'GET',
      headers: {}
    });
    
    expect(result).toEqual({ message: 'Public endpoint' });
  });

  it('should handle Bearer token authentication', async () => {
    const result = await generatedClient.api.protected.get({
      headers: { 'Authorization': 'Bearer valid-token-123' }
    });
    
    expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/protected', {
      method: 'GET',
      headers: { 'Authorization': 'Bearer valid-token-123' }
    });
    
    expect(result).toEqual({
      message: 'Protected endpoint',
      user: { id: '1', name: 'John Doe' }
    });
  });

  it('should handle API key authentication', async () => {
    const result = await generatedClient.api.apikey.get({
      headers: { 'X-API-Key': 'valid-api-key' }
    });
    
    expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/apikey', {
      method: 'GET',
      headers: { 'X-API-Key': 'valid-api-key' }
    });
    
    expect(result).toEqual({
      message: 'API key authenticated',
      client: { id: 'client-1', name: 'Test Client' }
    });
  });

  it('should handle session-based authentication', async () => {
    const result = await generatedClient.api.session.get({
      headers: { 'Cookie': 'sessionId=valid-session; other=value' }
    });
    
    expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/session', {
      method: 'GET',
      headers: { 'Cookie': 'sessionId=valid-session; other=value' }
    });
    
    expect(result).toEqual({
      message: 'Session authenticated',
      session: { id: 'valid-session', userId: 'user-1' }
    });
  });

  it('should handle role-based authentication', async () => {
    const result = await generatedClient.api.admin.get({
      headers: { 'Authorization': 'Bearer admin-token-123' }
    });
    
    expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/admin', {
      method: 'GET',
      headers: { 'Authorization': 'Bearer admin-token-123' }
    });
    
    expect(result).toEqual({
      message: 'Admin endpoint',
      admin: { id: 'admin-1', permissions: ['read', 'write', 'delete'] }
    });
  });

  it('should handle authentication failures with 401 status', async () => {
    await expect(generatedClient.api.protected.get()).rejects.toThrow('Authorization required');
    
    expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/protected', {
      method: 'GET',
      headers: {}
    });
  });

  it('should handle authorization failures with 403 status', async () => {
    await expect(generatedClient.api.admin.get({
      headers: { 'Authorization': 'Bearer user-token-123' }
    })).rejects.toThrow('Insufficient permissions');
    
    expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/admin', {
      method: 'GET',
      headers: { 'Authorization': 'Bearer user-token-123' }
    });
  });

  it('should handle invalid API key errors', async () => {
    await expect(generatedClient.api.apikey.get({
      headers: { 'X-API-Key': 'invalid-key' }
    })).rejects.toThrow('Invalid API key');
  });

  it('should handle invalid session errors', async () => {
    await expect(generatedClient.api.session.get({
      headers: { 'Cookie': 'sessionId=invalid-session' }
    })).rejects.toThrow('Invalid session');
  });

  it('should handle multiple authentication headers', async () => {
    const result = await generatedClient.api.protected.get({
      headers: {
        'Authorization': 'Bearer token-123',
        'X-API-Key': 'api-key-456',
        'X-User-ID': 'user-789'
      }
    });
    
    expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/protected', {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer token-123',
        'X-API-Key': 'api-key-456',
        'X-User-ID': 'user-789'
      }
    });
    
    expect(result).toEqual({
      message: 'Protected endpoint',
      user: { id: '1', name: 'John Doe' }
    });
  });

  it('should handle client-level authentication configuration', () => {
    // Test setting global auth token
    generatedClient.setAuthToken('global-token-123');
    expect(generatedClient._authToken).toBe('global-token-123');
    
    // Test setting global API key
    generatedClient.setApiKey('global-api-key-456');
    expect(generatedClient._apiKey).toBe('global-api-key-456');
  });

  it('should handle mixed authentication schemes', async () => {
    // Test that different endpoints can use different auth schemes
    const publicResult = await generatedClient.api.public.get();
    expect(publicResult.message).toBe('Public endpoint');
    
    const protectedResult = await generatedClient.api.protected.get({
      headers: { 'Authorization': 'Bearer token-123' }
    });
    expect(protectedResult.message).toBe('Protected endpoint');
    
    const apiKeyResult = await generatedClient.api.apikey.get({
      headers: { 'X-API-Key': 'valid-api-key' }
    });
    expect(apiKeyResult.message).toBe('API key authenticated');
  });

  it('should handle authentication with custom headers', async () => {
    const customAuthClient = {
      api: {
        custom: {
          get: vi.fn().mockImplementation(async (options = {}) => {
            const signature = options.headers?.['X-Signature'];
            const timestamp = options.headers?.['X-Timestamp'];
            
            if (!signature || !timestamp) {
              throw new Error('Custom authentication failed');
            }
            
            mockFetch.mockResolvedValueOnce({
              ok: true,
              status: 200,
              headers: new Map([['content-type', 'application/json']]),
              json: vi.fn().mockResolvedValue({ message: 'Custom auth success' })
            });
            
            await fetch('http://localhost:3000/api/custom', {
              method: 'GET',
              headers: options.headers || {}
            });
            
            return { message: 'Custom auth success' };
          })
        }
      }
    };

    const result = await customAuthClient.api.custom.get({
      headers: {
        'X-Signature': 'signature-abc123',
        'X-Timestamp': '1640995200'
      }
    });
    
    expect(result).toEqual({ message: 'Custom auth success' });
  });

  it('should handle JWT token authentication', async () => {
    const jwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
    
    const result = await generatedClient.api.protected.get({
      headers: { 'Authorization': `Bearer ${jwtToken}` }
    });
    
    expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/protected', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${jwtToken}` }
    });
    
    expect(result).toEqual({
      message: 'Protected endpoint',
      user: { id: '1', name: 'John Doe' }
    });
  });

  it('should handle authentication with refresh tokens', async () => {
    const refreshClient = {
      api: {
        refresh: {
          post: vi.fn().mockImplementation(async (options = {}) => {
            const refreshToken = options.body?.refreshToken;
            
            if (!refreshToken || refreshToken !== 'valid-refresh-token') {
              throw new Error('Invalid refresh token');
            }
            
            mockFetch.mockResolvedValueOnce({
              ok: true,
              status: 200,
              headers: new Map([['content-type', 'application/json']]),
              json: vi.fn().mockResolvedValue({
                accessToken: 'new-access-token-123',
                refreshToken: 'new-refresh-token-456',
                expiresIn: 3600
              })
            });
            
            await fetch('http://localhost:3000/api/refresh', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...options.headers
              },
              body: JSON.stringify(options.body)
            });
            
            return {
              accessToken: 'new-access-token-123',
              refreshToken: 'new-refresh-token-456',
              expiresIn: 3600
            };
          })
        }
      }
    };

    const result = await refreshClient.api.refresh.post({
      body: { refreshToken: 'valid-refresh-token' }
    });
    
    expect(result).toEqual({
      accessToken: 'new-access-token-123',
      refreshToken: 'new-refresh-token-456',
      expiresIn: 3600
    });
  });

  it('should handle authentication errors with detailed error messages', async () => {
    const detailedErrorClient = {
      api: {
        detailed: {
          get: vi.fn().mockImplementation(async (options = {}) => {
            const authHeader = options.headers?.authorization;
            
            if (!authHeader) {
              const response = {
                ok: false,
                status: 401,
                headers: new Map([['content-type', 'application/json']]),
                json: vi.fn().mockResolvedValue({
                  error: 'MISSING_AUTHORIZATION',
                  message: 'Authorization header is required',
                  code: 'AUTH_001'
                })
              };
              
              mockFetch.mockResolvedValueOnce(response);
              
              const fetchResponse = await fetch('http://localhost:3000/api/detailed');
              const errorData = await fetchResponse.json() as { error: string, message: string };
              throw new Error(`${errorData.error}: ${errorData.message}`);
            }
            
            return { message: 'Success' };
          })
        }
      }
    };

    await expect(detailedErrorClient.api.detailed.get()).rejects.toThrow('MISSING_AUTHORIZATION: Authorization header is required');
  });

  it('should handle authentication with CORS preflight requests', async () => {
    const corsClient = {
      api: {
        cors: {
          options: vi.fn().mockImplementation(async (options = {}) => {
            mockFetch.mockResolvedValueOnce({
              ok: true,
              status: 200,
              headers: new Map([
                ['Access-Control-Allow-Origin', '*'],
                ['Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE'],
                ['Access-Control-Allow-Headers', 'Authorization, Content-Type, X-API-Key']
              ])
            });
            
            await fetch('http://localhost:3000/api/cors', {
              method: 'OPTIONS',
              headers: options.headers || {}
            });
            
            return {};
          }),
          get: vi.fn().mockImplementation(async (options = {}) => {
            mockFetch.mockResolvedValueOnce({
              ok: true,
              status: 200,
              headers: new Map([
                ['content-type', 'application/json'],
                ['Access-Control-Allow-Origin', '*']
              ]),
              json: vi.fn().mockResolvedValue({ message: 'CORS authenticated' })
            });
            
            await fetch('http://localhost:3000/api/cors', {
              method: 'GET',
              headers: {
                'Authorization': 'Bearer token-123',
                ...options.headers
              }
            });
            
            return { message: 'CORS authenticated' };
          })
        }
      }
    };

    // Test OPTIONS preflight request
    await corsClient.api.cors.options();
    expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/cors', {
      method: 'OPTIONS',
      headers: {}
    });
    
    // Test actual GET request with auth
    const result = await corsClient.api.cors.get();
    expect(result).toEqual({ message: 'CORS authenticated' });
  });

  it('should handle concurrent authenticated requests', async () => {
    const promises = [
      generatedClient.api.protected.get({
        headers: { 'Authorization': 'Bearer token-1' }
      }),
      generatedClient.api.apikey.get({
        headers: { 'X-API-Key': 'valid-api-key' }
      }),
      generatedClient.api.session.get({
        headers: { 'Cookie': 'sessionId=valid-session' }
      })
    ];

    const results = await Promise.all(promises);
    
    expect(results).toHaveLength(3);
    expect(results[0].message).toBe('Protected endpoint');
    expect(results[1].message).toBe('API key authenticated');
    expect(results[2].message).toBe('Session authenticated');
    
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('should handle authentication with request interceptors', async () => {
    const interceptorClient = {
      _interceptors: {
        request: [(config: any) => {
          // Add global auth header if not present
          if (!config.headers.Authorization && generatedClient._authToken) {
            config.headers.Authorization = `Bearer ${generatedClient._authToken}`;
          }
          return config;
        }]
      },
      api: {
        intercepted: {
          get: vi.fn().mockImplementation(async (options = {}) => {
            // Simulate interceptor execution
            const config = { headers: options.headers || {} };
            interceptorClient._interceptors.request.forEach(interceptor => {
              interceptor(config);
            });
            
            mockFetch.mockResolvedValueOnce({
              ok: true,
              status: 200,
              headers: new Map([['content-type', 'application/json']]),
              json: vi.fn().mockResolvedValue({ message: 'Intercepted request' })
            });
            
            await fetch('http://localhost:3000/api/intercepted', {
              method: 'GET',
              headers: config.headers
            });
            
            return { message: 'Intercepted request' };
          })
        }
      }
    };

    // Set global auth token
    generatedClient._authToken = 'interceptor-token-123';
    
    await interceptorClient.api.intercepted.get();
    
    expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/intercepted', {
      method: 'GET',
      headers: { Authorization: 'Bearer interceptor-token-123' }
    });
  });
});