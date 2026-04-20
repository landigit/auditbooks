# 🔧 Build Stabilization — Issues & Fixes
### Frappe Books · Electron 22 + Vue 3 + Vite 5 + TypeScript 5 + Vitest 2

---

## Executive Summary

The project has **12 distinct stability issues** falling into 4 categories:

| Category | Count | Severity |
|----------|-------|----------|
| Missing files / broken imports | 3 | 🔴 Critical |
| Config errors & mismatches | 4 | 🟠 High |
| Dependency version conflicts | 3 | 🟠 High |
| Architecture / code quality | 2 | 🟡 Medium |

---

## Issue 1 — `src/tests/setup.ts` Does Not Exist

### Root Cause
`vitest.config.ts` line 10 declares:
```ts
setupFiles: ['src/tests/setup.ts'],
```
But `src/tests/` only contains `stores/app.spec.ts` — there is **no `setup.ts`** file at all.
Vitest tries to import this file before running any tests and immediately fails with a **"Failed to load url"** error.

### Impact: 🔴 Critical — ALL tests fail, zero test coverage

### Fix
Create the missing file `src/tests/setup.ts`:
```ts
// src/tests/setup.ts
import { config } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach } from 'vitest';

// Install Pinia globally for all tests
beforeEach(() => {
  setActivePinia(createPinia());
});

// Optional: global component stubs
config.global.stubs = {
  teleport: true,
};
```

> This also satisfies `src/tests/stores/app.spec.ts` which imports Pinia stores.

---

## Issue 2 — `src/stores/` Directory is Completely Empty

### Root Cause
`package.json` lists `pinia: ^2.2.0` as a production dependency, and `src/tests/stores/app.spec.ts` imports `src/stores/app` (a Pinia store). But **`src/stores/` is empty** — no store files exist.

This causes:
- `app.spec.ts` to fail to compile
- The renderer to potentially fail at runtime if anything tries to use a store

### Impact: 🔴 Critical — test file import crash + runtime risk

### Fix
Create the missing app store `src/stores/app.ts`:
```ts
// src/stores/app.ts
import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useAppStore = defineStore('app', () => {
  const isReady = ref(false);
  const isDevelopment = ref(false);
  const platform = ref<'Windows' | 'Mac' | 'Linux'>('Linux');
  const language = ref('English');
  const appVersion = ref('');

  function setReady(value: boolean) {
    isReady.value = value;
  }

  return {
    isReady,
    isDevelopment,
    platform,
    language,
    appVersion,
    setReady,
  };
});
```

> Verify what `app.spec.ts` actually imports and align the exported shape.

---

## Issue 3 — `fyo` Path Alias Missing from `tsconfig.json`

### Root Cause
`vite.config.ts`, `vitest.config.ts`, and `build/scripts/build.mjs` all define:
```js
fyo: path.resolve(__dirname, './fyo'),
```
But `tsconfig.json` paths section does **not include `fyo`**:
```json
"paths": {
  "src/*":      ["src/*"],
  "schemas/*":  ["schemas/*"],
  // ...
  // ❌ fyo/* is MISSING
}
```
TypeScript's language server (`vue-tsc` and IDE intellisense) cannot resolve any `import ... from 'fyo/...'` statement. This causes thousands of phantom type errors and blocks `vue-tsc` from succeeding.

### Impact: 🟠 High — type checking broken, IDE errors everywhere

### Fix — add to `tsconfig.json`:
```json
"paths": {
  "src/*":       ["src/*"],
  "fyo/*":       ["fyo/*"],     // ← ADD THIS
  "schemas/*":   ["schemas/*"],
  "main/*":      ["main/*"],
  "backend/*":   ["backend/*"],
  "regional/*":  ["regional/*"],
  "fixtures/*":  ["fixtures/*"],
  "reports/*":   ["reports/*"],
  "models/*":    ["models/*"],
  "utils/*":     ["utils/*"],
  "dummy/*":     ["dummy/*"]
}
```

---

## Issue 4 — Electron Version (22) vs Node ABI Mismatch with better-sqlite3

### Root Cause
`package.json` pins:
```json
"electron": "22.3.27"
```
Electron 22 embeds **Node.js 16.17.1** (ABI version 108), but `better-sqlite3 ^9.2.2` ships prebuilt binaries targeting **Node ABI 110+** (Node 18+).

