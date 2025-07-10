import { createApiRoute } from '../../../../../src/createApiRoute';
import { Type } from '@sinclair/typebox';

export const getPostsRoute = createApiRoute({
  path: '/api/v1/posts',
  method: 'GET',
  response: {
    200: {
      contentType: 'application/json',
      body: Type.Array(Type.Object({
        id: Type.Number(),
        title: Type.String(),
        content: Type.String()
      }))
    }
  },
  handler: async () => {
    return {
      status: 200 as const,
      body: [{ id: 1, title: 'Test Post', content: 'Test content' }]
    };
  }
});