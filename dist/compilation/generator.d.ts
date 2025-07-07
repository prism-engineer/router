import { TSchema } from '@sinclair/typebox';
import { CompilationConfig } from '../core/types';
export interface ClientGenerator {
    generateClient(config: CompilationConfig, routes: any[]): Promise<string>;
}
export declare const createTypeScriptClientGenerator: () => ClientGenerator;
export declare function extractTypeFromSchema(schema: TSchema, typeName?: string): Promise<string>;
//# sourceMappingURL=generator.d.ts.map