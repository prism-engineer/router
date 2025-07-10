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

export type ExtractAuthResultFromSchemes<T> = T extends readonly (infer U)[] 
  ? U extends BaseAuthScheme<infer TName, infer TContext> 
    ? AuthResult<TName, TContext>
    : never
  : T extends BaseAuthScheme<infer TName, infer TContext>
    ? AuthResult<TName, TContext>
    : never;

export function createAuthScheme<const T extends BaseAuthScheme<string, any>>(config: T): T {
  if(!config.name) {
    throw new Error('name is required');
  }

  if(typeof config.name !== 'string') {
    throw new Error('name must be a string');
  }
  
  if(!config.validate) {
    throw new Error('validate function is required');
  }

  if(typeof config.validate !== 'function') {
    throw new Error('validate function must be a function');
  }
  return config;
}

export async function validateAuth<T extends BaseAuthScheme<string, any> | readonly BaseAuthScheme<string, any>[]>(
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