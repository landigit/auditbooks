<template>
  <slot></slot>
</template>

<script setup lang="ts">
import { onErrorCaptured } from "vue";

// Define Props
const props = withDefaults(
  defineProps<{
    propagate?: boolean;
  }>(),
  {
    propagate: true,
  },
);

// Define Emits
const emit = defineEmits<{
  (e: "error-captured", error: unknown): void;
}>();

// Capture Errors
onErrorCaptured((err) => {
  emit("error-captured", err);
  return props.propagate;
});
</script>
