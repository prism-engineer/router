import { createApiRoute } from '../../../src/createApiRoute';
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