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
import icons18 from './Icons/18';
import icons24 from './Icons/24';
import icons8 from './Icons/8';

const components = {
  8: icons8,
  12: icons12,
  18: icons18,
  24: icons24,
} as const;

type Icon8Name = keyof typeof icons8;
type Icon12Name = keyof typeof icons12;
type Icon18Name = keyof typeof icons18;
type Icon24Name = keyof typeof icons24;

export type IconSize = '8' | '12' | '18' | '24';
export type IconName = Icon8Name | Icon12Name | Icon18Name | Icon24Name;

const props = withDefaults(
  defineProps<{
    name: IconName;
    active?: boolean;
    darkMode?: boolean;
    size: IconSize;
    height?: number;
  }>(),
  {
    active: false,
    darkMode: false,
  }
);

const iconComponent = computed(() => {
  const map = components[props.size];
  if (!map) return null;
  const mapObj = map as unknown as Record<string, unknown>;
  return mapObj[props.name] ?? null;
});

const iconClasses = computed(() => {
  const sizeMap: Record<string, string> = {
    '8': 'w-2 h-2',
    '12': 'w-3 h-3',
    '18': 'w-5 h-5',
    '24': 'w-6 h-6',
  };
  let sizeClass = sizeMap[props.size] || '';

  if (props.height) {
    sizeClass = `w-${props.height} h-${props.height}`;
  }

  return [sizeClass, 'fill-current'];
});
</script>
