import fs from 'fs/promises';
import path from 'path';
import { CompilationConfig } from '../core/types';
import { createTypeScriptClientGenerator, ClientGenerator } from './generator';

export const createCompiler = () => {
  const generator: ClientGenerator = createTypeScriptClientGenerator();

  return {
    async compile(config: CompilationConfig, routes: any[] = []): Promise<void> {
      // Validate required config
      if (!config.outputDir) {
        throw new Error('outputDir is required');
      }

      try {
        // Create output directory
        await fs.mkdir(config.outputDir, { recursive: true });

        // Generate client code
        const clientCode = await generator.generateClient(config, routes);

        // Determine file extension
        const fileName = `${config.name}.generated.ts`;
        const filePath = path.join(config.outputDir, fileName);

        // Write the generated client
        await fs.writeFile(filePath, clientCode, 'utf-8');

      } catch (error: any) {
        throw new Error(`Compilation failed: ${error.message}`);
      }
    }
  };
};