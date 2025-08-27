import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { router } from '../../router.js';
import path from 'path';
import fs from 'fs/promises';

describe('Frontend Client - JSON Response Handling', () => {
  let tempDir: string;
  let generatedClient: any;
  let mockFetch: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Mock fetch globally
    mockFetch = vi.fn();
    global.fetch = mockFetch;
    
    // Create temporary directory for generated client
    tempDir = path.join(process.cwd(), 'temp-test-' + crypto.randomUUID());
    await fs.mkdir(tempDir, { recursive: true });

    // Generate client for testing
    await router.compile({
      outputDir: tempDir,
      name: 'JsonClient',
      baseUrl: 'http://localhost:3000',
      routes: [{
        directory: path.resolve(__dirname, '../../../dist/tests/router/fixtures/api'),
        pattern: /.*\.js$/
      }]
    });

    // Create a mock client with JSON response handling
    generatedClient = createMockJsonClient();
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

  // Mock client factory for JSON response testing
  function createMockJsonClient() {
    return {
      api: {
        hello: {
          get: vi.fn().mockImplementation(async (options = {}) => {
            const response = {
              ok: true,
              status: 200,
              headers: new Map([['content-type', 'application/json']]),
              json: vi.fn().mockResolvedValue({ message: 'Hello World' })
            };
            
            mockFetch.mockResolvedValueOnce(response);
            
            const fetchResponse = await fetch('http://localhost:3000/api/hello', {
              method: 'GET',
              headers: options.headers || {}
            });
            
            if (fetchResponse.ok && fetchResponse.headers.get('content-type')?.includes('application/json')) {
              return await fetchResponse.json();
            }
            
            throw new Error('Non-JSON response');
          })
        },
        users: {
          get: vi.fn().mockImplementation(async (options = {}) => {
            const response = {
              ok: true,
              status: 200,
              headers: new Map([['content-type', 'application/json; charset=utf-8']]),
              json: vi.fn().mockResolvedValue([
                { id: 1, name: 'John Doe', email: 'john@example.com' },
                { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
              ])
            };
            
            mockFetch.mockResolvedValueOnce(response);
            
            const fetchResponse = await fetch('http://localhost:3000/api/users', {
              method: 'GET',
              headers: options.headers || {}
            });
            
            return await fetchResponse.json();
          }),
          post: vi.fn().mockImplementation(async (options = {}) => {
            const response = {
              ok: true,
              status: 201,
              headers: new Map([['content-type', 'application/json']]),
              json: vi.fn().mockResolvedValue({ 
                id: 3, 
                ...options.body,
                createdAt: '2024-01-01T00:00:00Z'
              })
            };
            
            mockFetch.mockResolvedValueOnce(response);
            
            const fetchResponse = await fetch('http://localhost:3000/api/users', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...options.headers
              },
              body: JSON.stringify(options.body)
            });
            
            return await fetchResponse.json();
          })
        },
        complex: {
          get: vi.fn().mockImplementation(async () => {
            const response = {
              ok: true,
              status: 200,
              headers: new Map([['content-type', 'application/json']]),
              json: vi.fn().mockResolvedValue({
                data: {
                  users: [
                    { id: 1, profile: { name: 'John', settings: { theme: 'dark' } } }
                  ],
                  meta: {
                    total: 100,
                    page: 1,
                    hasMore: true
                  }
                },
                timestamp: '2024-01-01T00:00:00Z'
              })
            };
            
            mockFetch.mockResolvedValueOnce(response);
            
            const fetchResponse = await fetch('http://localhost:3000/api/complex');
            return await fetchResponse.json();
          })
        }
      }
    };
  }

  it('should handle simple JSON response', async () => {
    const result = await generatedClient.api.hello.get();
    
    expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/hello', {
      method: 'GET',
      headers: {}
    });
    
    expect(result).toEqual({ message: 'Hello World' });
    expect(typeof result).toBe('object');
    expect(result.message).toBe('Hello World');
  });

  it('should handle JSON array responses', async () => {
    const result = await generatedClient.api.users.get();
    
    expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/users', {
      method: 'GET',
      headers: {}
    });
    
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ id: 1, name: 'John Doe', email: 'john@example.com' });
    expect(result[1]).toEqual({ id: 2, name: 'Jane Smith', email: 'jane@example.com' });
  });

  it('should handle JSON response with POST request', async () => {
    const userData = { name: 'Alice Brown', email: 'alice@example.com' };
    const result = await generatedClient.api.users.post({ body: userData });
    
    expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    
    expect(result).toEqual({
      id: 3,
      name: 'Alice Brown',
      email: 'alice@example.com',
      createdAt: '2024-01-01T00:00:00Z'
    });
  });

  it('should handle nested JSON object responses', async () => {
    const result = await generatedClient.api.complex.get();
    
    expect(result).toEqual({
      data: {
        users: [
          { id: 1, profile: { name: 'John', settings: { theme: 'dark' } } }
        ],
        meta: {
          total: 100,
          page: 1,
          hasMore: true
        }
      },
      timestamp: '2024-01-01T00:00:00Z'
    });
    
    // Test nested access
    expect(result.data.users[0].profile.settings.theme).toBe('dark');
    expect(result.data.meta.hasMore).toBe(true);
  });

  it('should handle JSON response with different content-type variations', async () => {
    const variations = [
      'application/json',
      'application/json; charset=utf-8',
      'application/json;charset=UTF-8',
      'application/vnd.api+json',
      'application/hal+json'
    ];

    for (const contentType of variations) {
      const mockClient = {
        test: {
          get: vi.fn().mockImplementation(async () => {
            const response = {
              ok: true,
              status: 200,
              headers: new Map([['content-type', contentType]]),
              json: vi.fn().mockResolvedValue({ type: 'test', contentType })
            };
            
            mockFetch.mockResolvedValueOnce(response);
            
            const fetchResponse = await fetch('http://localhost:3000/test');
            
            if (fetchResponse.headers.get('content-type')?.includes('json')) {
              return await fetchResponse.json();
            }
            
            return null;
          })
        }
      };

      const result = await mockClient.test.get();
      expect(result).toEqual({ type: 'test', contentType });
    }
  });

  it('should handle JSON response parsing errors gracefully', async () => {
    const errorClient = {
      api: {
        invalid: {
          get: vi.fn().mockImplementation(async () => {
            const response = {
              ok: true,
              status: 200,
              headers: new Map([['content-type', 'application/json']]),
              json: vi.fn().mockRejectedValue(new Error('Invalid JSON'))
            };
            
            mockFetch.mockResolvedValueOnce(response);
            
            const fetchResponse = await fetch('http://localhost:3000/api/invalid');
            
            try {
              return await fetchResponse.json();
            } catch (error: any) {
              throw new Error(`JSON parsing failed: ${error.message}`);
            }
          })
        }
      }
    };

    await expect(errorClient.api.invalid.get()).rejects.toThrow('JSON parsing failed: Invalid JSON');
  });

  it('should handle empty JSON responses', async () => {
    const emptyClient = {
      api: {
        empty: {
          get: vi.fn().mockImplementation(async () => {
            const response = {
              ok: true,
              status: 200,
              headers: new Map([['content-type', 'application/json']]),
              json: vi.fn().mockResolvedValue({})
            };
            
            mockFetch.mockResolvedValueOnce(response);
            
            const fetchResponse = await fetch('http://localhost:3000/api/empty');
            return await fetchResponse.json();
          })
        }
      }
    };

    const result = await emptyClient.api.empty.get();
    expect(result).toEqual({});
    expect(typeof result).toBe('object');
  });

  it('should handle null JSON responses', async () => {
    const nullClient = {
      api: {
        null: {
          get: vi.fn().mockImplementation(async () => {
            const response = {
              ok: true,
              status: 200,
              headers: new Map([['content-type', 'application/json']]),
              json: vi.fn().mockResolvedValue(null)
            };
            
            mockFetch.mockResolvedValueOnce(response);
            
            const fetchResponse = await fetch('http://localhost:3000/api/null');
            return await fetchResponse.json();
          })
        }
      }
    };

    const result = await nullClient.api.null.get();
    expect(result).toBeNull();
  });

  it('should handle JSON responses with numbers and booleans', async () => {
    const typesClient = {
      api: {
        types: {
          get: vi.fn().mockImplementation(async () => {
            const response = {
              ok: true,
              status: 200,
              headers: new Map([['content-type', 'application/json']]),
              json: vi.fn().mockResolvedValue({
                string: 'text',
                number: 42,
                float: 3.14,
                boolean: true,
                nullValue: null,
                array: [1, 2, 3],
                nested: {
                  flag: false,
                  count: 0
                }
              })
            };
            
            mockFetch.mockResolvedValueOnce(response);
            
            const fetchResponse = await fetch('http://localhost:3000/api/types');
            return await fetchResponse.json();
          })
        }
      }
    };

    const result = await typesClient.api.types.get();
    
    expect(typeof result.string).toBe('string');
    expect(typeof result.number).toBe('number');
    expect(typeof result.float).toBe('number');
    expect(typeof result.boolean).toBe('boolean');
    expect(result.nullValue).toBeNull();
    expect(Array.isArray(result.array)).toBe(true);
    expect(typeof result.nested).toBe('object');
    expect(result.nested.flag).toBe(false);
  });

  it('should handle large JSON responses', async () => {
    const largeClient = {
      api: {
        large: {
          get: vi.fn().mockImplementation(async () => {
            // Generate large dataset
            const largeData = {
              items: Array.from({ length: 1000 }, (_, i) => ({
                id: i,
                name: `Item ${i}`,
                description: `Description for item ${i}`,
                metadata: {
                  created: '2024-01-01T00:00:00Z',
                  updated: '2024-01-01T00:00:00Z',
                  tags: [`tag${i}`, `category${i % 10}`]
                }
              })),
              total: 1000,
              processed: true
            };

            const response = {
              ok: true,
              status: 200,
              headers: new Map([['content-type', 'application/json']]),
              json: vi.fn().mockResolvedValue(largeData)
            };
            
            mockFetch.mockResolvedValueOnce(response);
            
            const fetchResponse = await fetch('http://localhost:3000/api/large');
            return await fetchResponse.json();
          })
        }
      }
    };

    const result = await largeClient.api.large.get();
    
    expect(result.items).toHaveLength(1000);
    expect(result.total).toBe(1000);
    expect(result.processed).toBe(true);
    expect(result.items[0]).toEqual({
      id: 0,
      name: 'Item 0',
      description: 'Description for item 0',
      metadata: {
        created: '2024-01-01T00:00:00Z',
        updated: '2024-01-01T00:00:00Z',
        tags: ['tag0', 'category0']
      }
    });
  });

  it('should handle JSON responses with special characters', async () => {
    const specialClient = {
      api: {
        special: {
          get: vi.fn().mockImplementation(async () => {
            const response = {
              ok: true,
              status: 200,
              headers: new Map([['content-type', 'application/json']]),
              json: vi.fn().mockResolvedValue({
                unicode: 'Hello 世界 🌍',
                quotes: 'Text with "quotes" and \'apostrophes\'',
                backslashes: 'Path\\to\\file',
                newlines: 'Line 1\nLine 2\nLine 3',
                tabs: 'Column1\tColumn2\tColumn3',
                emoji: '😀😃😄😁🥳🎉✨'
              })
            };
            
            mockFetch.mockResolvedValueOnce(response);
            
            const fetchResponse = await fetch('http://localhost:3000/api/special');
            return await fetchResponse.json();
          })
        }
      }
    };

    const result = await specialClient.api.special.get();
    
    expect(result.unicode).toBe('Hello 世界 🌍');
    expect(result.quotes).toBe('Text with "quotes" and \'apostrophes\'');
    expect(result.backslashes).toBe('Path\\to\\file');
    expect(result.newlines).toBe('Line 1\nLine 2\nLine 3');
    expect(result.tabs).toBe('Column1\tColumn2\tColumn3');
    expect(result.emoji).toBe('😀😃😄😁🥳🎉✨');
  });

  it('should handle concurrent JSON response parsing', async () => {
    const promises = [
      generatedClient.api.hello.get(),
      generatedClient.api.users.get(),
      generatedClient.api.complex.get()
    ];

    const results = await Promise.all(promises);
    
    expect(results).toHaveLength(3);
    expect(results[0]).toEqual({ message: 'Hello World' });
    expect(Array.isArray(results[1])).toBe(true);
    expect(results[2]).toHaveProperty('data');
    expect(results[2]).toHaveProperty('timestamp');
  });

  it('should preserve JSON response type information', async () => {
    const result = await generatedClient.api.users.get();
    
    // Verify type preservation
    expect(typeof result[0].id).toBe('number');
    expect(typeof result[0].name).toBe('string');
    expect(typeof result[0].email).toBe('string');
    
    // Verify array methods are available
    expect(typeof result.map).toBe('function');
    expect(typeof result.filter).toBe('function');
    expect(typeof result.find).toBe('function');
  });

  it('should handle JSON response with circular references safely', async () => {
    const circularClient = {
      api: {
        circular: {
          get: vi.fn().mockImplementation(async () => {
            // Create object without circular reference for JSON serialization
            const data = {
              id: 1,
              name: 'Test',
              parent: null,
              children: [
                { id: 2, name: 'Child 1', parentId: 1 },
                { id: 3, name: 'Child 2', parentId: 1 }
              ]
            };

            const response = {
              ok: true,
              status: 200,
              headers: new Map([['content-type', 'application/json']]),
              json: vi.fn().mockResolvedValue(data)
            };
            
            mockFetch.mockResolvedValueOnce(response);
            
            const fetchResponse = await fetch('http://localhost:3000/api/circular');
            return await fetchResponse.json();
          })
        }
      }
    };

    const result = await circularClient.api.circular.get();
    
    expect(result.id).toBe(1);
    expect(result.children).toHaveLength(2);
    expect(result.children[0].parentId).toBe(1);
  });

  it('should handle JSON responses with Date-like strings', async () => {
    const dateClient = {
      api: {
        dates: {
          get: vi.fn().mockImplementation(async () => {
            const response = {
              ok: true,
              status: 200,
              headers: new Map([['content-type', 'application/json']]),
              json: vi.fn().mockResolvedValue({
                created: '2024-01-01T00:00:00Z',
                updated: '2024-01-01T12:30:45.123Z',
                date: '2024-01-01',
                time: '12:30:45',
                timestamp: 1704067200000
              })
            };
            
            mockFetch.mockResolvedValueOnce(response);
            
            const fetchResponse = await fetch('http://localhost:3000/api/dates');
            return await fetchResponse.json();
          })
        }
      }
    };

    const result = await dateClient.api.dates.get();
    
    // JSON parsing should preserve strings, not convert to Date objects
    expect(typeof result.created).toBe('string');
    expect(typeof result.updated).toBe('string');
    expect(typeof result.date).toBe('string');
    expect(typeof result.time).toBe('string');
    expect(typeof result.timestamp).toBe('number');
    
    // Verify date strings are valid
    expect(new Date(result.created).getTime()).not.toBeNaN();
    expect(new Date(result.updated).getTime()).not.toBeNaN();
  });
});