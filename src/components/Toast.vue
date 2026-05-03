<template>
  <Teleport to="#toast-container">
    <Transition>
      <div
        v-if="open"
        class="inner text-main shadow-lg px-3 py-2 flex items-center mb-3 w-toast z-30 bg-surface rounded-lg border border-border"
        :class="[config.containerBorder]"
        style="pointer-events: auto"
      >
        <lucide-icon
          :name="config.iconName"
          class="w-6 h-6 me-3"
          :class="config.iconColor"
        />
        <div :class="actionText ? 'cursor-pointer' : ''" @click="actionClicked">
          <p class="text-base">{{ message }}</p>
          <button v-if="actionText" class="text-sm text-muted hover:text-main">
            {{ actionText }}
          </button>
        </div>
        <div class="ms-auto flex items-center">
          <svg
            v-if="isPersistent"
            class="animate-spin h-4 w-4 text-description"
            viewBox="0 0 24 24"
          >
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
              fill="none"
            />
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            />
          </svg>

          <lucide-icon
            v-else
            name="x"
            class="w-4 h-4 ms-auto text-description cursor-pointer hover:text-main"
            @click="closeToast"
          />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
<script lang="ts">
import { getIconConfig } from 'src/utils/interactive';
import { ToastDuration, ToastType } from 'src/utils/types';
import { toastDurationMap } from 'src/utils/ui';
import { PropType, defineComponent, nextTick } from 'vue';
import LucideIcon from './LucideIcon.vue';

export default defineComponent({
  components: {
    LucideIcon,
  },
  props: {
    message: { type: String, required: true },
    action: { type: Function, default: () => {} },
    actionText: { type: String, default: '' },
    type: { type: String as PropType<ToastType>, default: 'info' },
    duration: { type: String as PropType<ToastDuration>, default: 'long' },
  },
  data() {
    return {
      open: false,
    };
  },
  computed: {
    config() {
      return getIconConfig(this.type);
    },
    isPersistent() {
      return this.duration === 'very_long';
    },
  },
  async mounted() {
    const duration = toastDurationMap[this.duration];
    await nextTick(() => (this.open = true));
    if (duration !== Infinity) {
      setTimeout(this.closeToast, duration);
    }
  },
  methods: {
    actionClicked() {
      this.action();
      this.closeToast();
    },
    closeToast() {
      this.open = false;
    },
  },
});
</script>
<style scoped>
.v-enter-active,
.v-leave-active {
  transition: all 150ms ease-out;
}

.v-enter-from,
.v-leave-to {
  opacity: 0;
}

.v-enter-to,
.v-leave-from {
  opacity: 1;
}
</style>
