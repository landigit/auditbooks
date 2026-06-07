<template>
  <Teleport to="#toast-container">
    <Transition
      enter-active-class="transition-all duration-150 ease-out"
      enter-from-class="opacity-0 translate-y-2 scale-95"
      enter-to-class="opacity-100 translate-y-0 scale-100"
      leave-active-class="transition-all duration-100 ease-in"
      leave-from-class="opacity-100 translate-y-0 scale-100"
      leave-to-class="opacity-0 translate-y-2 scale-95"
    >
      <view
        v-if="open"
        class="inner text-main shadow-lg px-3 py-2 flex items-center mb-3 w-toast z-30 bg-surface rounded-lg border border-border"
        :class="[config.containerBorder]"
        style="pointer-events: auto"
      >
        <LucideIcon
          :name="config.iconName"
          class="w-6 h-6 me-3"
          :class="config.iconColor"
        />
        <view :class="actionText ? 'cursor-pointer' : ''" @tap="actionClicked">
          <text class="text-base">{{ message }}</text>
          <view v-if="actionText" class="text-sm text-muted hover:text-main">
            {{ actionText }}
          </view>
        </view>
        <view class="ms-auto flex items-center">
          <LucideIcon
            v-if="isPersistent"
            name="loader-2"
            class="animate-spin h-4 w-4 text-description"
          />

          <LucideIcon
            v-else
            name="x"
            class="w-4 h-4 ms-auto text-description cursor-pointer hover:text-main"
            @tap="closeToast"
          />
        </view>
      </view>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue';
import { getIconConfig } from 'src/utils/interactive';
import { ToastDuration, ToastType } from 'src/utils/types';
import { toastDurationMap } from 'src/utils/ui';
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

const actionClicked = () => {
  props.action();
  closeToast();
};

// Lifecycles
onMounted(async () => {
  const durationVal = toastDurationMap[props.duration];
  await nextTick(() => (open.value = true));
  if (durationVal !== Infinity) {
    setTimeout(closeToast, durationVal);
  }
});
</script>
