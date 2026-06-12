<template>
  <div ref="referenceRef">
    <div class="h-full">
      <slot
        name="target"
        :toggle-popover="togglePopover"
        :handle-blur="handleBlur"
      ></slot>
    </div>
    <Transition>
      <div
        v-show="isOpen"
        ref="popoverRef"
        :class="popoverClass"
        class="bg-white dark:bg-gray-850 rounded-md border dark:border-gray-875 shadow-lg popover-container relative z-10"
        :style="{ 'transition-delay': `${isOpen ? entryDelay : exitDelay}ms` }"
      >
        <slot name="content" :toggle-popover="togglePopover"></slot>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { createPopper, Instance as PopperInstance } from '@popperjs/core';

const props = withDefaults(
  defineProps<{
    showPopup?: boolean | null;
    right?: boolean;
    entryDelay?: number;
    exitDelay?: number;
    placement?: string;
    popoverClass?: string | Record<string, boolean> | any[];
  }>(),
  {
    showPopup: null,
    right: false,
    entryDelay: 0,
    exitDelay: 0,
    placement: 'bottom-start',
  }
);

const emit = defineEmits<{
  (e: 'open'): void;
  (e: 'close'): void;
}>();

const isOpen = ref(false);
const referenceRef = ref<HTMLElement | null>(null);
const popoverRef = ref<HTMLElement | null>(null);

let popper: PopperInstance | null = null;
let listener: ((e: MouseEvent) => void) | null = null;

watch(
  () => props.showPopup,
  (value) => {
    if (value === true) {
      open();
    } else if (value === false) {
      close();
    }
  }
);

onMounted(() => {
  listener = (e: MouseEvent) => {
    const $els = [referenceRef.value, popoverRef.value];
    const insideClick = $els.some(
      ($el) => $el && (e.target === $el || $el.contains(e.target as Node))
    );
    if (insideClick) {
      return;
    }
    close();
  };

  if (props.showPopup === null) {
    document.addEventListener('click', listener);
  }
});

onBeforeUnmount(() => {
  if (popper) {
    popper.destroy();
    popper = null;
  }
  if (listener) {
    document.removeEventListener('click', listener);
    listener = null;
  }
});

function setupPopper() {
  if (!referenceRef.value || !popoverRef.value) {
    return;
  }
  if (!popper) {
    popper = createPopper(referenceRef.value, popoverRef.value, {
      placement: props.placement as any,
      modifiers: [{ name: 'offset', options: { offset: [0, 8] } }],
    });
  } else {
    popper.update();
  }
}

function togglePopover(flag?: boolean | null) {
  if (flag === null || flag === undefined) {
    flag = !isOpen.value;
  }
  flag = Boolean(flag);
  if (flag) {
    open();
  } else {
    close();
  }
}

function open() {
  if (isOpen.value) {
    return;
  }
  isOpen.value = true;
  nextTick(() => {
    setupPopper();
  });
  emit('open');
}

function close() {
  if (!isOpen.value) {
    return;
  }
  isOpen.value = false;
  emit('close');
}

function handleBlur({ relatedTarget }: FocusEvent) {
  if (relatedTarget) {
    close();
  }
}

defineExpose({
  open,
  close,
  togglePopover,
});
</script>
<style scoped>
.v-enter-active,
.v-leave-active {
  transition: opacity 150ms ease-out;
}

.v-enter-from,
.v-leave-to {
  opacity: 0;
}
</style>
