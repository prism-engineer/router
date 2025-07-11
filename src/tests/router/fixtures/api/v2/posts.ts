import { createApiRoute } from '../../../../../createApiRoute';
import { Type } from '@sinclair/typebox';

export const getPostsV2Route = createApiRoute({
  path: '/api/v2/posts',
  method: 'GET',
  response: {
    200: {
      contentType: 'application/json',
      body: Type.Array(Type.Object({
        id: Type.Number(),
        title: Type.String(),
        content: Type.String(),
        version: Type.String()
      }))
    }
  },
  handler: async () => {
    return {
      status: 200,
      body: [{ id: 1, title: 'Test Post V2', content: 'Test content', version: 'v2' }]
    };
  }
});