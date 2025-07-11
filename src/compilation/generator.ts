import { TSchema } from '@sinclair/typebox';
import { compile } from 'json-schema-to-typescript'

export interface ClientGenerator {
  generateClient(options: {
    name: string;
    baseUrl: string;
  }, routes: any[]): Promise<string>;
}

export const createTypeScriptClientGenerator = (): ClientGenerator => ({
  async generateClient(options: {
    name: string;
    baseUrl: string;
  }, routes: any[]): Promise<string> {
    if (routes.length === 0) {
      throw new Error('No routes found');
    }

    return await generateTypeSafeClient(options, routes);
  }
});

// Type extraction functions
export async function extractTypeFromSchema(schema: TSchema, typeName: string = 'S'): Promise<string> {
  const source = await compile(schema, typeName, {
    style: {
      unionType: 'type',
    },
    additionalProperties: false,
  });

  return source
}

// Generate consistent route key
function generateRouteKey(route: any): string {
  // Convert path to camelCase-like format: /agents/all -> AgentsAll, /agents/{id} -> AgentsId
  const pathParts = route.path.replace(/^\//, '').split('/').filter((part: string) => part.length > 0);
  const cleanPath = pathParts.map((part: string) => {
    // Handle path parameters like {id} -> Id
    if (part.startsWith('{') && part.endsWith('}')) {
      const paramName = part.slice(1, -1);
      return paramName.charAt(0).toUpperCase() + paramName.slice(1);
    }
    // Convert kebab-case to PascalCase
    return part.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('');
  }).join('');
  
  return `${route.method.toUpperCase()}_${cleanPath}`;
}

// Generate all types first with proper names
async function generateAllTypes(routes: any[]): Promise<{ types: string[]; typeMap: Map<string, string>; schemaMap: Map<string, any> }> {
  const types: string[] = [];
  const typeMap = new Map<string, string>();
  const schemaMap = new Map<string, any>(); // Store original JSON schemas
  const seenTypes = new Set<string>(); // Track seen types to avoid duplicates

  for (const route of routes) {
    const routeKey = generateRouteKey(route);
    
    // Generate request types and store schemas
    if (route.request?.query) {
      const typeName = `${routeKey}_Query`;
      if (!seenTypes.has(typeName)) {
        const typeDefinition = await extractTypeFromSchema(route.request.query, typeName);
        types.push(typeDefinition);
        seenTypes.add(typeName);
      }
      typeMap.set(`${routeKey}_query`, typeName);
      schemaMap.set(`${routeKey}_query_schema`, route.request.query);
    }
    
    if (route.request?.body) {
      const typeName = `${routeKey}_Body`;
      if (!seenTypes.has(typeName)) {
        const typeDefinition = await extractTypeFromSchema(route.request.body, typeName);
        types.push(typeDefinition);
        seenTypes.add(typeName);
      }
      typeMap.set(`${routeKey}_body`, typeName);
      schemaMap.set(`${routeKey}_body_schema`, route.request.body);
    }
    
    if (route.request?.headers) {
      const typeName = `${routeKey}_Headers`;
      if (!seenTypes.has(typeName)) {
        const typeDefinition = await extractTypeFromSchema(route.request.headers, typeName);
        types.push(typeDefinition);
        seenTypes.add(typeName);
      }
      typeMap.set(`${routeKey}_headers`, typeName);
      schemaMap.set(`${routeKey}_headers_schema`, route.request.headers);
    }
    
    // Generate response types and store schemas
    if (route.response) {
      for (const [statusCode, responseSchema] of Object.entries(route.response as Record<string, any>)) {
        if (responseSchema.body && (responseSchema.contentType ? isJsonContentType(responseSchema.contentType) : true)) {
          const typeName = `${routeKey}_Response${statusCode}`;
          if (!seenTypes.has(typeName)) {
            const typeDefinition = await extractTypeFromSchema(responseSchema.body, typeName);
            types.push(typeDefinition);
            seenTypes.add(typeName);
          }
          typeMap.set(`${routeKey}_response_${statusCode}`, typeName);
          schemaMap.set(`${routeKey}_response_${statusCode}_schema`, responseSchema.body);
        }
        
        if (responseSchema.headers) {
          const typeName = `${routeKey}_ResponseHeaders${statusCode}`;
          if (!seenTypes.has(typeName)) {
            const typeDefinition = await extractTypeFromSchema(responseSchema.headers, typeName);
            types.push(typeDefinition);
            seenTypes.add(typeName);
          }
          typeMap.set(`${routeKey}_response_headers_${statusCode}`, typeName);
          schemaMap.set(`${routeKey}_response_headers_${statusCode}_schema`, responseSchema.headers);
        }
      }
    }
  }
  
  return { types, typeMap, schemaMap };
}

function getRequestTypes(route: any, typeMap: Map<string, string>): { query?: string, body?: string, headers?: string } {
  const routeKey = generateRouteKey(route);
  
  return {
    query: typeMap.get(`${routeKey}_query`),
    body: typeMap.get(`${routeKey}_body`),
    headers: typeMap.get(`${routeKey}_headers`)
  };
}

// JSON-like content types that support TypeBox schemas
const JSON_CONTENT_TYPES = [
  'application/json',
  'application/vnd.api+json',
  'application/ld+json',
  'text/json'
];

function isJsonContentType(contentType: string): boolean {
  return JSON_CONTENT_TYPES.includes(contentType);
}

function getResponseUnion(route: any, typeMap: Map<string, string>): string {
  if (!route.response || Object.keys(route.response).length === 0) {
    return '{ status: number; body: any; headers: Record<string, string> }';
  }

  const responseTypes: string[] = [];
  const routeKey = generateRouteKey(route);

  for (const [statusCode] of Object.entries(route.response as Record<string, any>)) {
    let bodyType = 'any';
    let headersType = 'Record<string, string>';

    // Check if we have a generated body type
    const bodyTypeName = typeMap.get(`${routeKey}_response_${statusCode}`);
    if (bodyTypeName) {
      bodyType = bodyTypeName;
    }

    // Check if we have a generated headers type
    const headersTypeName = typeMap.get(`${routeKey}_response_headers_${statusCode}`);
    if (headersTypeName) {
      headersType = headersTypeName;
    }

    // Create discriminated union member
    responseTypes.push(`{ status: ${statusCode}; body: ${bodyType}; headers: ${headersType} }`);
  }

  return responseTypes.join(' | ');
}

function extractPathParams(path: string): string[] {
  const matches = path.match(/{([^}]+)}/g);
  return matches ? matches.map(match => match.slice(1, -1)) : [];
}

