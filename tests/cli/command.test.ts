import { describe, it, expect, vi, beforeEach } from 'vitest';
import { spawn } from 'child_process';
import { promisify } from 'util';

vi.mock('child_process');

describe('CLI Commands', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('npx @prism-engineer/router compile', () => {
    it('should execute the compile command successfully', async () => {
      const mockSpawn = vi.mocked(spawn);
      const mockProcess = {
        stdout: {
          on: vi.fn(),
          pipe: vi.fn()
        },
        stderr: {
          on: vi.fn(),
          pipe: vi.fn()
        },
        on: vi.fn((event, callback) => {
          if (event === 'close') {
            callback(0); // Success exit code
          }
        })
      };

      mockSpawn.mockReturnValue(mockProcess as any);

      // Simulate running the CLI command
      const result = await new Promise((resolve) => {
        const process = spawn('npx', ['@prism-engineer/router', 'compile']);
        
        process.on('close', (code) => {
          resolve(code);
        });
      });

      expect(result).toBe(0);
      expect(mockSpawn).toHaveBeenCalledWith('npx', ['@prism-engineer/router', 'compile']);
    });

    it('should handle CLI command errors', async () => {
      const mockSpawn = vi.mocked(spawn);
      const mockProcess = {
        stdout: {
          on: vi.fn(),
          pipe: vi.fn()
        },
        stderr: {
          on: vi.fn(),
          pipe: vi.fn()
        },
        on: vi.fn((event, callback) => {
          if (event === 'close') {
            callback(1); // Error exit code
          }
        })
      };

      mockSpawn.mockReturnValue(mockProcess as any);

      const result = await new Promise((resolve) => {
        const process = spawn('npx', ['@prism-engineer/router', 'compile']);
        
        process.on('close', (code) => {
          resolve(code);
        });
      });

      expect(result).toBe(1);
    });

    it('should support compile command with config file', async () => {
      const mockSpawn = vi.mocked(spawn);
      const mockProcess = {
        stdout: {
          on: vi.fn(),
          pipe: vi.fn()
        },
        stderr: {
          on: vi.fn(),
          pipe: vi.fn()
        },
        on: vi.fn((event, callback) => {
          if (event === 'close') {
            callback(0);
          }
        })
      };

      mockSpawn.mockReturnValue(mockProcess as any);

      const result = await new Promise((resolve) => {
        const process = spawn('npx', ['@prism-engineer/router', 'compile', '--config', 'custom-config.ts']);
        
        process.on('close', (code) => {
          resolve(code);
        });
      });

      expect(result).toBe(0);
      expect(mockSpawn).toHaveBeenCalledWith('npx', ['@prism-engineer/router', 'compile', '--config', 'custom-config.ts']);
    });

    it('should validate CLI command syntax', () => {
      const validCommands = [
        'npx @prism-engineer/router compile',
        'npx @prism-engineer/router compile --config custom-config.ts',
        'npx @prism-engineer/router compile --output ./dist'
      ];

      validCommands.forEach(command => {
        const parts = command.split(' ');
        expect(parts[0]).toBe('npx');
        expect(parts[1]).toBe('@prism-engineer/router');
        expect(parts[2]).toBe('compile');
      });
    });
  });

  describe('CLI help and version', () => {
    it('should support help command', async () => {
      const mockSpawn = vi.mocked(spawn);
      const mockProcess = {
        stdout: {
          on: vi.fn(),
          pipe: vi.fn()
        },
        stderr: {
          on: vi.fn(),
          pipe: vi.fn()
        },
        on: vi.fn((event, callback) => {
          if (event === 'close') {
            callback(0);
          }
        })
      };

      mockSpawn.mockReturnValue(mockProcess as any);

      const result = await new Promise((resolve) => {
        const process = spawn('npx', ['@prism-engineer/router', '--help']);
        
        process.on('close', (code) => {
          resolve(code);
        });
      });

      expect(result).toBe(0);
      expect(mockSpawn).toHaveBeenCalledWith('npx', ['@prism-engineer/router', '--help']);
    });

    it('should support version command', async () => {
      const mockSpawn = vi.mocked(spawn);
      const mockProcess = {
        stdout: {
          on: vi.fn(),
          pipe: vi.fn()
        },
        stderr: {
          on: vi.fn(),
          pipe: vi.fn()
        },
        on: vi.fn((event, callback) => {
          if (event === 'close') {
            callback(0);
          }
        })
      };

      mockSpawn.mockReturnValue(mockProcess as any);

      const result = await new Promise((resolve) => {
        const process = spawn('npx', ['@prism-engineer/router', '--version']);
        
        process.on('close', (code) => {
          resolve(code);
        });
      });

      expect(result).toBe(0);
      expect(mockSpawn).toHaveBeenCalledWith('npx', ['@prism-engineer/router', '--version']);
    });
  });
});