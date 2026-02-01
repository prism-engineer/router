import path from 'path';

export interface ParsedRoute {
  path: string;
  method: string;
  handler: Function;
  request?: any;
  response?: any;
}

export interface RouteParser {
  parseRouteFile(filePath: string): Promise<ParsedRoute[]>;
}

export const createRouteParser = (): RouteParser => {
  
  const parseRouteFile = async (filePath: string): Promise<ParsedRoute[]> => {
    try {
      const resolvedPath = path.resolve(filePath);
      let moduleExports: any;

      try {
        // For TypeScript files in test environment, use ts-node to compile and import
        if (filePath.endsWith('.ts') && process.env.NODE_ENV === 'test') {
          // Check if ts-node is available
          try {
            await import('ts-node/register' as any);
          } catch {
            // ts-node not available, fall back to regular import
          }
        }
        
        // Use dynamic import for ES modules (cache busting handled automatically)
        moduleExports = await import(resolvedPath + '?t=' + Date.now());
      } catch (importError) {
        throw new Error(`Failed to parse route file ${filePath}: ${importError}`);
      }
      
      const routes: ParsedRoute[] = [];
      const seenRoutes = new Set<string>(); // Track by path+method to avoid duplicates
      
      const addRoute = (route: ParsedRoute) => {
        const key = `${route.method}:${route.path}`;
        if (!seenRoutes.has(key)) {
          seenRoutes.add(key);
          routes.push(route);
        }
      };
      
      // Extract all exported route objects
      for (const [exportName, exportValue] of Object.entries(moduleExports)) {
        if (exportName === 'default') continue; // Handle default separately below
        
        // Check if this export looks like a route definition
        if (isValidRoute(exportValue)) {
          addRoute(exportValue as ParsedRoute);
        }
      }
      
      // Handle default export - it could be:
      // 1. A single route object (export default createApiRoute({...}))
      // 2. An object containing multiple routes (SWC CJS->ESM interop)
      // 3. Double-nested default.default (CJS module.exports.default -> ESM import)
      if (moduleExports.default) {
        if (isValidRoute(moduleExports.default)) {
          // Case 1: default is itself a route
          addRoute(moduleExports.default as ParsedRoute);
        } else if (typeof moduleExports.default === 'object' && moduleExports.default !== null) {
          // Check for double-nested default (CJS interop case)
          // When CJS has module.exports.default = route, ESM import creates { default: { default: route } }
          if (moduleExports.default.default && isValidRoute(moduleExports.default.default)) {
            addRoute(moduleExports.default.default as ParsedRoute);
          }
          
          // Case 2: default contains routes (SWC _export() helper puts all exports here)
          for (const [key, value] of Object.entries(moduleExports.default)) {
            if (key === 'default') continue; // Already handled above
            if (isValidRoute(value)) {
              addRoute(value as ParsedRoute);
            }
          }
        }
      }
      
      return routes;
    } catch (error) {
      throw new Error(`Failed to parse route file ${filePath}: ${error}`);
    }
  };
  
  return {
    parseRouteFile
  };
};

// Helper function to validate if an object is a valid route
function isValidRoute(obj: any): boolean {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.path === 'string' &&
    typeof obj.method === 'string' &&
    typeof obj.handler === 'function'
  );
}