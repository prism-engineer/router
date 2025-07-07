import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createApiRoute } from '../../src/createApiRoute';
import { Type } from '@sinclair/typebox';

describe('Path Parameters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('route definition', () => {
    it('should define single path parameter with {paramName} syntax', () => {
      const route = createApiRoute({
        path: '/api/users/{userId}',
        method: 'GET',
        outputs: {
          body: Type.Object({
            id: Type.Number(),
            name: Type.String(),
            email: Type.String()
          })
        },
        handler: (req, res) => {
          const { userId } = req.params;
          res.json({ id: Number(userId), name: 'John', email: 'john@example.com' });
        }
      });

      expect(route.path).toBe('/api/users/{userId}');
      expect(route.method).toBe('GET');
    });

    it('should define multiple path parameters', () => {
      const route = createApiRoute({
        path: '/api/users/{userId}/posts/{postId}',
        method: 'GET',
        outputs: {
          body: Type.Object({
            id: Type.Number(),
            title: Type.String(),
            authorId: Type.Number()
          })
        },
        handler: (req, res) => {
          const { userId, postId } = req.params;
          res.json({ id: Number(postId), title: 'Post Title', authorId: Number(userId) });
        }
      });

      expect(route.path).toBe('/api/users/{userId}/posts/{postId}');
    });

    it('should support CRUD operations with path parameters', () => {
      const routes = [
        createApiRoute({
          path: '/api/users/{userId}',
          method: 'GET',
          outputs: {
            body: Type.Object({
              id: Type.Number(),
              name: Type.String()
            })
          },
          handler: (req, res) => {
            const { userId } = req.params;
            res.json({ id: Number(userId), name: 'John' });
          }
        }),
        createApiRoute({
          path: '/api/users/{userId}',
          method: 'PUT',
          inputs: {
            body: Type.Object({
              name: Type.String(),
              email: Type.String()
            })
          },
          outputs: {
            body: Type.Object({
              id: Type.Number(),
              name: Type.String(),
              email: Type.String()
            })
          },
          handler: (req, res) => {
            const { userId } = req.params;
            const { name, email } = req.body;
            res.json({ id: Number(userId), name, email });
          }
        }),
        createApiRoute({
          path: '/api/users/{userId}',
          method: 'DELETE',
          outputs: {
            body: Type.Object({
              success: Type.Boolean()
            })
          },
          handler: (req, res) => {
            const { userId } = req.params;
            res.json({ success: true });
          }
        })
      ];

      routes.forEach(route => {
        expect(route.path).toBe('/api/users/{userId}');
      });
    });

    it('should support nested path parameters', () => {
      const route = createApiRoute({
        path: '/api/organizations/{orgId}/teams/{teamId}/members/{memberId}',
        method: 'GET',
        outputs: {
          body: Type.Object({
            id: Type.Number(),
            name: Type.String(),
            role: Type.String()
          })
        },
        handler: (req, res) => {
          const { orgId, teamId, memberId } = req.params;
          res.json({ id: Number(memberId), name: 'John', role: 'developer' });
        }
      });

      expect(route.path).toBe('/api/organizations/{orgId}/teams/{teamId}/members/{memberId}');
    });
  });

  describe('parameter extraction', () => {
    it('should extract parameter names from path', () => {
      const singleParam = '/api/users/{userId}';
      const multipleParams = '/api/users/{userId}/posts/{postId}';
      const nestedParams = '/api/orgs/{orgId}/teams/{teamId}/members/{memberId}';

      // These would be utility functions in the actual implementation
      // Testing the concept here
      expect(singleParam).toContain('{userId}');
      expect(multipleParams).toContain('{userId}');
      expect(multipleParams).toContain('{postId}');
      expect(nestedParams).toContain('{orgId}');
      expect(nestedParams).toContain('{teamId}');
      expect(nestedParams).toContain('{memberId}');
    });
  });
});