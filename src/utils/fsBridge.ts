/**
 * fsBridge.ts
 *
 * Platform-agnostic file system interface for reading and writing the SQLite
 * database binary.  Each platform (Tauri desktop, Lynx mobile) provides its
 * own concrete implementation; all higher-level database code only depends on
 * this interface so it stays 100% portable.
 */

export interface FileSystemBridge {
  /**
   * Read the raw bytes of the given database file.
   * Returns `null` when the file does not yet exist (first launch).
   */
  readDatabaseFile(filename: string): Promise<Uint8Array | null>;

  /**
   * Persist the given byte array back to the named database file.
   */
  writeDatabaseFile(filename: string, bytes: Uint8Array): Promise<void>;
}

// ---------------------------------------------------------------------------
// Runtime bridge registry — set once during app bootstrap
// ---------------------------------------------------------------------------

let _bridge: FileSystemBridge | null = null;

/**
 * Register the platform-specific file system bridge.
 * Call this exactly once before initialising the Wasm database.
 */
export function registerFsBridge(bridge: FileSystemBridge): void {
  _bridge = bridge;
}

/**
 * Retrieve the currently registered bridge.
 * Throws if none has been registered yet.
 */
export function getFsBridge(): FileSystemBridge {
  if (!_bridge) {
    throw new Error(
      '[fsBridge] No FileSystemBridge has been registered. ' +
        'Call registerFsBridge() during app bootstrap before any DB access.'
    );
  }
  return _bridge;
}
