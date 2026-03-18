<template>
  <div
    class="px-8 py-4 flex justify-between items-center flex-shrink-0 bg-white dark:bg-gray-875 border-b border-gray-100 dark:border-gray-800 z-10"
  >
    <div class="flex flex-col gap-1">
      <h1 v-if="formTitle" class="text-2xl font-semibold tracking-tight text-foreground">{{ formTitle }}</h1>
      <p v-if="formSubTitle" class="text-xs font-semibold normal-case tracking-normal text-muted-foreground/70">
        {{ formSubTitle }}
      </p>
    </div>
    <div class="flex items-center gap-4">
      <slot />
    </div>
  </div>
</template>
<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  props: {
    formTitle: { type: String, default: '' },
    formSubTitle: { type: String, default: '' },
  },
});
</script>
