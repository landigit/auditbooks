<template>
  <view
    class="rounded-md flex justify-center items-center text-sm cursor-pointer select-none transition-all duration-150 active:scale-95 active:brightness-95"
    :class="_class"
    v-bind="$attrs"
  >
    <slot></slot>
  </view>
</template>

<script setup lang="ts">
import { computed, useAttrs } from 'vue';

// Define Props
const props = withDefaults(
  defineProps<{
    type?: string;
    icon?: boolean;
    disabled?: boolean;
    padding?: boolean;
    background?: boolean;
  }>(),
  {
    type: 'secondary',
    icon: false,
    disabled: false,
    padding: true,
    background: true,
  }
);

const attrs = useAttrs();

// Computed classes
const _class = computed(() => {
  const customClass = attrs.class;
  const hasHeightOrPadding =
    typeof customClass === 'string' &&
    (/\bh-\d+/.test(customClass) || /\bpy-\d+/.test(customClass));

  return {
    'opacity-50 cursor-not-allowed pointer-events-none': props.disabled,
    'text-button-primary-text': props.type === 'primary',
    'bg-button-primary-bg': props.type === 'primary' && props.background,
    'text-button-secondary-text': props.type !== 'primary',
    'bg-button-secondary-bg': props.type !== 'primary' && props.background,
    'h-8': props.background && !hasHeightOrPadding,
    'px-3': props.padding && props.icon,
    'px-6': props.padding && !props.icon,
  };
});
</script>

<style scoped>
@reference "../styles/index.css";
</style>

