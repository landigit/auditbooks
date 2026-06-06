<template>
  <view
    class="flex-shrink-0 flex items-center gap-2"
    style="width: fit-content"
  >
    <kbd
      v-for="k in keys"
      :key="k"
      class="key-common"
      :class="{ 'key-styling': !simple }"
      >{{ keyMap[k] ?? k }}</kbd
    >
  </view>
</template>

<script setup lang="ts">
// --- Imports ---
import { computed } from 'vue';
import { getShortcutKeyMap } from 'src/utils/ui';
import { useAppStore } from 'src/stores/app';

// --- Props & Emits ---
withDefaults(
  defineProps<{
    keys: string[];
    simple?: boolean;
  }>(),
  {
    simple: false,
  }
);

// --- State ---
const store = useAppStore();

// --- Computed ---
const keyMap = computed<Record<string, string>>(() => {
  return getShortcutKeyMap(store.platform);
});
</script>

<style scoped>
@reference "../styles/index.css";
.key-common {
  font-family: monospace;
  font-weight: 600;
  @apply rounded-md px-1.5 py-0.5 bg-canvas-muted text-muted tracking-tighter;
}

.key-styling {
  @apply border-b-4 border-border shadow-md;
}
</style>