The `postinstall` script runs `electron-rebuild` which should recompile the `.node` binary against Electron 22's headers — but this depends on the correct `node-abi` resolution AND a working MSVC / node-gyp toolchain on Windows.

The `resolutions` field:
```json
"resolutions": { "node-abi": "^3.54.0" }
```
is a Yarn v1 resolution but only applies to the package dependency graph — it does **not** fix the ABI of the compiled binary.

### Impact: 🟠 High — app crashes on launch / tests crash when SQLite is touched

### Fix (3-step)

**Step 1**: Force exact Electron version pin (prevents accidental upgrades):
```json
"electron": "22.3.27"
```
(Already correct — keep as-is.)

**Step 2**: Add explicit rebuild configuration to `package.json`:
```json
"build": {
  "electronVersion": "22.3.27",
  "electronRebuildConfig": {
    "buildFromSource": true
  }
}
```

**Step 3**: Run rebuild manually and verify:
```powershell
# In the project root
npx @electron/rebuild --version 22.3.27 --module-dir . --force
```

> On Windows, MSVC Build Tools + Python 3 must be available for node-gyp. If CI/CD is used, add this to the pipeline before `yarn install`.

**Alternative (avoid rebuild entirely)**:
Upgrade Electron to **v28+** which uses Node.js 18 (ABI 108→115 compatible with better-sqlite3 v9):
```json
"electron": "28.3.3"
```
Then update all Electron-related deps accordingly.

---

## Issue 5 — `vitest.config.ts` Missing `vue` Alias

### Root Cause
`vite.config.ts` defines the crucial alias:
```ts
vue: 'vue/dist/vue.esm-bundler.js',
```
This ensures Vue's template compiler is included for runtime compilation. But **`vitest.config.ts` does NOT have this alias**:
```ts
// vitest.config.ts — resolve.alias block
resolve: {
  alias: {
    fyo: ...,
    src: ...,
    // ❌ vue alias is MISSING
  }
}
```
When Vitest imports `.vue` files during tests, it gets the wrong Vue bundle (runtime-only) causing `[Vue warn]: Component provided template option but runtime compilation is not supported` errors.

### Impact: 🟠 High — Vue component tests fail silently or with cryptic errors

### Fix — add to `vitest.config.ts`:
```ts
resolve: {
  alias: {
    vue: 'vue/dist/vue.esm-bundler.js',   // ← ADD THIS
    fyo: path.resolve(__dirname, './fyo'),
    src: path.resolve(__dirname, './src'),
    // ... rest of aliases
  },
},
```

---

## Issue 6 — `tailwind.config.js` Uses CommonJS `require()` (CJS/ESM Conflict)

### Root Cause
`tailwind.config.js` uses:
```js
const fs = require('fs');
module.exports = { ... };
```
This is CJS syntax. PostCSS loads it via `postcss.config.js` which also uses CJS:
```js
module.exports = { plugins: [require('tailwindcss'), ...] };
```
While this currently works (Node.js allows `.js` files as CJS by default when no `"type": "module"` is in `package.json`), **Vite 5 and TailwindCSS v4** (upcoming) will require ESM config files. Additionally, mixing CJS config files with ESM build scripts (`build.mjs`, `dev.mjs`, `electron-builder-config.mjs`) creates a fragile inconsistency that causes issues when tools try to `import` the config.

### Impact: 🟡 Medium — works now but will break on Tailwind v4 / Vite 6 upgrade

### Fix — convert to ESM (rename to `.cjs` to be explicit, OR update to ESM syntax):

**Option A (safest — keep CJS but be explicit):**
Rename `tailwind.config.js` → `tailwind.config.cjs` and `postcss.config.js` → `postcss.config.cjs`.

**Option B (modern — convert to ESM):**
```js
// tailwind.config.js (ESM)
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const colors = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'colors.json'), { encoding: 'utf-8' })
);

export default {
  darkMode: 'class',
  content: [
    './src/**/*.{vue,ts,html}',
    './main/**/*.{vue,ts}',
    './templates/**/*.html',
  ],
  theme: {
    // ... same as before
    extend: {
      colors,
      // ...
    },
  },
  plugins: [],  // tailwindcss-rtl must also be converted or replaced
};
```
> Note: `tailwindcss-rtl` may not support ESM — check its exports or use `createRequire` fallback.

---

