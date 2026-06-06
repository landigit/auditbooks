/**
 * lynxFs.ts
 *
 * Lynx (Vue Lynx) implementation of FileSystemBridge.
 *
 * Communicates with the host iOS/Android native module `AuditbooksFsModule`
 * to read and write the SQLite database binary on mobile device storage.
 *
 * Data is transmitted as Base64 strings because Lynx's native module bridge
 * only natively serialises JSON-compatible types.
 *
 * Register this bridge during Lynx app bootstrap:
 * ```ts
 * // lynx/src/index.ts
 * import { registerFsBridge } from 'src/utils/fsBridge';
 * import { lynxFsBridge } from 'lynx/src/lib/lynxFs';
 * registerFsBridge(lynxFsBridge);
 * ```
 *
 * During development (dev server mode) the bridge falls back to the HTTP
 * backend so that the app remains functional without a physical device.
 */

import type { FileSystemBridge } from 'src/utils/fsBridge';

// ---------------------------------------------------------------------------
// Native module accessor
// ---------------------------------------------------------------------------

/**
 * Lazily acquire the AuditbooksFsModule native module handle.
 * Throws with a clear message if the module is not registered on the host.
 */
function getFsModule(): {
  readBytes(filename: string): Promise<string | null>;
  writeBytes(filename: string, base64: string): Promise<void>;
} {
  const lynxGlobal = globalThis as any;

  if (typeof lynxGlobal.lynx?.requireModule !== 'function') {
    throw new Error(
      '[lynxFs] globalThis.lynx.requireModule is not available. ' +
        'Are you running inside a Lynx native shell with AuditbooksFsModule registered?'
    );
  }

  return lynxGlobal.lynx.requireModule('AuditbooksFsModule');
}

// ---------------------------------------------------------------------------
// Base64 <-> Uint8Array helpers
// ---------------------------------------------------------------------------

function uint8ToBase64(bytes: Uint8Array): string {
  // Use btoa on browsers/Lynx JS thread; fallback to Buffer for Node tests
  if (typeof btoa === 'function') {
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
  return Buffer.from(bytes).toString('base64');
}

function base64ToUint8(b64: string): Uint8Array {
  if (typeof atob === 'function') {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
  return new Uint8Array(Buffer.from(b64, 'base64'));
}

// ---------------------------------------------------------------------------
// HTTP dev-server fallback
// ---------------------------------------------------------------------------

const DEV_BACKEND_URL = `http://${(process.env as any).BACKEND_IP || 'localhost'}:6970/api/fs`;

async function devReadFile(filename: string): Promise<Uint8Array | null> {
  try {
    const res = await fetch(`${DEV_BACKEND_URL}/read`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename }),
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { base64 } = await res.json();
    return base64 ? base64ToUint8(base64) : null;
  } catch (err) {
    console.warn('[lynxFs] Dev HTTP fallback readFile failed:', err);
    return null;
  }
}

async function devWriteFile(
  filename: string,
  bytes: Uint8Array
): Promise<void> {
  const base64 = uint8ToBase64(bytes);
  const res = await fetch(`${DEV_BACKEND_URL}/write`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename, base64 }),
  });
  if (!res.ok) {
    throw new Error(
      `[lynxFs] Dev HTTP fallback writeFile failed: HTTP ${res.status}`
    );
  }
}

// ---------------------------------------------------------------------------
// FileSystemBridge implementation
// ---------------------------------------------------------------------------

export const lynxFsBridge: FileSystemBridge = {
  /**
   * Read the database file bytes from the mobile device's app documents dir.
   * Returns `null` when the file doesn't exist yet (first launch).
   */
  async readDatabaseFile(filename: string): Promise<Uint8Array | null> {
    // During dev mode there is no native shell — use HTTP backend
    if (typeof (globalThis as any).lynx?.requireModule !== 'function') {
      console.info(
        '[lynxFs] Native module unavailable — using dev HTTP fallback.'
      );
      return devReadFile(filename);
    }

    const fsModule = getFsModule();
    const base64 = await fsModule.readBytes(filename);

    if (!base64) {
      console.info(
        `[lynxFs] "${filename}" not found — will create a new database.`
      );
      return null;
    }

    const bytes = base64ToUint8(base64);
    console.debug(`[lynxFs] Read "${filename}" (${bytes.byteLength} bytes).`);
    return bytes;
  },

  /**
   * Write the database bytes back to the mobile app's documents directory.
   */
  async writeDatabaseFile(filename: string, bytes: Uint8Array): Promise<void> {
    // During dev mode there is no native shell — use HTTP backend
    if (typeof (globalThis as any).lynx?.requireModule !== 'function') {
      return devWriteFile(filename, bytes);
    }

    const fsModule = getFsModule();
    const base64 = uint8ToBase64(bytes);
    await fsModule.writeBytes(filename, base64);
    console.debug(`[lynxFs] Wrote "${filename}" (${bytes.byteLength} bytes).`);
  },
};
