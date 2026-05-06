<script setup lang="ts">
import { type HTMLAttributes, computed } from 'vue';
import {
  TooltipContent,
  type TooltipContentProps,
  TooltipPortal,
  useForwardPropsEmits,
} from 'reka-ui';
import { cn } from 'src/utils/cn';

defineOptions({
  inheritAttrs: false,
});

const props = withDefaults(
  defineProps<
    TooltipContentProps & {
      class?: HTMLAttributes['class'];
      offset?: number;
      placement?: string;
    }
  >(),
  {
    sideOffset: 4,
  }
);

const emits = defineEmits(['close']);

const delegatedProps = computed(() => {
  const { class: _, ...delegated } = props;

  // Map legacy props if they exist in attrs
  if (props.offset !== undefined) delegated.sideOffset = props.offset;
  if (props.placement !== undefined) delegated.side = props.placement;

  return delegated;
});

const forwarded = useForwardPropsEmits(delegatedProps, emits);
</script>

<template>
  <TooltipPortal>
    <TooltipContent
      v-bind="{ ...forwarded, ...$attrs }"
      :class="
        cn(
          'z-50 overflow-hidden pointer-events-none rounded bg-surface-variant px-2 py-1 text-xs text-on-surface shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
          props.class
        )
      "
    >
      <slot />
    </TooltipContent>
  </TooltipPortal>
</template>
