import pkg from '../../package.json';

// Mock global ipc object if used
(global as any).ipc = {
  getEnv: async () => ({
    isDevelopment: true,
    platform: 'linux',
    version: pkg.version,
  }),
};
