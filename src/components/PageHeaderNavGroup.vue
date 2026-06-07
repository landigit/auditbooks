<template>
  <view class="flex items-center gap-1">
    <SearchBar />
    <!-- Back Button -->
    <a
      ref="backlink"
      class="nav-link flex items-center border border-border bg-canvas-muted rounded-md h-8"
      :class="[
        store.historyState.back
          ? 'text-main cursor-pointer'
          : 'text-description pointer-events-none opacity-50',
      ]"
      @tap="router.back()"
    >
      <lucide-icon name="chevron-left" class="w-4 h-4" />
    </a>
    <!-- Forward Button -->
    <a
      class="nav-link hidden md:flex items-center border border-border bg-canvas-muted rounded-md h-8"
      :class="[
        store.historyState.forward
          ? 'text-main cursor-pointer'
          : 'text-description pointer-events-none opacity-50',
      ]"
      @tap="router.forward()"
    >
      <lucide-icon name="chevron-right" class="w-4 h-4" />
    </a>
  </view>
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
  @apply bg-canvas-muted px-3;
}
</style>
