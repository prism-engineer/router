import { describe, it, expect } from 'vitest';
import { Type } from '@sinclair/typebox';
import { createApiRoute } from '../../src/createApiRoute';
import { createRouter } from '../../src/router';
import express from 'express';

describe('Content Types', () => {
  describe('JSON Content Types', () => {
    it('should handle application/json responses', async () => {
      const route = createApiRoute({
        path: '/json-test',
        method: 'GET',
        response: {
          200: {
            contentType: 'application/json',
            body: Type.Object({
              message: Type.String()
            })
          }
        },
        handler: async () => {
          return { status: 200 as const, body: { message: 'Hello JSON' } };
        }
      });

      expect(route.response?.[200]).toMatchObject({
        contentType: 'application/json',
        body: expect.any(Object)
      });
    });

    it('should handle application/vnd.api+json responses', async () => {
      const route = createApiRoute({
        path: '/api-json-test',
        method: 'GET',
        response: {
          200: {
            contentType: 'application/vnd.api+json',
            body: Type.Object({
              data: Type.Object({
                id: Type.String(),
                type: Type.String()
              })
            })
          }
        },
        handler: async () => {
          return { 
            status: 200 as const, 
            body: { 
              data: { 
                id: '123', 
                type: 'user' 
              } 
            } 
          };
        }
      });

      expect(route.response?.[200]).toMatchObject({
        contentType: 'application/vnd.api+json',
        body: expect.any(Object)
      });
    });

    it('should handle backward compatibility for routes without contentType', async () => {
      const route = createApiRoute({
        path: '/legacy-test',
        method: 'GET',
        response: {
          200: {
            body: Type.Object({
              message: Type.String()
            })
          } as any // TODO: Support backward compatibility for routes without contentType
        },
        handler: async () => {
          return { status: 200 as const, body: { message: 'Legacy response' } };
        }
      });

      expect(route.response?.[200]).toMatchObject({
        body: expect.any(Object)
      });
      expect(route.response?.[200]).not.toHaveProperty('contentType');
    });
  });

  describe('Custom Content Types', () => {
    it('should handle custom content types with custom response handlers', async () => {
      const route = createApiRoute({
        path: '/stream-test',
        method: 'GET',
        response: {
          200: {
            contentType: 'application/octet-stream'
          }
        },
        handler: async () => {
          return { 
            status: 200 as const, 
            custom: (res: express.Response) => {
              res.setHeader('Content-Type', 'application/octet-stream');
              res.setHeader('Content-Disposition', 'attachment; filename="data.bin"');
              res.send(Buffer.from('binary data'));
            }
          };
        }
      });

      expect(route.response?.[200]).toMatchObject({
        contentType: 'application/octet-stream'
      });
      expect(route.response?.[200]).not.toHaveProperty('body');
    });

    it('should handle text/plain responses', async () => {
      const route = createApiRoute({
        path: '/text-test',
        method: 'GET',
        response: {
          200: {
            contentType: 'text/plain'
          }
        },
        handler: async () => {
          return { 
            status: 200 as const, 
            custom: (res: express.Response) => {
              res.setHeader('Content-Type', 'text/plain');
              res.send('Plain text response');
            }
          };
        }
      });

      expect(route.response?.[200]).toMatchObject({
        contentType: 'text/plain'
      });
    });

    it('should handle image content types', async () => {
      const route = createApiRoute({
        path: '/image-test',
        method: 'GET',
        response: {
          200: {
            contentType: 'image/png'
          }
        },
        handler: async () => {
          return { 
            status: 200 as const, 
            custom: (res: express.Response) => {
              res.setHeader('Content-Type', 'image/png');
              res.send(Buffer.from('fake png data'));
            }
          };
        }
      });

      expect(route.response?.[200]).toMatchObject({
        contentType: 'image/png'
      });
    });
  });

  describe('Mixed Content Types', () => {
    it('should handle routes with multiple response types', async () => {
      const route = createApiRoute({
        path: '/mixed-test',
        method: 'GET',
        response: {
          200: {
            contentType: 'application/json',
            body: Type.Object({
              success: Type.Boolean()
            })
          },
          400: {
            contentType: 'application/json',
            body: Type.Object({
              error: Type.String()
            })
          },
          500: {
            contentType: 'text/plain'
          }
        },
        handler: async () => {
          // This would return different responses based on logic
          return { status: 200 as const, body: { success: true } };
        }
      });

      expect(route.response?.[200]).toMatchObject({
        contentType: 'application/json',
        body: expect.any(Object)
      });
      expect(route.response?.[400]).toMatchObject({
        contentType: 'application/json',
        body: expect.any(Object)
      });
      expect(route.response?.[500]).toMatchObject({
        contentType: 'text/plain'
      });
    });
  });

  describe('Headers Support', () => {
    it('should support custom headers with JSON responses', async () => {
      const route = createApiRoute({
        path: '/headers-json-test',
        method: 'GET',
        response: {
          200: {
            contentType: 'application/json',
            body: Type.Object({
              data: Type.String()
            }),
            headers: Type.Object({
              'X-Custom-Header': Type.String(),
              'X-Rate-Limit': Type.String()
            })
          }
        },
        handler: async () => {
          return { status: 200 as const, body: { data: 'test' } };
        }
      });

      expect(route.response?.[200]).toMatchObject({
        contentType: 'application/json',
        body: expect.any(Object),
        headers: expect.any(Object)
      });
    });

    it('should support custom headers with custom content types', async () => {
      const route = createApiRoute({
        path: '/headers-custom-test',
        method: 'GET',
        response: {
          200: {
            contentType: 'application/pdf',
            headers: Type.Object({
              'Content-Disposition': Type.String(),
              'X-File-Size': Type.String()
            })
          }
        },
        handler: async () => {
          return { 
            status: 200 as const, 
            custom: (res: express.Response) => {
              res.setHeader('Content-Type', 'application/pdf');
              res.setHeader('Content-Disposition', 'attachment; filename="document.pdf"');
              res.setHeader('X-File-Size', '1024');
              res.send(Buffer.from('fake pdf data'));
            }
          };
        }
      });

      expect(route.response?.[200]).toMatchObject({
        contentType: 'application/pdf',
        headers: expect.any(Object)
      });
    });
  });

  describe('Type Safety', () => {
    it('should provide correct return types for JSON responses', () => {
      const route = createApiRoute({
        path: '/type-test',
        method: 'POST',
        request: {
          body: Type.Object({
            name: Type.String()
          })
        },
        response: {
          201: {
            contentType: 'application/json',
            body: Type.Object({
              id: Type.Number(),
              name: Type.String()
            })
          }
        },
        handler: async (req) => {
          // Type checking: req.body should have name property
          const name: string = req.body.name;
          
          // Return type should match response schema
          return { 
            status: 201 as const, 
            body: { 
              id: 123, 
              name: name 
            } 
          };
        }
      });

      expect(route).toBeDefined();
    });

    it('should provide correct return types for custom responses', () => {
      const route = createApiRoute({
        path: '/custom-type-test',
        method: 'GET',
        response: {
          200: {
            contentType: 'text/csv'
          }
        },
        handler: async () => {
          // Return type should require custom function
          return { 
            status: 200 as const, 
            custom: (res: express.Response) => {
              res.setHeader('Content-Type', 'text/csv');
              res.send('column1,column2\nvalue1,value2');
            }
          };
        }
      });

      expect(route).toBeDefined();
    });
  });
});