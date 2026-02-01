// This simulates: export default createApiRoute({...})
// SWC puts this on module.exports.default
// When Node.js ESM imports this, it creates: { default: { default: route } }
// But our parser should handle this case

module.exports.default = {
  path: '/api/health',
  method: 'GET',
  handler: async () => ({ status: 200, body: { healthy: true } }),
  response: { 200: { contentType: 'application/json', body: {} } }
};
