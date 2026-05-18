<template>
  <component
    v-bind="$attrs"
    :is="iconComponent"
    :class="iconClasses"
    :active="active"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import icons18 from './Icons/18';
import icons24 from './Icons/24';

// Define Props
const props = withDefaults(
  defineProps<{
    name: string;
    active?: boolean;
    size: '18' | '24';
    height?: number;
  }>(),
  {
    active: false,
  }
);

const components = {
  18: icons18,
  24: icons24,
} as const;

// Computed Properties
const iconComponent = computed(() => {
  const map = components[props.size];
  return map[props.name as keyof typeof map] ?? null;
});

const iconClasses = computed(() => {
  let sizeClass = {
    18: 'w-5 h-5',
    24: 'w-6 h-6',
  }[props.size];

  if (props.height) {
    sizeClass = `w-${props.height} h-${props.height}`;
  }

  return [sizeClass, 'fill-current'];
});
</script>
