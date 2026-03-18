<script setup lang="ts">
import { type HTMLAttributes, provide, useId } from 'vue';
import { cn } from '../../lib/utils';

const props = defineProps<{
  class?: HTMLAttributes['class'];
}>();

const id = useId();
provide('FORM_ITEM_ID', id);
</script>

<template>
  <div :class="cn('space-y-2', props.class)">
    <slot />
  </div>
</template>
