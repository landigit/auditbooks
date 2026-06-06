<template>
  <Teleport to="body">
    <Transition>
      <view
        v-if="openModal"
        class="backdrop z-50 flex justify-center items-center"
        @tap="emit('closemodal')"
      >
        <view
          class="bg-surface rounded-lg shadow-2xl border border-border overflow-hidden inner"
          v-bind="$attrs"
          @tap.stop
        >
          <slot></slot>
        </view>
      </view>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { inject, watch, onUnmounted } from 'vue';

defineOptions({ inheritAttrs: false });
import { shortcutsKey } from 'src/utils/injectionKeys';

// Define Props
const props = withDefaults(
  defineProps<{
    openModal?: boolean;
    setCloseListener?: boolean;
  }>(),
  {
    openModal: false,
    setCloseListener: false,
  }
);

// Define Emits
const emit = defineEmits<{
  (e: 'closemodal'): void;
}>();

const shortcuts = inject(shortcutsKey);
const context = `Modal-` + Math.random().toString(36).slice(2, 6);

// Watch openModal to register Escape shortcut
watch(
  () => props.openModal,
  (value: boolean) => {
    if (value) {
      shortcuts?.set(context, ['Escape'], () => {
        emit('closemodal');
      });
    } else {
      shortcuts?.delete(context);
    }
  },
  { immediate: true }
);

onUnmounted(() => {
  shortcuts?.delete(context);
});
</script>

<style scoped>
.v-enter-active,
.v-leave-active {
  transition: opacity 120ms ease-out;
}

.inner {
  transition:
    transform 120ms cubic-bezier(0.16, 1, 0.3, 1),
    opacity 120ms ease-out;
}

.v-enter-from,
.v-leave-to {
  opacity: 0;
}

.v-enter-from .inner,
.v-leave-to .inner {
  transform: translateY(8px) scale(0.98);
  opacity: 0;
}

.v-enter-to .inner,
.v-leave-from .inner {
  transform: translateY(0px) scale(1);
  opacity: 1;
}
</style>
