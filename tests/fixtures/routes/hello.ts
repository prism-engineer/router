import { createApiRoute } from '../../../src/createApiRoute';
import { Type } from '@sinclair/typebox';

export const helloRoute = createApiRoute({
  path: '/api/hello',
  method: 'GET',
  response: {
    200: {
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