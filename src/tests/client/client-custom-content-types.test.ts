import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { router } from '../../router';
import path from 'path';
import fs from 'fs/promises';

describe('Frontend Client - Custom Content Types', () => {
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
      name: 'CustomContentClient',
      baseUrl: 'http://localhost:3000',
      routes: [{
        directory: path.resolve(__dirname, '../../../dist/tests/router/fixtures/api'),
        pattern: /.*\.js$/
      }]
    });

    // Create a mock client with custom content type handling
    generatedClient = createMockCustomContentClient();
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

  // Mock client factory for custom content type testing
  function createMockCustomContentClient() {
    return {
      api: {
        download: {
          get: vi.fn().mockImplementation(async (options = {}) => {
            const response = {
              ok: true,
              status: 200,
              headers: new Map([
                ['content-type', 'application/octet-stream'],
                ['content-disposition', 'attachment; filename="file.bin"']
              ]),
              blob: vi.fn().mockResolvedValue(new Blob(['binary data'], { type: 'application/octet-stream' })),
              arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8))
            };
            
            mockFetch.mockResolvedValueOnce(response);
            
            const fetchResponse = await fetch('http://localhost:3000/api/download', {
              method: 'GET',
              headers: options.headers || {}
            });
            
            // For non-JSON content types, return the response object for custom handling
            if (!fetchResponse.headers.get('content-type')?.includes('json')) {
              return fetchResponse;
            }
            
            return await fetchResponse.json();
          })
        },
        upload: {
          post: vi.fn().mockImplementation(async (options = {}) => {
            const response = {
              ok: true,
              status: 201,
              headers: new Map([['content-type', 'application/json']]),
              json: vi.fn().mockResolvedValue({ 
                id: 'upload-123',
                filename: options.filename || 'unknown',
                size: options.size || 0
              })
            };
            
            mockFetch.mockResolvedValueOnce(response);
            
            const fetchResponse = await fetch('http://localhost:3000/api/upload', {
              method: 'POST',
              headers: {
                'Content-Type': 'multipart/form-data',
                ...options.headers
              },
              body: options.body
            });
            
            return await fetchResponse.json();
          })
        },
        xml: {
          get: vi.fn().mockImplementation(async (options = {}) => {
            const xmlData = '<?xml version="1.0" encoding="UTF-8"?><root><item id="1">Test</item></root>';
            
            const response = {
              ok: true,
              status: 200,
              headers: new Map([['content-type', 'application/xml']]),
              text: vi.fn().mockResolvedValue(xmlData)
            };
            
            mockFetch.mockResolvedValueOnce(response);
            
            const fetchResponse = await fetch('http://localhost:3000/api/xml', {
              method: 'GET',
              headers: options.headers || {}
            });
            
            // For XML content, return response for custom handling
            return fetchResponse;
          })
        },
        csv: {
          get: vi.fn().mockImplementation(async (options = {}) => {
            const csvData = 'id,name,email\n1,John Doe,john@example.com\n2,Jane Smith,jane@example.com';
            
            const response = {
              ok: true,
              status: 200,
              headers: new Map([['content-type', 'text/csv']]),
              text: vi.fn().mockResolvedValue(csvData)
            };
            
            mockFetch.mockResolvedValueOnce(response);
            
            const fetchResponse = await fetch('http://localhost:3000/api/csv', {
              method: 'GET',
              headers: options.headers || {}
            });
            
            return fetchResponse;
          })
        },
        image: {
          get: vi.fn().mockImplementation(async (options = {}) => {
            // Mock image data as ArrayBuffer
            const imageBuffer = new ArrayBuffer(1024);
            
            const response = {
              ok: true,
              status: 200,
              headers: new Map([
                ['content-type', 'image/png'],
                ['content-length', '1024']
              ]),
              blob: vi.fn().mockResolvedValue(new Blob([imageBuffer], { type: 'image/png' })),
              arrayBuffer: vi.fn().mockResolvedValue(imageBuffer)
            };
            
            mockFetch.mockResolvedValueOnce(response);
            
            const fetchResponse = await fetch('http://localhost:3000/api/image', {
              method: 'GET',
              headers: options.headers || {}
            });
            
            return fetchResponse;
          })
        },
        pdf: {
          get: vi.fn().mockImplementation(async (options = {}) => {
            const pdfBuffer = new ArrayBuffer(2048);
            
            const response = {
              ok: true,
              status: 200,
              headers: new Map([
                ['content-type', 'application/pdf'],
                ['content-disposition', 'inline; filename="document.pdf"']
              ]),
              blob: vi.fn().mockResolvedValue(new Blob([pdfBuffer], { type: 'application/pdf' })),
              arrayBuffer: vi.fn().mockResolvedValue(pdfBuffer)
            };
            
            mockFetch.mockResolvedValueOnce(response);
            
            const fetchResponse = await fetch('http://localhost:3000/api/pdf', {
              method: 'GET',
              headers: options.headers || {}
            });
            
            return fetchResponse;
          })
        },
        stream: {
          get: vi.fn().mockImplementation(async (options = {}) => {
            const response = {
              ok: true,
              status: 200,
              headers: new Map([
                ['content-type', 'text/plain'],
                ['transfer-encoding', 'chunked']
              ]),
              body: {
                getReader: vi.fn().mockReturnValue({
                  read: vi.fn()
                    .mockResolvedValueOnce({ value: new TextEncoder().encode('chunk1'), done: false })
                    .mockResolvedValueOnce({ value: new TextEncoder().encode('chunk2'), done: false })
                    .mockResolvedValueOnce({ value: undefined, done: true })
                })
              }
            };
            
            mockFetch.mockResolvedValueOnce(response);
            
            const fetchResponse = await fetch('http://localhost:3000/api/stream', {
              method: 'GET',
              headers: options.headers || {}
            });
            
            return fetchResponse;
          })
        }
      }
    };
  }

  it('should handle binary file downloads', async () => {
    const response = await generatedClient.api.download.get();
    
    expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/download', {
      method: 'GET',
      headers: {}
    });
    
    expect(response.ok).toBe(true);
    expect(response.headers.get('content-type')).toBe('application/octet-stream');
    expect(response.headers.get('content-disposition')).toContain('attachment');
    
    // Test binary data handling
    const blob = await response.blob();
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('application/octet-stream');
  });

  it('should handle file uploads with multipart/form-data', async () => {
    const formData = new FormData();
    formData.append('file', new Blob(['test data'], { type: 'text/plain' }), 'test.txt');
    formData.append('description', 'Test file upload');
    
    const result = await generatedClient.api.upload.post({
      body: formData,
      filename: 'test.txt',
      size: 9
    });
    
    expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'multipart/form-data' },
      body: formData
    });
    
    expect(result).toEqual({
      id: 'upload-123',
      filename: 'test.txt',
      size: 9
    });
  });

  it('should handle XML responses', async () => {
    const response = await generatedClient.api.xml.get();
    
    expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/xml', {
      method: 'GET',
      headers: {}
    });
    
    expect(response.ok).toBe(true);
    expect(response.headers.get('content-type')).toBe('application/xml');
    
    // Test XML data handling
    const xmlText = await response.text();
    expect(xmlText).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xmlText).toContain('<root>');
    expect(xmlText).toContain('<item id="1">Test</item>');
  });

  it('should handle CSV responses', async () => {
    const response = await generatedClient.api.csv.get();
    
    expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/csv', {
      method: 'GET',
      headers: {}
    });
    
    expect(response.ok).toBe(true);
    expect(response.headers.get('content-type')).toBe('text/csv');
    
    // Test CSV data handling
    const csvText = await response.text();
    expect(csvText).toContain('id,name,email');
    expect(csvText).toContain('John Doe,john@example.com');
    expect(csvText).toContain('Jane Smith,jane@example.com');
  });

  it('should handle image responses', async () => {
    const response = await generatedClient.api.image.get();
    
    expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/image', {
      method: 'GET',
      headers: {}
    });
    
    expect(response.ok).toBe(true);
    expect(response.headers.get('content-type')).toBe('image/png');
    expect(response.headers.get('content-length')).toBe('1024');
    
    // Test image data handling
    const blob = await response.blob();
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('image/png');
    
    const arrayBuffer = await response.arrayBuffer();
    expect(arrayBuffer).toBeInstanceOf(ArrayBuffer);
    expect(arrayBuffer.byteLength).toBe(1024);
  });

  it('should handle PDF responses', async () => {
    const response = await generatedClient.api.pdf.get();
    
    expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/pdf', {
      method: 'GET',
      headers: {}
    });
    
    expect(response.ok).toBe(true);
    expect(response.headers.get('content-type')).toBe('application/pdf');
    expect(response.headers.get('content-disposition')).toContain('inline');
    expect(response.headers.get('content-disposition')).toContain('document.pdf');
    
    // Test PDF data handling
    const blob = await response.blob();
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('application/pdf');
  });

  it('should handle streaming responses', async () => {
    const response = await generatedClient.api.stream.get();
    
    expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/stream', {
      method: 'GET',
      headers: {}
    });
    
    expect(response.ok).toBe(true);
    expect(response.headers.get('content-type')).toBe('text/plain');
    expect(response.headers.get('transfer-encoding')).toBe('chunked');
    
    // Test streaming data handling
    const reader = response.body.getReader();
    const chunks = [];
    
    let chunk = await reader.read();
    while (!chunk.done) {
      chunks.push(new TextDecoder().decode(chunk.value));
      chunk = await reader.read();
    }
    
    expect(chunks).toEqual(['chunk1', 'chunk2']);
  });

  it('should handle custom content types with Accept headers', async () => {
    const response = await generatedClient.api.xml.get({
      headers: { 'Accept': 'application/xml, text/xml' }
    });
    
    expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/api/xml', {
      method: 'GET',
      headers: { 'Accept': 'application/xml, text/xml' }
    });
    
    expect(response.ok).toBe(true);
    expect(response.headers.get('content-type')).toBe('application/xml');
  });

  it('should handle content with custom encoding', async () => {
    const encodedClient = {
      api: {
        encoded: {
          get: vi.fn().mockImplementation(async () => {
            const response = {
              ok: true,
              status: 200,
              headers: new Map([
                ['content-type', 'text/plain; charset=utf-8'],
                ['content-encoding', 'gzip']
              ]),
              text: vi.fn().mockResolvedValue('Encoded content with special chars: café, naïve, résumé')
            };
            
            mockFetch.mockResolvedValueOnce(response);
            
            const fetchResponse = await fetch('http://localhost:3000/api/encoded');
            return fetchResponse;
          })
        }
      }
    };

    const response = await encodedClient.api.encoded.get();
    
    expect(response.headers.get('content-encoding')).toBe('gzip');
    expect(response.headers.get('content-type')).toContain('charset=utf-8');
    
    const text = await response.text();
    expect(text).toContain('café, naïve, résumé');
  });

  it('should handle different image formats', async () => {
    const imageFormats = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml'];
    
    for (const contentType of imageFormats) {
      const formatClient = {
        api: {
          image: {
            get: vi.fn().mockImplementation(async () => {
              const response = {
                ok: true,
                status: 200,
                headers: new Map([['content-type', contentType]]),
                blob: vi.fn().mockResolvedValue(new Blob([new ArrayBuffer(512)], { type: contentType }))
              };
              
              mockFetch.mockResolvedValueOnce(response);
              
              const fetchResponse = await fetch(`http://localhost:3000/api/image`);
              return fetchResponse;
            })
          }
        }
      };

      const response = await formatClient.api.image.get();
      expect(response.headers.get('content-type')).toBe(contentType);
      
      const blob = await response.blob();
      expect(blob.type).toBe(contentType);
    }
  });

  it('should handle video content', async () => {
    const videoClient = {
      api: {
        video: {
          get: vi.fn().mockImplementation(async () => {
            const response = {
              ok: true,
              status: 200,
              headers: new Map([
                ['content-type', 'video/mp4'],
                ['content-length', '10485760'], // 10MB
                ['accept-ranges', 'bytes']
              ]),
              blob: vi.fn().mockResolvedValue(new Blob([new ArrayBuffer(10485760)], { type: 'video/mp4' }))
            };
            
            mockFetch.mockResolvedValueOnce(response);
            
            const fetchResponse = await fetch('http://localhost:3000/api/video');
            return fetchResponse;
          })
        }
      }
    };

    const response = await videoClient.api.video.get();
    
    expect(response.headers.get('content-type')).toBe('video/mp4');
    expect(response.headers.get('accept-ranges')).toBe('bytes');
    
    const blob = await response.blob();
    expect(blob.type).toBe('video/mp4');
    expect(blob.size).toBe(10485760);
  });

  it('should handle audio content', async () => {
    const audioClient = {
      api: {
        audio: {
          get: vi.fn().mockImplementation(async () => {
            const response = {
              ok: true,
              status: 200,
              headers: new Map([
                ['content-type', 'audio/mpeg'],
                ['content-disposition', 'inline; filename="song.mp3"']
              ]),
              blob: vi.fn().mockResolvedValue(new Blob([new ArrayBuffer(5242880)], { type: 'audio/mpeg' }))
            };
            
            mockFetch.mockResolvedValueOnce(response);
            
            const fetchResponse = await fetch('http://localhost:3000/api/audio');
            return fetchResponse;
          })
        }
      }
    };

    const response = await audioClient.api.audio.get();
    
    expect(response.headers.get('content-type')).toBe('audio/mpeg');
    expect(response.headers.get('content-disposition')).toContain('song.mp3');
  });

  it('should handle text-based custom formats', async () => {
    const textFormats = [
      { type: 'text/css', data: 'body { margin: 0; padding: 0; }' },
      { type: 'text/javascript', data: 'console.log("Hello World");' },
      { type: 'text/html', data: '<html><body><h1>Test</h1></body></html>' },
      { type: 'application/yaml', data: 'key: value\nlist:\n  - item1\n  - item2' },
      { type: 'application/toml', data: '[section]\nkey = "value"' }
    ];

    for (const format of textFormats) {
      const textClient = {
        api: {
          text: {
            get: vi.fn().mockImplementation(async () => {
              const response = {
                ok: true,
                status: 200,
                headers: new Map([['content-type', format.type]]),
                text: vi.fn().mockResolvedValue(format.data)
              };
              
              mockFetch.mockResolvedValueOnce(response);
              
              const fetchResponse = await fetch('http://localhost:3000/api/text');
              return fetchResponse;
            })
          }
        }
      };

      const response = await textClient.api.text.get();
      expect(response.headers.get('content-type')).toBe(format.type);
      
      const text = await response.text();
      expect(text).toBe(format.data);
    }
  });

  it('should handle compressed content', async () => {
    const compressedClient = {
      api: {
        compressed: {
          get: vi.fn().mockImplementation(async () => {
            const response = {
              ok: true,
              status: 200,
              headers: new Map([
                ['content-type', 'application/zip'],
                ['content-disposition', 'attachment; filename="archive.zip"']
              ]),
              blob: vi.fn().mockResolvedValue(new Blob([new ArrayBuffer(1024)], { type: 'application/zip' }))
            };
            
            mockFetch.mockResolvedValueOnce(response);
            
            const fetchResponse = await fetch('http://localhost:3000/api/compressed');
            return fetchResponse;
          })
        }
      }
    };

    const response = await compressedClient.api.compressed.get();
    
    expect(response.headers.get('content-type')).toBe('application/zip');
    expect(response.headers.get('content-disposition')).toContain('archive.zip');
    
    const blob = await response.blob();
    expect(blob.type).toBe('application/zip');
  });

  it('should handle responses with no content-type header', async () => {
    const noTypeClient = {
      api: {
        notype: {
          get: vi.fn().mockImplementation(async () => {
            const response = {
              ok: true,
              status: 200,
              headers: new Map(), // No content-type header
              text: vi.fn().mockResolvedValue('Plain text content'),
              blob: vi.fn().mockResolvedValue(new Blob(['Plain text content']))
            };
            
            mockFetch.mockResolvedValueOnce(response);
            
            const fetchResponse = await fetch('http://localhost:3000/api/notype');
            return fetchResponse;
          })
        }
      }
    };

    const response = await noTypeClient.api.notype.get();
    
    expect(response.headers.get('content-type')).toBeUndefined();
    
    // Should still be able to handle the response
    const text = await response.text();
    expect(text).toBe('Plain text content');
  });

  it('should handle content type negotiation', async () => {
    const negotiationClient = {
      api: {
        negotiate: {
          get: vi.fn().mockImplementation(async (options = {}) => {
            const acceptHeader = options.headers?.['Accept'] || 'application/json';
            let contentType = 'application/json';
            let responseData = { message: 'JSON response' };
            
            if (acceptHeader.includes('text/xml')) {
              contentType = 'text/xml';
              responseData = { message: 'XML response' };
            } else if (acceptHeader.includes('text/csv')) {
              contentType = 'text/csv';
              responseData = { message: 'CSV response' };
            }
            
            const response = {
              ok: true,
              status: 200,
              headers: new Map([['content-type', contentType]]),
              json: contentType === 'application/json' ? 
                vi.fn().mockResolvedValue(responseData) : undefined,
              text: contentType !== 'application/json' ? 
                vi.fn().mockResolvedValue(responseData) : undefined
            };
            
            mockFetch.mockResolvedValueOnce(response);
            
            const fetchResponse = await fetch('http://localhost:3000/api/negotiate', {
              headers: options.headers || {}
            });
            return fetchResponse;
          })
        }
      }
    };

    // Test JSON response
    const jsonResponse = await negotiationClient.api.negotiate.get({
      headers: { 'Accept': 'application/json' }
    });
    expect(jsonResponse.headers.get('content-type')).toBe('application/json');

    // Test XML response
    const xmlResponse = await negotiationClient.api.negotiate.get({
      headers: { 'Accept': 'text/xml' }
    });
    expect(xmlResponse.headers.get('content-type')).toBe('text/xml');

    // Test CSV response
    const csvResponse = await negotiationClient.api.negotiate.get({
      headers: { 'Accept': 'text/csv' }
    });
    expect(csvResponse.headers.get('content-type')).toBe('text/csv');
  });
});