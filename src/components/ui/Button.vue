<script setup lang="ts">
import { type HTMLAttributes, computed } from 'vue'
import { Primitive, type PrimitiveProps } from 'reka-ui'
import { cn } from 'src/utils/cn'

interface Props extends PrimitiveProps {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  class?: HTMLAttributes['class']
}

const props = withDefaults(defineProps<Props>(), {
  as: 'button',
  variant: 'default',
  size: 'default',
})

const variants = {
  default: 'bg-indicator-blue-text text-white hover:bg-indicator-blue-text/90',
  destructive: 'bg-error text-white hover:bg-error/90',
  outline: 'border border-border bg-surface hover:bg-surface-hover text-main',
  secondary: 'bg-canvas-muted text-main hover:bg-canvas-muted/80',
  ghost: 'hover:bg-surface-hover text-main',
  link: 'text-indicator-blue-text underline-offset-4 hover:underline',
}

const sizes = {
  default: 'h-10 px-4 py-2',
  sm: 'h-9 px-3',
  lg: 'h-11 px-8',
  icon: 'h-10 w-10',
}
</script>

<template>
  <Primitive
    :as="as"
    :as-child="asChild"
    :class="cn(
      'inline-flex items-center justify-center rounded text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
      variants[variant],
      sizes[size],
      props.class,
    )"
  >
    <slot />
  </Primitive>
</template>