## Issue 7 — `postcss.config.js` Uses Deprecated Plugin Loading

### Root Cause
```js
module.exports = {
  plugins: [require('tailwindcss'), require('autoprefixer')],
};
```
Modern PostCSS (v8+) and TailwindCSS v3.3+ expect plugins to be referenced as **strings or objects with options**, not pre-required module references. This causes issues with PostCSS's plugin resolution cache in Vite's HMR pipeline — config changes don't get picked up without a full restart.

### Impact: 🟡 Medium — HMR config refresh issues, future-proofing

### Fix:
```js
// postcss.config.js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```
> The object syntax is the officially recommended form for PostCSS 8 config files.

---

## Issue 8 — `renderer.ts` Uses `app.config.unwrapInjectedRef = true` (Deprecated)

### Root Cause
```ts
// src/renderer.ts line 36
app.config.unwrapInjectedRef = true;
```
This property was a **temporary workaround** for Vue 3.2's ref unwrapping in templates and was **removed in Vue 3.4**. Since `package.json` targets `vue: ^3.4.0`, this line will throw a runtime warning (or silently fail on some builds).

### Impact: 🟠 High — silent Vue deprecation warning, potential breakage on Vue 3.5+

### Fix
Remove the line entirely:
```ts
// src/renderer.ts
const app = createApp({ template: '<App/>' });
// ❌ Remove: app.config.unwrapInjectedRef = true;
setErrorHandlers(app);
```
The behavior it enabled (automatic ref unwrapping in `provide/inject`) is now **the default** in Vue 3.3+.

---

## Issue 9 — `App.vue` Uses Options API with Mixed `setup()` + `data()` + `methods`

### Root Cause
`App.vue` (329 lines) uses the old **Options API** style (`defineComponent` with `data()`, `methods`, `computed`, `watch`, `mounted`). This conflicts with the `setup()` block also present in the same component. In Vue 3.4+ with `@vitejs/plugin-vue ^5.0`, this mixing can cause:
- Incorrect reactivity binding order
- `this` context loss in methods that reference `setup()` return values
- Template compiler warnings about duplicate reactive references

Specific problematic pattern:
```ts
// setup() returns `databaseSelector`
setup() {
  const databaseSelector = ref<...>(null);
  return { databaseSelector };
},
// methods() also references it via `this.databaseSelector`
methods: {
  async handleConnectionFailed(error, actionSymbol) {
    await this.databaseSelector?.existingDatabase();  // ← risky
  }
}
```

### Impact: 🟡 Medium — subtle reactivity bugs, hard to debug

### Fix
Migrate `App.vue` to full **Composition API** using `<script setup>`:
```vue
<script setup lang="ts">
import { ref, computed, watch, onMounted, provide } from 'vue';
// ... all imports

const keys = useKeys();
const searcher = ref<null | Search>(null);
const shortcuts = new Shortcuts(keys);
const languageDirection = ref(getLanguageDirection(systemLanguageRef.value));
const databaseSelector = ref<InstanceType<typeof DatabaseSelector> | null>(null);

// Provide injection keys
provide(injectionKeys.keysKey, keys);
// ...

// Lifecycle
onMounted(async () => {
  await setInitialScreen();
  const darkMode = !!fyo.singles.SystemSettings?.darkMode;
  setDarkMode(darkMode);
  darkModeRef.value = darkMode;
});

// All methods become plain async functions
async function setInitialScreen() { ... }
// etc.
</script>
```
> This is a larger refactor — do it module by module, starting with `App.vue` as it's the root.

---

## Issue 10 — ESLint Ignores All Component Files (`src/components/**/*.vue`)

### Root Cause
`.eslintrc.js` line 61:
```js
ignorePatterns: [
  // ...
  'src/components/**/*.vue', // Incrementally fix these
  // ...
]
```
This comment says "incrementally fix" but the entire `src/components/` folder — which is likely the **largest Vue code surface** — is **completely excluded from linting**. This means:
- Type safety is not enforced in components
- No unused variable warnings
- No accessibility warnings
- No promise handling warnings

### Impact: 🟡 Medium — accumulating technical debt, bugs go undetected

### Fix (incremental approach)
Remove components directory from `ignorePatterns` and fix lint errors in batches:

