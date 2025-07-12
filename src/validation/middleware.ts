import { Request, Response, NextFunction } from 'express';
import { TSchema } from '@sinclair/typebox';
import { TypeCompiler } from '@sinclair/typebox/compiler';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

interface ValidationError {
  type: 'query' | 'body' | 'headers';
  errors: Array<{
    path: string;
    message: string;
    value: any;
  }>;
}

export interface ValidationSchemas {
  query?: TSchema;
  body?: TSchema;
  headers?: TSchema;
}

// Create AJV instance with format support
const ajv = new Ajv({ allErrors: true, verbose: true });
addFormats(ajv);

export function createValidationMiddleware(schemas: ValidationSchemas) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const validationErrors: ValidationError[] = [];

    // Validate query parameters
    if (schemas.query) {
      try {
        // Convert query string values to proper types
        const processedQuery = processQueryParams(req.query);
        
        // Convert TSchema to JSON Schema for AJV
        const jsonSchema = convertTSchemaToJsonSchema(schemas.query);
        const validator = ajv.compile(jsonSchema);
        const isValid = validator(processedQuery);
        
        if (!isValid) {
          const errors = (validator.errors || []).map(error => ({
            path: error.instancePath || error.schemaPath || '',
            message: error.message || 'Validation failed',
            value: error.data
          }));
          
          validationErrors.push({
            type: 'query',
            errors
          });
        }
      } catch (error) {
        validationErrors.push({
          type: 'query',
          errors: [{
            path: '',
            message: `Query validation error: ${error}`,
            value: req.query
          }]
        });
      }
    }

    // Validate request body
    if (schemas.body) {
      try {
        const jsonSchema = convertTSchemaToJsonSchema(schemas.body);
        const validator = ajv.compile(jsonSchema);
        const isValid = validator(req.body);
        
        if (!isValid) {
          const errors = (validator.errors || []).map(error => ({
            path: error.instancePath || error.schemaPath || '',
            message: error.message || 'Validation failed',
            value: error.data
          }));
          
          validationErrors.push({
            type: 'body',
            errors
          });
        }
      } catch (error) {
        validationErrors.push({
          type: 'body',
          errors: [{
            path: '',
            message: `Body validation error: ${error}`,
            value: req.body
          }]
        });
      }
    }

    // Validate headers
    if (schemas.headers) {
      try {
        // Convert headers to plain object and lowercase keys for consistent validation
        const headersObj: Record<string, string> = {};
        Object.entries(req.headers).forEach(([key, value]) => {
          if (typeof value === 'string') {
            headersObj[key.toLowerCase()] = value;
          } else if (Array.isArray(value)) {
            headersObj[key.toLowerCase()] = value[0] || '';
          }
        });

        const jsonSchema = convertTSchemaToJsonSchema(schemas.headers);
        const validator = ajv.compile(jsonSchema);
        const isValid = validator(headersObj);
        
        if (!isValid) {
          const errors = (validator.errors || []).map(error => ({
            path: error.instancePath || error.schemaPath || '',
            message: error.message || 'Validation failed',
            value: error.data
          }));
          
          validationErrors.push({
            type: 'headers',
            errors
          });
        }
      } catch (error) {
        validationErrors.push({
          type: 'headers',
          errors: [{
            path: '',
            message: `Headers validation error: ${error}`,
            value: req.headers
          }]
        });
      }
    }

    // If there are validation errors, return a 400 response
    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validationErrors
      });
    }

    next();
  };
}

function convertTSchemaToJsonSchema(schema: TSchema): any {
  // TypeBox schemas are already JSON Schema compatible
  // We just need to ensure they're serialized properly
  return JSON.parse(JSON.stringify(schema));
}

function processQueryParams(query: any): any {
  if (!query || typeof query !== 'object') {
    return query;
  }

  const processed: any = {};
  
  for (const [key, value] of Object.entries(query)) {
    if (Array.isArray(value)) {
      // Handle array query parameters
      processed[key] = value.map(v => convertQueryValue(v));
    } else {
      processed[key] = convertQueryValue(value);
    }
  }
  
  return processed;
}

function convertQueryValue(value: any): any {
  if (typeof value !== 'string') {
    return value;
  }
  
  // Try to convert to number
  if (/^\d+$/.test(value)) {
    return parseInt(value, 10);
  }
  
  if (/^\d*\.\d+$/.test(value)) {
    return parseFloat(value);
  }
  
  // Try to convert to boolean
  if (value === 'true') {
    return true;
  }
  
  if (value === 'false') {
    return false;
  }
  
  // Return as string
  return value;
}

function getErrorMessage(error: any): string {
  // Use the error type number or fallback to message
  const errorType = error.type;
  
  // Common error patterns based on TypeBox error types
  if (error.message) {
    return error.message;
  }
  
  if (error.path === '' && error.schema?.required) {
    return `Required property is missing`;
  }
  
  if (error.schema?.minLength !== undefined && error.value?.length < error.schema.minLength) {
    return `String '${error.path}' must be at least ${error.schema.minLength} characters long`;
  }
  
  if (error.schema?.maxLength !== undefined && error.value?.length > error.schema.maxLength) {
    return `String '${error.path}' must be at most ${error.schema.maxLength} characters long`;
  }
  
  if (error.schema?.pattern && typeof error.value === 'string') {
    return `String '${error.path}' does not match pattern '${error.schema.pattern}'`;
  }
  
  if (error.schema?.format && typeof error.value === 'string') {
    return `String '${error.path}' does not match format '${error.schema.format}'`;
  }
  
  if (error.schema?.minimum !== undefined && error.value < error.schema.minimum) {
    return `Number '${error.path}' must be at least ${error.schema.minimum}`;
  }
  
  if (error.schema?.maximum !== undefined && error.value > error.schema.maximum) {
    return `Number '${error.path}' must be at most ${error.schema.maximum}`;
  }
  
  if (error.schema?.minItems !== undefined && error.value?.length < error.schema.minItems) {
    return `Array '${error.path}' must have at least ${error.schema.minItems} items`;
  }
  
  if (error.schema?.maxItems !== undefined && error.value?.length > error.schema.maxItems) {
    return `Array '${error.path}' must have at most ${error.schema.maxItems} items`;
  }
  
  if (error.schema?.anyOf || error.schema?.oneOf) {
    return `Value '${error.path}' does not match any of the allowed types`;
  }
  
  return `Invalid value at '${error.path}': ${error.value}`;
}