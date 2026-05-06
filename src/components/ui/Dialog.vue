<script setup lang="ts">
import { DialogRoot, type DialogRootEmits, type DialogRootProps, useForwardPropsEmits } from 'reka-ui'

const props = defineProps<DialogRootProps>()
const emits = defineEmits<DialogRootEmits>()

const forwarded = useForwardPropsEmits(props, emits)
</script>

<template>
  <div v-bind="$attrs">
    <DialogRoot v-bind="forwarded">
      <slot />
    </DialogRoot>
  </div>
</template>

<script lang="ts">
export {
  DialogTrigger,
  DialogPortal,
  DialogClose,
  DialogOverlay,
} from 'reka-ui'
</script>
