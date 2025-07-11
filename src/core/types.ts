import { Express, Response } from 'express';
import { TSchema, Static } from '@sinclair/typebox';

export type IsUnknown<T> = T extends unknown ? true : false;
export type IsManyUnknown<T extends any[]> = T extends [infer U, ...infer Rest] ? IsUnknown<U> extends true ? IsManyUnknown<Rest> : false : true;
export type AppendParametersIfNotUnknown<Key extends string, T> = IsUnknown<T> extends true ? {} : { [K in Key]: T };

// Generic route configuration with type safety
export interface RouteConfig<
  TPath extends string,
  TInputQuery extends TSchema,
  TInputBody extends TSchema,
  TInputHeaders extends TSchema,
  TOutputBody extends TSchema,
  TOutputHeaders extends TSchema
> {
  path: TPath;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD';
  inputs: {
    query: TInputQuery;
    body: TInputBody;
    headers: TInputHeaders;
  };
  outputs?: {
    body: TOutputBody;
    headers: TOutputHeaders;
  };
  handler: (
    req:
      IsUnknown<NoInfer<TInputQuery>> extends true ? "query is undefined" :
      IsUnknown<NoInfer<TInputBody>> extends true ? "body is undefined" :
      IsUnknown<NoInfer<TInputHeaders>> extends true ? "headers is undefined" :
      {
        query: Static<NoInfer<TInputQuery>>;
        body: Static<NoInfer<TInputBody>>;
        headers: Static<NoInfer<TInputHeaders>>;
      },
    res: Response
  ) => void | Promise<void>;
}

export interface RouterInterface {
  app: Express;
  loadRoutes(directory: string, pattern: RegExp, options?: {
    prefix?: string;
  }): Promise<void>;
  registerRoute(route: any, prefix?: string): void;
  compile(config: CompilationConfig): Promise<void>;
}

export interface CompilationConfig {
  outputDir: string;
  baseUrl: string;
  name: string;
  routes: {
    directory: string;
    pattern: RegExp;
    options?: {
      prefix?: string;
    }
  }[]
}