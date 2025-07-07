import { createApiRoute } from '../../../src/createApiRoute';
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