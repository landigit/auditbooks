<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "src/utils/cn";

const props = defineProps<{
  class?: HTMLAttributes["class"];
}>();
</script>

<template>
  <view :class="cn('flex flex-col space-y-1.5 text-center sm:text-left', props.class)">
    <slot />
  </view>
</template>
