import { $ } from 'bun';
import fs from 'fs';
import path from 'path';

// Sync version from package.json to tauri.conf.json and Cargo.toml
const pkgPath = path.join(import.meta.dir, '../package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const version = pkg.version;

console.log(`Syncing version ${version} from package.json...`);

// Update tauri.conf.json
const tauriConfPath = path.join(import.meta.dir, '../src-tauri/tauri.conf.json');
if (fs.existsSync(tauriConfPath)) {
  const tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, 'utf8'));
  if (tauriConf.version !== version) {
    tauriConf.version = version;
    fs.writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2) + '\n', 'utf8');
    console.log(`Updated tauri.conf.json version to ${version}`);
  }
}

// Update Cargo.toml
const cargoTomlPath = path.join(import.meta.dir, '../src-tauri/Cargo.toml');
if (fs.existsSync(cargoTomlPath)) {
  let cargoToml = fs.readFileSync(cargoTomlPath, 'utf8');
  const updatedCargoToml = cargoToml.replace(/^version\s*=\s*"[^"]*"/m, `version = "${version}"`);
  if (cargoToml !== updatedCargoToml) {
    fs.writeFileSync(cargoTomlPath, updatedCargoToml, 'utf8');
    console.log(`Updated Cargo.toml version to ${version}`);
  }
}


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
