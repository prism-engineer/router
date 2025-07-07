"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCompiler = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const generator_1 = require("./generator");
const createCompiler = () => {
    const generator = (0, generator_1.createTypeScriptClientGenerator)();
    return {
        async compile(config, routes = []) {
            // Validate required config
            if (!config.outputDir) {
                throw new Error('outputDir is required');
            }
            try {
                // Create output directory
                await promises_1.default.mkdir(config.outputDir, { recursive: true });
                // Generate client code
                const clientCode = await generator.generateClient(config, routes);
                // Determine file extension
                const fileName = `${config.name}.generated.ts`;
                const filePath = path_1.default.join(config.outputDir, fileName);
                // Write the generated client
                await promises_1.default.writeFile(filePath, clientCode, 'utf-8');
            }
            catch (error) {
                throw new Error(`Compilation failed: ${error.message}`);
            }
        }
    };
};
exports.createCompiler = createCompiler;
//# sourceMappingURL=compiler.js.map