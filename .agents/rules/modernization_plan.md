# Auditbooks — Full Modernization Roadmap

> A complete plan to bring this app from "Vue 2 style code running on Vue 3" to a genuinely modern Vite + Vue 3 stack.

---

## Area 1 — Vue Component Architecture

**Problem:** Every component uses `defineComponent()` + Options API. `<script setup>` is the Vue 3 standard.

### Current Pattern

```vue
<script lang="ts">
export default defineComponent({
  name: 'Button',
  data() { return { isShown: false } },
  computed: { _class() { return { ... } } },
  methods: { toggle() { ... } },
});
</script>
```

### Modern Pattern

```vue
<script setup lang="ts">
const props = withDefaults(defineProps<{ type?: 'primary' | 'secondary' }>(), { type: 'secondary' });
const isShown = ref(false);
const _class = computed(() => ({ ... }));
function toggle() { ... }
</script>
```

### What to change

- Migrate all 40+ components from Options API to `<script setup>`
- Use `defineProps<{}>()`, `defineEmits<{}>()`, `defineOptions({ name: '...' })`
- Use `computed()`, `ref()`, `watch()` directly from vue imports
- Remove `defineComponent` wrapper entirely

**No new dependencies needed.**

---

## Area 2 — State Management: Replace Global Mixin + Module Refs with Pinia

**Problem:** State is spread across 3 messy patterns:

1. **Global mixin** in `renderer.ts` injects `fyo`, `platform`, `t`, `T` into every component via `this.*` — Vue 2 anti-pattern, breaks TypeScript
2. **Module-level refs** in `src/utils/refs.ts` (`showSidebar`, `systemLanguageRef`, etc.) — accessed directly, no reactivity tracking, no devtools support
3. **Module singleton** in `src/initFyo.ts` — the `fyo` object is a bare class instance imported everywhere

### Modern Pattern: Pinia Stores

```typescript
// stores/appStore.ts
import { defineStore } from 'pinia';
import { fyo } from 'src/initFyo';

export const useAppStore = defineStore('app', () => {
  const platform = ref<'Windows' | 'Mac' | 'Linux'>('Linux');
  const darkMode = ref(false);
  const showSidebar = ref(true);
  const language = ref('English');
  const languageDirection = computed(() =>
    RTL_LANGUAGES.includes(language.value) ? 'rtl' : 'ltr'
  );

  return { platform, darkMode, showSidebar, language, languageDirection };
});

// In any component:
const appStore = useAppStore();
appStore.platform; // typed, reactive, devtools-visible
```

### What to add

```bash
yarn add pinia
```

### What to remove

- `app.mixin({...})` block in `renderer.ts`
- `src/utils/refs.ts` (fold into Pinia stores)
- All `this.fyo`, `this.t`, `this.platform` references (replace with imports)
- `provide/inject` for `languageDirectionKey`, `shortcutsKey`, etc. — move to stores

### Pinia DevTools

Pinia integrates with Vue DevTools automatically — you get full time-travel debugging of all app state.

---

## Area 3 — Tailwind CSS Upgrade

**Problem:** The app uses `tailwindcss: "npm:@tailwindcss/postcss7-compat"` — this is Tailwind v2 compatibility shim for older PostCSS. The config uses the old `purge:`, `variants:` fields which are removed in v3.

### Current stack issues

- `tailwindcss` aliased to PostCSS 7 compat package — not the real Tailwind
- `tailwind.config.js` uses `purge: false` (v2 API)
- `variants: { margin: ['responsive', 'first', ...] }` — v2 API, ignored in v3
- `tailwindcss-rtl` plugin — maintained but has a modern alternative

### Upgrade to Tailwind v3

```bash
yarn add -D tailwindcss@^3 postcss autoprefixer
```

**`tailwind.config.js` changes:**

```javascript
module.exports = {
  darkMode: 'class',
  content: [                        // ← replaces `purge:`
    './src/**/*.{vue,ts,html}',
  ],
  theme: { ... },                   // keep existing theme
  // remove `variants:` entirely — v3 uses JIT and has all variants by default
  plugins: [require('tailwindcss-rtl')],
};
```

### For Tailwind v4 (cutting-edge)

If you want the absolute latest:

```bash
yarn add -D tailwindcss@next @tailwindcss/vite
```

Tailwind v4 uses a CSS-first config (`@import "tailwindcss"` in CSS) and has a Vite plugin. No `tailwind.config.js` needed.

---

## Area 4 — TypeScript Modernization

**Problem:** `tsconfig.json` targets `es2020` with `moduleResolution: "node"` — both outdated for Vite.

### Changes to `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ESNext", // was: es2020
    "module": "ESNext",
    "moduleResolution": "bundler", // was: "node" — correct for Vite
    "useDefineForClassFields": true, // add: Vue 3 requirement
    "isolatedModules": true, // add: Vite requirement
    "verbatimModuleSyntax": true, // add: modern TS import handling
    "strict": true,
    "noUnusedLocals": true, // add: catch dead code
    "noUnusedParameters": true, // add: catch dead params
    "exactOptionalPropertyTypes": true // add: tighter types
  }
}
```

### Replace `@ts-ignore` with proper types

`backend/database/manager.ts:147` uses `// @ts-ignore` on the DB dispatch call. This should use a proper discriminated union type for `DatabaseMethod`.

---

## Area 5 — Electron Modernization

**Problem:** Running Electron 22 (you downgraded due to Windows SDK issue). The app should be on Electron 33+ with modern security defaults.

### Key API changes from Electron 22 → 33+

