<script setup lang="ts">
import { type HTMLAttributes, computed } from "vue";
import {
  DialogContent,
  type DialogContentEmits,
  type DialogContentProps,
  DialogOverlay,
  DialogPortal,
  useForwardPropsEmits,
} from "reka-ui";
import { cn } from "src/utils/cn";

const props = defineProps<
  DialogContentProps & { class?: HTMLAttributes["class"] }
>();
const emits = defineEmits<DialogContentEmits>();

const delegatedProps = computed(() => {
  const { class: _, ...delegated } = props;
  return delegated;
});

const forwarded = useForwardPropsEmits(delegatedProps, emits);
</script>

<template>
  <DialogPortal>
    <DialogOverlay
      class="fixed inset-0 z-50 bg-[var(--color-backdrop)] dialog-overlay"
    />
    <DialogContent
      v-bind="forwarded"
      :class="
        cn(
          'fixed left-1/2 top-1/2 z-50 grid w-full max-w-lg gap-4 border border-border bg-surface p-6 shadow-2xl sm:rounded-lg dialog-content',
          props.class,
        )
      "
    >
      <slot />
    </DialogContent>
  </DialogPortal>
</template>

<style scoped>
.dialog-overlay {
  transition: opacity 120ms ease-out;
}
.dialog-overlay[data-state="open"] {
  opacity: 1;
  backdrop-filter: blur(6px);
}
.dialog-overlay[data-state="closed"] {
  opacity: 0;
}

.dialog-content {
  transition:
    transform 120ms cubic-bezier(0.16, 1, 0.3, 1),
    opacity 120ms ease-out;
}
.dialog-content[data-state="open"] {
  opacity: 1;
  transform: translate(-50%, -50%) scale(1);
}
.dialog-content[data-state="closed"] {
  opacity: 0;
  transform: translate(-50%, calc(-50% + 8px)) scale(0.98);
}
</style>
