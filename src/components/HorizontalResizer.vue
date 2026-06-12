<template>
  <div
    ref="hr"
    class="h-full bg-gray-300 dark:bg-gray-700 transition-opacity hover:opacity-100"
    :class="resizing ? 'opacity-100' : 'opacity-0'"
    style="width: 3px; cursor: col-resize; margin-left: -3px"
    @mousedown="onMouseDown"
  >
    <MouseFollower
      :show="resizing"
      placement="left"
      class="px-1 py-0.5 border dark:border-gray-800 rounded-md shadow text-sm text-center bg-gray-900 text-gray-100"
      style="min-width: 2rem"
    >
      {{ value }}
    </MouseFollower>
  </div>
</template>
<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from 'vue';
import MouseFollower from './MouseFollower.vue';

const props = defineProps<{
  initialX: number;
  minX?: number;
  maxX?: number;
}>();

const emit = defineEmits<{
  (e: 'resize', value: number): void;
}>();

const hr = ref<HTMLElement | null>(null);
const x = ref(0);
const delta = ref(0);
const xOnMouseDown = ref(0);
const resizing = ref(false);

const value = computed(() => {
  let val = delta.value + xOnMouseDown.value;
  if (typeof props.minX === 'number') {
    val = Math.max(props.minX, val);
  }
  if (typeof props.maxX === 'number') {
    val = Math.min(props.maxX, val);
  }
  return val;
});

function onMouseDown(e: MouseEvent) {
  e.preventDefault();

  x.value = e.clientX;
  xOnMouseDown.value = props.initialX;
  setResizing(true);

  document.addEventListener('mousemove', mouseMoveListener);
  document.addEventListener('mouseup', mouseUpListener);
}

function mouseUpListener(e: MouseEvent) {
  e.preventDefault();

  x.value = e.clientX;
  setResizing(false);

  emit('resize', value.value);
  removeListeners();
}

function mouseMoveListener(e: MouseEvent) {
  e.preventDefault();
  delta.value = x.value - e.clientX;
  emit('resize', value.value);
}

function removeListeners() {
  document.removeEventListener('mousemove', mouseMoveListener);
  document.removeEventListener('mouseup', mouseUpListener);
}

function setResizing(val: boolean) {
  resizing.value = val;

  if (val) {
    delta.value = 0;
    document.body.style.cursor = 'col-resize';
  } else {
    document.body.style.cursor = '';
  }
}

onBeforeUnmount(() => {
  removeListeners();
  document.body.style.cursor = '';
});
</script>
