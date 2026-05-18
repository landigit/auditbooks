<template>
  <div class="flex">
    <SearchBar />
    <!-- Back Button -->
    <a
      ref="backlink"
      class="nav-link border-l border-r border-border bg-canvas-muted"
      :class="
        store.historyState.back
          ? 'text-main cursor-pointer'
          : 'text-description'
      "
      @click="router.back()"
    >
      <lucide-icon name="chevron-left" class="w-4 h-4" />
    </a>
    <!-- Forward Button -->
    <a
      class="nav-link rounded-md rounded-l-none bg-canvas-muted"
      :class="
        store.historyState.forward
          ? 'text-main cursor-pointer'
          : 'text-description'
      "
      @click="router.forward()"
    >
      <lucide-icon name="chevron-right" class="w-4 h-4" />
    </a>
  </div>
</template>

<script setup lang="ts">
import { ref, inject, onActivated, onDeactivated } from 'vue';
import { useRouter } from 'vue-router';
import { shortcutsKey } from 'src/utils/injectionKeys';
import SearchBar from './SearchBar.vue';
import { useAppStore } from 'src/stores/app';

const COMPONENT_NAME = 'PageHeaderNavGroup';

const store = useAppStore();
const router = useRouter();
const shortcuts = inject(shortcutsKey);

// Template Ref
const backlink = ref<HTMLAnchorElement | null>(null);

// Lifecycles
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
@reference "../styles/index.css";
.nav-link {
  @apply flex items-center bg-canvas-muted px-3;
}
</style>
