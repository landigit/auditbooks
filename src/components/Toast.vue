<template>
  <ToastProvider>
    <Teleport to="#toast-container">
      <ToastRoot
        v-model:open="open"
        class="text-main shadow-lg px-3 py-2 flex items-center mb-3 w-toast z-30 bg-surface rounded-lg border border-border data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=move]:translate-x-[var(--reka-toast-swipe-move-x)] data-[swipe=cancel]:translate-x-0 data-[swipe=cancel]:transition-transform data-[swipe=end]:animate-out"
        :class="[config.containerBorder]"
        style="pointer-events: auto"
        @update:open="onOpenChange"
      >
        <LucideIcon
          :name="config.iconName"
          class="w-6 h-6 me-3"
          :class="config.iconColor"
        />
        <div :class="actionText ? 'cursor-pointer' : ''" @click="actionClicked">
          <ToastTitle class="text-base font-semibold">{{ message }}</ToastTitle>
          <ToastDescription
            v-if="actionText"
            class="text-sm text-muted hover:text-main"
          >
            {{ actionText }}
          </ToastDescription>
        </div>
        <div class="ms-auto flex items-center">
          <LucideIcon
            v-if="isPersistent"
            name="loader-2"
            class="animate-spin h-4 w-4 text-description"
          />

          <ToastClose v-else as-child>
            <LucideIcon
              name="x"
              class="w-4 h-4 ms-auto text-description cursor-pointer hover:text-main"
              @click="closeToast"
            />
          </ToastClose>
        </div>
      </ToastRoot>
      <ToastViewport />
    </Teleport>
  </ToastProvider>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import {
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastRoot,
  ToastTitle,
  ToastViewport,
} from 'reka-ui';
import { getIconConfig } from 'src/utils/api/interactive.js';
import { ToastDuration, ToastType } from 'src/utils/api/types.js';
import { toastDurationMap } from 'src/utils/api/ui.js';
import LucideIcon from './LucideIcon.vue';

// Define Props
const props = withDefaults(
  defineProps<{
    message: string;
    action?: () => void;
    actionText?: string;
    type?: ToastType;
    duration?: ToastDuration;
  }>(),
  {
    action: () => {},
    actionText: '',
    type: 'info',
    duration: 'long',
  }
);

// Reactive State
const open = ref(false);

// Computed Properties
const config = computed(() => getIconConfig(props.type));
const isPersistent = computed(() => props.duration === 'very_long');

// Methods
const closeToast = () => {
  open.value = false;
};

const onOpenChange = (value: boolean) => {
  if (!value) {
    closeToast();
  }
};

const actionClicked = () => {
  props.action();
  closeToast();
};

// Lifecycles
onMounted(() => {
  open.value = true;
  const durationVal = toastDurationMap[props.duration];
  if (durationVal !== Infinity) {
    setTimeout(closeToast, durationVal);
  }
});
</script>
