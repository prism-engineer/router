import express, { Express } from 'express';
import { RouterInterface, CompilationConfig } from './core/types';
import { createFileRouteLoader } from './routing/loader';
import { createCompiler } from './compilation/compiler';
import { createRouteParser, ParsedRoute } from './routing/parser';
import { validateAuth } from './createAuthScheme';


export const createRouter = (): RouterInterface => {
  const app: Express = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  const routes: ParsedRoute[] = [];
  const routeLoader = createFileRouteLoader();
  const routeParser = createRouteParser();

  const self = {
    app,
    async loadRoutes(directory: string, pattern: RegExp, options?: {
      prefix?: string;
    }): Promise<void> {
      if(!directory || !pattern) {
        throw new Error('Directory and pattern are required');
      }
      
      try {
        const files = await routeLoader.loadRoutes(directory, pattern);
                
        // Parse each route file and extract route definitions
        for (const filePath of files) {
          try {
            const parsedRoutes = await routeParser.parseRouteFile(filePath);
            
            // Add parsed routes to our collection
            routes.push(...parsedRoutes);
            
            // Auto-register each route with Express
            for (const route of parsedRoutes) {
              this.registerRoute(route, options?.prefix);
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
    registerRoute(route: any, prefix?: string): void {
      // Store the route for client generation
      routes.push(route);
      
      // Convert path params from {param} to :param format for Express
      const expressPath = prefix + route.path.replace(/{(\w+)}/g, ':$1');
      
      // Create middleware array
      const middleware: any[] = [];
      
      // Add auth middleware if auth is defined
      if (route.auth) {
        middleware.push(async (req: express.Request, res: express.Response, next: express.NextFunction) => {
          const authContext = await validateAuth(route.auth, req);
          (req as any).auth = authContext;
          next();
        });
      }
      
      // Add main handler
      middleware.push(async (req: express.Request, res: express.Response) => {
        const result = await route.handler({
          query: req.query,
          body: req.body,
          headers: req.headers,
          params: req.params,
          auth: (req as any).auth,
        });
        const responseSchema = route.response?.[result.status];
        if (result && typeof result === 'object' && 'status' in result) {
          if ('custom' in result && typeof result.custom === 'function') {
            // Custom content type - user controls response
            res.status(result.status);
            if(!responseSchema?.contentType) {
              throw new Error('No content type specified for custom response handler');
            }
            res.setHeader('Content-Type', responseSchema?.contentType);
            await result.custom(res);
          } else {
            res.status(result.status);
            if(!responseSchema?.contentType) {
              throw new Error('No content type specified for custom response handler');
            }
            res.setHeader('Content-Type', responseSchema?.contentType);
            res.json(result.body);
          }
        }
      });
      
      // Register the route with Express
      app[route.method.toLowerCase() as keyof express.Application](
        expressPath,
        ...middleware
      );

      console.log(`Registered route ${route.method} ${expressPath}`);
    },
    async compile(config: CompilationConfig, loadRoutesOptions?: {
      prefix?: string;
    }): Promise<void> {
      if (!config) {
        throw new Error('Configuration is required');
      }

      for(const routeConfig of config.routes) {
        console.log(`Loading routes from ${routeConfig.directory} with pattern ${routeConfig.pattern}`);
        await self.loadRoutes(routeConfig.directory, routeConfig.pattern, routeConfig.options) ;
      }


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
export type { PrismCliConfig } from './cli/index';