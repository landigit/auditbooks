<template>
  <component
    v-bind="$attrs"
    :is="iconComponent"
    :class="iconClasses"
    :active="active"
    :darkMode="darkMode"
    :name="name"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import icons12 from './Icons/12';
import icons16 from './Icons/16';
import icons18 from './Icons/18';
import icons24 from './Icons/24';
import icons8 from './Icons/8';

defineOptions({
  name: 'Icon',
});

type IconSize = '8' | '12' | '16' | '18' | '24';

const components: Record<string, any> = {
  8: icons8,
  12: icons12,
  16: icons16,
  18: icons18,
  24: icons24,
};

const props = defineProps<{
  name: string;
  active?: boolean;
  darkMode?: boolean;
  size: IconSize;
  height?: number;
}>();

const iconComponent = computed(() => {
  const map = components[props.size];
  return map?.[props.name] ?? null;
});

const iconClasses = computed(() => {
  let sizeClass = {
    8: 'w-2 h-2',
    12: 'w-3 h-3',
    16: 'w-4 h-4',
    18: 'w-5 h-5',
    24: 'w-6 h-6',
  }[props.size];

  if (props.height) {
    sizeClass = `w-${props.height} h-${props.height}`;
  }

  return [sizeClass, 'fill-current'];
});
</script>
