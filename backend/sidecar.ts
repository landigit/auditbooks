import fs from 'node:fs/promises';
import path from 'path';
import process from 'process';
import databaseManager from './database/manager';
import { getLanguageMap } from './getLanguageMap';
import { getTemplates } from './getPrintTemplates';
import { sendAPIRequest } from './api';
import { IPC_ACTIONS } from '../src/utils/core/messages';

// ─── App Data Directory ───────────────────────────────────────────────────────
// All user data lives in %APPDATA%\Auditbooks\ (Windows) or ~/.config/Auditbooks/ (Linux/Mac)
// This mirrors what electron-store did — nothing stored inside the project folder.
const APP_DATA_DIR = path.join(
  process.env.APPDATA || path.join(process.env.HOME || '~', '.config'),
  'Auditbooks'
);
const DB_DIR = path.join(APP_DATA_DIR, 'databases');
const CONFIG_FILE = path.join(APP_DATA_DIR, 'config.json');

// ─── Persistent Config Store ──────────────────────────────────────────────────
interface KnownDb {
  id: string;
  companyName: string;
  dbPath: string;
  openCount: number;
}

interface AppConfig {
  files: KnownDb[];
  lastSelectedFilePath: string | null;
  language?: string;
  deviceId?: string;
}

async function ensureAppDirs(): Promise<void> {
  await fs.mkdir(APP_DATA_DIR, { recursive: true });
  await fs.mkdir(DB_DIR, { recursive: true });
}

async function readConfig(): Promise<AppConfig> {
  try {
    const text = await fs.readFile(CONFIG_FILE, 'utf-8');
    return JSON.parse(text) as AppConfig;
  } catch {
    return { files: [], lastSelectedFilePath: null };
  }
}

async function writeConfig(config: AppConfig): Promise<void> {
  await ensureAppDirs();
  await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
}

async function upsertDbInConfig(dbPath: string, companyName?: string): Promise<void> {
  const config = await readConfig();
  const normalized = path.normalize(dbPath).toLowerCase();
  const existing = config.files.find(
    (f) => path.normalize(f.dbPath).toLowerCase() === normalized
  );
  if (!existing) {
    config.files.push({
      id: `db-${Date.now()}`,
      companyName: companyName || path.basename(dbPath, '.db'),
      dbPath,
      openCount: 1,
    });
  } else {
    existing.openCount = (existing.openCount || 0) + 1;
    if (companyName) existing.companyName = companyName;
  }
  config.lastSelectedFilePath = dbPath;
  await writeConfig(config);
}

async function removeDbFromConfig(dbPath: string): Promise<void> {
  const config = await readConfig();
  const normalized = path.normalize(dbPath).toLowerCase();
  config.files = config.files.filter(
    (f) => path.normalize(f.dbPath).toLowerCase() !== normalized
  );
  if (
    config.lastSelectedFilePath &&
    path.normalize(config.lastSelectedFilePath).toLowerCase() === normalized
  ) {
    config.lastSelectedFilePath = null;
  }
  await writeConfig(config);
}

// Ensure directories exist at startup
await ensureAppDirs();
console.log(`[Dev Backend] App data: ${APP_DATA_DIR}`);
console.log(`[Dev Backend] DB dir:   ${DB_DIR}`);

