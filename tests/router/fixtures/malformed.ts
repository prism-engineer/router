// This file intentionally has malformed route exports for testing error handling
export const notARoute = {
  path: '/malformed',
  // Missing method and handler
};

export const invalidRoute = {
  method: 'GET',
  // Missing path and handler
};

// This is a valid object but not a route
export const someOtherExport = {
  data: 'not a route'
};