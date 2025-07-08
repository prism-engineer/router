import { Static, TLiteral, TNumber, TObject, TSchema, TString, TUnion, Type } from '@sinclair/typebox';
import { RouteConfig } from './core/types';
import { AuthScheme, AuthContext } from './createAuthScheme';

type Expand<T> = T extends infer U ? { [K in keyof U]: U[K] } : never;

type ExtractPathParams<TPath extends string> =
  Expand<TPath extends `${string}{${infer U}}${infer Rest}`
    ? Rest extends `${string}{${string}`
      ? { [K in U]: string } & ExtractPathParams<Rest>
      : { [K in U]: string }
    : {}>;

type IsNever<T> = [T] extends [never] ? true : false;

type HandlerOutput<TResponse extends GenericResponseSchema> = {
  [K in keyof TResponse]: {
    status: K extends number ? K : never;
  } & (TResponse[K] extends { body: infer TBody } 
    ? TBody extends TSchema 
      ? { body: Static<TBody> }
      : {}
    : {}) & (TResponse[K] extends { headers: infer THeaders } 
    ? THeaders extends TSchema 
      ? { headers: Static<THeaders> }
      : {}
    : {})
}[keyof TResponse]

type HandlerReturnType<TResponse extends GenericResponseSchema | never> =
  IsNever<TResponse> extends true ? Promise<void> :
    Promise<HandlerOutput<TResponse extends GenericResponseSchema ? TResponse : never>>;

type GenericResponseSchema = {
  [K in number]: {
    body: TSchema;
    headers?: TObject<{ [K in string]: TString }>;
  }
};

export type CreateApiRoute = <
  TPath extends string,
  TMethod extends 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD',
  TRequestBody extends TSchema | never = never,
  TRequestQuery extends TSchema | never = never,
  TRequestHeaders extends TObject<{ [K in string]: TString | TLiteral<string> | TUnion<(TString | TLiteral<string>)[]> }> | never = never,
  TResponse extends GenericResponseSchema | never = never,
  TAuth extends AuthScheme | AuthScheme[] | never = never
>(config: {
  path: TPath;
  method: TMethod;
  request?: {
    body?: TRequestBody;
    query?: TRequestQuery;
    headers?: TRequestHeaders;
  };
  response?: TResponse,
  auth?: TAuth;
  handler: (req: {
    body: IsNever<TRequestBody> extends true ? {} : Static<TRequestBody>;
    query: IsNever<TRequestQuery> extends true ? {} : Static<TRequestQuery>;
    headers: IsNever<TRequestHeaders> extends true ? {} : Static<TRequestHeaders>;
    params: ExtractPathParams<TPath>;
    auth: IsNever<TAuth> extends true ? never : AuthContext;
  }) => HandlerReturnType<TResponse>
}) => {
  path: TPath;
  method: TMethod;
  request?: {
    body?: TRequestBody;
    query?: TRequestQuery;
    headers?: TRequestHeaders;
  };
  response?: TResponse,
  auth?: TAuth;
  handler: (req: {
    body: IsNever<TRequestBody> extends true ? {} : Static<TRequestBody>;
    query: IsNever<TRequestQuery> extends true ? {} : Static<TRequestQuery>;
    headers: IsNever<TRequestHeaders> extends true ? {} : Static<TRequestHeaders>;
    params: ExtractPathParams<TPath>;
    auth: IsNever<TAuth> extends true ? never : AuthContext;
  }) => HandlerReturnType<TResponse>
};

export const createApiRoute: CreateApiRoute = (config) => {
  return config;
}