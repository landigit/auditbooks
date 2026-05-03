<script setup lang="ts">
import {
  PopoverContent,
  type PopoverContentProps,
  PopoverPortal,
  PopoverRoot,
  type PopoverRootEmits,
  type PopoverRootProps,
  PopoverTrigger,
  useForwardPropsEmits,
} from 'reka-ui'
import { cn } from 'src/utils/cn'

const props = withDefaults(defineProps<PopoverRootProps>(), {
  modal: true,
})
const emits = defineEmits<PopoverRootEmits>()

const forwarded = useForwardPropsEmits(props, emits)
</script>

<template>
  <PopoverRoot v-bind="forwarded">
    <slot />
  </PopoverRoot>
</template>

<script lang="ts">
export { PopoverTrigger } from 'reka-ui'
</script>
