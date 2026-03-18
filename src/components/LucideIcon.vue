<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import * as icons from 'lucide-vue-next';
import { cn } from '../lib/utils';

interface Props {
  name: string;
  size?: number | string;
  color?: string;
  strokeWidth?: number | string;
  defaultClass?: string;
}

defineOptions({
  inheritAttrs: false,
});

const props = withDefaults(defineProps<Props>(), {
  size: 24,
  strokeWidth: 2,
  defaultClass: '',
});

const attrs = useAttrs();

const icon = computed(() => {
  // Convert kebab-case or camelCase to PascalCase for lucide-vue-next
  const name = props.name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');

  return (icons as any)[name] || (icons as any)[props.name] || icons.HelpCircle;
});
</script>

<template>
  <component
    :is="icon"
    v-bind="attrs"
    :size="size"
    :color="color"
    :stroke-width="strokeWidth"
    :class="cn('lucide-icon', props.defaultClass)"
  />
</template>
