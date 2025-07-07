import { describe, it, expect, vi, beforeEach } from 'vitest';
import { router } from '../../src/router';

describe('Router Core', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should export a router instance', () => {
      expect(router).toBeDefined();
    });

    it('should expose an Express app', () => {
      expect(router.app).toBeDefined();
      expect(typeof router.app).toBe('function');
    });

    it('should have a loadRoutes method', () => {
      expect(router.loadRoutes).toBeDefined();
      expect(typeof router.loadRoutes).toBe('function');
    });

    it('should have a compile method', () => {
      expect(router.compile).toBeDefined();
      expect(typeof router.compile).toBe('function');
    });
  });

  describe('Express app integration', () => {
    it('should allow middleware to be added', () => {
      const middleware = vi.fn();
      expect(() => router.app.use(middleware)).not.toThrow();
    });

    it('should have Express app methods', () => {
      expect(router.app.listen).toBeDefined();
      expect(router.app.use).toBeDefined();
      expect(router.app.get).toBeDefined();
      expect(router.app.post).toBeDefined();
      expect(router.app.put).toBeDefined();
      expect(router.app.delete).toBeDefined();
    });
  });
});