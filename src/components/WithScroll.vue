<template>
  <scroll-view
    v-if="isLynx"
    scroll-y="true"
    class="custom-scroll custom-scroll-thumb1"
    :style="$attrs.style"
    @scroll="handleLynxScroll"
  >
    <slot></slot>
  </scroll-view>
  <view v-else ref="scrollContainer" class="custom-scroll custom-scroll-thumb1">
    <slot></slot>
  </view>
</template>

<script setup lang="ts">
// --- Imports ---
import { ref, onMounted, onBeforeUnmount } from "vue";

// --- Props & Emits ---
const emit = defineEmits<{
  (e: "scroll", payload: { scrollLeft: number; scrollTop: number }): void;
}>();

// --- State ---
const scrollContainer = ref<HTMLElement | null>(null);
let listener: (() => void) | undefined = undefined;

const handleLynxScroll = (e: any) => {
  const scrollLeft = e.detail?.scrollLeft ?? 0;
  const scrollTop = e.detail?.scrollTop ?? 0;
  emit("scroll", { scrollLeft, scrollTop });
};

// --- Lifecycle ---
onMounted(() => {
  if (typeof window !== "undefined" && scrollContainer.value) {
    listener = () => {
      if (!scrollContainer.value) return;
      const { scrollLeft, scrollTop } = scrollContainer.value;
      emit("scroll", { scrollLeft, scrollTop });
    };
    scrollContainer.value.addEventListener("scroll", listener);
  }
});

onBeforeUnmount(() => {
  if (typeof window !== "undefined" && listener && scrollContainer.value) {
    scrollContainer.value.removeEventListener("scroll", listener);
    listener = undefined;
  }
});
</script>
