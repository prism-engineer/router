import { createApiRoute } from '../../../../createApiRoute';
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
      status: 200,
      body: { message: 'Hello, World!' }
    };
  }
});