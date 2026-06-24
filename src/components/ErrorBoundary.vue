<template>
  <slot></slot>
</template>
<script setup lang="ts">
import { onErrorCaptured } from 'vue';

const props = withDefaults(
  defineProps<{
    propagate?: boolean;
  }>(),
  {
    propagate: true,
  }
);

const emit = defineEmits<{
  (e: 'error-captured', error: unknown): void;
}>();

onErrorCaptured((error) => {
  emit('error-captured', error);
  return props.propagate;
});
</script>
