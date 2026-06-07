<template>
  <view class="inline-block rounded-md px-2 py-1 truncate select-none" :class="colorClass">
    <slot></slot>
  </view>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { getBgTextColorClass } from "src/utils/colors";

// Define Props
const props = withDefaults(
  defineProps<{
    color?: string;
  }>(),
  {
    color: "gray",
  },
);

// Computed Property
const colorClass = computed(() => getBgTextColorClass(props.color));
</script>
