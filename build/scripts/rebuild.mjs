import { rebuild } from '@electron/rebuild';
import { createRequire } from 'module';
import path from 'path';

const require = createRequire(import.meta.url);
const { version: electronVersion } = require('electron/package.json');

console.log(
  `[rebuild] Starting native module rebuild for Electron ${electronVersion}...`
);

(async () => {
  try {
    await rebuild({
      buildPath: process.cwd(),
      electronVersion,
      force: true, // Force rebuild to ensure compatibility
      types: ['prod', 'dev'],
    });

    console.log('[rebuild] ✓ Successfully rebuilt all native modules.');
  } catch (error) {
    console.error('[rebuild] ✗ Rebuild failed:');
    console.error(error);
    process.exit(1);
  }
})();
