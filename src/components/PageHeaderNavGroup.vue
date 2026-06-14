<template>
  <div class="flex items-center -space-x-px">
    <!-- Hamburger button when sidebar is hidden or on mobile -->
    <a
      v-if="!showSidebar || isMobile"
      class="nav-link rounded-l-md cursor-pointer header-nav-btn"
      @click="() => toggleSidebar()"
    >
      <feather-icon name="menu" class="w-4 h-4" />
    </a>
    <SearchBar :class="(!showSidebar || isMobile) ? 'rounded-l-none' : ''" />
    <!-- Back Button -->
    <a
      v-if="!isMobile"
      ref="backlink"
      class="nav-link"
      :class="
        historyState.back
          ? 'cursor-pointer header-nav-btn'
          : 'header-nav-btn-disabled'
      "
      @click="$router.back()"
    >
      <feather-icon name="chevron-left" class="w-4 h-4" />
    </a>
    <!-- Forward Button -->
    <a
      v-if="!isMobile"
      class="nav-link rounded-r-md"
      :class="
        historyState.forward
          ? 'cursor-pointer header-nav-btn'
          : 'header-nav-btn-disabled'
      "
      @click="$router.forward()"
    >
      <feather-icon name="chevron-right" class="w-4 h-4" />
    </a>
  </div>
</template>
<script setup lang="ts">
import { ref, onActivated, onDeactivated } from 'vue';
import SearchBar from './SearchBar.vue';
import { historyState, showSidebar } from 'src/utils/refs';
import { toggleSidebar } from 'src/utils/ui';
import { useShortcuts } from 'src/composables/useShortcuts.js';
import { useBreakpoint } from 'src/composables/useBreakpoint';

const COMPONENT_NAME = 'PageHeaderNavGroup';

const backlink = ref<HTMLAnchorElement | null>(null);
const shortcuts = useShortcuts();
const { isMobile } = useBreakpoint();

onActivated(() => {
  shortcuts?.shift.set(COMPONENT_NAME, ['Backspace'], () => {
    backlink.value?.click();
  });
  // @ts-ignore
  window.ng = { backlink };
});

onDeactivated(() => {
  shortcuts?.delete(COMPONENT_NAME);
});
</script>

<style scoped>
.nav-link {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 2rem;
  padding-left: 0.75rem;
  padding-right: 0.75rem;
  background-color: var(--secondary) !important;
  border: 1.5px solid var(--border) !important;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  transition: all 100ms ease-in-out;
}
.nav-link:hover:not(.header-nav-btn-disabled) {
  background-color: var(--accent) !important;
  border-color: var(--border) !important;
}
.header-nav-btn {
  color: color-mix(in srgb, var(--foreground) 70%, transparent) !important;
  transition: color 0.15s;
}
.header-nav-btn:hover {
  color: var(--foreground) !important;
}
.header-nav-btn-disabled {
  color: color-mix(in srgb, var(--foreground) 25%, transparent) !important;
  opacity: 0.5;
  cursor: not-allowed !important;
  pointer-events: none;
}
</style>

