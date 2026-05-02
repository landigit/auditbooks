# ESM Transition Analysis: Auditbooks

Switching the project to **ECMAScript Modules (ESM)** is a significant architectural change. While the frontend (Vue/Vite) is already ESM-friendly, the **Main Process (Electron)** and **Build Scripts** are currently anchored in **CommonJS**.

## 1. Project-Level Blockers

### `package.json` Configuration
- **Current State**: No `"type": "module"` specified.
- **Requirement**: Add `"type": "module"` to `package.json`.
- **Impact**: This forces all `.js` and `.ts` files to be treated as ESM by Node.js. Configuration files like `.eslintrc.js` or `tailwind.config.js` will likely need to be renamed to `.cjs` if they continue to use `module.exports`.

## 2. Main Process Blockers (`main.ts`)

### Global Variables
- **Blocker**: Extensive use of `__dirname` (e.g., `path.join(__dirname, 'preload.js')`).
- **Fix**: In ESM, `__dirname` and `__filename` do not exist. They must be replaced with:
  ```typescript
  import { fileURLToPath } from 'url';
  import { dirname } from 'path';
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  ```

### Static `require` Calls
- **Blocker**: `require('source-map-support').install(...)` at the top of `main.ts`.
- **Fix**: Replace with `import` or use `createRequire` from the `module` package for legacy dependencies.

## 3. Build & Bundling Blockers

### `esbuild` Configuration (`build/scripts/helpers.mjs`)
- **Current State**: Defaults to `cjs` output for the main process.
- **Requirement**: Set `format: 'esm'` in the `esbuild` configuration.
- **Challenge**: Native modules like `better-sqlite3` must be handled correctly. ESM does not support direct `.node` file imports without specific loader configurations or bundling strategies (e.g., using `createRequire` to load the native binary).

### Module Resolution
- **Issue**: ESM strictly requires file extensions in imports (e.g., `import { helper } from './helper.js'`).
- **Current State**: The project uses extension-less imports (e.g., `import { fyo } from './initFyo'`).
- **Resolution**: While the bundler (esbuild/Vite) can resolve these, any scripts run directly via `node` or `ts-node` will fail unless the `--experimental-specifier-resolution=node` flag is used or extensions are added.

## 4. Dependency Considerations

### `better-sqlite3` & `knex`
- **Native Modules**: `better-sqlite3` is a C++ addon. Loading native modules in ESM can be brittle in Electron.
- **Knex**: `knex` relies heavily on dynamic `require` for loading database drivers. Using it in a pure ESM environment often requires `createRequire` to bridge the gap.

## 5. Recommended Roadmap

1.  **Renaming Configs**: Rename `.js` config files that use `module.exports` to `.cjs`.
2.  **Updating `main.ts`**: Replace `__dirname` with `import.meta.url` logic.
3.  **Update `package.json`**: Set `"type": "module"`.
4.  **Update Bundler**: Set `esbuild` to output ESM and verify Electron can load the resulting `main.js`.
5.  **Test Native Modules**: Thoroughly test database connectivity in the ESM-bundled app.

> [!WARNING]
> Switching to ESM in a complex Electron app with native dependencies often leads to "unexpected" runtime errors during the transition phase. Incremental testing is mandatory.
