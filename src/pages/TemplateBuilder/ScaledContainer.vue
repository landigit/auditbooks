<template>
  <div class="overflow-hidden" :style="outerContainerStyle">
    <div
      :style="innerContainerStyle"
      :class="showOverflow ? 'overflow-auto no-scrollbar' : 'overflow-visible'"
    >
      <slot></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

// Define Props
const props = withDefaults(
  defineProps<{
    height?: number;
    width?: number;
    scale?: number;
    showOverflow?: boolean;
  }>(),
  {
    height: 29.7,
    width: 21,
    scale: 0.65,
    showOverflow: false,
  }
);

// Computed Properties
const innerContainerStyle = computed<Record<string, string>>(() => {
  const style: Record<string, string> = {};
  style['width'] = `${props.width}cm`;
  style['height'] = `${props.height}cm`;
  style['transform'] = `scale(${props.scale})`;
  style['margin-top'] =
    `calc(-1 * (${props.height}cm * ${1 - props.scale}) / 2)`;
  style['margin-left'] =
    `calc(-1 * (${props.width}cm * ${1 - props.scale}) / 2)`;

  return style;
});

const outerContainerStyle = computed<Record<string, string>>(() => {
  const style: Record<string, string> = {};
  style['height'] = `calc(${props.scale} * ${props.height}cm)`;
  style['width'] = `calc(${props.scale} * ${props.width}cm)`;

  return style;
});
</script>
