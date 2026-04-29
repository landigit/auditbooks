import { vi } from 'vitest';

// Mock electron
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn().mockReturnValue('/tmp'),
    getVersion: vi.fn().mockReturnValue('0.37.3'),
  },
  ipcRenderer: {
    on: vi.fn(),
    send: vi.fn(),
    invoke: vi.fn(),
  },
}));

// Mock global ipc object if used
(global as any).ipc = {
  getEnv: vi.fn().mockResolvedValue({
    isDevelopment: true,
    platform: 'linux',
    version: '0.37.3',
  }),
};
