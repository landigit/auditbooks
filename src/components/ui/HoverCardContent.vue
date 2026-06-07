<script setup lang="ts">
import { type HTMLAttributes, computed } from 'vue';
import {
  HoverCardContent,
  type HoverCardContentProps,
  HoverCardPortal,
  useForwardPropsEmits,
} from 'reka-ui';
import { cn } from 'src/utils/cn';

defineOptions({
  inheritAttrs: false,
});

const props = withDefaults(
  defineProps<HoverCardContentProps & { class?: HTMLAttributes['class'] }>(),
  {
    sideOffset: 4,
  }
);
const emits = defineEmits(['close']);

const delegatedProps = computed(() => {
  const { class: _, ...delegated } = props;

  return delegated;
});

const forwarded = useForwardPropsEmits(delegatedProps, emits);
</script>

<template>
  <HoverCardPortal>
    <HoverCardContent
      v-bind="{ ...forwarded, ...$attrs }"
      :class="
        cn(
          'z-50 min-w-[200px] rounded border border-border bg-surface p-4 text-main shadow-lg outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          props.class
        )
      "
    >
      <slot />
    </HoverCardContent>
  </HoverCardPortal>
</template>
