<script setup lang="ts">
import type { HTMLAttributes } from 'vue';
import { cn } from '../../lib/utils';

const props = defineProps<{
  class?: HTMLAttributes['class'];
}>();
</script>

<template>
  <div
    :class="
      cn(
        'rounded-lg border bg-card/80 glass text-card-foreground shadow-lg',
        props.class,
      )
    "
  >
    <slot />
  </div>
</template>
