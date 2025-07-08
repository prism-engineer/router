import express, { Express } from 'express';
import { RouterInterface, CompilationConfig } from './core/types';
import { createFileRouteLoader } from './routing/loader';
import { createCompiler } from './compilation/compiler';
import { createRouteParser, ParsedRoute } from './routing/parser';
import { validateAuth } from './createAuthScheme';

export const createRouter = (): RouterInterface => {
  const app: Express = express();
  const routes: ParsedRoute[] = [];
  const routeLoader = createFileRouteLoader();
  const routeParser = createRouteParser();

  const self = {
    app,
    async loadRoutes(directory: string, pattern: RegExp): Promise<void> {
      try {
        const files = await routeLoader.loadRoutes(directory, pattern);
        console.log(`Loading routes with pattern: ${pattern}`);
        
        // Parse each route file and extract route definitions
        for (const filePath of files) {
          try {
            const parsedRoutes = await routeParser.parseRouteFile(filePath);
            
            // Add parsed routes to our collection
            routes.push(...parsedRoutes);
            
            // Auto-register each route with Express
            for (const route of parsedRoutes) {
              this.registerRoute(route);
            }
          } catch (parseError) {
            console.warn(`Failed to parse route file ${filePath}: ${parseError}`);
            // Continue with other files instead of failing completely
          }
        }
      } catch (error) {
        throw new Error(`Failed to load routes: ${error}`);
      }
    },
    registerRoute(route: any): void {
      // Store the route for client generation
      routes.push(route);
      
      // Convert path params from {param} to :param format for Express
      const expressPath = route.path.replace(/{(\w+)}/g, ':$1');
      
      // Create middleware array
      const middleware: any[] = [];
      
      // Add auth middleware if auth is defined
      if (route.auth) {
        middleware.push(async (req: express.Request, res: express.Response, next: express.NextFunction) => {
          try {
            const authContext = await validateAuth(route.auth, req);
            (req as any).auth = authContext;
            next();
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
            res.status(401).json({ error: errorMessage });
          }
        });
      }
      
      // Add main handler
      middleware.push(async (req: express.Request, res: express.Response) => {
        try {
          const result = await route.handler(req as any);
          if (result && typeof result === 'object' && 'status' in result) {
            res.status(result.status).json(result.body);
          }
        } catch (error) {
          res.status(500).json({ error: 'Internal server error' });
        }
      });
      
      // Register the route with Express
      app[route.method.toLowerCase() as keyof express.Application](
        expressPath,
        ...middleware
      );
    },
    async compile(config: CompilationConfig): Promise<void> {
      if (!config) {
        throw new Error('Configuration is required');
      }

      console.log(`Loading routes from ${config.routes.directory} with pattern ${config.routes.pattern}`);
      await self.loadRoutes(config.routes.directory, config.routes.pattern);

      const compiler = createCompiler();
      await compiler.compile(config, routes);
      
      console.log(`Compiling with config: ${JSON.stringify(config)}`);
    }
  };

  return self;
};

// Export singleton instance
export const router = createRouter();

export { createApiRoute } from './createApiRoute';
export { createAuthScheme } from './createAuthScheme';