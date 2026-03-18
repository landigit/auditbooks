<script setup lang="ts">
import { useFormField } from './useFormField';

const { error, formMessageId } = useFormField();
</script>

<template>
  <p
    :id="formMessageId"
    :class="'text-[0.8rem] font-medium text-destructive'"
  >
    <template v-if="error">
      {{ error }}
    </template>
    <slot v-else />
  </p>
</template>
