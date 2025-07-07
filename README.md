# @prism/router

A type-safe router library that provides Express.js integration with automatic API client code generation. This library serves as a wrapper around Express.js that adds:

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
npm install @prism/router

# Install required peer dependency
npm install @sinclair/typebox
```

**Note:** TypeBox is a required dependency for defining route schemas with runtime validation and type safety.

## Quick Start

### 1. Import and Initialize

```typescript
import { router } from '@prism/router';

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
import { createApiRoute } from '@prism/router';
import { Type } from '@sinclair/typebox';

export const helloRoute = createApiRoute({
  path: '/api/hello',
  method: 'GET',
  outputs: {
    body: Type.Object({
      message: Type.String()
    })
  },
  handler: (req, res) => {
    res.json({ message: 'Hello, World!' });
  }
});
```

```typescript
// api/users.ts - POST route with request body
import { createApiRoute } from '@prism/router';
import { Type } from '@sinclair/typebox';

export const createUserRoute = createApiRoute({
  path: '/api/users',
  method: 'POST',
  inputs: {
    body: Type.Object({
      name: Type.String(),
      email: Type.String()
    })
  },
  outputs: {
    body: Type.Object({
      id: Type.Number(),
      name: Type.String(),
      email: Type.String()
    })
  },
  handler: (req, res) => {
    const { name, email } = req.body;
    res.json({ id: 1, name, email });
  }
});
```

### 3. Load Routes Dynamically

```typescript
// Load all API routes
await router.loadRoutes(/api\/.*\.ts$/);

// Load specific route patterns
await router.loadRoutes(/api\/v1\/.*\.ts$/);
await router.loadRoutes('api/**/*.ts'); // glob pattern

// Load multiple patterns
const patterns = [
  /api\/v1\/.*\.ts$/,
  /api\/v2\/.*\.ts$/,
  /admin\/.*\.ts$/
];

for (const pattern of patterns) {
  await router.loadRoutes(pattern);
}
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
  clientName: 'ApiClient',
  format: 'typescript', // or 'javascript'
  baseUrl: 'http://localhost:3000',
  includeTypes: true,
};
```

### Programmatic Compilation

```typescript
import { router } from '@prism/router';

// Compile with custom config
await router.compile({
  outputDir: './src/generated',
  clientName: 'MyApiClient',
  format: 'typescript',
  baseUrl: 'http://localhost:3000',
  includeTypes: true,
});
```

### CLI Usage

```bash
# Generate API client using config file
npx router compile

# The generated client will be type-safe:
# ./generated/ApiClient.ts
```

### Using Generated Client

The generated client mirrors your API structure using actual paths:

```typescript
import { ApiClient } from './generated/ApiClient';

const client = new ApiClient('http://localhost:3000');

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
  inputs: {
    query: Type.Object({
      page: Type.Optional(Type.Number()),
      limit: Type.Optional(Type.Number()),
      search: Type.Optional(Type.String())
    })
  },
  outputs: {
    body: Type.Array(Type.Object({
      id: Type.Number(),
      name: Type.String(),
      email: Type.String()
    }))
  },
  handler: (req, res) => {
    const { page = 1, limit = 10, search } = req.query;
    res.json([{ id: 1, name: 'John', email: 'john@example.com' }]);
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
  outputs: {
    body: Type.Object({
      id: Type.Number(),
      name: Type.String(),
      email: Type.String()
    })
  },
  handler: (req, res) => {
    const { userId } = req.params;
    res.json({ id: Number(userId), name: 'John', email: 'john@example.com' });
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
  inputs: {
    headers: Type.Object({
      authorization: Type.String(),
      'x-api-version': Type.Optional(Type.String())
    })
  },
  outputs: {
    body: Type.Object({
      message: Type.String()
    })
  },
  handler: (req, res) => {
    const { authorization } = req.headers;
    res.json({ message: 'Access granted' });
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

Add authentication requirements to routes:

```typescript
// Route definition
export const secureRoute = createApiRoute({
  path: '/api/secure',
  method: 'GET',
  outputs: {
    body: Type.Object({
      data: Type.String()
    })
  },
  auth: { required: true, type: 'bearer' },
  handler: (req, res) => {
    // req.user is available when auth is configured
    res.json({ data: 'Secret information' });
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

### Authentication Support
```typescript
// No auth required (default)
// auth property can be omitted

// Bearer token
auth: { required: true, type: 'bearer' }

// API key in header
auth: { required: true, type: 'apikey', location: 'header', name: 'x-api-key' }

// Basic auth
auth: { required: true, type: 'basic' }

// Custom validation
auth: { required: true, type: 'custom', validator: (req) => boolean }
```

## Complete Example

```typescript
import express from 'express';
import { router } from '@prism/router';
import { loadConfig } from '@prism/router';

async function main() {
  // Get the Express app
  const app = router.app;
  
  // Add middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  // Load routes from multiple patterns
  await router.loadRoutes(/api\/.*\.ts$/);
  await router.loadRoutes(/admin\/.*\.ts$/);
  
  // Start server
  app.listen(3000, () => {
    console.log('🚀 Server running on port 3000');
  });
  
  // Generate API client
  const config = await loadConfig();
  await router.compile(config);
  console.log('✅ API client generated');
}

main().catch(console.error);
```

## Configuration Options

The `config.prism.router.ts` file supports these options:

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `outputDir` | `string` | ✅ | - | Output directory for generated client |
| `clientName` | `string` | ✅ | - | Name of the generated client class |
| `format` | `'typescript' \| 'javascript'` | ❌ | `'typescript'` | Output format |
| `baseUrl` | `string` | ❌ | `''` | Base URL for API calls |
| `includeTypes` | `boolean` | ❌ | `true` | Include TypeScript type definitions |

```typescript
export default {
  outputDir: './generated',
  clientName: 'ApiClient',
  format: 'typescript',
  baseUrl: 'http://localhost:3000',
  includeTypes: true,
};
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

- Package name: `@prism/router`
- Type: Library package for Express.js applications
- Current version: 0.0.1
- Node.js compatibility: >= 16.0.0