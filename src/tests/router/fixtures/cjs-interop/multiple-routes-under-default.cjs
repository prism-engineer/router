// This simulates what SWC produces when compiling:
// export const getUsersRoute = createApiRoute({...});
// export const createUserRoute = createApiRoute({...});
// export const deleteUserRoute = createApiRoute({...});
//
// SWC's _export() helper puts named exports on module.exports directly
// When Node.js ESM imports this, it wraps the whole thing under `default`
// Result: { default: { getUsersRoute: {...}, createUserRoute: {...}, ... } }

module.exports.getUsersRoute = {
  path: '/api/users',
  method: 'GET',
  handler: async () => ({ status: 200, body: [] }),
  response: { 200: { contentType: 'application/json', body: {} } }
};

module.exports.createUserRoute = {
  path: '/api/users',
  method: 'POST',
  handler: async () => ({ status: 201, body: {} }),
  request: { body: {} },
  response: { 201: { contentType: 'application/json', body: {} } }
};

module.exports.deleteUserRoute = {
  path: '/api/users/:id',
  method: 'DELETE',
  handler: async () => ({ status: 204 }),
  response: { 204: { contentType: 'application/json' } }
};