| Feature                           | Electron 22 | Electron 33+                         |
| --------------------------------- | ----------- | ------------------------------------ |
| `protocol.registerBufferProtocol` | Available   | Deprecated → use `protocol.handle()` |
| `webContents.openDevTools()`      | Same        | Same                                 |
| `app.commandLine.appendSwitch`    | Same        | Same                                 |
| Context Isolation                 | Optional    | Default on                           |

### Fix `bufferProtocolCallback` in `main.ts`

```typescript
// Current (deprecated):
protocol.registerBufferProtocol('app', bufferProtocolCallback);

// Modern (Electron 25+):
protocol.handle('app', async (request) => {
  const { pathname, host } = new URL(request.url);
  const filePath = path.join(
    __dirname,
    'src',
    decodeURI(host),
    decodeURI(pathname)
  );
  return net.fetch(pathToFileURL(filePath).toString());
});
```

### Electron version compatibility matrix

| Node.js Version   | Electron Version  |
| ----------------- | ----------------- |
| Node 20 LTS       | Electron 28-33 ✅ |
| Node 22           | Electron 33+      |
| Node 24 (current) | Electron 34+      |

**Recommendation:** Use Node 20 LTS + Electron 33 for the most stable combination.

---

## Area 6 — Vite Config Modernization

**Problem:** Vite config is minimal and uses CommonJS-era patterns.

### Add to `vite.config.ts`

```typescript
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

export default defineConfig({
  plugins: [
    vue({
      script: {
        defineModel: true,   // enable v-model macro
        propsDestructure: true,  // enable reactive props destructure
      },
    }),
  ],
  resolve: { alias: { ... } },  // keep existing aliases

  // Add these:
  build: {
    target: 'esnext',
    sourcemap: true,
  },
  server: {
    host: '127.0.0.1',   // ← not 0.0.0.0 (security — don't expose to network)
    port: 6969,
    strictPort: true,
    watch: {
      ignored: ['**/node_modules/**', '**/dist_electron/**'],
    },
  },
  optimizeDeps: {
    exclude: ['electron'],  // don't try to pre-bundle electron
  },
});
```

---

## Area 7 — Testing Stack Replacement

**Problem:** App uses `tape` + `tap-spec` for testing — a minimal Node.js test runner with no Vue awareness. Zero component tests possible.

### Current

```json
"tape": "^5.6.1",
"tap-spec": "^5.0.0",
```

### Modern replacement: Vitest

```bash
yarn add -D vitest @vue/test-utils jsdom
```

Vitest is Vite-native, uses the same config as your build, and has first-class Vue support:

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
```

Component test example:

```typescript
import { mount } from '@vue/test-utils';
import Button from 'src/components/Button.vue';

test('Button renders correctly', () => {
  const wrapper = mount(Button, { props: { type: 'primary' } });
  expect(wrapper.classes()).toContain('bg-black');
});
```

---

## Area 8 — Dependency Cleanup & Upgrades

### Remove / Replace

| Current                   | Replace With                          | Why                                                                      |
| ------------------------- | ------------------------------------- | ------------------------------------------------------------------------ |
| `feather-icons`           | `lucide-vue-next`                     | Tree-shakeable, Vue 3 native, actively maintained                        |
| `bree` (job scheduler)    | `node-cron` or built-in `setInterval` | Bree is complex for what it does here (just interval scheduling)         |
| `lodash`                  | Native JS / `es-toolkit`              | Modern JS has most lodash methods natively; es-toolkit is tree-shakeable |
| `tailwindcss` compat shim | `tailwindcss@^3`                      | Use real Tailwind                                                        |
| `tape` + `tap-spec`       | `vitest`                              | Vite-native testing                                                      |
| `@electron/rebuild`       | Only needed with native modules       | Keep if better-sqlite3 stays                                             |

### Add

| Package           | Purpose                                                       |
| ----------------- | ------------------------------------------------------------- |
| `pinia`           | State management (replaces global mixin)                      |
| `vitest`          | Testing                                                       |
| `@vue/test-utils` | Vue component testing                                         |
| `lucide-vue-next` | Modern icon library (optional)                                |
| `electron-vite`   | Proper Electron + Vite integration (optional but recommended) |

### Upgrade

| Package          | From      | To                                    |
| ---------------- | --------- | ------------------------------------- |
| `electron`       | `22.x`    | `33.x` (Node 20) or `35.x` (Node 22+) |
| `better-sqlite3` | `^9.x`    | `^11.x`                               |
| `typescript`     | `^4.6.2`  | `^5.5`                                |
| `vue-router`     | `^4.0.12` | `^4.4`                                |
| `vite`           | `^5.4`    | `^6.x`                                |

---

## Implementation Priority Order

```
Phase 1 (Foundation — no breaking changes):
  ✅ Fix lifecycle hooks (done)
  ✅ Fix data() types (done)
  ✅ Fix app.mount target (done)
  ✅ Add ipc global types (done)
  → Upgrade tsconfig
  → Upgrade Tailwind to v3
  → Fix Vite dev server host

Phase 2 (State):
  → Add Pinia
  → Migrate refs.ts to Pinia appStore
  → Remove global mixin from renderer.ts
  → Update components to import fyo/t directly

Phase 3 (Components — biggest effort):
  → Migrate components to <script setup> one by one
  → Start with leaf components (Button, Badge, FeatherIcon)
  → Work up to complex ones (Dropdown, SearchBar, App.vue)

Phase 4 (Dependencies):
  → Upgrade Electron + Node
  → Upgrade Tailwind
  → Replace tape with Vitest
  → Fix deprecated protocol API

Phase 5 (Testing):
  → Write component tests with Vitest
  → Write store tests with Pinia test utils
```
