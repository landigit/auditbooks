---
trigger: model_decision
---

- run with electron.log after the command to capture the electron logs
  Since you are upgrading to **Electron 34** and **Node 22**, your safety criteria have changed. Some of these are "safe" because they fix compatibility issues, while others are "risky" because they require significant code changes.

Here is the breakdown of what is safe to move and what requires caution:

---

## 🟢 Category 1: Safe & Highly Recommended

These updates are almost mandatory for your move to Electron 34/Node 22.

### **better-sqlite3 (9.6.0 ❯ 12.9.0)**

- **Why:** This is the most critical update. Version 12+ is specifically optimized for the **C++20** standard required by Electron 34.

* **Safety:** Very high. The JavaScript API remains largely the same, but the internal binary stability is much better for Node 22.
* **Action:** Move this first.

### **luxon (2.5.2 ❯ 3.7.2)**

- **Why:** Luxon 3.x is a direct upgrade that removes support for very old browsers/Node versions that you aren't using anyway.

* **Safety:** High. Most functions are identical. It handles modern Time Zone data much better in Node 22.
* **Action:** Safe to move.

### **electron-store (8.0.1 ❯ 11.0.2)**

- **Why:** Version 11 adds full support for modern Electron APIs and is written in pure ESM (EcmaScript Modules).

* **Safety:** High, provided your build script (Vite) handles ESM (which yours does).
* **Action:** Safe to move.

---

## 🟡 Category 2: Proceed with Caution

These are safe for the _system_, but might require you to fix your code.

### **knex (2.4.0 ❯ 3.2.9)**

- **The Risk:** Knex 3.0 introduced some breaking changes in how it handles specific database drivers and migrations.

* **In your app:** Since you use SQLite, check if you use any custom `raw` queries. Most standard query-building code will work fine.
* **Verdict:** Safe for the environment, but **test your database migrations** immediately after.

### **node-fetch (2.6.7 ❯ 3.3.2)**

- **The Risk:** Version 3 is **ESM-only**.

* **In your app:** If your `dev.mjs` or `build.mjs` uses `require('node-fetch')`, it will **break** instantly. You must use `import fetch from 'node-fetch'`.
* **Pro-Tip:** Node 22 now has a built-in `fetch()`. You might not even need this package anymore!

---

## 🔴 Category 3: High Risk (Potential Refactor)

### **vue-router (4.0.12 ❯ 5.0.4)**

- **The Risk:** Vue Router 5 includes several changes to how navigation guards and "scrolling behavior" work.

* **Safety:** Low. This is the most likely to cause "white screen" errors or broken navigation in your UI.
* **Action:** Keep this for last. Upgrade it only after the app is stable on Electron 34.

---

## 🛠️ Recommended Update Order

If I were managing this for you, I would do it in this specific order to minimize "debug headaches":

1. **Level 1 (The Foundation):** `better-sqlite3` and `luxon`.
2. **Level 2 (The Config):** `electron-store`.
3. **Level 3 (The Logic):** `knex`.
4. **Level 4 (The UI):** `vue-router`.

**Wait on `node-fetch`:** Since you're on Node 22, try replacing `node-fetch` with the native `fetch()` API. It’s one less dependency to manage in your bookkeeping app!
