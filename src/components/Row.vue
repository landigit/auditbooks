<template>
  <div class="inline-grid" :style="style" v-bind="$attrs">
    <slot></slot>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface RowProps {
  columnWidth?: string;
  columnCount?: number;
  ratio?: any[];
  gridTemplateColumns?: string | null;
  gap?: string;
}

const props = withDefaults(defineProps<RowProps>(), {
  columnWidth: '1fr',
  columnCount: 0,
  ratio: () => [],
  gridTemplateColumns: null,
});

const style = computed(() => {
  const obj: Record<string, string> = {};
  if (props.columnCount) {
    obj['grid-template-columns'] =
      `repeat(${props.columnCount}, ${props.columnWidth})`;
  }
  if (props.ratio.length) {
    obj['grid-template-columns'] = props.ratio
      .map((r) => `minmax(0, ${r}fr)`)
      .join(' ');
  }
  if (props.gridTemplateColumns) {
    obj['grid-template-columns'] = props.gridTemplateColumns;
  }
  if (props.gap) {
    obj['grid-gap'] = props.gap;
  }

  return obj;
});
</script>
