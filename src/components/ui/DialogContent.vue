<script setup lang="ts">
import { type HTMLAttributes, computed } from 'vue';
import {
  DialogContent,
  type DialogContentEmits,
  type DialogContentProps,
  DialogOverlay,
  DialogPortal,
  useForwardPropsEmits,
} from 'reka-ui';
import { cn } from 'src/utils/api/cn';

const props = defineProps<
  DialogContentProps & { class?: HTMLAttributes['class'] }
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
          'fixed inset-0 m-auto h-fit z-50 grid w-full max-w-lg gap-4 border border-border bg-surface p-6 shadow-2xl sm:rounded-lg dialog-content',
          props.class
        )
      "
    >
      <slot />
    </DialogContent>
  </DialogPortal>
</template>

<style scoped>
.dialog-overlay {
  backdrop-filter: blur(6px);
}
.dialog-overlay[data-state='open'] {
  animation: fadeIn 120ms ease-out forwards;
}
.dialog-overlay[data-state='closed'] {
  animation: fadeOut 120ms ease-in forwards;
}

.dialog-content[data-state='open'] {
  animation: dialogIn 120ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
.dialog-content[data-state='closed'] {
  animation: dialogOut 120ms ease-in forwards;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes fadeOut {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}

@keyframes dialogIn {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0px) scale(1);
  }
}

@keyframes dialogOut {
  from {
    opacity: 1;
    transform: translateY(0px) scale(1);
  }
  to {
    opacity: 0;
    transform: translateY(8px) scale(0.98);
  }
}
</style>
