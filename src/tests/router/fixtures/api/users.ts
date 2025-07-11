import { createApiRoute } from '../../../../createApiRoute';
import { Type } from '@sinclair/typebox';

export const getUsersRoute = createApiRoute({
  path: '/api/users',
  method: 'GET',
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
    return {
      status: 200,
      body: [{ id: 1, name: 'John Doe' }]
    };
  }
});

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
    return {
      status: 201,
      body: { id: 1, name: req.body.name, email: req.body.email }
    };
  }
});