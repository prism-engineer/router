import { createApiRoute } from '../../../src/createApiRoute';
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
    const { name, email } = req.body;
    return {
      status: 200 as const,
      body: { id: 1, name, email }
    };
  }
});

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