/**
 * tauriFs.ts
 *
 * Tauri Desktop implementation of FileSystemBridge.
 *
 * Uses the Tauri `@tauri-apps/plugin-fs` plugin (v2) to read and write the
 * SQLite database binary on the user's local disk.  The database file is
 * stored in Tauri's standard `AppData` directory so it respects OS
 * conventions and sandboxing rules.
 *
 * Register this bridge during Tauri app bootstrap:
 * ```ts
 * import { registerFsBridge } from 'src/utils/fsBridge';
 * import { tauriFsBridge } from 'src/utils/ipc/tauriFs';
 * registerFsBridge(tauriFsBridge);
 * ```
 */

import type { FileSystemBridge } from 'src/utils/fsBridge';

// ---------------------------------------------------------------------------
// Tauri plugin-fs lazy import
// ---------------------------------------------------------------------------
// @tauri-apps/plugin-fs is not an npm package — it is injected by the
// Tauri build toolchain at runtime inside the desktop shell.  We therefore
// resolve it dynamically and type the result ourselves so the TypeScript
// compiler doesn't complain about a missing module declaration.

interface TauriFs {
  readFile(path: string, options?: { baseDir?: number }): Promise<Uint8Array>;
  writeFile(
    path: string,
    data: Uint8Array,
    options?: { baseDir?: number }
  ): Promise<void>;
  mkdir(
    path: string,
    options?: { baseDir?: number; recursive?: boolean }
  ): Promise<void>;
  exists(path: string, options?: { baseDir?: number }): Promise<boolean>;
  dirname(path: string): Promise<string>;
  // BaseDirectory enum — we only use AppData (value 4 in Tauri v2)
  BaseDirectory: { AppData: number };
}

async function getTauriFs(): Promise<TauriFs> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (
      (await (globalThis as any).__tauriImport?.('@tauri-apps/plugin-fs')) ??
      ((await import('@tauri-apps/plugin-fs' as string)) as unknown as TauriFs)
    );
  } catch {
    // Fallback: try the standard module specifier (works inside Tauri shell)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod = await (Function('s', 'return import(s)') as any)(
      '@tauri-apps/plugin-fs'
    );
    if (!mod) {
      throw new Error(
        '[tauriFs] @tauri-apps/plugin-fs is not available. ' +
          'Make sure you are running inside a Tauri v2 desktop shell.'
      );
    }
    return mod as TauriFs;
  }
}

// ---------------------------------------------------------------------------
// FileSystemBridge implementation
// ---------------------------------------------------------------------------

export const tauriFsBridge: FileSystemBridge = {
  /**
   * Read the raw bytes of the database file from AppData.
   * Returns `null` when the file does not yet exist.
   */
  async readDatabaseFile(filename: string): Promise<Uint8Array | null> {
    const { readFile, BaseDirectory, exists } = await getTauriFs();

    const fileExists = await exists(filename, {
      baseDir: BaseDirectory.AppData,
    });
    if (!fileExists) {
      console.info(
        `[tauriFs] "${filename}" not found — will create a new database.`
      );
      return null;
    }

    const bytes = await readFile(filename, { baseDir: BaseDirectory.AppData });
    console.debug(`[tauriFs] Read "${filename}" (${bytes.byteLength} bytes).`);
    return bytes;
  },

  /**
   * Write the database bytes back to the AppData directory.
   * Creates the file (and parent directories) if they don't exist.
   */
  async writeDatabaseFile(filename: string, bytes: Uint8Array): Promise<void> {
    const { writeFile, mkdir, BaseDirectory, dirname } = await getTauriFs();

    // Ensure parent directory exists (e.g. when filename contains sub-folders)
    const dir = await dirname(filename).catch(() => null);
    if (dir && dir !== '.') {
      await mkdir(dir, {
        baseDir: BaseDirectory.AppData,
        recursive: true,
      }).catch(() => {
        // Ignore — directory likely already exists
      });
    }

    await writeFile(filename, bytes, { baseDir: BaseDirectory.AppData });
    console.debug(`[tauriFs] Wrote "${filename}" (${bytes.byteLength} bytes).`);
  },
};
