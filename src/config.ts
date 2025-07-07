import { CompilationConfig } from './core/types';

export async function loadConfig(configPath?: string): Promise<CompilationConfig> {
  const filePath = configPath || 'config.prism.router.ts';
  
  try {
    return await import(filePath);
  } catch (error: any) {
    if (error.code === 'ENOENT' || error.message.includes('ENOENT')) {
      throw new Error('Configuration file not found');
    }
    throw error;
  }
}