function generateMethodImplementation(route: any, typeMap: Map<string, string>, schemaMap: Map<string, any>): string {
  const pathParams = extractPathParams(route.path);
  const requestTypes = getRequestTypes(route, typeMap);
  const responseUnion = getResponseUnion(route, typeMap);
  const method = route.method.toLowerCase();
  const routeKey = generateRouteKey(route);

  // Build parameter list
  const params: string[] = [];

  // Add path parameters first (all as strings)
  pathParams.forEach(param => {
    params.push(`${param}: string`);
  });

  // Build options object type
  const optionsParts: string[] = [];
  if (requestTypes.query) {
    optionsParts.push(`query?: ${requestTypes.query}`);
  }
  if (requestTypes.body) {
    optionsParts.push(`body: ${requestTypes.body}`);
  }
  if (requestTypes.headers) {
    optionsParts.push(`headers?: ${requestTypes.headers}`);
  }

  // Add options parameter if needed
  if (optionsParts.length > 0) {
    const isOptional = !requestTypes.body; // Required if body is present
    const optionalMarker = isOptional ? '?' : '';
    params.push(`options${optionalMarker}: { ${optionsParts.join('; ')} }`);
  } else if (pathParams.length === 0) {
    // No path params and no options - add optional empty options
    params.push('options?: {}');
  }

  // Generate method implementation using makeApiCall
  let implementation = 
    `${method}: async (
      ${params.join(',\n      ')}
    ): Promise<
      ${responseUnion}
    > => {
      return makeApiCall({
        baseUrl,
        path: '${route.path}',
        method: '${route.method.toUpperCase()}',`;

  // Add path parameters
  if (pathParams.length > 0) {
    implementation += `\n        pathParams: { ${pathParams.map(param => `${param}`).join(', ')} },`;
  }

  // Add request options
  if (requestTypes.query) {
    implementation += `\n        query: options?.query,`;
  }
  if (requestTypes.body) {
    implementation += `\n        body: options.body,`;
  }
  if (requestTypes.headers) {
    implementation += `\n        headers: options?.headers,`;
  }

  // Build request schemas
  const requestSchemas: string[] = [];
  if (schemaMap.has(`${routeKey}_query_schema`)) {
    requestSchemas.push(`query: ${JSON.stringify(schemaMap.get(`${routeKey}_query_schema`))}`);
  }
  if (schemaMap.has(`${routeKey}_body_schema`)) {
    requestSchemas.push(`body: ${JSON.stringify(schemaMap.get(`${routeKey}_body_schema`))}`);
  }
  if (schemaMap.has(`${routeKey}_headers_schema`)) {
    requestSchemas.push(`headers: ${JSON.stringify(schemaMap.get(`${routeKey}_headers_schema`))}`);
  }

  implementation += `\n        requestSchema: {${requestSchemas.length > 0 ? '\n          ' + requestSchemas.join(',\n          ') + '\n        ' : ''}},`;

  // Build response schemas
  const responseSchemas: string[] = [];
  if (route.response) {
    for (const [statusCode] of Object.entries(route.response as Record<string, any>)) {
      const bodySchema = schemaMap.get(`${routeKey}_response_${statusCode}_schema`);
      const headersSchema = schemaMap.get(`${routeKey}_response_headers_${statusCode}_schema`);
      
      const statusSchemas: string[] = [];
      if (bodySchema) {
        statusSchemas.push(`body: ${JSON.stringify(bodySchema)}`);
      }
      if (headersSchema) {
        statusSchemas.push(`headers: ${JSON.stringify(headersSchema)}`);
      }
      
      if (statusSchemas.length > 0) {
        responseSchemas.push(`'${statusCode}': {\n            ${statusSchemas.join(',\n            ')}\n          }`);
      }
    }
  }

  implementation += `\n        responseSchema: {${responseSchemas.length > 0 ? '\n          ' + responseSchemas.join(',\n          ') + '\n        ' : ''}}`;

  // Pass interceptors as the second argument to makeApiCall
  implementation += `\n      }, interceptors) as unknown as Promise<${responseUnion}>;\n    }`;

  return implementation;
}

