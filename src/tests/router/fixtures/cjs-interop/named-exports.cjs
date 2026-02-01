// This simulates proper named exports that work correctly
// When Node.js ESM imports, these become both:
// - Top-level named exports (via static analysis)
// - Properties under `default` (the whole module.exports)

module.exports.getOrdersRoute = {
  path: '/api/orders',
  method: 'GET',
  handler: async () => ({ status: 200, body: [] }),
  response: { 200: { contentType: 'application/json', body: {} } }
};

module.exports.createOrderRoute = {
  path: '/api/orders',
  method: 'POST',
  handler: async () => ({ status: 201, body: {} }),
  request: { body: {} },
  response: { 201: { contentType: 'application/json', body: {} } }
};
