import fs from "fs/promises";
import { constants } from "fs";
import path from "path";
import databaseManager from "../../backend/database/manager";
import { getLanguageMap } from "../../backend/shims/getLanguageMap";
import { getTemplates } from "../../backend/shims/getTemplates";
import { sendAPIRequest } from "../../backend/shims/api";
import { IPC_ACTIONS } from "../../utils/messages";

const PORT = 6970;

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    // Setup CORS headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-File-Name",
    };

    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          ...corsHeaders,
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    const url = new URL(req.url);

    // DB file upload endpoint — receives raw binary .db file, saves to /dbs
    if (req.method === "POST" && url.pathname === "/api/upload-db") {
      try {
        const fileName = decodeURIComponent(
          (req.headers.get("x-file-name") as string) || "uploaded.db",
        );
        const safeFileName = path
          .basename(fileName)
          .replace(/[^a-zA-Z0-9._\- ]/g, "_");
        const dbsDir = path.resolve("dbs");
        const destPath = path.join(dbsDir, safeFileName);

        const arrayBuffer = await req.arrayBuffer();
        await Bun.write(destPath, arrayBuffer);

        return new Response(
          JSON.stringify({ filePath: destPath, name: safeFileName }),
          {
            status: 200,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          },
        );
      } catch (err: any) {
        console.error("[Dev Backend] Upload error:", err);
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        });
      }
    }

    if (req.method === "POST" && url.pathname === "/api/ipc") {
      try {
        const body = await req.json();
        const { action, args = [] } = body;
        let result: any = null;
        // Silent IPC actions for a clean console output

        switch (action) {
          case IPC_ACTIONS.DB_CREATE: {
            const dbPath = args[0];
            const countryCode = args[1];
            const code = await databaseManager.createNewDatabase(
              dbPath,
              countryCode,
            );
            result = { data: code };
            break;
          }
          case IPC_ACTIONS.DB_CONNECT: {
            const dbPath = args[0];
            const countryCode = args[1];
            try {
              const code = await databaseManager.connectToDatabase(
                dbPath,
                countryCode,
              );
              result = { data: code };
            } catch (err: any) {
              const isCorrupt =
                err?.code === "SQLITE_CORRUPT" ||
                err?.message?.includes("malformed");
              if (isCorrupt) {
                console.error(
                  `[Dev Backend] DB is corrupt or malformed: ${dbPath}`,
                );
                throw Object.assign(
                  new Error(`Database file is corrupt or malformed: ${dbPath}`),
                  { code: "SQLITE_CORRUPT" },
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
            const data = await databaseManager.callBespoke(
              method,
              ...methodArgs,
            );
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
                version: "0.37.8",
              },
            };
            break;
          }
          case IPC_ACTIONS.GET_DB_DEFAULT_PATH: {
            const companyName = args[0];
            // Store DBs in the dbs directory during web dev
            const dbsDir = path.resolve("dbs");
            await fs.mkdir(dbsDir, { recursive: true });
            result = { data: path.join(dbsDir, `${companyName}.db`) };
            break;
          }
          case IPC_ACTIONS.CHECK_DB_ACCESS: {
            const filePath = args[0];
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
            const filePath = args[0];
            try {
              await fs.unlink(filePath);
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
            const fullPath = path.join(process.cwd(), "books", decodedPath);
            const file = Bun.file(fullPath);
            const data = await file.text();
            result = { data };
            break;
          }
          case IPC_ACTIONS.READ_DOC_DATA: {
            const relPath = args[0];
            const decodedPath = decodeURIComponent(relPath);
            const fullPath = path.join(process.cwd(), "books", decodedPath);
            const file = Bun.file(fullPath);
            const data = await file.arrayBuffer();
            const ext = path.extname(fullPath).toLowerCase().slice(1);
            const mime =
              ext === "png"
                ? "image/png"
                : ext === "jpg" || ext === "jpeg"
                  ? "image/jpeg"
                  : "application/octet-stream";
            result = {
              data: `data:${mime};base64,${Buffer.from(data).toString("base64")}`,
            };
            break;
          }
          case IPC_ACTIONS.GET_LANGUAGE_MAP: {
            const code = args[0];
            const languageMap = await getLanguageMap(code);
            result = { data: { languageMap, success: true, message: "" } };
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
            const dbsDir = path.resolve("dbs");
            try {
              const glob = new Bun.Glob("*.db");
              const dbFiles = Array.from(glob.scanSync({ cwd: dbsDir }));
              const list: any[] = [];
              for (const f of dbFiles) {
                const filePath = path.join(dbsDir, f);
                try {
                  const file = Bun.file(filePath);
                  // Quick sanity check: file must be at least 4KB (SQLite header)
                  if (file.size < 4096) continue;
                  list.push({
                    companyName: f.replace(".db", ""),
                    dbPath: filePath,
                    modified: new Date(file.lastModified).toISOString(),
                  });
                } catch {
                  // skip inaccessible or missing files
                }
              }
              result = { data: list };
            } catch {
              result = { data: [] };
            }
            break;
          }
          case IPC_ACTIONS.SELECT_FILE:
          case IPC_ACTIONS.GET_OPEN_FILEPATH: {
            // Default to the first user database in dbs/, or fall back to an internal demo.db
            const dbsDir = path.resolve("dbs");
            let targetDb = path.resolve("drizzle", "db", "demo.db");
            try {
              const glob = new Bun.Glob("*.db");
              const dbFiles = Array.from(glob.scanSync({ cwd: dbsDir }));
              if (dbFiles.length > 0) {
                targetDb = path.join(dbsDir, dbFiles[0]);
              }
            } catch {}
            result = {
              data: {
                canceled: false,
                filePaths: [targetDb],
                filePath: targetDb,
                name: path.basename(targetDb),
                success: true,
              },
            };
            break;
          }
          case IPC_ACTIONS.GET_SAVE_FILEPATH: {
            result = {
              data: {
                canceled: false,
                filePath: path.resolve("dbs/saved_file.db"),
              },
            };
            break;
          }
          case IPC_ACTIONS.GET_CREDS: {
            result = {
              data: { errorLogUrl: "", tokenString: "", telemetryUrl: "" },
            };
            break;
          }
          case IPC_ACTIONS.INIT_SCHEDULER:
          case IPC_ACTIONS.CHECK_FOR_UPDATES: {
            result = { data: true };
            break;
          }
          case IPC_ACTIONS.STORE_ALL: {
            const configPath = path.resolve("dbs", "config.json");
            let data = {};
            try {
              const file = Bun.file(configPath);
              if (await file.exists()) {
                data = await file.json();
              }
            } catch (err) {
              console.error("[Dev Backend] Error reading config.json:", err);
            }
            result = { data };
            break;
          }
          case IPC_ACTIONS.STORE_SET: {
            const key = args[0] as string;
            const value = args[1];
            const configPath = path.resolve("dbs", "config.json");
            let data: Record<string, any> = {};
            try {
              const file = Bun.file(configPath);
              if (await file.exists()) {
                data = await file.json();
              }
            } catch (err) {
              // ignore if file doesn't exist or is invalid JSON
            }
            data[key] = value;
            const dbsDir = path.resolve("dbs");
            await fs.mkdir(dbsDir, { recursive: true });
            await Bun.write(configPath, JSON.stringify(data, null, 2));
            result = { data: true };
            break;
          }
          case IPC_ACTIONS.STORE_DELETE: {
            const key = args[0] as string;
            const configPath = path.resolve("dbs", "config.json");
            let data: Record<string, any> = {};
            try {
              const file = Bun.file(configPath);
              if (await file.exists()) {
                data = await file.json();
              }
            } catch (err) {
              // ignore if file doesn't exist or is invalid JSON
            }
            delete data[key];
            const dbsDir = path.resolve("dbs");
            await fs.mkdir(dbsDir, { recursive: true });
            await Bun.write(configPath, JSON.stringify(data, null, 2));
            result = { data: true };
            break;
          }
          case IPC_ACTIONS.SAVE_HTML_AS_PDF: {
            const html = args[0];
            const savePath = args[1];
            const width = args[2];
            const height = args[3];

            const { chromium } = await import("playwright");
            const browser = await chromium.launch({ channel: "chrome" });
            try {
              const page = await browser.newPage();
              await page.setContent(html);
              const pdfBuffer = await page.pdf({
                width: `${width}cm`,
                height: `${height}cm`,
                printBackground: true,
                margin: {
                  top: "0px",
                  bottom: "0px",
                  left: "0px",
                  right: "0px",
                },
              });
              result = { data: pdfBuffer.toString("base64") };
            } finally {
              await browser.close();
            }
            break;
          }
          default:
            throw new Error(`Unsupported IPC action: ${action}`);
        }

        return new Response(JSON.stringify(result), {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        });
      } catch (err: any) {
        console.error("[Dev Backend] Error processing action:", err);
        return new Response(
          JSON.stringify({
            error: {
              name: err.name || "Error",
              message: err.message || String(err),
            },
          }),
          {
            status: 500,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          },
        );
      }
    }

    return new Response("Not Found", { status: 404 });
  },
});

console.log(`[Dev Backend] Running at http://localhost:${server.port}`);
