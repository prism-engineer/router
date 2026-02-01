import { describe, it, expect, beforeEach } from 'vitest';
import { createRouteParser } from '../../routing/parser.js';
import path from 'path';

describe('Router System - CJS/ESM Interop', () => {
  let parser: ReturnType<typeof createRouteParser>;

  beforeEach(() => {
    parser = createRouteParser();
  });

  describe('CJS module exports with ESM import', () => {
    it('should extract routes from CJS named exports (module.exports.routeName)', async () => {
      // When CJS uses module.exports.routeName = {...}, ESM import gives us:
      // { routeName: {...}, default: { routeName: {...} } }
      // Parser should deduplicate and return each route once
      const filePath = path.join(__dirname, 'fixtures/cjs-interop/multiple-routes-under-default.cjs');
      
      const routes = await parser.parseRouteFile(filePath);
      
      // Should find all 3 routes (deduplicated)
      expect(routes).toHaveLength(3);
      
      const paths = routes.map(r => r.path);
      expect(paths).toContain('/api/users');
      expect(paths).toContain('/api/users/:id');
      
      const methods = routes.map(r => r.method);
      expect(methods).toContain('GET');
      expect(methods).toContain('POST');
      expect(methods).toContain('DELETE');
    });

    it('should handle CJS default export (module.exports.default = route)', async () => {
      // When CJS uses module.exports.default = route, ESM import creates:
      // { default: { default: route } }
      // Parser should extract the route from the double-nested default
      const filePath = path.join(__dirname, 'fixtures/cjs-interop/single-route-default.cjs');
      
      const routes = await parser.parseRouteFile(filePath);
      
      // Should find the single route from double-nested default
      expect(routes).toHaveLength(1);
      expect(routes[0].path).toBe('/api/health');
      expect(routes[0].method).toBe('GET');
    });

    it('should handle CJS named exports without default', async () => {
      const filePath = path.join(__dirname, 'fixtures/cjs-interop/named-exports.cjs');
      
      const routes = await parser.parseRouteFile(filePath);
      
      // Should find both named exports (deduplicated)
      expect(routes).toHaveLength(2);
      
      const paths = routes.map(r => r.path);
      expect(paths).toContain('/api/orders');
      
      const methods = routes.map(r => r.method);
      expect(methods).toContain('GET');
      expect(methods).toContain('POST');
    });

    it('should handle CJS with both named and default exports', async () => {
      // When CJS has both module.exports.route and module.exports.default
      // ESM import creates: { route: {...}, default: { route: {...}, default: {...} } }
      const filePath = path.join(__dirname, 'fixtures/cjs-interop/mixed-exports.cjs');
      
      const routes = await parser.parseRouteFile(filePath);
      
      // Should find: topLevelRoute + default route = 2 routes
      expect(routes).toHaveLength(2);
      
      const paths = routes.map(r => r.path);
      expect(paths).toContain('/api/top');
      expect(paths).toContain('/api/default-route');
    });
  });

  describe('Deduplication', () => {
    it('should not duplicate routes that appear at both top-level and under default', async () => {
      // CJS exports appear both at top-level and under default in ESM import
      // Parser should deduplicate by method+path
      const filePath = path.join(__dirname, 'fixtures/cjs-interop/named-exports.cjs');
      
      const routes = await parser.parseRouteFile(filePath);
      
      // Each route should only appear once
      const uniquePaths = new Set(routes.map(r => `${r.method}:${r.path}`));
      expect(uniquePaths.size).toBe(routes.length);
    });

    it('should deduplicate multiple-route files correctly', async () => {
      const filePath = path.join(__dirname, 'fixtures/cjs-interop/multiple-routes-under-default.cjs');
      
      const routes = await parser.parseRouteFile(filePath);
      
      // Each route should only appear once even though they're at both levels
      const uniquePaths = new Set(routes.map(r => `${r.method}:${r.path}`));
      expect(uniquePaths.size).toBe(routes.length);
      expect(routes.length).toBe(3);
    });
  });

  describe('Route validation during extraction', () => {
    it('should only extract valid routes with handler functions', async () => {
      const filePath = path.join(__dirname, 'fixtures/cjs-interop/multiple-routes-under-default.cjs');
      
      const routes = await parser.parseRouteFile(filePath);
      
      for (const route of routes) {
        expect(route).toHaveProperty('path');
        expect(route).toHaveProperty('method');
        expect(route).toHaveProperty('handler');
        expect(typeof route.path).toBe('string');
        expect(typeof route.method).toBe('string');
        expect(typeof route.handler).toBe('function');
      }
    });

    it('should validate all routes have valid HTTP methods', async () => {
      const filePath = path.join(__dirname, 'fixtures/cjs-interop/multiple-routes-under-default.cjs');
      
      const routes = await parser.parseRouteFile(filePath);
      
      const validMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
      for (const route of routes) {
        expect(validMethods).toContain(route.method);
      }
    });

    it('should validate all routes have path strings starting with /', async () => {
      const filePath = path.join(__dirname, 'fixtures/cjs-interop/multiple-routes-under-default.cjs');
      
      const routes = await parser.parseRouteFile(filePath);
      
      for (const route of routes) {
        expect(typeof route.path).toBe('string');
        expect(route.path.startsWith('/')).toBe(true);
      }
    });
  });
});
