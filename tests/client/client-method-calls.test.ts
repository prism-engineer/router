import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { router } from '../../src/router';
import path from 'path';
import fs from 'fs/promises';

describe('Frontend Client - Method Calls', () => {
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
      name: 'TestClient',
      baseUrl: 'http://localhost:3000',
      routes: {
        directory: path.join(__dirname, '../router/fixtures/api'),
        pattern: /.*\.ts$/
      }
    });

    // Create a mock client with the expected structure
    generatedClient = createMockClient();
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

  // Mock client factory for testing
  function createMockClient() {
    return {
      api: {
        hello: {
          get: vi.fn().mockImplementation(async (options = {}) => {
            const url = 'http://localhost:3000/api/hello';
            mockFetch.mockResolvedValueOnce({
              ok: true,
              status: 200,
              headers: new Map([['content-type', 'application/json']]),
              json: async () => ({ message: 'Hello World' })
            });
            
            await fetch(url, {
              method: 'GET',
              headers: options.headers || {}
            });
            
            return { message: 'Hello World' };
          })
        },
        users: {
          get: vi.fn().mockImplementation(async (options = {}) => {
            const url = new URL('http://localhost:3000/api/users');
            if (options.query) {
              Object.entries(options.query).forEach(([key, value]) => {
                url.searchParams.append(key, String(value));
              });
            }
            
            mockFetch.mockResolvedValueOnce({
              ok: true,
              status: 200,
              headers: new Map([['content-type', 'application/json']]),
              json: async () => [{ id: 1, name: 'John Doe', email: 'john@example.com' }]
            });
            
            await fetch(url.toString(), {
              method: 'GET',
              headers: options.headers || {}
            });
            
            return [{ id: 1, name: 'John Doe', email: 'john@example.com' }];
          }),
          post: vi.fn().mockImplementation(async (options = {}) => {
            mockFetch.mockResolvedValueOnce({
              ok: true,
              status: 201,
              headers: new Map([['content-type', 'application/json']]),
              json: async () => ({ id: 2, ...options.body })
            });
            
            await fetch('http://localhost:3000/api/users', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...options.headers
              },
              body: JSON.stringify(options.body)
            });
            
            return { id: 2, ...options.body };
          }),
          _userId_: {
            get: vi.fn().mockImplementation(async (userId: string, options = {}) => {
              mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                headers: new Map([['content-type', 'application/json']]),
                json: async () => ({ id: parseInt(userId), name: 'John Doe', email: 'john@example.com' })
              });
              
              await fetch(`http://localhost:3000/api/users/${userId}`, {
                method: 'GET',
                headers: options.headers || {}
              });
              
              return { id: parseInt(userId), name: 'John Doe', email: 'john@example.com' };
            })
          }
        },
        v1: {
          posts: {
            get: vi.fn().mockImplementation(async (options = {}) => {
              mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                headers: new Map([['content-type', 'application/json']]),
                json: async () => [{ id: 1, title: 'Test Post V1', content: 'Test content', version: 'v1' }]
              });
              
              await fetch('http://localhost:3000/api/v1/posts', {
                method: 'GET',
                headers: options.headers || {}
              });
              
              return [{ id: 1, title: 'Test Post V1', content: 'Test content', version: 'v1' }];
            })
          }
        },
        v2: {
          posts: {
            get: vi.fn().mockImplementation(async (options = {}) => {
              mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                headers: new Map([['content-type', 'application/json']]),
                json: async () => [{ id: 1, title: 'Test Post V2', content: 'Test content', version: 'v2' }]
              });
              
              await fetch('http://localhost:3000/api/v2/posts', {
                method: 'GET',
                headers: options.headers || {}
              });
              
              return [{ id: 1, title: 'Test Post V2', content: 'Test content', version: 'v2' }];
            })
          }
        }
      },
      admin: {
        dashboard: {
          get: vi.fn().mockImplementation(async (options = {}) => {
            mockFetch.mockResolvedValueOnce({
              ok: true,
              status: 200,
              headers: new Map([['content-type', 'application/json']]),
              json: async () => ({ stats: { users: 100, posts: 500 } })
            });
            
            await fetch('http://localhost:3000/admin/dashboard', {
              method: 'GET',
              headers: options.headers || {}
            });
            
            return { stats: { users: 100, posts: 500 } };
          })
        }
      }
    };
  }

  it('should call GET method without parameters', async () => {
    const result = await generatedClient.api.hello.get();
    
    expect(generatedClient.api.hello.get).toHaveBeenCalledWith();
    expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/hello', {
      method: 'GET',
      headers: {}
    });
    expect(result).toEqual({ message: 'Hello World' });
  });

  it('should call GET method with query parameters', async () => {
    const result = await generatedClient.api.users.get({
      query: { page: 1, limit: 10, search: 'john' }
    });
    
    expect(generatedClient.api.users.get).toHaveBeenCalledWith({
      query: { page: 1, limit: 10, search: 'john' }
    });
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/users?page=1&limit=10&search=john',
      expect.objectContaining({ method: 'GET' })
    );
    expect(result).toEqual([{ id: 1, name: 'John Doe', email: 'john@example.com' }]);
  });

  it('should call GET method with headers', async () => {
    const result = await generatedClient.api.hello.get({
      headers: { 
        'Authorization': 'Bearer token123',
        'X-API-Version': 'v1'
      }
    });
    
    expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/hello', {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer token123',
        'X-API-Version': 'v1'
      }
    });
    expect(result).toEqual({ message: 'Hello World' });
  });

  it('should call POST method with request body', async () => {
    const userData = { name: 'Jane Doe', email: 'jane@example.com' };
    const result = await generatedClient.api.users.post({
      body: userData
    });
    
    expect(generatedClient.api.users.post).toHaveBeenCalledWith({
      body: userData
    });
    expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    expect(result).toEqual({ id: 2, ...userData });
  });

  it('should call POST method with body and headers', async () => {
    const userData = { name: 'Alice Smith', email: 'alice@example.com' };
    const result = await generatedClient.api.users.post({
      body: userData,
      headers: { 
        'Authorization': 'Bearer token123',
        'X-Request-ID': 'req-456'
      }
    });
    
    expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer token123',
        'X-Request-ID': 'req-456'
      },
      body: JSON.stringify(userData)
    });
    expect(result).toEqual({ id: 2, ...userData });
  });

  it('should call method with path parameters', async () => {
    const userId = '123';
    const result = await generatedClient.api.users._userId_.get(userId);
    
    expect(generatedClient.api.users._userId_.get).toHaveBeenCalledWith(userId);
    expect(mockFetch).toHaveBeenCalledWith(`http://localhost:3000/api/users/${userId}`, {
      method: 'GET',
      headers: {}
    });
    expect(result).toEqual({ id: 123, name: 'John Doe', email: 'john@example.com' });
  });

  it('should call method with path parameters and options', async () => {
    const userId = '456';
    const result = await generatedClient.api.users._userId_.get(userId, {
      headers: { 'Authorization': 'Bearer token123' }
    });
    
    expect(generatedClient.api.users._userId_.get).toHaveBeenCalledWith(userId, {
      headers: { 'Authorization': 'Bearer token123' }
    });
    expect(mockFetch).toHaveBeenCalledWith(`http://localhost:3000/api/users/${userId}`, {
      method: 'GET',
      headers: { 'Authorization': 'Bearer token123' }
    });
    expect(result).toEqual({ id: 456, name: 'John Doe', email: 'john@example.com' });
  });

  it('should call nested route methods (v1 routes)', async () => {
    const result = await generatedClient.api.v1.posts.get();
    
    expect(generatedClient.api.v1.posts.get).toHaveBeenCalledWith();
    expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/v1/posts', {
      method: 'GET',
      headers: {}
    });
    expect(result).toEqual([{ id: 1, title: 'Test Post V1', content: 'Test content', version: 'v1' }]);
  });

  it('should call nested route methods (v2 routes)', async () => {
    const result = await generatedClient.api.v2.posts.get();
    
    expect(generatedClient.api.v2.posts.get).toHaveBeenCalledWith();
    expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/v2/posts', {
      method: 'GET',
      headers: {}
    });
    expect(result).toEqual([{ id: 1, title: 'Test Post V2', content: 'Test content', version: 'v2' }]);
  });

  it('should call admin route methods', async () => {
    const result = await generatedClient.admin.dashboard.get();
    
    expect(generatedClient.admin.dashboard.get).toHaveBeenCalledWith();
    expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/admin/dashboard', {
      method: 'GET',
      headers: {}
    });
    expect(result).toEqual({ stats: { users: 100, posts: 500 } });
  });

  it('should handle method calls with optional parameters', async () => {
    // Test calling with undefined options
    const result = await generatedClient.api.hello.get(undefined);
    
    expect(generatedClient.api.hello.get).toHaveBeenCalledWith(undefined);
    expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/hello', {
      method: 'GET',
      headers: {}
    });
    expect(result).toEqual({ message: 'Hello World' });
  });

  it('should handle method calls with empty options', async () => {
    const result = await generatedClient.api.users.get({});
    
    expect(generatedClient.api.users.get).toHaveBeenCalledWith({});
    expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/users', {
      method: 'GET',
      headers: {}
    });
    expect(result).toEqual([{ id: 1, name: 'John Doe', email: 'john@example.com' }]);
  });

  it('should handle method calls with partial options', async () => {
    const result = await generatedClient.api.users.get({
      query: { page: 1 } // Only some query parameters
    });
    
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/users?page=1',
      expect.objectContaining({ method: 'GET' })
    );
    expect(result).toEqual([{ id: 1, name: 'John Doe', email: 'john@example.com' }]);
  });

  it('should handle concurrent method calls', async () => {
    const promises = [
      generatedClient.api.hello.get(),
      generatedClient.api.users.get(),
      generatedClient.admin.dashboard.get()
    ];
    
    const results = await Promise.all(promises);
    
    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(results).toHaveLength(3);
    expect(results[0]).toEqual({ message: 'Hello World' });
    expect(results[1]).toEqual([{ id: 1, name: 'John Doe', email: 'john@example.com' }]);
    expect(results[2]).toEqual({ stats: { users: 100, posts: 500 } });
  });

  it('should handle method calls with complex query parameters', async () => {
    const complexQuery = {
      search: 'john doe',
      filters: 'active,verified',
      sort: 'created_desc',
      page: 2,
      limit: 25,
      include: 'profile,settings'
    };
    
    await generatedClient.api.users.get({ query: complexQuery });
    
    const expectedUrl = 'http://localhost:3000/api/users?' + 
      'search=john+doe&filters=active%2Cverified&sort=created_desc&page=2&limit=25&include=profile%2Csettings';
    
    expect(mockFetch).toHaveBeenCalledWith(
      expectedUrl,
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('should handle method calls with various HTTP methods', async () => {
    const postData = { name: 'Test User', email: 'test@example.com' };
    
    // Test different HTTP methods if they exist in the client
    await generatedClient.api.users.post({ body: postData });
    
    expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(postData)
    });
  });

  it('should handle method calls with custom Content-Type headers', async () => {
    await generatedClient.api.users.post({
      body: { name: 'Custom User' },
      headers: { 'Content-Type': 'application/vnd.api+json' }
    });
    
    expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/vnd.api+json' },
      body: JSON.stringify({ name: 'Custom User' })
    });
  });

  it('should maintain method call context and state', async () => {
    // First call
    await generatedClient.api.hello.get({ headers: { 'X-Call': '1' } });
    
    // Second call with different headers
    await generatedClient.api.hello.get({ headers: { 'X-Call': '2' } });
    
    expect(mockFetch).toHaveBeenNthCalledWith(1, 'http://localhost:3000/api/hello', {
      method: 'GET',
      headers: { 'X-Call': '1' }
    });
    
    expect(mockFetch).toHaveBeenNthCalledWith(2, 'http://localhost:3000/api/hello', {
      method: 'GET',
      headers: { 'X-Call': '2' }
    });
  });

  it('should handle method calls with URL encoding', async () => {
    const userId = '123/abc'; // ID with special characters
    
    await generatedClient.api.users._userId_.get(userId);
    
    expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/users/123/abc', {
      method: 'GET',
      headers: {}
    });
  });

  it('should handle method calls with boolean and number query parameters', async () => {
    await generatedClient.api.users.get({
      query: {
        active: true,
        limit: 50,
        verified: false,
        score: 95.5
      }
    });
    
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/users?active=true&limit=50&verified=false&score=95.5',
      expect.objectContaining({ method: 'GET' })
    );
  });
});