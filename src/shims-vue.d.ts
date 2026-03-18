declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/ban-types
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

import '@vue/runtime-core';

declare module '@vue/runtime-core' {
  export interface GlobalComponents {
    UIButton: typeof import('./components/ui/Button.vue').default;
    Badge: typeof import('./components/ui/Badge.vue').default;
    LucideIcon: typeof import('./components/LucideIcon.vue').default;
  }
}

// Global component types for use in <script> blocks
import ButtonComponent from './components/ui/Button.vue';
import BadgeComponent from './components/ui/Badge.vue';
import IconComponent from './components/LucideIcon.vue';

declare global {
  const UIButton: typeof ButtonComponent;
  const Badge: typeof BadgeComponent;
  const LucideIcon: typeof IconComponent;
}
