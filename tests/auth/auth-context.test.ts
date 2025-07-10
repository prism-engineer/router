import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createAuthScheme } from '../../src/createAuthScheme';
import { createApiRoute } from '../../src/createApiRoute';
import { Type } from '@sinclair/typebox';

describe('Authentication - Auth Context', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should provide user context structure', () => {
    const authScheme = createAuthScheme({
      name: 'user-context',
      validate: async () => ({
        user: {
          id: '123',
          name: 'John Doe',
          email: 'john@example.com',
          role: 'admin',
          permissions: ['read', 'write', 'delete']
        }
      })
    });

    const route = createApiRoute({
      path: '/api/user-context',
      method: 'GET',
      auth: authScheme,
      response: {
        200: {
          contentType: 'application/json',
          body: Type.Object({
            userId: Type.String(),
            userName: Type.String()
          })
        }
      },
      handler: async (req) => {
        // TypeScript should infer the auth context type
        const userId: string = req.auth.context.user.id;
        const userName: string = req.auth.context.user.name;
        
        return {
          status: 200 as const,
          body: { userId, userName }
        };
      }
    });

    expect(route.auth).toBe(authScheme);
  });

  it('should provide client context structure', () => {
    const authScheme = createAuthScheme({
      name: 'client-context',
      validate: async () => ({
        client: {
          id: 'client-123',
          name: 'Mobile App',
          version: '1.2.3',
          apiKey: 'key-456',
          rateLimit: 1000
        }
      })
    });

    const route = createApiRoute({
      path: '/api/client-context',
      method: 'GET',
      auth: authScheme,
      response: {
        200: {
          contentType: 'application/json',
          body: Type.Object({
            clientId: Type.String(),
            clientName: Type.String()
          })
        }
      },
      handler: async (req) => {
        const clientId: string = req.auth.context.client.id;
        const clientName: string = req.auth.context.client.name;
        
        return {
          status: 200 as const,
          body: { clientId, clientName }
        };
      }
    });

    expect(route.auth).toBe(authScheme);
  });

  it('should provide service context structure', () => {
    const authScheme = createAuthScheme({
      name: 'service-context',
      validate: async () => ({
        service: {
          id: 'service-789',
          name: 'Background Worker',
          type: 'internal',
          permissions: ['system:read', 'system:write'],
          metadata: {
            version: '2.1.0',
            region: 'us-east-1'
          }
        }
      })
    });

    const route = createApiRoute({
      path: '/api/service-context',
      method: 'GET',
      auth: authScheme,
      response: {
        200: {
          contentType: 'application/json',
          body: Type.Object({
            serviceId: Type.String(),
            serviceType: Type.String()
          })
        }
      },
      handler: async (req) => {
        const serviceId: string = req.auth.context.service.id;
        const serviceType: string = req.auth.context.service.type;
        
        return {
          status: 200 as const,
          body: { serviceId, serviceType }
        };
      }
    });

    expect(route.auth).toBe(authScheme);
  });

  it('should provide session context structure', () => {
    const authScheme = createAuthScheme({
      name: 'session-context',
      validate: async () => ({
        session: {
          id: 'session-abc',
          userId: 'user-123',
          expiresAt: new Date('2024-12-31T23:59:59Z'),
          csrfToken: 'csrf-token-xyz',
          metadata: {
            userAgent: 'Mozilla/5.0',
            ip: '192.168.1.1',
            createdAt: new Date('2024-01-01T00:00:00Z')
          }
        }
      })
    });

    const route = createApiRoute({
      path: '/api/session-context',
      method: 'GET',
      auth: authScheme,
      response: {
        200: {
          contentType: 'application/json',
          body: Type.Object({
            sessionId: Type.String(),
            userId: Type.String()
          })
        }
      },
      handler: async (req) => {
        const sessionId: string = req.auth.context.session.id;
        const userId: string = req.auth.context.session.userId;
        
        return {
          status: 200 as const,
          body: { sessionId, userId }
        };
      }
    });

    expect(route.auth).toBe(authScheme);
  });

  it('should provide mixed context structure', () => {
    const authScheme = createAuthScheme({
      name: 'mixed-context',
      validate: async () => ({
        user: {
          id: 'user-123',
          name: 'John Doe'
        },
        client: {
          id: 'client-456',
          name: 'Web App'
        },
        session: {
          id: 'session-789',
          expiresAt: new Date()
        },
        metadata: {
          timestamp: Date.now(),
          ip: '192.168.1.1',
          userAgent: 'Mozilla/5.0'
        }
      })
    });

    const route = createApiRoute({
      path: '/api/mixed-context',
      method: 'GET',
      auth: authScheme,
      response: {
        200: {
          contentType: 'application/json',
          body: Type.Object({
            userId: Type.String(),
            clientId: Type.String(),
            sessionId: Type.String()
          })
        }
      },
      handler: async (req) => {
        const userId: string = req.auth.context.user.id;
        const clientId: string = req.auth.context.client.id;
        const sessionId: string = req.auth.context.session.id;
        
        return {
          status: 200 as const,
          body: { userId, clientId, sessionId }
        };
      }
    });

    expect(route.auth).toBe(authScheme);
  });

  it('should provide typed context with interfaces', () => {
    interface CustomUser {
      id: string;
      email: string;
      role: 'admin' | 'editor' | 'viewer';
      permissions: string[];
      profile: {
        firstName: string;
        lastName: string;
        avatar?: string;
      };
    }

    interface CustomContext {
      user: CustomUser;
      organizationId: string;
      features: string[];
    }

    const authScheme = createAuthScheme({
      name: 'typed-context',
      validate: async (): Promise<CustomContext> => ({
        user: {
          id: 'user-123',
          email: 'john@example.com',
          role: 'admin',
          permissions: ['users:read', 'users:write'],
          profile: {
            firstName: 'John',
            lastName: 'Doe',
            avatar: 'https://example.com/avatar.jpg'
          }
        },
        organizationId: 'org-456',
        features: ['feature-a', 'feature-b']
      })
    });

    const route = createApiRoute({
      path: '/api/typed-context',
      method: 'GET',
      auth: authScheme,
      response: {
        200: {
          contentType: 'application/json',
          body: Type.Object({
            email: Type.String(),
            role: Type.String(),
            organizationId: Type.String()
          })
        }
      },
      handler: async (req) => {
        // TypeScript should provide full type checking
        const email: string = req.auth.context.user.email;
        const role: 'admin' | 'editor' | 'viewer' = req.auth.context.user.role;
        const organizationId: string = req.auth.context.organizationId;
        
        return {
          status: 200 as const,
          body: { email, role, organizationId }
        };
      }
    });

    expect(route.auth).toBe(authScheme);
  });

  it('should provide context with nested objects', () => {
    const authScheme = createAuthScheme({
      name: 'nested-context',
      validate: async () => ({
        user: {
          id: 'user-123',
          profile: {
            personal: {
              firstName: 'John',
              lastName: 'Doe',
              birthDate: '1990-01-01'
            },
            professional: {
              title: 'Senior Developer',
              department: 'Engineering',
              manager: {
                id: 'manager-456',
                name: 'Jane Smith'
              }
            }
          },
          preferences: {
            theme: 'dark',
            language: 'en',
            notifications: {
              email: true,
              push: false,
              sms: true
            }
          }
        }
      })
    });

    const route = createApiRoute({
      path: '/api/nested-context',
      method: 'GET',
      auth: authScheme,
      response: {
        200: {
          contentType: 'application/json',
          body: Type.Object({
            firstName: Type.String(),
            title: Type.String(),
            theme: Type.String()
          })
        }
      },
      handler: async (req) => {
        const firstName: string = req.auth.context.user.profile.personal.firstName;
        const title: string = req.auth.context.user.profile.professional.title;
        const theme: string = req.auth.context.user.preferences.theme;
        
        return {
          status: 200 as const,
          body: { firstName, title, theme }
        };
      }
    });

    expect(route.auth).toBe(authScheme);
  });

  it('should provide context with arrays and collections', () => {
    const authScheme = createAuthScheme({
      name: 'collections-context',
      validate: async () => ({
        user: {
          id: 'user-123',
          roles: ['admin', 'editor'],
          permissions: [
            { resource: 'users', actions: ['read', 'write'] },
            { resource: 'posts', actions: ['read', 'write', 'delete'] }
          ],
          groups: [
            { id: 'group-1', name: 'Administrators' },
            { id: 'group-2', name: 'Content Editors' }
          ],
          tags: ['vip', 'beta-tester'],
          metadata: new Map<string, string | number>([
            ['lastLogin', '2024-01-01T12:00:00Z'],
            ['loginCount', 42]
          ])
        }
      })
    });

    const route = createApiRoute({
      path: '/api/collections-context',
      method: 'GET',
      auth: authScheme,
      response: {
        200: {
          contentType: 'application/json',
          body: Type.Object({
            rolesCount: Type.Number(),
            permissionsCount: Type.Number(),
            hasVipTag: Type.Boolean()
          })
        }
      },
      handler: async (req) => {
        const rolesCount: number = req.auth.context.user.roles.length;
        const permissionsCount: number = req.auth.context.user.permissions.length;
        const hasVipTag: boolean = req.auth.context.user.tags.includes('vip');
        
        return {
          status: 200 as const,
          body: { rolesCount, permissionsCount, hasVipTag }
        };
      }
    });

    expect(route.auth).toBe(authScheme);
  });

  it('should provide context with optional properties', () => {
    const authScheme = createAuthScheme({
      name: 'optional-context',
      validate: async () => ({
        user: {
          id: 'user-123',
          email: 'john@example.com',
          name: 'John Doe',
          avatar: undefined,
          phoneNumber: '555-1234',
          bio: null,
          settings: {
            theme: 'dark',
            language: 'en',
            timezone: 'UTC'
          }
        }
      })
    });

    const route = createApiRoute({
      path: '/api/optional-context',
      method: 'GET',
      auth: authScheme,
      response: {
        200: {
          contentType: 'application/json',
          body: Type.Object({
            hasName: Type.Boolean(),
            hasPhone: Type.Boolean(),
            language: Type.String()
          })
        }
      },
      handler: async (req) => {
        const hasName: boolean = !!req.auth.context.user.name;
        const hasPhone: boolean = !!req.auth.context.user.phoneNumber;
        const language: string = req.auth.context.user.settings.language || 'unknown';
        
        return {
          status: 200 as const,
          body: { hasName, hasPhone, language }
        };
      }
    });

    expect(route.auth).toBe(authScheme);
  });

  it('should provide context with generic types', () => {
    interface AuthContext<T = any> {
      user: {
        id: string;
        data: T;
      };
    }

    const authScheme = createAuthScheme({
      name: 'generic-context',
      validate: async (): Promise<AuthContext<{ preferences: object; stats: object }>> => ({
        user: {
          id: 'user-123',
          data: {
            preferences: {
              theme: 'dark',
              language: 'en'
            },
            stats: {
              loginCount: 42,
              lastActive: '2024-01-01'
            }
          }
        }
      })
    });

    const route = createApiRoute({
      path: '/api/generic-context',
      method: 'GET',
      auth: authScheme,
      response: {
        200: {
          contentType: 'application/json',
          body: Type.Object({
            userId: Type.String(),
            hasData: Type.Boolean()
          })
        }
      },
      handler: async (req) => {
        const userId: string = req.auth.context.user.id;
        const hasData: boolean = !!req.auth.context.user.data;
        
        return {
          status: 200 as const,
          body: { userId, hasData }
        };
      }
    });

    expect(route.auth).toBe(authScheme);
  });

  it('should provide context with computed properties', () => {
    const authScheme = createAuthScheme({
      name: 'computed-context',
      validate: async () => {
        const baseUser = {
          id: 'user-123',
          firstName: 'John',
          lastName: 'Doe',
          permissions: ['read', 'write']
        };

        return {
          user: {
            ...baseUser,
            get fullName() {
              return `${baseUser.firstName} ${baseUser.lastName}`;
            },
            get isAdmin() {
              return baseUser.permissions.includes('admin');
            },
            get canWrite() {
              return baseUser.permissions.includes('write');
            }
          }
        };
      }
    });

    const route = createApiRoute({
      path: '/api/computed-context',
      method: 'GET',
      auth: authScheme,
      response: {
        200: {
          contentType: 'application/json',
          body: Type.Object({
            fullName: Type.String(),
            canWrite: Type.Boolean()
          })
        }
      },
      handler: async (req) => {
        const fullName: string = req.auth.context.user.fullName;
        const canWrite: boolean = req.auth.context.user.canWrite;
        
        return {
          status: 200 as const,
          body: { fullName, canWrite }
        };
      }
    });

    expect(route.auth).toBe(authScheme);
  });

  it('should provide context with validation metadata', () => {
    const authScheme = createAuthScheme({
      name: 'validation-metadata',
      validate: async (req) => ({
        user: {
          id: 'user-123',
          email: 'john@example.com'
        },
        validation: {
          method: 'bearer-token',
          timestamp: Date.now(),
          ip: req.ip || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown',
          secure: req.headers['x-forwarded-proto'] === 'https',
          source: 'api-gateway'
        }
      })
    });

    const route = createApiRoute({
      path: '/api/validation-metadata',
      method: 'GET',
      auth: authScheme,
      response: {
        200: {
          contentType: 'application/json',
          body: Type.Object({
            userId: Type.String(),
            validationMethod: Type.String(),
            isSecure: Type.Boolean()
          })
        }
      },
      handler: async (req) => {
        const userId: string = req.auth.context.user.id;
        const validationMethod: string = req.auth.context.validation.method;
        const isSecure: boolean = req.auth.context.validation.secure;
        
        return {
          status: 200 as const,
          body: { userId, validationMethod, isSecure }
        };
      }
    });

    expect(route.auth).toBe(authScheme);
  });

  it('should provide context with organization hierarchy', () => {
    const authScheme = createAuthScheme({
      name: 'organization-context',
      validate: async () => ({
        user: {
          id: 'user-123',
          email: 'john@acme.com'
        },
        organization: {
          id: 'org-456',
          name: 'ACME Corp',
          tier: 'enterprise',
          features: ['sso', 'audit-logs', 'custom-roles'],
          hierarchy: {
            department: {
              id: 'dept-789',
              name: 'Engineering'
            },
            team: {
              id: 'team-012',
              name: 'Backend Team'
            },
            role: {
              id: 'role-345',
              name: 'Senior Developer',
              level: 5
            }
          }
        }
      })
    });

    const route = createApiRoute({
      path: '/api/organization-context',
      method: 'GET',
      auth: authScheme,
      response: {
        200: {
          contentType: 'application/json',
          body: Type.Object({
            orgName: Type.String(),
            department: Type.String(),
            roleLevel: Type.Number()
          })
        }
      },
      handler: async (req) => {
        const orgName: string = req.auth.context.organization.name;
        const department: string = req.auth.context.organization.hierarchy.department.name;
        const roleLevel: number = req.auth.context.organization.hierarchy.role.level;
        
        return {
          status: 200 as const,
          body: { orgName, department, roleLevel }
        };
      }
    });

    expect(route.auth).toBe(authScheme);
  });

  it('should handle context with type guards', () => {
    const authScheme = createAuthScheme({
      name: 'type-guards',
      validate: async () => ({
        entity: {
          type: 'user' as const,
          id: 'user-123',
          name: 'John Doe'
        }
      })
    });

    const route = createApiRoute({
      path: '/api/type-guards',
      method: 'GET',
      auth: authScheme,
      response: {
        200: {
          contentType: 'application/json',
          body: Type.Object({
            entityType: Type.String(),
            entityName: Type.String()
          })
        }
      },
      handler: async (req) => {
        const entity = req.auth.context.entity;
        
        // Type guard usage
        if (entity.type === 'user') {
          const entityType: string = entity.type;
          const entityName: string = entity.name;
          
          return {
            status: 200 as const,
            body: { entityType, entityName }
          };
        }
        
        return {
          status: 200 as const,
          body: { entityType: 'unknown', entityName: 'unknown' }
        };
      }
    });

    expect(route.auth).toBe(authScheme);
  });
});