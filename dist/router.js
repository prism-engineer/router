"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApiRoute = exports.router = exports.createRouter = void 0;
const express_1 = __importDefault(require("express"));
const loader_1 = require("./routing/loader");
const compiler_1 = require("./compilation/compiler");
const parser_1 = require("./routing/parser");
const createRouter = () => {
    const app = (0, express_1.default)();
    const routes = [];
    const routeLoader = (0, loader_1.createFileRouteLoader)();
    const routeParser = (0, parser_1.createRouteParser)();
    const self = {
        app,
        async loadRoutes(directory, pattern) {
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
                    }
                    catch (parseError) {
                        console.warn(`Failed to parse route file ${filePath}: ${parseError}`);
                        // Continue with other files instead of failing completely
                    }
                }
            }
            catch (error) {
                throw new Error(`Failed to load routes: ${error}`);
            }
        },
        registerRoute(route) {
            // Store the route for client generation
            routes.push(route);
            // Convert path params from {param} to :param format for Express
            const expressPath = route.path.replace(/{(\w+)}/g, ':$1');
            // Register the route with Express
            app[route.method.toLowerCase()](expressPath, async (req, res) => {
                try {
                    const result = await route.handler(req);
                    if (result && typeof result === 'object' && 'status' in result) {
                        res.status(result.status).json(result.body);
                    }
                }
                catch (error) {
                    res.status(500).json({ error: 'Internal server error' });
                }
            });
        },
        async compile(config) {
            if (!config) {
                throw new Error('Configuration is required');
            }
            console.log(`Loading routes from ${config.routes.directory} with pattern ${config.routes.pattern}`);
            await self.loadRoutes(config.routes.directory, config.routes.pattern);
            const compiler = (0, compiler_1.createCompiler)();
            await compiler.compile(config, routes);
            console.log(`Compiling with config: ${JSON.stringify(config)}`);
        }
    };
    return self;
};
exports.createRouter = createRouter;
// Export singleton instance
exports.router = (0, exports.createRouter)();
var createApiRoute_1 = require("./createApiRoute");
Object.defineProperty(exports, "createApiRoute", { enumerable: true, get: function () { return createApiRoute_1.createApiRoute; } });
//# sourceMappingURL=router.js.map