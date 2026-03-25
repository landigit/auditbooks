declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  // biome-ignore lint/suspicious/noExplicitAny: library declaration
  const component: DefineComponent<{}, {}, any>;
  export default component;
}
