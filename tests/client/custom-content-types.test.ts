import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Type } from '@sinclair/typebox';
import { createRouter } from '../../src/router';
import { createApiRoute } from '../../src/createApiRoute';
import express from 'express';
import request from 'supertest';
import { createCompiler } from '../../src/compilation/compiler';
import fs from 'fs/promises';
import path from 'path';
import { tmpdir } from 'os';

describe('Frontend Client with Custom Content Types', () => {
  let router: ReturnType<typeof createRouter>;
  let app: express.Express;
  let server: any;
  let baseUrl: string;
  let tempDir: string;

  beforeEach(async () => {
    router = createRouter();
    app = router.app;
    app.use(express.json());
    
    // Start server on random port
    server = app.listen(0);
    const port = server.address()?.port;
    baseUrl = `http://localhost:${port}`;
    
    // Create temp directory for generated client
    tempDir = await fs.mkdtemp(path.join(tmpdir(), 'prism-client-test-'));
  });

  afterEach(async () => {
    if (server) {
      server.close();
    }
    // Clean up temp directory
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should handle custom content type responses in generated client', async () => {
    // Define a route with custom content type
    const customRoute = createApiRoute({
      path: '/api/download-csv',
      method: 'GET',
      response: {
        200: {
          contentType: 'text/csv'
        }
      },
      handler: async () => {
        return {
          status: 200 as const,
          custom: (res) => {
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename="data.csv"');
            res.send('Name,Age,Email\nJohn,30,john@example.com\nJane,25,jane@example.com');
          }
        };
      }
    });

    router.registerRoute(customRoute);

    // Write route to temp file so compiler can find it
    const routeFilePath = path.join(tempDir, 'download.ts');
    await fs.writeFile(
      routeFilePath,
      `
import { createApiRoute } from '../../src/createApiRoute';

export default ${JSON.stringify(customRoute, null, 2).replace(/"([^"]+)":/g, '$1:').replace(/"/g, "'")};
      `,
      'utf-8'
    );

    // Generate client
    const compiler = createCompiler();
    await compiler.compile({
      outputDir: tempDir,
      baseUrl,
      routes: {
        directory: tempDir,
        pattern: /\.ts$/
      },
      name: 'TestClient'
    }, [customRoute]);

    // Read generated client
    const clientPath = path.join(tempDir, 'TestClient.generated.ts');
    const clientCode = await fs.readFile(clientPath, 'utf-8');

    // Verify client was generated with proper structure
    expect(clientCode).toContain('createTestClient');
    expect(clientCode).toContain('download');
    expect(clientCode).toContain('get:');

    // Test the actual HTTP endpoint works
    const response = await request(app)
      .get('/api/download-csv')
      .expect(200);

    expect(response.headers['content-type']).toMatch(/^text\/csv/);
    expect(response.headers['content-disposition']).toBe('attachment; filename="data.csv"');
    expect(response.text).toBe('Name,Age,Email\nJohn,30,john@example.com\nJane,25,jane@example.com');
  });

  it('should handle binary content types in generated client', async () => {
    // Define a route with binary content type
    const binaryRoute = createApiRoute({
      path: '/api/download-file',
      method: 'GET',
      response: {
        200: {
          contentType: 'application/octet-stream'
        }
      },
      handler: async () => {
        return {
          status: 200 as const,
          custom: (res) => {
            res.setHeader('Content-Type', 'application/octet-stream');
            res.setHeader('Content-Disposition', 'attachment; filename="file.bin"');
            res.send(Buffer.from([0x48, 0x65, 0x6c, 0x6c, 0x6f])); // "Hello" in bytes
          }
        };
      }
    });

    router.registerRoute(binaryRoute);

    // Generate client
    const compiler = createCompiler();
    await compiler.compile({
      outputDir: tempDir,
      baseUrl,
      routes: {
        directory: tempDir,
        pattern: /\.ts$/
      },
      name: 'BinaryClient'
    }, [binaryRoute]);

    // Verify client was generated
    const clientPath = path.join(tempDir, 'BinaryClient.generated.ts');
    const clientCode = await fs.readFile(clientPath, 'utf-8');
    expect(clientCode).toContain('createBinaryClient');

    // Test the actual HTTP endpoint works
    const response = await request(app)
      .get('/api/download-file')
      .expect(200);

    expect(response.headers['content-type']).toBe('application/octet-stream');
    expect(response.headers['content-disposition']).toBe('attachment; filename="file.bin"');
    expect(response.body).toEqual(Buffer.from([0x48, 0x65, 0x6c, 0x6c, 0x6f]));
  });

  it('should distinguish between JSON and custom responses in client types', async () => {
    // Define routes with both JSON and custom content types
    const jsonRoute = createApiRoute({
      path: '/api/json-data',
      method: 'GET',
      response: {
        200: {
          contentType: 'application/json',
          body: Type.Object({
            message: Type.String(),
            count: Type.Number()
          })
        }
      },
      handler: async () => {
        return {
          status: 200 as const,
          body: { message: 'Hello JSON', count: 42 }
        };
      }
    });

    const customRoute = createApiRoute({
      path: '/api/text-data',
      method: 'GET',
      response: {
        200: {
          contentType: 'text/plain'
        }
      },
      handler: async () => {
        return {
          status: 200 as const,
          custom: (res) => {
            res.setHeader('Content-Type', 'text/plain');
            res.send('Hello Plain Text');
          }
        };
      }
    });

    router.registerRoute(jsonRoute);
    router.registerRoute(customRoute);

    // Generate client
    const compiler = createCompiler();
    await compiler.compile({
      outputDir: tempDir,
      baseUrl,
      routes: {
        directory: tempDir,
        pattern: /\.ts$/
      },
      name: 'MixedClient'
    }, [jsonRoute, customRoute]);

    // Verify client was generated with both routes
    const clientPath = path.join(tempDir, 'MixedClient.generated.ts');
    const clientCode = await fs.readFile(clientPath, 'utf-8');
    expect(clientCode).toContain('createMixedClient');
    expect(clientCode).toContain('json-data');
    expect(clientCode).toContain('text-data');

    // Test both endpoints work correctly
    const jsonResponse = await request(app)
      .get('/api/json-data')
      .expect(200);

    expect(jsonResponse.headers['content-type']).toMatch(/^application\/json/);
    expect(jsonResponse.body).toEqual({ message: 'Hello JSON', count: 42 });

    const textResponse = await request(app)
      .get('/api/text-data')
      .expect(200);

    expect(textResponse.headers['content-type']).toMatch(/^text\/plain/);
    expect(textResponse.text).toBe('Hello Plain Text');
  });
});