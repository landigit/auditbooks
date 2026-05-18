<script setup lang="ts">
import {
  HoverCardRoot,
  type HoverCardRootEmits,
  type HoverCardRootProps,
  useForwardPropsEmits,
} from 'reka-ui';

const props = withDefaults(defineProps<HoverCardRootProps>(), {
  openDelay: 500,
  closeDelay: 100,
});
const emits = defineEmits<HoverCardRootEmits>();

const forwarded = useForwardPropsEmits(props, emits);
</script>

<template>
  <div v-bind="$attrs">
    <HoverCardRoot v-bind="forwarded">
      <slot />
    </HoverCardRoot>
  </div>
</template>
