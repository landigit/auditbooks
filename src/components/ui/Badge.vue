<script setup lang="ts">
import type { HTMLAttributes } from 'vue';
import { type VariantProps, cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80',
        outline: 'text-foreground',
        blue: 'border-transparent bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
        green:
          'border-transparent bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
        orange:
          'border-transparent bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
        red: 'border-transparent bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
        gray: 'border-transparent bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

interface Props {
  variant?: VariantProps<typeof badgeVariants>['variant'];
  class?: HTMLAttributes['class'];
}

const props = defineProps<Props>();
</script>

<template>
  <div :class="cn(badgeVariants({ variant }), props.class)">
    <slot />
  </div>
</template>
