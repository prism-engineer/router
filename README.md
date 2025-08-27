# @prism-engineer/router

A type-safe router library that provides Express.js integration with automatic API client code generation. This library serves as a wrapper around Express.js that adds:

> **⚠️ Breaking Change Notice**: Starting from version 0.1.0, this package uses **ES Modules (ESM)** only. If you need CommonJS support, please use version 0.0.11 or earlier.

1. Dynamic route loading from file patterns
2. Automatic TypeScript API client generation
3. Type-safe API consumption for frontends and backends

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [API Client Generation](#api-client-generation)
- [Key Features](#key-features)
- [Complete Example](#complete-example)
- [Configuration Options](#configuration-options)
- [Development](#development)

## Installation

```bash
# Install the router
npm install @prism-engineer/router

# Install required peer dependencies
npm install @sinclair/typebox express
```

**Requirements:**
- **Node.js 16+**: Required for ES Module support
- **ES Modules**: This package now uses ESM exclusively (version 0.1.0+)
- **TypeBox**: Required for defining route schemas with runtime validation and type safety
- **Express.js**: Required as the underlying web framework

**Migration from CommonJS**: If you're upgrading from version 0.0.11 or earlier, you'll need to:
1. Update your `package.json` to include `"type": "module"`
2. Change `require()` statements to `import` statements  
3. Change `module.exports` to `export` statements

## Quick Start

### 1. Import and Initialize

```typescript
import express from 'express';
import { router } from '@prism-engineer/router';

// Access the Express app instance
const app = router.app;

// Add middleware as needed
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
```

### 2. Create Route Files

Create route files using the `createApiRoute` helper. **TypeBox is required** for defining type-safe schemas:

```typescript
// api/hello.ts - Simple GET route
import { createApiRoute } from '@prism-engineer/router';
import { Type } from '@sinclair/typebox';

export const helloRoute = createApiRoute({
  path: '/api/hello',
  method: 'GET',
  response: {
    200: {
      contentType: 'application/json',
      body: Type.Object({
        message: Type.String()
      })
    }
  },
  handler: async (req) => {
    return {
      status: 200 as const,
      body: { message: 'Hello, World!' }
    };
  }
});
```

```typescript
// api/users.ts - POST route with request body
import { createApiRoute } from '@prism-engineer/router';
import { Type } from '@sinclair/typebox';

export const createUserRoute = createApiRoute({
  path: '/api/users',
  method: 'POST',
  request: {
    body: Type.Object({
      name: Type.String(),
      email: Type.String()
    })
  },
  response: {
    201: {
      contentType: 'application/json',
      body: Type.Object({
        id: Type.Number(),
        name: Type.String(),
        email: Type.String()
      })
    }
  },
  handler: async (req) => {
    const { name, email } = req.body;
    return {
      status: 201 as const,
      body: { id: 1, name, email }
    };
  }
});
```

### 3. Load Routes Dynamically

```typescript
// Load all API routes using RegExp pattern matching
await router.loadRoutes('./api', /.*\.ts$/);

// Load specific route patterns
await router.loadRoutes('./api/v1', /.*\.ts$/);

// Load multiple directories and patterns
await router.loadRoutes('./api/v1', /users\.ts$/);
await router.loadRoutes('./api/v2', /.*\.ts$/);
await router.loadRoutes('./admin', /.*\.ts$/);
```

### 4. Start the Server

```typescript
// Start the server
app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

## API Client Generation

### Configuration File

Create `config.prism.router.ts` in your project root:

```typescript
export default {
  outputDir: './generated',
  name: 'ApiClient',
  baseUrl: 'http://localhost:3000',
  routes: {
    directory: './api',
    pattern: /.*\.ts$/
  }
} as const;
```

### Programmatic Compilation

```typescript
import { router } from '@prism-engineer/router';

// Compile with custom config
await router.compile({
  outputDir: './src/generated',
  name: 'MyApiClient',
  baseUrl: 'http://localhost:3000',
  routes: {
    directory: './api',
    pattern: /.*\.ts$/
  }
});
```

### CLI Usage

The CLI provides a simple way to generate API clients from your route definitions:

```bash
# Generate API client using config file
npx @prism-engineer/router compile

# Alternative: use the binary name directly (after installation)
npx prism-router compile

# Show CLI help
npx @prism-engineer/router help
```

**Configuration Options:**
The CLI looks for configuration files in this order:
- `config.prism.router.ts`
- `config.prism.router.js` 
- `prism.config.ts`
- `prism.config.js`

**Example output:**
```
🔍 Loading configuration...
📁 Output directory: ./generated
🏷️  Client name: ApiClient
🌐 Base URL: http://localhost:3000
📂 Routes directory: ./api
🔍 Pattern: /.*\.ts$/

⚡ Compiling API client...
✅ API client generated successfully!
📄 Generated file: ./generated/ApiClient.generated.ts
```

### Using Generated Client

The generated client mirrors your API structure using actual paths:

```typescript
import { createApiClient } from './generated/ApiClient.generated';

const client = createApiClient('http://localhost:3000');

// GET /api/hello -> client.api.hello.get()
const hello = await client.api.hello.get();

// POST /api/users -> client.api.users.post({ body: {...} })
const newUser = await client.api.users.post({ 
  body: { name: 'John', email: 'john@example.com' } 
});
```

#### Query Parameters

Add query parameters to GET requests for filtering, pagination, etc:

```typescript
// Route definition
export const getUsersRoute = createApiRoute({
  path: '/api/users',
  method: 'GET',
  request: {
    query: Type.Object({
      page: Type.Optional(Type.Number()),
      limit: Type.Optional(Type.Number()),
      search: Type.Optional(Type.String())
    })
  },
  response: {
    200: {
      contentType: 'application/json',
      body: Type.Array(Type.Object({
        id: Type.Number(),
        name: Type.String(),
        email: Type.String()
      }))
    }
  },
  handler: async (req) => {
    const { page = 1, limit = 10, search } = req.query;
    return {
      status: 200 as const,
      body: [{ id: 1, name: 'John', email: 'john@example.com' }]
    };
  }
});
```

```typescript
// Client usage
const users = await client.api.users.get({ 
  query: { page: 1, limit: 10, search: 'john' } 
});
```

#### Path Parameters

Use `{paramName}` syntax in routes. Client uses underscore notation `_paramName_`:

```typescript
// Route definition
export const getUserByIdRoute = createApiRoute({
  path: '/api/users/{userId}',
  method: 'GET',
  response: {
    200: {
      contentType: 'application/json',
      body: Type.Object({
        id: Type.Number(),
        name: Type.String(),
        email: Type.String()
      })
    }
  },
  handler: async (req) => {
    const { userId } = req.params;
    return {
      status: 200 as const,
      body: { id: Number(userId), name: 'John', email: 'john@example.com' }
    };
  }
});
```

```typescript
// Client usage
const user = await client.api.users._userId_.get('123');

// Multiple path parameters (passed in order)
const comment = await client.api.users._userId_.posts._postId_.get('123', '456');
```

#### Headers

Define expected headers for validation and typing:

```typescript
// Route definition
export const protectedRoute = createApiRoute({
  path: '/api/protected',
  method: 'GET',
  request: {
    headers: Type.Object({
      authorization: Type.String(),
      'x-api-version': Type.Optional(Type.String())
    })
  },
  response: {
    200: {
      contentType: 'application/json',
      body: Type.Object({
        message: Type.String()
      })
    }
  },
  handler: async (req) => {
    const { authorization } = req.headers;
    return {
      status: 200 as const,
      body: { message: 'Access granted' }
    };
  }
});
```

```typescript
// Client usage
const result = await client.api.protected.get({
  headers: { 
    authorization: 'Bearer token123',
    'x-api-version': 'v1' 
  }
});
```

#### Authentication

Define reusable authentication schemes and use them in routes:

**Step 1: Define Authentication Schemes**

```typescript
// auth/schemes.ts
import { createAuthScheme } from '@prism-engineer/router';
import express from 'express';

export const bearerAuth = createAuthScheme({
  name: 'bearer',
  validate: async (req: express.Request) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const user = await validateJWT(token);
      return { user, scopes: user.permissions };
    }
    throw new Error('Missing or invalid bearer token');
  }
});

export const apiKeyAuth = createAuthScheme({
  name: 'apiKey',
  validate: async (req: express.Request) => {
    const key = req.headers['x-api-key'] as string;
    if (key) {
      const client = await validateApiKey(key);
      return { client, scopes: ['read', 'write'] };
    }
    throw new Error('Missing API key');
  }
});

// Placeholder functions for the example
declare function validateJWT(token: string): Promise<{ id: string; permissions: string[] }>;
declare function validateApiKey(key: string): Promise<{ id: string }>;
```

**Step 2: Use Auth Schemes in Routes**

```typescript
// api/users.ts
import { bearerAuth } from '../auth/schemes';

export const getUsersRoute = createApiRoute({
  path: '/api/users',
  method: 'GET',
  auth: bearerAuth, // Single auth scheme
  response: {
    200: {
      contentType: 'application/json',
      body: Type.Array(Type.Object({
        id: Type.Number(),
        name: Type.String()
      }))
    }
  },
  handler: async (req) => {
    // req.auth contains { name: <scheme>, context: <auth result> }
    const { user } = req.auth.context;
    const authScheme = req.auth.name; // 'bearer' in this case
    return {
      status: 200 as const,
      body: [{ id: 1, name: 'John' }]
    };
  }
});

// Multiple auth schemes (OR logic)
export const flexibleRoute = createApiRoute({
  path: '/api/flexible',
  method: 'GET',
  auth: [bearerAuth, apiKeyAuth], // Either bearer OR API key
  handler: async (req) => {
    // req.auth is a union type that preserves which scheme was used
    if (req.auth.name === 'bearer') {
      // TypeScript knows context contains user data
      const { user } = req.auth.context;
      console.log('Authenticated user:', user.id);
    } else if (req.auth.name === 'apiKey') {
      // TypeScript knows context contains client data
      const { client } = req.auth.context;
      console.log('Authenticated client:', client.id);
    }
    return { status: 200 as const, body: { success: true } };
  }
});
```

**Authentication Context Structure**

The `req.auth` object now has a strongly-typed structure that preserves both the authentication scheme name and the validated result:

```typescript
// req.auth structure (for single auth scheme)
{
  name: 'your-scheme-name',              // Literal type of your auth scheme name
  context: <YourValidateReturnType>      // Exactly what your validate function returns
}

// req.auth structure (for multiple auth schemes - union type)
{
  name: 'scheme1',
  context: <Scheme1ValidateReturnType>
} | {
  name: 'scheme2', 
  context: <Scheme2ValidateReturnType>
} | ...
```

**Key Features:**
- **Full Request Access**: Your `validate` function receives the complete `express.Request` object
- **Type Safety**: `req.auth.context` is strongly typed based on your `validate` function's return type
- **Scheme Discrimination**: `req.auth.name` lets you identify which auth scheme was used
- **Maximum Flexibility**: Extract authentication data from headers, query params, cookies, or anywhere in the request

**Example with Custom Return Types:**
```typescript
const customAuth = createAuthScheme({
  name: 'custom-jwt',
  validate: async (req: express.Request) => {
    // Access any part of the request
    const token = req.headers.authorization?.replace('Bearer ', '') || 
                  req.query.token as string ||
                  req.cookies?.jwt;
    
    if (!token) throw new Error('No token provided');
    
    // Your validate function can return ANY type
    const decoded = await verifyJWT(token);
    return { userId: decoded.sub, permissions: decoded.scope.split(' ') };
  }
});

const route = createApiRoute({
  path: '/api/custom',
  method: 'GET',
  auth: customAuth,
  response: {
    200: {
      contentType: 'application/json',
      body: Type.Object({
        message: Type.String()
      })
    }
  },
  handler: async (req) => {
    // req.auth.context is typed as { userId: string, permissions: string[] }
    const userId: string = req.auth.context.userId;
    const permissions: string[] = req.auth.context.permissions;
    const schemeName: 'custom-jwt' = req.auth.name;
    // ...
    return { status: 200 as const, body: { message: 'Success' } };
  }
});

// Placeholder function for the example
declare function verifyJWT(token: string): Promise<{ sub: string; scope: string }>;

// Multiple auth schemes create union types
const multiAuthRoute = createApiRoute({
  path: '/api/multi',
  method: 'GET',
  auth: [bearerAuth, apiKeyAuth], // Union of different schemes
  handler: async (req) => {
    // req.auth is union type with proper discrimination
    if (req.auth.name === 'bearer') {
      // TypeScript knows this is bearer auth result
      const user = req.auth.context.user; // Typed correctly
      const scopes = req.auth.context.scopes;
    } else if (req.auth.name === 'apiKey') {
      // TypeScript knows this is API key auth result  
      const client = req.auth.context.client; // Typed correctly
      const scopes = req.auth.context.scopes;
    }
    // Full type safety with literal string discrimination!
  }
});
```

**Step 3: Client Authentication**

The generated client automatically handles authentication:

```typescript
import { createApiClient } from './generated/ApiClient.generated';

// Initialize client with auth schemes
const client = createApiClient('http://localhost:3000', {
  auth: {
    bearer: () => localStorage.getItem('token'),
    apiKey: 'your-api-key'
  }
});

// Auth headers automatically added to protected endpoints
const users = await client.api.users.get(); // Adds Bearer header
const data = await client.api.flexible.get(); // Adds appropriate auth header
```

**Advanced Authentication Patterns**

```typescript
// Note: Advanced authentication patterns like getToken and onUnauthorized
// are not currently implemented in the generated client code.
// The generated client currently supports simple string tokens or functions
// that return tokens.

// Dynamic token management (not currently implemented)
const client = createApiClient(baseUrl, {
  auth: {
    bearer: () => authStore.getAccessToken(),
    apiKey: 'your-api-key'
  }
});

// Multiple auth schemes for different endpoint types
const client = createApiClient(baseUrl, {
  auth: {
    bearer: userToken,      // For user endpoints
    apiKey: serviceKey,     // For service endpoints
    oauth: oauthToken       // For OAuth endpoints
  }
});
```

#### Request Options

All HTTP methods support the same options structure:

```typescript
interface RequestOptions {
  query?: Record<string, any>;
  body?: any;
  headers?: Record<string, string>;
}

// Example with query parameters
await client.api.users.get({ 
  query: { page: 1, limit: 10 }
});

// Example with request body and headers
await client.api.users.post({ 
  body: { name: 'John', email: 'john@example.com' },
  headers: { 'content-type': 'application/json' }
});
```

## Key Features

### Core Benefits

- **Runtime Validation**: Automatic request/response validation using TypeBox schemas
- **Type Safety**: TypeScript types automatically inferred from schemas  
- **Path-Based Client**: Generated client mirrors your API structure (`client.api.users.get()`)
- **JSON Schema Output**: Generate OpenAPI/Swagger documentation automatically

### Handler Functions

Route handlers are **async functions** that receive a typed request object and return a response object:

```typescript
handler: async (req) => {
  // req.body - typed request body (if defined)
  // req.query - typed query parameters (if defined) 
  // req.headers - typed headers (if defined)
  // req.params - extracted path parameters
  
  return {
    status: 200 as const,
    body: { /* response data */ },
    headers?: { /* optional response headers */ }
  };
}
```

### Response Types

The router supports two types of responses based on the `contentType` you specify:

#### JSON Responses

For JSON content types (`application/json`, `application/vnd.api+json`, `application/ld+json`, `text/json`), return a `body` object:

```typescript
export const jsonRoute = createApiRoute({
  path: '/api/data',
  method: 'GET',
  response: {
    200: {
      contentType: 'application/json',
      body: Type.Object({
        message: Type.String(),
        timestamp: Type.Number()
      })
    }
  },
  handler: async (req) => {
    return {
      status: 200 as const,
      body: {
        message: 'Hello, World!',
        timestamp: Date.now()
      }
    };
  }
});
```

#### Custom Content Types

For non-JSON content types (like `text/plain`, `text/html`, `image/png`, etc.), return a `custom` function that receives the Express response object:

```typescript
export const customRoute = createApiRoute({
  path: '/api/download',
  method: 'GET',
  response: {
    200: {
      contentType: 'text/plain'
    },
    404: {
      contentType: 'application/json',
      body: Type.Object({
        error: Type.String()
      })
    }
  },
  handler: async (req) => {
    const data = await getFileData();
    
    if (!data) {
      return {
        status: 404 as const,
        body: { error: 'File not found' }
      };
    }
    
    return {
      status: 200 as const,
      custom: (res) => {
        res.setHeader('Content-Disposition', 'attachment; filename="data.txt"');
        res.send(data);
      }
    };
  }
});

// Example: Streaming response for large files or real-time data
export const streamRoute = createApiRoute({
  path: '/api/stream/{fileId}',
  method: 'GET',
  response: {
    200: {
      contentType: 'application/octet-stream'
    },
    404: {
      contentType: 'application/json',
      body: Type.Object({
        error: Type.String()
      })
    }
  },
  handler: async (req) => {
    const { fileId } = req.params;
    const fileStream = await getFileStream(fileId);
    
    if (!fileStream) {
      return {
        status: 404 as const,
        body: { error: 'File not found' }
      };
    }
    
    return {
      status: 200 as const,
      custom: (res) => {
        res.setHeader('Content-Disposition', `attachment; filename="${fileId}"`);
        res.setHeader('Transfer-Encoding', 'chunked');
        
        // Stream the file directly to the response
        fileStream.pipe(res);
        
        // Handle stream errors
        fileStream.on('error', (err) => {
          console.error('Stream error:', err);
          if (!res.headersSent) {
            res.status(500).json({ error: 'Stream error' });
          }
        });
      }
    };
  }
});

// Example: Server-Sent Events (SSE) for real-time updates
export const sseRoute = createApiRoute({
  path: '/api/events',
  method: 'GET',
  response: {
    200: {
      contentType: 'text/event-stream'
    }
  },
  handler: async (req) => {
    return {
      status: 200 as const,
      custom: (res) => {
        // Set SSE headers
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('Access-Control-Allow-Origin', '*');
        
        // Send initial connection message
        res.write('data: {"type":"connected","timestamp":' + Date.now() + '}\n\n');
        
        // Set up interval to send periodic updates
        const interval = setInterval(() => {
          const data = {
            type: 'update',
            timestamp: Date.now(),
            data: Math.random()
          };
          res.write(`data: ${JSON.stringify(data)}\n\n`);
        }, 1000);
        
        // Clean up when client disconnects
        req.on('close', () => {
          clearInterval(interval);
          console.log('SSE connection closed');
        });
        
        // Handle errors
        res.on('error', (err) => {
          console.error('SSE error:', err);
          clearInterval(interval);
        });
      }
    };
  }
});

// Placeholder functions for the examples
declare function getFileData(): Promise<string | null>;
declare function getFileStream(fileId: string): Promise<NodeJS.ReadableStream | null>;
```

**Key Points:**
- **JSON responses**: Use `body` property with TypeBox schema validation
- **Custom responses**: Use `custom` function for full control over the response
- **Content-Type**: Automatically set by the framework based on your schema
- **Mixed responses**: You can mix JSON and custom content types in the same route (different status codes)

## Complete Example

```typescript
import express from 'express';
import { router } from '@prism-engineer/router';

async function main() {
  // Get the Express app
  const app = router.app;
  
  // Add middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  // Load routes from multiple directories
  await router.loadRoutes('./api', /.*\.ts$/);
  await router.loadRoutes('./admin', /.*\.ts$/);
  
  // Start server
  app.listen(3000, () => {
    console.log('🚀 Server running on port 3000');
  });
  
  // Generate API client
  await router.compile({
    outputDir: './generated',
    name: 'ApiClient',
    baseUrl: 'http://localhost:3000',
    routes: {
      directory: './api',
      pattern: /.*\.ts$/
    }
  });
  console.log('✅ API client generated');
}

main().catch(console.error);
```

## Configuration Options

The `config.prism.router.ts` file supports these options:

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `outputDir` | `string` | ✅ | - | Output directory for generated client |
| `name` | `string` | ✅ | - | Name of the generated client function |
| `baseUrl` | `string` | ✅ | - | Base URL for API calls |
| `routes.directory` | `string` | ✅ | - | Directory to scan for route files |
| `routes.pattern` | `RegExp` | ✅ | - | RegExp pattern to match route files |

```typescript
export default {
  outputDir: './generated',
  name: 'ApiClient',
  baseUrl: 'http://localhost:3000',
  routes: {
    directory: './api',
    pattern: /.*\.ts$/
  }
} as const;
```

## Development

### Dependencies
- Use `npm install {package}` to add dependencies
- Compatible with any Node.js project

### Testing
- Run tests: `npm test`
- Watch mode: `npm run test:watch`
- Coverage: `npm run test:coverage`

## Package Info

- **Package name**: `@prism-engineer/router`
- **Type**: ES Module library for Express.js applications
- **Current version**: 0.1.0 (ESM-only)
- **Last CommonJS version**: 0.0.11
- **Node.js compatibility**: >= 16.0.0 (ES Modules required)