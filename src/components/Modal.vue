<template>
  <Transition>
    <div
      v-if="openModal"
      class="backdrop z-20 flex justify-center items-center"
      @click="$emit('closemodal')"
    >
      <div
        class="bg-white dark:bg-gray-850 rounded-lg shadow-2xl border dark:border-gray-800 overflow-hidden inner"
        v-bind="$attrs"
        @click.stop
      >
        <slot></slot>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { shortcutsKey } from 'src/utils/injectionKeys';
import { inject, watch, onUnmounted } from 'vue';

const props = withDefaults(
  defineProps<{
    openModal?: boolean;
  }>(),
  {
    openModal: false,
  }
);

const emit = defineEmits<{
  (e: 'closemodal'): void;
}>();

const shortcuts = inject(shortcutsKey);
const context = `Modal-` + Math.random().toString(36).slice(2, 6);

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
  }
);

onUnmounted(() => {
  shortcuts?.delete(context);
});
</script>
<style scoped>
.v-enter-active,
.v-leave-active {
  transition: all 100ms ease-out;
}

.inner {
  transition: all 150ms ease-out;
}

.v-enter-from,
.v-leave-to {
  opacity: 0;
}

.v-enter-from .inner,
.v-leave-to .inner {
  transform: translateY(-50px);
}

.v-enter-to .inner,
.v-leave-from .inner {
  transform: translateY(0px);
}
</style>
