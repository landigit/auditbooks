<template>
  <div class="flex items-center">
    <!-- Hamburger button when sidebar is hidden or on mobile -->
    <a
      v-if="!showSidebar || isMobile"
      class="nav-link rounded-md rounded-r-none border-r border-white dark:border-gray-850 dark:bg-gray-900 text-gray-700 dark:text-gray-300 cursor-pointer"
      @click="() => toggleSidebar()"
    >
      <feather-icon name="menu" class="w-4 h-4" />
    </a>
    <SearchBar :class="(!showSidebar || isMobile) ? 'rounded-l-none' : ''" />
    <!-- Back Button -->
    <a
      ref="backlink"
      class="nav-link border-l border-r border-white dark:border-white dark:border-opacity-10 dark:bg-gray-900"
      :class="
        historyState.back
          ? 'text-gray-700 dark:text-gray-300 cursor-pointer'
          : 'text-gray-400 dark:text-gray-700'
      "
      @click="$router.back()"
    >
      <feather-icon name="chevron-left" class="w-4 h-4" />
    </a>
    <!-- Forward Button -->
    <a
      class="nav-link rounded-md rounded-l-none dark:bg-gray-900"
      :class="
        historyState.forward
          ? 'text-gray-700 dark:text-gray-400 cursor-pointer'
          : 'text-gray-400 dark:text-gray-700'
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
import { useBreakpoint } from 'src/composables/useBreakpoint.js';

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
  @apply flex items-center bg-gray-200 px-3 h-8;
}
</style>

