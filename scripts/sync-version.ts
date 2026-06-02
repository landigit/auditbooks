/**
 * sync-version.ts
 * Reads version from package.json and writes it to:
 *  - src-tauri/tauri.conf.json
 *  - src-tauri/Cargo.toml
 *
 * Run: pnpm run scripts/sync-version.ts
 */
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = join(__dirname, '..');

// ── Read source of truth ──────────────────────────────────────────────────────
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf-8'));
const version: string = pkg.version;

// ── Patch tauri.conf.json ─────────────────────────────────────────────────────
const tauriConfPath = join(root, 'src-tauri', 'tauri.conf.json');
const tauriConf = JSON.parse(readFileSync(tauriConfPath, 'utf-8'));
tauriConf.version = version;
writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2) + '\n');

// ── Patch Cargo.toml ──────────────────────────────────────────────────────────
const cargoPath = join(root, 'src-tauri', 'Cargo.toml');
const cargo = readFileSync(cargoPath, 'utf-8');
// Only replace the [package] version, not dependency versions
const patched = cargo.replace(
  /^(version\s*=\s*)"[^"]*"(\s*#.*)?$/m,
  `$1"${version}"$2`
);
writeFileSync(cargoPath, patched);

console.log(`✓ Version synced: ${version}`);
console.log(`  → src-tauri/tauri.conf.json`);
console.log(`  → src-tauri/Cargo.toml`);
