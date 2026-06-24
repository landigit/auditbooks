<template>
  <div class="flex-shrink-0 flex items-center gap-2" style="width: fit-content">
    <kbd
      v-for="k in keys"
      :key="k"
      class="key-common"
      :class="{ 'key-styling': !simple }"
      >{{ keyMap[k] ?? k }}</kbd
    >
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue';
import { getShortcutKeyMap } from 'src/utils/ui';
import { usePlatform } from 'src/composables/usePlatform';

const props = withDefaults(
  defineProps<{
    keys: string[];
    simple?: boolean;
  }>(),
  {
    simple: false,
  }
);

const { platformName } = usePlatform();

const keyMap = computed<Record<string, string>>(
  () => getShortcutKeyMap(platformName.value) as any
);
</script>
<style scoped>
@reference "../styles/index.css";
.key-common {
  font-family: monospace;
  font-weight: 600;
  @apply rounded-md px-1.5 py-0.5 bg-gray-200 text-gray-700
    tracking-tighter;
}

.key-styling {
  @apply border-b-4 border-gray-400 shadow-md;
}
</style>
