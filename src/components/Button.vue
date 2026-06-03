<template>
  <ShadcnButton
    :variant="resolvedVariant"
    :size="resolvedSize"
    :disabled="disabled"
    :class="computedClasses"
    v-bind="$attrs"
  >
    <slot></slot>
  </ShadcnButton>
</template>

<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import ShadcnButton from './ui/Button.vue';

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

const resolvedVariant = computed(() => {
  if (!props.background) return 'ghost';
  return props.type === 'primary' ? 'default' : 'secondary';
});

const resolvedSize = computed(() => {
  if (!props.padding) return 'sm';
  return props.icon ? 'sm' : 'default';
});

const computedClasses = computed(() => {
  const customClass = attrs.class;
  const hasHeightOrPadding =
    typeof customClass === 'string' &&
    (/\bh-\d+/.test(customClass) || /\bpy-\d+/.test(customClass));

  return {
    'h-8': props.background && !hasHeightOrPadding,
    'px-3': props.padding && props.icon,
    'px-6': props.padding && !props.icon,
  };
});
</script>

<style scoped>
button:focus {
  filter: brightness(0.95);
}
</style>
