<template>
  <div
    class="px-4 text-xl font-semibold flex justify-between h-row-large items-center flex-shrink-0"
  >
    <h1 v-if="formTitle" class="text-foreground">{{ formTitle }}</h1>
    <slot />
    <p v-if="formSubTitle" class="text-muted-foreground">
      {{ formSubTitle }}
    </p>
  </div>
</template>
<script setup lang="ts">
const props = withDefaults(
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