```js
// .eslintrc.js — remove this line:
// 'src/components/**/*.vue',

// Instead, use overrides to relax specific rules per directory
overrides: [
  {
    files: ['src/components/**/*.vue'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'warn',  // warn, not error
      '@typescript-eslint/no-explicit-any': 'warn',
    }
  }
]
```
Run `yarn lint --fix` to auto-fix many issues, then handle remaining ones manually.

---

## Issue 11 — `@types/node` Version Mismatch

### Root Cause
```json
"@types/node": "^17.0.23"
```
This targets Node.js 17 type definitions, but:
- The project uses modern Node.js APIs (`fs.readFileSync`, `path`, `url`, etc.)
- Electron 22 embeds Node 16
- TypeScript 5.5 expects modern `@types/node` (v18+ or v20+)

Using v17 types while running on Electron 22 (Node 16 runtime) causes subtle type mismatches for newer Node APIs used in the build scripts.

### Impact: 🟠 High — type errors in build scripts, incorrect autocomplete

### Fix — update `@types/node` to match Electron 22's Node (16.x):
```json
"@types/node": "^16.18.0"
```
Or if you upgrade Electron to 28+ (Node 18):
```json
"@types/node": "^18.19.0"
```

---

## Issue 12 — `dev.mjs` Has Numeric Port Assigned to String Env Variable

### Root Cause
```js
// build/scripts/dev.mjs line 11
process.env['VITE_PORT'] = 6969;  // ← number, not string
```
`process.env` values are **always strings** in Node.js. Assigning a number (`6969`) coerces it to `"6969"` implicitly, but TypeScript (and ESLint) flag this as a type error. More importantly, when `vite.config.ts` reads it:
```ts
port = Number(process.env.VITE_PORT);  // "6969" → 6969  ✓
```
It works — but only due to implicit coercion. This is a fragile pattern that can silently break if checked with strict equality.

### Impact: 🟡 Low-Medium — type safety smell, potential env var parsing bugs

### Fix:
```js
// build/scripts/dev.mjs
process.env['VITE_PORT'] = '6969';  // ← explicit string
```

---

## Priority Order for Fixes

Apply fixes in this order for fastest stability return:

| Priority | Issue | File(s) to Change |
|----------|-------|-------------------|
| 1 | Create `src/tests/setup.ts` | `src/tests/setup.ts` (create new) |
| 2 | Create `src/stores/app.ts` | `src/stores/app.ts` (create new) |
| 3 | Add `fyo` to `tsconfig.json` paths | `tsconfig.json` |
| 4 | Add `vue` alias to `vitest.config.ts` | `vitest.config.ts` |
| 5 | Remove `unwrapInjectedRef` from renderer | `src/renderer.ts` |
| 6 | Fix `@types/node` version | `package.json` |
| 7 | Fix `VITE_PORT` string assignment | `build/scripts/dev.mjs` |
| 8 | Fix PostCSS config syntax | `postcss.config.js` |
| 9 | Rebuild better-sqlite3 against Electron | Terminal command |
| 10 | Fix Tailwind CJS/ESM inconsistency | `tailwind.config.js` |
| 11 | Incrementally enable ESLint for components | `.eslintrc.js` |
| 12 | Migrate App.vue to Composition API | `src/App.vue` (large refactor) |

---

## Quick Win Commands

```powershell
# 1. Rebuild native modules against Electron 22
npx @electron/rebuild --version 22.3.27 --force

# 2. Run type check (should have fewer errors after fixes 1-4)
yarn vue-tsc --noEmit

# 3. Run all tests
yarn test

# 4. Run linter
yarn lint

# 5. Run dev mode (verifies Vite + Electron work together)
yarn dev
```

---

## Long-Term Modernization Recommendations

1. **Upgrade Electron 22 → 28+**: Electron 22 is EOL. Electron 28 (Node 18 LTS) eliminates the ABI mismatch entirely.
2. **Upgrade `luxon ^2` → `^3`**: Luxon v3 has breaking changes but better TypeScript support.
3. **Replace Options API with Composition API** throughout the renderer codebase.
4. **Add `"type": "module"` to `package.json`**: Makes ESM the default, eliminates CJS/ESM confusion — but requires converting all `.js` config files.
5. **Use `eslint.config.js` (Flat Config)**: ESLint v9 deprecated `.eslintrc.js`. Migrate to flat config format.
6. **Upgrade `prettier ^2` → `^3`**: Prettier 3 has improved TypeScript and Vue support.
