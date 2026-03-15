import { Hono } from 'https://deno.land/x/hono@v3.11.7/mod.ts';
import { cors } from 'https://deno.land/x/hono@v3.11.7/middleware/cors/index.ts';
import { serveStatic } from 'https://deno.land/x/hono@v3.11.7/adapter/deno/serve-static.ts';
import { DB } from 'https://deno.land/x/sqlite@v3.9.1/mod.ts';

const app = new Hono();

// Enable CORS
app.use('/auth/*', cors());
app.use('/data/*', cors());

// Initialize Deno KV
const kv = await Deno.openKv();

// --- Authentication Routes ---

app.post("/auth/signup", async (c) => {
  try {
    const { email, password, name, username } = await c.req.json();
    if (!email || !password) return c.json({ error: "Email and password required" }, 400);
    const existing = await kv.get(["users", email]);
    if (existing.value) return c.json({ error: "User already exists" }, 400);
    const user = { email, name, username, password };
    await kv.set(["users", email], user);
    await logActivity(email, "Signed up");
    return c.json({ message: "User created successfully", user: { email, name, username } });
  } catch (err) { return c.json({ error: err.message }, 500); }
});

app.post("/auth/login", async (c) => {
  try {
    const { email, password } = await c.req.json();
    const userResult = await kv.get(["users", email]);
    const user = userResult.value as any;
    if (!user || user.password !== password) return c.json({ error: "Invalid credentials" }, 401);
    const token = btoa(JSON.stringify({ email, ts: Date.now() }));
    await kv.set(["sessions", token], email, { expireIn: 3600000 });
    await logActivity(email, "Logged in");
    return c.json({ token, user: { email: user.email, name: user.name, username: user.username } });
  } catch (err: any) { return c.json({ error: err.message }, 500); }
});

// --- Fyo Database API ---

app.get("/data/db/getSchema", async (c) => {
  try {
    const schemasText = await Deno.readTextFile("backend/schemas.json");
    const schemaMap = JSON.parse(schemasText);
    return c.json({ data: schemaMap, success: true });
  } catch (err) {
    console.error("Failed to read schemas.json:", err);
    return c.json({ data: {}, success: true });
  }
});

app.post("/data/db/create", async (c) => {
  const { dbPath, countryCode } = await c.req.json();
  await kv.set(["config", "countryCode"], countryCode);
  return c.json({ data: countryCode, success: true });
});

app.post("/data/db/connect", async (c) => {
  const countryCode = (await kv.get(["config", "countryCode"])).value || 'in';
  return c.json({ data: countryCode, success: true });
});

app.post("/data/db/call", async (c) => {
  try {
    const { method, args } = await c.req.json();
    let data;

    switch (method) {
      case 'insert': {
        const [schemaName, record] = args;
        const name = record.name || crypto.randomUUID();
        const newRecord = { ...record, name, modified: new Date().toISOString() };
        await kv.set(["records", schemaName, name], newRecord);
        data = newRecord;
        break;
      }
      case 'get': {
        const [schemaName, name] = args;
        const res = await kv.get(["records", schemaName, name]);
        data = res.value;
        break;
      }
      case 'getAll': {
        const [schemaName, options] = args;
        const iter = kv.list({ prefix: ["records", schemaName] });
        const records = [];
        for await (const res of iter) records.push(res.value);
        data = records;
        break;
      }
      case 'update': {
        const [schemaName, record] = args;
        if (!record.name) throw new Error("Record name required for update");
        await kv.set(["records", schemaName, record.name], { ...record, modified: new Date().toISOString() });
        data = record;
        break;
      }
      case 'delete': {
        const [schemaName, name] = args;
        await kv.delete(["records", schemaName, name]);
        data = true;
        break;
      }
      case 'getSingleValues': {
        const results = [];
        for (const arg of args) {
          const { fieldname, parent } = typeof arg === 'string' ? { fieldname: arg, parent: 'undefined' } : arg;
          const res = await kv.get(["records", parent, fieldname]);
          results.push({ fieldname, parent, value: res.value });
        }
        data = results;
        break;
      }
      case 'exists': {
        const [schemaName, name] = args;
        const res = await kv.get(["records", schemaName, name]);
        data = !!res.value;
        break;
      }
      default:
        return c.json({ error: { name: 'NotImplemented', message: `Method ${method} not implemented in Deno backend` } });
    }

    return c.json({ data, success: true });
  } catch (err: any) {
    return c.json({ error: { name: 'DatabaseError', message: err.message } });
  }
});

app.post("/data/db/bespoke", async (c) => {
  const { method, args } = await c.req.json();
  return c.json({ data: null, success: true });
});

// --- Generic Records API ---

app.get("/data/records/:schemaName", async (c) => {
  const schemaName = c.req.param("schemaName");
  const iter = kv.list({ prefix: ["records", schemaName] });
  const records = [];
  for await (const res of iter) records.push(res.value);
  return c.json(records);
});

app.post("/data/records/:schemaName", async (c) => {
  try {
    const schemaName = c.req.param("schemaName");
    const data = await c.req.json();
    const name = data.name || crypto.randomUUID();
    const record = { ...data, name, modified: new Date().toISOString() };
    await kv.set(["records", schemaName, name], record);
    await logActivity("system", `Saved ${schemaName}: ${name}`);
    return c.json({ success: true, record });
  } catch (err) { return c.json({ error: err.message }, 500); }
});

app.delete("/data/records/:schemaName/:name", async (c) => {
  const { schemaName, name } = c.req.param();
  await kv.delete(["records", schemaName, name]);
  return c.json({ success: true });
});

// --- Logs ---
app.get("/data/logs", async (c) => {
  const iter = kv.list({ prefix: ["logs"] }, { reverse: true, limit: 50 });
  const logs = [];
  for await (const res of iter) logs.push(res.value);
  return c.json(logs);
});

// --- Portless/Unified Serving (Vercel Style) ---
// Serve static files from the 'dist' directory
app.use('/*', serveStatic({ root: './dist_electron/build/src' }));

// Fallback to index.html for SPA routing
app.get('*', async (c) => {
  try {
    const html = await Deno.readTextFile("./dist_electron/build/src/index.html");
    return c.html(html);
  } catch {
    return c.text("AuditBooks Backend is running. Frontend build (dist) not found.", 404);
  }
});

async function logActivity(userId: string, action: string) {
  const timestamp = new Date().toISOString();
  const logKey = ["logs", timestamp, Math.random().toString(36).substr(2, 5)];
  await kv.set(logKey, { user_id: userId, action, timestamp });
}

const PORT = 8080;
console.log(`🚀 AuditBooks Portless Backend running on http://localhost:${PORT}`);

Deno.serve({ port: PORT }, app.fetch);
