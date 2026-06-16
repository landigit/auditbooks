<template>
  <svg
    :width="computedSize"
    :height="computedSize"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    :color="color"
    v-bind="$attrs"
  >
    <component
      :is="element[0]"
      v-for="(element, index) in currentIcon"
      :key="index"
      v-bind="transformAttrs(element[1])"
    />
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue';

defineOptions({
  inheritAttrs: false,
});

const props = withDefaults(
  defineProps<{
    icon: Array<any>;
    size?: number | string;
    strokeWidth?: number;
    absoluteStrokeWidth?: boolean;
    altIcon?: Array<any>;
    showAlt?: boolean;
    color?: string;
  }>(),
  {
    size: 24,
    absoluteStrokeWidth: false,
    color: 'currentColor',
  }
);

const computedSize = computed(() => {
  const size = typeof props.size === 'string' ? parseInt(props.size, 10) : props.size;
  return !isNaN(size) && size > 0 ? size : 24;
});

const calculatedStrokeWidth = computed(() => {
  if (props.strokeWidth === undefined) return undefined;
  return props.absoluteStrokeWidth
    ? (props.strokeWidth * 24) / computedSize.value
    : props.strokeWidth;
});

const currentIcon = computed(() => {
  return props.altIcon && props.showAlt ? props.altIcon : props.icon;
});

const transformAttrs = (attrs: Record<string, any>) => {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(attrs)) {
    const kebabKey = key.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
    result[kebabKey] = value;
  }

  const strokeWidth = calculatedStrokeWidth.value;
  if (strokeWidth !== undefined) {
    result['stroke-width'] = strokeWidth;
    result['stroke'] = 'currentColor';
  }

  return result;
};
</script>
