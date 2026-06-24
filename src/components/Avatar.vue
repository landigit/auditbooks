<template>
  <div class="rounded-full overflow-hidden" :class="sizeClasses">
    <img
      v-if="imageURL"
      :src="imageURL"
      class="object-cover"
      :class="sizeClasses"
    />
    <div
      v-else
      class="bg-gray-500 flex h-full items-center justify-center text-white dark:text-gray-900 w-full text-base uppercase"
    >
      {{ label && label[0] }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    imageURL?: string;
    label?: string;
    size?: 'sm' | 'md' | 'lg';
  }>(),
  {
    size: 'md',
  }
);

const sizeClasses = computed(() => {
  return {
    sm: 'w-5 h-5',
    md: 'w-7 h-7',
    lg: 'w-9 h-9',
  }[props.size];
});
</script>
