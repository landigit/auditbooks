<template>
  <div ref="root" class="custom-scroll custom-scroll-thumb1">
    <slot></slot>
  </div>
</template>
<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';

const emit = defineEmits<{
  (e: 'scroll', payload: { scrollLeft: number; scrollTop: number }): void;
}>();

const root = ref<HTMLElement | null>(null);
let listener: (() => void) | undefined;

onMounted(() => {
  if (root.value) {
    listener = () => {
      if (root.value) {
        const { scrollLeft, scrollTop } = root.value;
        emit('scroll', { scrollLeft, scrollTop });
      }
    };
    root.value.addEventListener('scroll', listener);
  }
});

onBeforeUnmount(() => {
  if (root.value && listener) {
    root.value.removeEventListener('scroll', listener);
  }
});
</script>
