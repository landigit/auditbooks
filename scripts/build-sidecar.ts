import { $ } from 'bun';
import fs from 'fs';
import path from 'path';

const targetTripleMap: Record<string, string> = {
  'win32-x64': 'x86_64-pc-windows-msvc',
  'linux-x64': 'x86_64-unknown-linux-gnu',
  'darwin-x64': 'x86_64-apple-darwin',
  'darwin-arm64': 'aarch64-apple-darwin',
};

const currentPlatform = `${process.platform}-${process.arch}`;
const targetTriple = targetTripleMap[currentPlatform];

if (!targetTriple) {
  throw new Error(`Unsupported platform/arch: ${currentPlatform}`);
}

const binDir = path.join(import.meta.dir, '../src-tauri/bin');
if (!fs.existsSync(binDir)) {
  fs.mkdirSync(binDir, { recursive: true });
}

const ext = process.platform === 'win32' ? '.exe' : '';
const binPath = path.join(binDir, `backend-${targetTriple}${ext}`);

console.log(`Building Bun sidecar for ${targetTriple} to ${binPath}...`);
await $`bun build --compile backend/sidecar.ts --outfile ${binPath}`;
console.log('Done building sidecar!');
