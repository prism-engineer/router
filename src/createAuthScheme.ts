import express from 'express';

export interface AuthContext {
  user?: any;
  client?: any;
  scopes?: string[];
  [key: string]: any;
}

export interface BaseAuthScheme {
  type: string;
  validate: (value: string) => Promise<AuthContext>;
}

export interface BearerAuthScheme extends BaseAuthScheme {
  type: 'bearer';
}

export interface ApiKeyAuthScheme extends BaseAuthScheme {
  type: 'apiKey';
  in: 'header' | 'query';
  name: string;
}

export interface CustomAuthScheme extends BaseAuthScheme {
  type: 'custom';
  extract: (req: express.Request) => string | undefined;
}

export type AuthScheme = BearerAuthScheme | ApiKeyAuthScheme | CustomAuthScheme;

export function createAuthScheme<T extends AuthScheme>(config: T): T {
  return config;
}

export function extractAuthValue(scheme: AuthScheme, req: express.Request): string | undefined {
  switch (scheme.type) {
    case 'bearer':
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7);
      }
      return undefined;

    case 'apiKey':
      if (scheme.in === 'header') {
        return req.headers[scheme.name] as string;
      } else if (scheme.in === 'query') {
        return req.query[scheme.name] as string;
      }
      return undefined;

    case 'custom':
      return scheme.extract(req);

    default:
      return undefined;
  }
}

export async function validateAuth(
  schemes: AuthScheme | AuthScheme[], 
  req: express.Request
): Promise<AuthContext> {
  const schemesToTry = Array.isArray(schemes) ? schemes : [schemes];
  let lastError: any = null;
  
  for (const scheme of schemesToTry) {
    try {
      const value = extractAuthValue(scheme, req);
      if (value) {
        const authContext = await scheme.validate(value);
        return authContext;
      }
    } catch (error) {
      lastError = error;
      // Continue to next scheme if this one fails
      continue;
    }
  }
  
  // If we have an error from validation, throw that; otherwise throw generic message
  if (lastError) {
    throw lastError;
  }
  throw new Error('Authentication failed');
}