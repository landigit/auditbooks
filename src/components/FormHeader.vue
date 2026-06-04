<template>
  <div
    class="form-header px-4 text-xl font-semibold flex justify-between h-row-large items-center flex-shrink-0"
  >
    <h1 class="text-main">{{ formTitle || '' }}</h1>
    <slot />
    <p v-if="formSubTitle" class="text-description">
      {{ formSubTitle }}
    </p>
  </div>
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
