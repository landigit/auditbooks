<script setup lang="ts">
import type { HTMLAttributes } from 'vue';
import { cn } from 'src/utils/cn';

const props = defineProps<{
  class?: HTMLAttributes['class'];
}>();
</script>

<template>
  <view
    :class="
      cn(
        'flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2',
        props.class
      )
    "
  >
    <slot />
  </view>
</template>