// Type-safe client generation
async function generateTypeSafeClient(options: {
  name: string;
  baseUrl: string;
}, routes: any[]): Promise<string> {
  const { name, baseUrl } = options;
  
  // Generate all types first
  const { types, typeMap, schemaMap } = await generateAllTypes(routes);
  
  let clientCode = '';
  
  // Add type imports and generated types
  clientCode += `// Generated API client\n`;
  clientCode += `// This file is auto-generated. Do not edit manually.\n\n`;
  clientCode += `import { makeApiCall } from '@prism-engineer/router/dist/compilation/makeApiCall';\n\n`;
  
  // Add all type definitions
  if (types.length > 0) {
    clientCode += types.join('\n\n') + '\n\n';
  }

  const interceptorsType = `
    type Interceptors = ((request: any) => any)[];
  `;

  clientCode += interceptorsType;
  
  // Start with client factory function with real implementation
  clientCode += `export const create${name} = (baseUrl: string = '${baseUrl || ''}', interceptors: Interceptors = []) => {\n`;
  clientCode += `  return {\n`;
  clientCode += `    api: {\n`;
  
  // Generate actual method implementations
  const apiStructure = buildTypeSafeApiStructure(routes, typeMap, schemaMap);
  clientCode += apiStructure;
  
  clientCode += `    }\n`;
  clientCode += `  };\n`;
  clientCode += `};\n`;
  
  return clientCode;
}

function buildTypeSafeApiStructure(routes: any[], typeMap: Map<string, string>, schemaMap: Map<string, any>): string {
  const structure: { [key: string]: any } = {};
  
  // Group routes by path structure
  for (const route of routes) {
    const pathParts = route.path.replace(/^\//, '').split('/').filter((part: string) => part.length > 0);
    let current = structure;
    
    for (let i = 0; i < pathParts.length; i++) {
      const part = pathParts[i];
      const cleanPart = part.startsWith('{') && part.endsWith('}') 
        ? `_${part.slice(1, -1)}_` 
        : part;
      
      if (i === pathParts.length - 1) {
        // Last segment - add method signature
        if (!current[cleanPart]) {
          current[cleanPart] = {};
        }
        
        const methodImplementation = generateMethodImplementation(route, typeMap, schemaMap);
        current[cleanPart][route.method.toLowerCase()] = methodImplementation;
      } else {
        // Intermediate segment
        if (!current[cleanPart]) {
          current[cleanPart] = {};
        }
        current = current[cleanPart];
      }
    }
  }
  
  return generateApiStructureCode(structure, '      ');
}

// Helper function to determine if a property name needs quotes
function needsQuotes(key: string): boolean {
  // Check if the key is a valid JavaScript identifier
  // Valid identifiers must start with a letter, underscore, or dollar sign
  // and can contain letters, numbers, underscores, or dollar signs
  return !/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key);
}

// Helper function to format property name with quotes if needed
function formatPropertyName(key: string): string {
  return needsQuotes(key) ? `'${key}'` : key;
}

function generateApiStructureCode(structure: any, indent: string): string {
  let code = '';
  
  for (const [key, value] of Object.entries(structure)) {
    if (typeof value === 'object' && value !== null) {
      const valueObj = value as any;
      const methods = Object.keys(valueObj).filter(k => typeof valueObj[k] === 'string');
      const nestedStructures = Object.keys(valueObj).filter(k => typeof valueObj[k] === 'object' && valueObj[k] !== null);
      
      if (methods.length > 0 || nestedStructures.length > 0) {
        // This has method implementations and/or nested structures
        code += `${indent}${formatPropertyName(key)}: {\n`;
        
        // Add methods first
        for (const method of methods) {
          // The method code is already properly formatted
          code += `${indent}  ${valueObj[method]},\n`;
        }
        
        // Add nested structures
        for (const nestedKey of nestedStructures) {
          const nestedStructure = { [nestedKey]: valueObj[nestedKey] };
          code += generateApiStructureCode(nestedStructure, indent + '  ');
        }
        
        code += `${indent}},\n`;
      }
    }
  }
  
  return code;
}