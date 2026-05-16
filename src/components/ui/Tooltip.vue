<script setup lang="ts">
import { ref, watch } from 'vue';
import {
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger,
  type TooltipRootEmits,
  type TooltipRootProps,
  useForwardPropsEmits,
} from 'reka-ui';
import TooltipContent from './TooltipContent.vue';

import { useRoute } from 'vue-router';

const props = withDefaults(
  defineProps<TooltipRootProps & { open?: boolean }>(),
  {
    delayDuration: 300,
  }
);
const emits = defineEmits<TooltipRootEmits>();

const forwarded = useForwardPropsEmits(props, emits);

defineOptions({
  inheritAttrs: false,
});

// Compatibility for imperative usage (used by legacy charts)
const internalOpen = ref(false);
const x = ref(0);
const y = ref(0);

const create = (e?: MouseEvent) => {
  if (e) {
    x.value = e.clientX;
    y.value = e.clientY;
  }
  internalOpen.value = true;
};

const update = (e: MouseEvent) => {
  x.value = e.clientX;
  y.value = e.clientY;
};

const destroy = () => {
  internalOpen.value = false;
};

defineExpose({
  create,
  update,
  destroy,
});

// Support both prop-driven and imperative-driven open state
const isOpen = ref(props.open ?? false);
watch(
  () => props.open,
  (val) => {
    if (val !== undefined) isOpen.value = val;
  }
);
watch(internalOpen, (val) => {
  isOpen.value = val;
});

// Close on route change
const route = useRoute();
watch(
  () => route?.fullPath,
  () => {
    internalOpen.value = false;
    isOpen.value = false;
  }
);
</script>

<template>
  <TooltipProvider>
    <TooltipRoot v-bind="forwarded" :open="isOpen">
      <template v-if="internalOpen">
        <TooltipTrigger as-child>
          <div
            class="fixed pointer-events-none"
            :style="{
              left: `${x}px`,
              top: `${y}px`,
            }"
          />
        </TooltipTrigger>
        <TooltipContent v-bind="$attrs">
          <slot />
        </TooltipContent>
      </template>
      <template v-else>
        <slot />
      </template>
    </TooltipRoot>
  </TooltipProvider>
</template>

<script lang="ts">
export { TooltipTrigger } from 'reka-ui';
</script>
