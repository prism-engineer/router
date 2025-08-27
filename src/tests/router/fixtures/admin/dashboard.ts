import { createApiRoute } from '../../../../createApiRoute.js';
import { Type } from '@sinclair/typebox';

export const getDashboardRoute = createApiRoute({
  path: '/admin/dashboard',
  method: 'GET',
  response: {
    200: {
      contentType: 'application/json',
      body: Type.Object({
        stats: Type.Object({
          users: Type.Number(),
          posts: Type.Number()
        })
      })
    }
  },
  handler: async () => {
    return {
      status: 200,
      body: { stats: { users: 100, posts: 500 } }
    };
  }
});