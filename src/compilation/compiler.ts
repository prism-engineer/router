import fs from 'fs/promises';
import path from 'path';
import { createTypeScriptClientGenerator, ClientGenerator } from './generator.js';

export const createCompiler = () => {
  const generator: ClientGenerator = createTypeScriptClientGenerator();

  return {
    async compile(options: {
      name: string;
      outputDir: string;
      baseUrl: string;
    }, routes: any[] = []): Promise<void> {
      // Validate required config
      if (!options.outputDir) {
        throw new Error('outputDir is required');
      }

      try {
        // Create output directory
        await fs.mkdir(options.outputDir, { recursive: true });

        // Generate client code
        const clientCode = await generator.generateClient(options, routes);

        // Determine file extension
        const fileName = `${options.name}.generated.ts`;
        const filePath = path.join(options.outputDir, fileName);

        // Write the generated client
        await fs.writeFile(filePath, clientCode, 'utf-8');

      } catch (error: any) {
        throw new Error(`Compilation failed: ${error.message}`);
      }
    }
  };
};