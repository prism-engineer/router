// Runtime API call function with validation and response parsing
// This function is included in generated clients to handle all API calls

import Ajv from 'ajv';

const ajv = new Ajv.default({ allErrors: true, verbose: true });

interface ApiCallOptions {
  baseUrl: string;
  path: string;
  method: string;
  pathParams?: object;
  query?: any;
  body?: any;
  headers?: object;
  requestSchema?: {
    query?: object; // JSON Schema object
    body?: object;  // JSON Schema object
    headers?: object; // JSON Schema object
  };
  responseSchema?: Record<string, {
    contentType?: string;
    body?: object;  // JSON Schema object
    headers?: object; // JSON Schema object
  }>;
}

export async function makeApiCall(options: ApiCallOptions, interceptors: Function[] = []): Promise<any> {
  const {
    baseUrl,
    path,
    method,
    pathParams = {},
    query,
    body,
    headers = {},
    requestSchema,
    responseSchema
  } = options;

  // Validate path parameters
  for (const [paramName, paramValue] of Object.entries(pathParams)) {
    if (!paramValue) {
      throw new Error(`Path parameter "${paramName}" is required`);
    }
  }

  // Build URL with path parameters
  let url = baseUrl + path;
  for (const [paramName, paramValue] of Object.entries(pathParams)) {
    url = url.replace(`{${paramName}}`, encodeURIComponent(paramValue));
  }

  // Add query parameters
  if (query) {
    const searchParams = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += '?' + queryString;
    }
  }

  // Validate request data against schemas (non-throwing, just log warnings)
  if (requestSchema?.query && query) {
    try {
      const validate = ajv.compile(requestSchema.query);
      const valid = validate(query);
      if (!valid) {
        console.warn('Request query validation failed:', validate.errors);
      }
    } catch (error) {
      console.warn('Request query validation error:', error);
    }
  }

  if (requestSchema?.body && body) {
    try {
      const validate = ajv.compile(requestSchema.body);
      const valid = validate(body);
      if (!valid) {
        console.warn('Request body validation failed:', validate.errors);
      }
    } catch (error) {
      console.warn('Request body validation error:', error);
    }
  }

  if (requestSchema?.headers && headers) {
    try {
      const validate = ajv.compile(requestSchema.headers);
      const valid = validate(headers);
      if (!valid) {
        console.warn('Request headers validation failed:', validate.errors);
      }
    } catch (error) {
      console.warn('Request headers validation error:', error);
    }
  }

  // Build fetch options
  let fetchOptions: RequestInit = {
    method: method.toUpperCase(),
    headers: {
      ...(body && { 'Content-Type': 'application/json' }),
      ...headers
    },
    ...(body && { body: JSON.stringify(body) })
  };

  // Apply async interceptors sequentially, updating fetchOptions
  for (const interceptor of interceptors) {
    const result = await interceptor(fetchOptions);
    if (result !== undefined) {
      fetchOptions = result;
    }
  }

  // Make the request
  const response = await fetch(url, fetchOptions);

  // Check if status code is in the expected response union
  const statusCode = response.status;
  const statusStr = statusCode.toString();
  
  if (responseSchema && !responseSchema[statusStr]) {
    throw new Error(`Unexpected status code: ${statusCode}. Expected one of: ${Object.keys(responseSchema).join(', ')}`);
  }

  // Parse response based on content type
  const contentType = response.headers.get('content-type') || '';
  let responseBody: any;

  if (contentType.includes('application/json') || 
      contentType.includes('application/vnd.api+json') || 
      contentType.includes('application/ld+json') || 
      contentType.includes('text/json')) {
    responseBody = await response.json();
    
    // Validate response body against schema (non-throwing, just log warnings)
    if (responseSchema?.[statusStr]?.body && responseBody) {
      try {
        const validate = ajv.compile(responseSchema[statusStr].body!);
        const valid = validate(responseBody);
        if (!valid) {
          console.warn(`Response body validation failed for status ${statusCode}:`, validate.errors);
        }
      } catch (error) {
        console.warn(`Response body validation error for status ${statusCode}:`, error);
      }
    }
  } else {
    // For non-JSON content types, return the raw response
    responseBody = response;
  }

  // Validate response headers against schema (non-throwing, just log warnings)
  if (responseSchema?.[statusStr]?.headers) {
    try {
      const headersObj = Object.fromEntries(response.headers.entries());
      const validate = ajv.compile(responseSchema[statusStr].headers!);
      const valid = validate(headersObj);
      if (!valid) {
        console.warn(`Response headers validation failed for status ${statusCode}:`, validate.errors);
      }
    } catch (error) {
      console.warn(`Response headers validation error for status ${statusCode}:`, error);
    }
  }

  return {
    status: response.status,
    body: responseBody,
    headers: Object.fromEntries(response.headers.entries())
  };
}