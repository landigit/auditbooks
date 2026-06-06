<script setup lang="ts">
import { computed, type HTMLAttributes } from "vue";
import {
  ScrollAreaCorner,
  ScrollAreaRoot,
  type ScrollAreaRootProps,
  ScrollAreaScrollbar,
  ScrollAreaThumb,
  ScrollAreaViewport,
} from "reka-ui";
import { cn } from "src/utils/cn";

const props = withDefaults(
  defineProps<ScrollAreaRootProps & { class?: HTMLAttributes["class"] }>(),
  {
    type: "auto",
  },
);

const delegatedProps = computed(() => {
  const { class: _, ...delegated } = props;
  return delegated;
});
</script>

<template>
  <ScrollAreaRoot
    v-bind="delegatedProps"
    :class="
      cn('relative overflow-hidden h-full w-full flex flex-col', props.class)
    "
  >
    <ScrollAreaViewport class="h-full w-full rounded-[inherit] overflow-auto">
      <slot />
    </ScrollAreaViewport>
    <ScrollAreaScrollbar
      orientation="vertical"
      class="flex select-none touch-none p-[2px] bg-surface transition-colors duration-150 ease-out data-[orientation=vertical]:w-2.5 data-[orientation=horizontal]:flex-col data-[orientation=horizontal]:h-2.5 z-20"
    >
      <ScrollAreaThumb
        class="flex-1 bg-border hover:bg-gray-300 dark:hover:bg-gray-600 rounded-[10px] relative before:content-[''] before:absolute before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:w-full before:h-full before:min-w-[44px] before:min-h-[44px]"
      />
    </ScrollAreaScrollbar>
    <ScrollAreaScrollbar
      orientation="horizontal"
      class="flex select-none touch-none p-[2px] bg-surface transition-colors duration-150 ease-out data-[orientation=vertical]:w-2.5 data-[orientation=horizontal]:flex-col data-[orientation=horizontal]:h-2.5 z-20"
    >
      <ScrollAreaThumb
        class="flex-1 bg-border hover:bg-gray-300 dark:hover:bg-gray-600 rounded-[10px] relative before:content-[''] before:absolute before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:w-full before:h-full before:min-w-[44px] before:min-h-[44px]"
      />
    </ScrollAreaScrollbar>
    <ScrollAreaCorner />
  </ScrollAreaRoot>
</template>
