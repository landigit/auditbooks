<template>
  <div
    class="inline-block rounded-[4px] px-2 py-1 truncate select-none"
    :class="colorClass"
  >
    <slot></slot>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { getBgTextColorClass } from 'src/utils/colors';

defineOptions({
  name: 'Badge',
});

const props = withDefaults(
  defineProps<{
    color?: string;
  }>(),
  {
    color: 'gray',
  }
);

const colorClass = computed(() => {
  return getBgTextColorClass(props.color);
});
</script>
