import { Static, TLiteral, TNumber, TObject, TSchema, TString, TUnion, Type } from '@sinclair/typebox';
import { BaseAuthScheme, ExtractAuthResultFromSchemes } from './createAuthScheme.js';

type Expand<T> = T extends infer U ? { [K in keyof U]: U[K] } : never;

type ExtractPathParams<TPath extends string> =
  Expand<TPath extends `${string}{${infer U}}${infer Rest}`
    ? Rest extends `${string}{${string}`
      ? { [K in U]: string } & ExtractPathParams<Rest>
      : { [K in U]: string }
    : {}>;

type IsNever<T> = [T] extends [never] ? true : false;

type JsonContentType = 
  | 'application/json'
  | 'application/vnd.api+json'
  | 'application/ld+json'
  | 'text/json';

type GenericResponseSchema =  {
  [K in number]: (
    {
      contentType: JsonContentType;
      body: TSchema;
    } | {
      contentType: string;
    }
  ) & ({
    headers?: TObject<{ [K in string]: TString | TLiteral<string> | TUnion<(TString | TLiteral<string>)[]> }>
  })
}

type TransformResponseSchemaToOutput<TResponse extends GenericResponseSchema> = Expand<{
  [K in keyof TResponse]: (TResponse[K extends number ? K : never]['contentType'] extends JsonContentType ? {
    status: K extends number ? K : never,
    body: Static<TResponse[K] extends { body: infer TBody } ? TBody extends TSchema ? TBody : never : never>;
  } : {
    status: K extends number ? K : never,
    custom: (res: any) => void;
  }) &  (TResponse[K] extends { headers: infer THeaders } ? {
    headers: Static<THeaders extends TSchema ? THeaders : never>;
  } : {})
}[keyof TResponse]>

export const createApiRoute = <
  TPath extends string,
  TMethod extends 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD',
  TRequestBody extends TSchema | never = never,
  TRequestQuery extends TSchema | never = never,
  TRequestHeaders extends TObject<{ [K in string]: TString | TLiteral<string> | TUnion<(TString | TLiteral<string>)[]> }> | never = never,
  TResponse extends GenericResponseSchema | never = never,
  TAuth extends BaseAuthScheme<string, any> | readonly BaseAuthScheme<string, any>[] | never = never,
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
    auth: IsNever<TAuth> extends true ? never : ExtractAuthResultFromSchemes<TAuth>;
    rawRequest: any;
  }) => Promise<TransformResponseSchemaToOutput<TResponse>>
}) => {
  return config;
}