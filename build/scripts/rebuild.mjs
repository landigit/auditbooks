import { execSync } from 'child_process';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { version } = require('electron/package.json');

console.log(`[rebuild] Building better-sqlite3 for Electron ${version} (x64)...`);

try {
  // The most direct "Node-ABI" based solution: 
  // Tell node-gyp exactly what we want.
  const cmd = [
    'npx node-gyp rebuild',
    `--target=${version}`,
    '--arch=x64',
    '--dist-url=https://electronjs.org/headers',
    '--runtime=electron',
    '--build-from-source'
  ].join(' ');

  execSync(cmd, {
    cwd: path.join(process.cwd(), 'node_modules', 'better-sqlite3'),
    stdio: 'inherit',
    env: { ...process.env, HOME: path.join(process.cwd(), '.electron-gyp') }
  });

  console.log('[rebuild] ✓ Successfully compiled for Electron.');
} catch (e) {
  console.error('[rebuild] ✗ Compilation failed.');
  process.exit(1);
}
