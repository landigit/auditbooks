<template>
  <Tooltip :open="show">
    <TooltipTrigger as-child>
      <div
        ref="trigger"
        class="fixed pointer-events-none"
        :style="{
          left: `${x}px`,
          top: `${y}px`,
        }"
      />
    </TooltipTrigger>
    <TooltipContent
      :side="placement"
      :side-offset="offset"
      v-bind="$attrs"
    >
      <slot />
    </TooltipContent>
  </Tooltip>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { Tooltip, TooltipTrigger, TooltipContent } from 'src/components/ui'

const props = withDefaults(defineProps<{
  show?: boolean
  offset?: number
  placement?: 'top' | 'right' | 'bottom' | 'left'
}>(), {
  show: false,
  offset: 10,
  placement: 'top',
})

const x = ref(0)
const y = ref(0)

const updateMousePosition = (e: MouseEvent) => {
  x.value = e.clientX
  y.value = e.clientY
}

watch(() => props.show, (isVisible) => {
  if (isVisible) {
    window.addEventListener('mousemove', updateMousePosition)
  } else {
    window.removeEventListener('mousemove', updateMousePosition)
  }
})

onMounted(() => {
  if (props.show) {
    window.addEventListener('mousemove', updateMousePosition)
  }
})

onUnmounted(() => {
  window.removeEventListener('mousemove', updateMousePosition)
})
</script>
