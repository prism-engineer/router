// This simulates a mix of named export and default export
// export const topLevelRoute = createApiRoute({...});
// export default createApiRoute({...});

module.exports.topLevelRoute = {
  path: '/api/top',
  method: 'GET',
  handler: async () => ({ status: 200, body: { level: 'top' } }),
  response: { 200: { contentType: 'application/json', body: {} } }
};

// Default export (a single route)
module.exports.default = {
  path: '/api/default-route',
  method: 'POST',
  handler: async () => ({ status: 201, body: { from: 'default' } }),
  response: { 201: { contentType: 'application/json', body: {} } }
};
