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
      
      // Extract all exported route objects
      for (const [exportName, exportValue] of Object.entries(moduleExports)) {
        if (exportName === 'default') continue; // Skip default export for now
        
        // Check if this export looks like a route definition
        if (isValidRoute(exportValue)) {
          routes.push(exportValue as ParsedRoute);
        }
      }
      
      // Also check default export
      if (moduleExports.default && isValidRoute(moduleExports.default)) {
        routes.push(moduleExports.default as ParsedRoute);
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