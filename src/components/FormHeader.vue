<template>
  <view
    class="px-4 text-xl font-semibold flex justify-between h-row-large items-center flex-shrink-0"
  >
    <text v-if="formTitle" class="text-main">{{ formTitle }}</text>
    <slot />
    <text v-if="formSubTitle" class="text-description">
      {{ formSubTitle }}
    </text>
  </view>
</template>

<script setup lang="ts">
// Define Props directly
withDefaults(
  defineProps<{
    formTitle?: string;
    formSubTitle?: string;
  }>(),
  {
    formTitle: '',
    formSubTitle: '',
  }
);
</script>
