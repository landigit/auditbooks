<template>
  <view ref="scrollContainer" class="custom-scroll custom-scroll-thumb1">
    <slot></slot>
  </view>
</template>

<script setup lang="ts">
// --- Imports ---
import { ref, onMounted, onBeforeUnmount } from 'vue';

// --- Props & Emits ---
const emit = defineEmits<{
  (e: 'scroll', payload: { scrollLeft: number; scrollTop: number }): void;
}>();

// --- State ---
const scrollContainer = ref<HTMLElement | null>(null);
let listener: (() => void) | undefined = undefined;

// --- Lifecycle ---
onMounted(() => {
  listener = () => {
    if (!scrollContainer.value) return;
    const { scrollLeft, scrollTop } = scrollContainer.value;
    emit('scroll', { scrollLeft, scrollTop });
  };
  scrollContainer.value?.addEventListener('scroll', listener);
});

onBeforeUnmount(() => {
  if (!listener || !scrollContainer.value) {
    return;
  }

  scrollContainer.value.removeEventListener('scroll', listener);
  listener = undefined;
});
</script>