// ─── HTTP Server ──────────────────────────────────────────────────────────────
const PORT = 6970;

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-File-Name',
    };

    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: { ...corsHeaders, 'Access-Control-Max-Age': '86400' },
      });
    }

    const url = new URL(req.url);

    // DB file upload endpoint — saves to user's DB_DIR (not project folder)
    if (req.method === 'POST' && url.pathname === '/api/upload-db') {
      try {
        const fileName = decodeURIComponent(
          (req.headers.get('x-file-name') as string) || 'uploaded.db'
        );
        const safeFileName = path
          .basename(fileName)
          .replace(/[^a-zA-Z0-9._\- ]/g, '_');
        const destPath = path.join(DB_DIR, safeFileName);

        const arrayBuffer = await req.arrayBuffer();
        await Bun.write(destPath, arrayBuffer);

        return new Response(
          JSON.stringify({ filePath: destPath, name: safeFileName }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      } catch (err: any) {
        console.error('[Dev Backend] Upload error:', err);
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    if (req.method === 'POST' && url.pathname === '/api/ipc') {
      try {
        const body = await req.json();
        const { action, args = [] } = body;
        let result: any = null;

        switch (action) {
          case IPC_ACTIONS.DB_CREATE: {
            const dbPath = args[0] as string;
            const countryCode = args[1];
            const code = await databaseManager.createNewDatabase(dbPath, countryCode);
            // Register in persistent config so it shows up in DB list always
            await upsertDbInConfig(dbPath);
            result = { data: code };
            break;
          }

          case IPC_ACTIONS.DB_CONNECT: {
            const dbPath = args[0] as string;
            const countryCode = args[1];
            try {
              const code = await databaseManager.connectToDatabase(dbPath, countryCode);
              // Register in persistent config so it shows up in DB list always
              await upsertDbInConfig(dbPath);
              result = { data: code };
            } catch (err: any) {
              const isCorrupt =
                err?.code === 'SQLITE_CORRUPT' ||
                err?.message?.includes('malformed');
              if (isCorrupt) {
                console.error(`[Dev Backend] DB is corrupt or malformed: ${dbPath}`);
                throw Object.assign(
                  new Error(`Database file is corrupt or malformed: ${dbPath}`),
                  { code: 'SQLITE_CORRUPT' }
                );
              }
              throw err;
            }
            break;
          }

          case IPC_ACTIONS.DB_CALL: {
            const method = args[0];
            const methodArgs = args.slice(1);
            const data = await databaseManager.call(method, ...methodArgs);
            result = { data };
            break;
          }

          case IPC_ACTIONS.DB_BESPOKE: {
            const method = args[0];
            const methodArgs = args.slice(1);
            const data = await databaseManager.callBespoke(method, ...methodArgs);
            result = { data };
            break;
          }

          case IPC_ACTIONS.DB_SCHEMA: {
            const schema = await databaseManager.getSchemaMap();
            result = { data: schema };
            break;
          }

          case IPC_ACTIONS.GET_ENV: {
            result = {
              data: {
                isDevelopment: true,
                platform: process.platform,
                version: '0.37.8',
              },
            };
            break;
          }

          case IPC_ACTIONS.GET_DB_DEFAULT_PATH: {
            // Returns a default save path inside the user's DB_DIR
            const companyName = (args[0] as string) || 'company';
            result = { data: path.join(DB_DIR, `${companyName}.db`) };
            break;
          }

          case IPC_ACTIONS.CHECK_DB_ACCESS: {
            const filePath = args[0] as string;
            const exists = await Bun.file(filePath).exists();
            result = { data: exists };
            break;
          }

          case IPC_ACTIONS.SAVE_DATA: {
            const data = args[0];
            const savePath = args[1];
            await Bun.write(savePath, data);
            result = { data: true };
            break;
          }

          case IPC_ACTIONS.DELETE_FILE: {
            const filePath = args[0] as string;
            try {
              await fs.unlink(filePath);
              // Also remove from persistent config so it won't reappear
              await removeDbFromConfig(filePath);
              result = { data: { success: true } };
            } catch (err: any) {
              result = {
                data: {
                  success: false,
                  error: { name: err.name, message: err.message },
                },
              };
            }
            break;
          }

          case IPC_ACTIONS.READ_DOC_FILE: {
            const relPath = args[0];
            const decodedPath = decodeURIComponent(relPath);
            const cwd = process.cwd();
            const resourceDir = process.env.APP_RESOURCE_DIR;
            const basePath = resourceDir
              ? path.join(resourceDir, 'books')
              : cwd.endsWith('src-tauri')
                ? path.join(cwd, '..', 'books')
                : path.join(cwd, 'books');
            const fullPath = path.join(basePath, decodedPath);
            const file = Bun.file(fullPath);
            const data = await file.text();
            result = { data };
            break;
          }

          case IPC_ACTIONS.READ_DOC_DATA: {
            const relPath = args[0];
            const decodedPath = decodeURIComponent(relPath);
            const cwd = process.cwd();
            const resourceDir = process.env.APP_RESOURCE_DIR;
            const basePath = resourceDir
              ? path.join(resourceDir, 'books')
              : cwd.endsWith('src-tauri')
                ? path.join(cwd, '..', 'books')
                : path.join(cwd, 'books');
            const fullPath = path.join(basePath, decodedPath);
            const file = Bun.file(fullPath);
            const data = await file.arrayBuffer();
            const ext = path.extname(fullPath).toLowerCase().slice(1);
            const mime =
              ext === 'png'
                ? 'image/png'
                : ext === 'jpg' || ext === 'jpeg'
                  ? 'image/jpeg'
                  : 'application/octet-stream';
            result = {
              data: `data:${mime};base64,${Buffer.from(data).toString('base64')}`,
            };
            break;
          }

          case IPC_ACTIONS.GET_LANGUAGE_MAP: {
            const code = args[0];
            const languageMap = await getLanguageMap(code);
            result = { data: { languageMap, success: true, message: '' } };
            break;
          }

          case IPC_ACTIONS.GET_TEMPLATES: {
            const posPrintWidth = args[0];
            const templates = await getTemplates(posPrintWidth);
            result = { data: templates };
            break;
          }

          case IPC_ACTIONS.SEND_API_REQUEST: {
            const endpoint = args[0];
            const options = args[1];
            const data = await sendAPIRequest(endpoint, options);
            result = { data };
            break;
          }

          case IPC_ACTIONS.GET_DB_LIST: {
            // Read all known databases from the persistent config file.
            // This mirrors electron-store: the list always survives restarts.
            const config = await readConfig();
            const list: any[] = [];
            const addedPaths = new Set<string>();

            for (const entry of config.files) {
              if (!entry?.dbPath) continue;
              const normalized = path.normalize(entry.dbPath).toLowerCase();
              if (addedPaths.has(normalized)) continue;
              try {
                const file = Bun.file(entry.dbPath);
                const exists = await file.exists();
                // Skip if file no longer exists or is too small to be a valid SQLite DB
                if (!exists || file.size < 4096) continue;
                addedPaths.add(normalized);
                list.push({
                  companyName: entry.companyName || path.basename(entry.dbPath, '.db'),
                  dbPath: entry.dbPath,
                  modified: new Date(file.lastModified).toISOString(),
                });
              } catch {
                // skip inaccessible files
              }
            }

            result = { data: list };
            break;
          }

          case IPC_ACTIONS.SELECT_FILE:
          case IPC_ACTIONS.GET_OPEN_FILEPATH: {
            // In dev/web mode, show the last known DB from config, or prompt user to upload
            const config = await readConfig();
            const knownFiles = config.files.filter((f) => f.dbPath);
            const targetDb =
              knownFiles.length > 0 ? knownFiles[0].dbPath : null;

            result = {
              data: targetDb
                ? {
                    canceled: false,
                    filePaths: [targetDb],
                    filePath: targetDb,
                    name: path.basename(targetDb),
                    success: true,
                  }
                : { canceled: true, filePaths: [], filePath: null },
            };
            break;
          }

          case IPC_ACTIONS.GET_SAVE_FILEPATH: {
            // In dev/web mode: simulate a save dialog by returning a path in the user's DB_DIR.
            // The file name comes from defaultPath option (e.g. "MyCompany.db").
            const options = args[0] as { defaultPath?: string } | undefined;
            const defaultName = options?.defaultPath || 'company.db';
            const safeName = path.basename(defaultName).replace(/[^a-zA-Z0-9._\- ]/g, '_');
            result = {
              data: {
                canceled: false,
                filePath: path.join(DB_DIR, safeName),
              },
            };
            break;
          }

          case IPC_ACTIONS.GET_CREDS: {
            result = { data: { errorLogUrl: '', tokenString: '', telemetryUrl: '' } };
            break;
          }

          case IPC_ACTIONS.INIT_SCHEDULER:
          case IPC_ACTIONS.CHECK_FOR_UPDATES: {
            result = { data: true };
            break;
          }

          case IPC_ACTIONS.SAVE_HTML_AS_PDF: {
            console.warn(
              '[Dev Backend] SAVE_HTML_AS_PDF called but playwright is removed for Tauri sidecar'
            );
            result = { data: '' };
            break;
          }

          default:
            throw new Error(`Unsupported IPC action: ${action}`);
        }

        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (err: any) {
        console.error('[Dev Backend] Error processing action:', err);
        return new Response(
          JSON.stringify({
            error: {
              name: err.name || 'Error',
              message: err.message || String(err),
            },
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    return new Response('Not Found', { status: 404 });
  },
});

console.log(`[Dev Backend] Running at http://localhost:${server.port}`);
