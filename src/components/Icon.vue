<template>
  <component
    v-bind="$attrs"
    :is="iconComponent"
    :class="iconClasses"
    :active="active"
  />
</template>

<script lang="ts">
import icons18 from './Icons/18';
import icons24 from './Icons/24';

const components = {
  18: icons18,
  24: icons24,
} as const;

type IconSize = '18' | '24';
export default {
  name: 'Icon',
  props: {
    name: { type: String, required: true },
    active: { type: Boolean, default: false },
    size: {
      type: String,
      required: true,
    },
    height: Number,
  },
  computed: {
    iconComponent() {
      const map = components[this.size as IconSize];
      return map[this.name as keyof typeof map] ?? null;
    },
    iconClasses() {
      let sizeClass = {
        18: 'w-5 h-5',
        24: 'w-6 h-6',
      }[this.size];

      if (this.height) {
        sizeClass = `w-${this.height} h-${this.height}`;
      }

      return [sizeClass, 'fill-current'];
    },
  },
};
</script>
