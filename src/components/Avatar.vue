<template>
  <view class="rounded-full overflow-hidden" :class="sizeClasses">
    <img
      v-if="imageURL"
      :src="imageURL"
      class="object-cover"
      :class="sizeClasses"
    />
    <view
      v-else
      class="bg-indicator-gray-bg flex h-full items-center justify-center text-indicator-gray-text w-full text-base uppercase"
    >
      {{ label && label[0] }}
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from "vue";

// Define Props
const props = withDefaults(
  defineProps<{
    imageURL?: string;
    label?: string;
    size?: "sm" | "md" | "lg";
  }>(),
  {
    imageURL: "",
    label: "",
    size: "md",
  },
);

// Computed Property
const sizeClasses = computed(() => {
  return (
    {
      sm: "w-5 h-5",
      md: "w-7 h-7",
      lg: "w-9 h-9",
    }[props.size] ?? "w-7 h-7"
  );
});
</script>
