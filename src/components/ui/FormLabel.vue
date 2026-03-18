<script setup lang="ts">
import { type HTMLAttributes } from 'vue';
import { Label } from 'reka-ui'; // Using reka-ui Label if it exists, or just a generic label
import { useFormField } from './useFormField';
import { cn } from '../../lib/utils';

const props = defineProps<{
  class?: HTMLAttributes['class'];
}>();

const { error, formItemId } = useFormField();
</script>

<template>
  <label
    :class="
      cn(
        'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
        error && 'text-destructive',
        props.class,
      )
    "
    :for="formItemId"
  >
    <slot />
  </label>
</template>
