<template>
  <Tooltip ref="tooltip"><slot></slot></Tooltip>
</template>

<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue';
import Tooltip from './Tooltip.vue';

const props = withDefaults(
  defineProps<{
    show?: boolean;
  }>(),
  {
    show: false,
  }
);

const tooltip = ref<InstanceType<typeof Tooltip> | null>(null);

function mousemoveListener(e: MouseEvent) {
  tooltip.value?.update(e);
}

function setListeners() {
  window.addEventListener('mousemove', mousemoveListener);
}

function removeListener() {
  window.removeEventListener('mousemove', mousemoveListener);
}

watch(
  () => props.show,
  (val) => {
    if (val) {
      tooltip.value?.create();
      setListeners();
    } else {
      tooltip.value?.destroy();
      removeListener();
    }
  }
);

onBeforeUnmount(() => {
  removeListener();
});
</script>
