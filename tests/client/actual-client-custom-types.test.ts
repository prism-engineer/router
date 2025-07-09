import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Type } from '@sinclair/typebox';
import { createRouter } from '../../src/router';
import { createApiRoute } from '../../src/createApiRoute';
import { createCompiler } from '../../src/compilation/compiler';
import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { tmpdir } from 'os';

describe('Actual Frontend Client with Custom Content Types', () => {
  let router: ReturnType<typeof createRouter>;
  let app: express.Express;
  let server: any;
  let baseUrl: string;
  let tempDir: string;

  beforeEach(async () => {
    router = createRouter();
    app = router.app;
    app.use(express.json());
    
    // Create temp directory for generated client
    tempDir = await fs.mkdtemp(path.join(tmpdir(), 'prism-actual-client-test-'));
  });

  afterEach(async () => {
    if (server) {
      server.close();
    }
    // Clean up temp directory
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should generate and actually use client code with proper custom content type handling', async () => {
    // Start server
    const server = app.listen(0);
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : 3000;
    baseUrl = `http://localhost:${port}`;

    try {
      // Define routes with both JSON and custom content types
      const jsonRoute = createApiRoute({
        path: '/api/json-endpoint',
        method: 'GET',
        response: {
          200: {
            contentType: 'application/json',
            body: Type.Object({
              message: Type.String()
            })
          }
        },
        handler: async () => {
          return {
            status: 200 as const,
            body: { message: 'Hello JSON' }
          };
        }
      });

      const csvRoute = createApiRoute({
        path: '/api/csv-export',
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
              res.send('Name,Age\nJohn,30');
            }
          };
        }
      });

      // Register routes
      router.registerRoute(jsonRoute);
      router.registerRoute(csvRoute);

      // Generate client code
      const compiler = createCompiler();
      await compiler.compile({
        outputDir: tempDir,
        name: 'TestClient',
        baseUrl,
        routes: {
          directory: tempDir,
          pattern: /.*\.ts$/
        }
      }, [jsonRoute, csvRoute]);

      // Read generated client
      const clientPath = path.join(tempDir, 'TestClient.generated.ts');
      const clientContent = await fs.readFile(clientPath, 'utf-8');

      // Verify client structure
      expect(clientContent).toContain('createTestClient');
      expect(clientContent).toContain('json-endpoint');
      expect(clientContent).toContain('csv-export');

      // Actually import and use the generated client
      const clientModule = await import(clientPath);
      const client = clientModule.createTestClient();

      // Test JSON endpoint using the actual generated client
      const jsonResult = await client.api.api['json-endpoint'].get();
      expect(jsonResult.status).toBe(200);
      expect(jsonResult.body).toEqual({ message: 'Hello JSON' });

      // Test CSV endpoint using the actual generated client
      const csvResult = await client.api.api['csv-export'].get();
      expect(csvResult.status).toBe(200);
      
      // For custom content types, the client should return the raw response
      expect(csvResult.body).toBeDefined();
      const csvText = await csvResult.body.text();
      expect(csvText).toBe('Name,Age\nJohn,30');

    } finally {
      server.close();
    }
  });

  it('should generate and use type-safe client for mixed content types', async () => {
    // Start server
    const server = app.listen(0);
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : 3000;
    baseUrl = `http://localhost:${port}`;

    try {
      // Define a route that can return both JSON and custom responses
      const mixedRoute = createApiRoute({
        path: '/api/mixed/{format}',
        method: 'GET',
        response: {
          200: {
            contentType: 'application/json',
            body: Type.Object({
              data: Type.String(),
              format: Type.String()
            })
          },
          201: {
            contentType: 'text/plain'
          }
        },
        handler: async (req) => {
          const format = req.params.format;
          
          if (format === 'json') {
            return {
              status: 200 as const,
              body: {
                data: 'JSON response',
                format: 'json'
              }
            };
          } else {
            return {
              status: 201 as const,
              custom: (res) => {
                res.setHeader('Content-Type', 'text/plain');
                res.send('Plain text response');
              }
            };
          }
        }
      });

      router.registerRoute(mixedRoute);

      // Generate client
      const compiler = createCompiler();
      await compiler.compile({
        outputDir: tempDir,
        name: 'MixedTestClient',
        baseUrl,
        routes: {
          directory: tempDir,
          pattern: /.*\.ts$/
        }
      }, [mixedRoute]);

      // Read generated client
      const clientPath = path.join(tempDir, 'MixedTestClient.generated.ts');
      const clientContent = await fs.readFile(clientPath, 'utf-8');

      // Verify client handles both response types
      expect(clientContent).toContain('createMixedTestClient');
      expect(clientContent).toContain('mixed');
      expect(clientContent).toContain('_format_');

      // Actually import and use the generated client
      const clientModule = await import(clientPath);
      const client = clientModule.createMixedTestClient();

      // Test JSON response using the actual generated client
      const jsonResult = await client.api.api.mixed._format_.get('json');
      expect(jsonResult.status).toBe(200);
      expect(jsonResult.body).toEqual({
        data: 'JSON response',
        format: 'json'
      });

      // Test custom text response using the actual generated client
      const textResult = await client.api.api.mixed._format_.get('text');
      expect(textResult.status).toBe(201);
      
      // For custom content types, the client should return the raw response
      expect(textResult.body).toBeDefined();
      const textContent = await textResult.body.text();
      expect(textContent).toBe('Plain text response');

    } finally {
      server.close();
    }
  });
});