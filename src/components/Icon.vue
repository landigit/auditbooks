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

<script lang="ts">
import { defineComponent, PropType } from 'vue';
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

export default defineComponent({
  name: 'Icon',
  props: {
    name: {
      type: String as PropType<IconName>,
      required: true,
    },
    active: {
      type: Boolean,
      default: false,
    },
    darkMode: {
      type: Boolean,
      default: false,
    },
    size: {
      type: String as PropType<IconSize>,
      required: true,
    },
    height: Number,
  },
  computed: {
    iconComponent(): unknown {
      const map = components[this.size];
      if (!map) return null;
      // Cast components map to retrieve dynamic icon component by name string
      const mapObj = map as unknown as Record<string, unknown>;
      return mapObj[this.name] ?? null;
    },
    iconClasses(): string[] {
      const sizeMap: Record<string, string> = {
        '8': 'w-2 h-2',
        '12': 'w-3 h-3',
        '18': 'w-5 h-5',
        '24': 'w-6 h-6',
      };
      let sizeClass = sizeMap[this.size as string] || '';

      if (this.height) {
        sizeClass = `w-${this.height} h-${this.height}`;
      }

      return [sizeClass, 'fill-current'];
    },
  },
});
</script>
