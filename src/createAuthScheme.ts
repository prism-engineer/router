import express from 'express';

export interface AuthContext {
  user?: any;
  client?: any;
  scopes?: string[];
  [key: string]: any;
}

export type AuthResult<TScheme extends string, TContext> = {
  name: TScheme;
  context: TContext;
};

export interface BaseAuthScheme<TName extends string = string, TAuthContext = any> {
  name: TName;
  validate: (req: express.Request) => Promise<TAuthContext>;
}

type ExtractAuthResult<T> = T extends BaseAuthScheme<infer TName, infer TContext> 
  ? AuthResult<TName, TContext>
  : never;

export type ExtractAuthResultFromSchemes<T> = T extends (infer U)[] 
  ? ExtractAuthResult<U> 
  : ExtractAuthResult<T>;

export function createAuthScheme<T extends BaseAuthScheme<string, any>>(config: T): T {
  return config;
}

export async function validateAuth<T extends BaseAuthScheme<string, any> | BaseAuthScheme<string, any>[]>(
  schemes: T,
  req: express.Request
): Promise<ExtractAuthResultFromSchemes<T>> {
  const schemesToTry = Array.isArray(schemes) ? schemes : [schemes];
  let lastError: any = null;
  
  for (const scheme of schemesToTry) {
    try {
      const authContext = await scheme.validate(req);
      if (authContext) {
        return { name: scheme.name, context: authContext } as ExtractAuthResultFromSchemes<T>;
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