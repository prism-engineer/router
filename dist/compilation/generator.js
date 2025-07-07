"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTypeScriptClientGenerator = void 0;
exports.extractTypeFromSchema = extractTypeFromSchema;
const json_schema_to_typescript_1 = require("json-schema-to-typescript");
const createTypeScriptClientGenerator = () => ({
    async generateClient(config, routes) {
        if (routes.length === 0) {
            throw new Error('No routes found');
        }
        return await generateTypeSafeClient(config, routes);
    }
});
exports.createTypeScriptClientGenerator = createTypeScriptClientGenerator;
// Type extraction functions
async function extractTypeFromSchema(schema, typeName = 'S') {
    const source = await (0, json_schema_to_typescript_1.compile)(schema, typeName, {
        style: {
            unionType: 'type',
        },
        additionalProperties: false,
    });
    return source;
}
async function extractRequestTypes(route) {
    const result = {};
    // Extract query parameters type
    if (route.request?.query) {
        const queryType = await extractTypeFromSchema(route.request.query, 'QueryType');
        // Extract just the type definition, remove the interface wrapper
        const typeMatch = queryType.match(/export interface QueryType \{([^}]*)\}/s);
        if (typeMatch) {
            result.query = `{ ${typeMatch[1].trim()} }`;
        }
    }
    // Extract request body type  
    if (route.request?.body) {
        const bodyType = await extractTypeFromSchema(route.request.body, 'BodyType');
        const typeMatch = bodyType.match(/export interface BodyType \{([^}]*)\}/s);
        if (typeMatch) {
            result.body = `{ ${typeMatch[1].trim()} }`;
        }
    }
    // Extract request headers type
    if (route.request?.headers) {
        const headersType = await extractTypeFromSchema(route.request.headers, 'HeadersType');
        const typeMatch = headersType.match(/export interface HeadersType \{([^}]*)\}/s);
        if (typeMatch) {
            result.headers = `{ ${typeMatch[1].trim()} }`;
        }
    }
    return result;
}
async function extractResponseUnion(route) {
    if (!route.response || Object.keys(route.response).length === 0) {
        return '{ status: number; body: any; headers: Record<string, string> }';
    }
    const responseTypes = [];
    for (const [statusCode, responseSchema] of Object.entries(route.response)) {
        let bodyType = 'any';
        let headersType = 'Record<string, string>';
        // Extract body type if defined
        if (responseSchema.body) {
            const bodyTypeCode = await extractTypeFromSchema(responseSchema.body, `Response${statusCode}Body`);
            const typeMatch = bodyTypeCode.match(/export interface Response\d+Body \{([^}]*)\}/s);
            if (typeMatch) {
                bodyType = `{ ${typeMatch[1].trim()} }`;
            }
        }
        // Extract headers type if defined
        if (responseSchema.headers) {
            const headersTypeCode = await extractTypeFromSchema(responseSchema.headers, `Response${statusCode}Headers`);
            const typeMatch = headersTypeCode.match(/export interface Response\d+Headers \{([^}]*)\}/s);
            if (typeMatch) {
                headersType = `{ ${typeMatch[1].trim()} }`;
            }
        }
        // Create discriminated union member
        responseTypes.push(`{ status: ${statusCode}; body: ${bodyType}; headers: ${headersType} }`);
    }
    return responseTypes.join(' | ');
}
function extractPathParams(path) {
    const matches = path.match(/{([^}]+)}/g);
    return matches ? matches.map(match => match.slice(1, -1)) : [];
}
async function generateMethodImplementation(route) {
    const pathParams = extractPathParams(route.path);
    const requestTypes = await extractRequestTypes(route);
    const responseUnion = await extractResponseUnion(route);
    const method = route.method.toLowerCase();
    const httpMethod = route.method.toUpperCase();
    // Build parameter list
    const params = [];
    // Add path parameters first (all as strings)
    pathParams.forEach(param => {
        params.push(`${param}: string`);
    });
    // Build options object type
    const optionsParts = [];
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
    }
    else if (pathParams.length === 0) {
        // No path params and no options - add optional empty options
        params.push('options?: {}');
    }
    // Generate method implementation
    let implementation = `${method}: async (${params.join(', ')}) => {\n`;
    // Build URL with path parameters
    let urlPath = route.path;
    pathParams.forEach(param => {
        implementation += `      if (!${param}) throw new Error('Path parameter "${param}" is required');\n`;
        urlPath = urlPath.replace(`{${param}}`, `\${${param}}`);
    });
    implementation += `      let url = \`\${baseUrl}${urlPath}\`;\n`;
    // Add query parameters
    if (requestTypes.query) {
        implementation += `      if (options?.query) {\n`;
        implementation += `        const searchParams = new URLSearchParams();\n`;
        implementation += `        Object.entries(options.query).forEach(([key, value]) => {\n`;
        implementation += `          if (value !== undefined && value !== null) {\n`;
        implementation += `            searchParams.append(key, String(value));\n`;
        implementation += `          }\n`;
        implementation += `        });\n`;
        implementation += `        const queryString = searchParams.toString();\n`;
        implementation += `        if (queryString) url += '?' + queryString;\n`;
        implementation += `      }\n`;
    }
    // Build fetch options
    implementation += `      const fetchOptions: RequestInit = {\n`;
    implementation += `        method: '${httpMethod}',\n`;
    implementation += `        headers: {\n`;
    if (requestTypes.body) {
        implementation += `          'Content-Type': 'application/json',\n`;
    }
    if (requestTypes.headers) {
        implementation += `          ...options?.headers,\n`;
    }
    else {
        implementation += `          ...({} as any),\n`;
    }
    implementation += `        },\n`;
    if (requestTypes.body) {
        implementation += `        body: JSON.stringify(options.body),\n`;
    }
    implementation += `      };\n`;
    // Make request and handle response
    implementation += `      const response = await fetch(url, fetchOptions);\n`;
    implementation += `      const responseBody = await response.json();\n`;
    implementation += `      return {\n`;
    implementation += `        status: response.status as any,\n`;
    implementation += `        body: responseBody,\n`;
    implementation += `        headers: Object.fromEntries(response.headers.entries())\n`;
    implementation += `      };\n`;
    implementation += `    }`;
    return implementation;
}
// Type-safe client generation
async function generateTypeSafeClient(config, routes) {
    const { name, baseUrl } = config;
    let clientCode = '';
    // Add type imports
    clientCode += `// Generated API client\n`;
    clientCode += `// This file is auto-generated. Do not edit manually.\n\n`;
    // Start with client factory function with real implementation
    clientCode += `export const create${name} = (baseUrl: string = '${baseUrl || ''}') => {\n`;
    clientCode += `  return {\n`;
    clientCode += `    api: {\n`;
    // Generate actual method implementations
    const apiStructure = await buildTypeSafeApiStructure(routes);
    clientCode += apiStructure;
    clientCode += `    }\n`;
    clientCode += `  };\n`;
    clientCode += `};\n`;
    return clientCode;
}
async function buildTypeSafeApiStructure(routes) {
    const structure = {};
    // Group routes by path structure
    for (const route of routes) {
        const pathParts = route.path.replace(/^\//, '').split('/').filter((part) => part.length > 0);
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
                const methodImplementation = await generateMethodImplementation(route);
                current[cleanPart][route.method.toLowerCase()] = methodImplementation;
            }
            else {
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
function generateApiStructureCode(structure, indent) {
    let code = '';
    for (const [key, value] of Object.entries(structure)) {
        if (typeof value === 'object' && value !== null) {
            const valueObj = value;
            const methods = Object.keys(valueObj).filter(k => typeof valueObj[k] === 'string');
            if (methods.length > 0) {
                // This has method implementations
                code += `${indent}${key}: {\n`;
                for (const method of methods) {
                    // Replace escaped newlines with actual newlines and adjust indentation
                    const methodCode = valueObj[method].replace(/\\n/g, '\n').replace(/^/gm, indent + '  ');
                    code += `${indent}  ${methodCode},\n`;
                }
                code += `${indent}},\n`;
            }
            else {
                // Nested structure
                code += `${indent}${key}: {\n`;
                code += generateApiStructureCode(valueObj, indent + '  ');
                code += `${indent}},\n`;
            }
        }
    }
    return code;
}
//# sourceMappingURL=generator.js.map