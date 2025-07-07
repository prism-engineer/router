"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRouteParser = void 0;
const path_1 = __importDefault(require("path"));
const createRouteParser = () => {
    const parseRouteFile = async (filePath) => {
        try {
            const resolvedPath = path_1.default.resolve(filePath);
            let moduleExports;
            try {
                moduleExports = require(resolvedPath.replace(/\.ts$|\.js$/, ''));
            }
            catch (importError) {
                console.error({ importError });
                throw new Error(`Failed to parse route file ${filePath}: ${importError}`);
            }
            const routes = [];
            // Extract all exported route objects
            for (const [exportName, exportValue] of Object.entries(moduleExports)) {
                if (exportName === 'default')
                    continue; // Skip default export for now
                // Check if this export looks like a route definition
                if (isValidRoute(exportValue)) {
                    routes.push(exportValue);
                }
            }
            // Also check default export
            if (moduleExports.default && isValidRoute(moduleExports.default)) {
                routes.push(moduleExports.default);
            }
            return routes;
        }
        catch (error) {
            throw new Error(`Failed to parse route file ${filePath}: ${error}`);
        }
    };
    return {
        parseRouteFile
    };
};
exports.createRouteParser = createRouteParser;
// Helper function to validate if an object is a valid route
function isValidRoute(obj) {
    return (obj &&
        typeof obj === 'object' &&
        typeof obj.path === 'string' &&
        typeof obj.method === 'string' &&
        typeof obj.handler === 'function');
}
//# sourceMappingURL=parser.js.map