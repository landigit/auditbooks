<template>
  <view
    v-if="isDesktop"
    class="relative window-drag flex items-center border-b bg-canvas text-main border-border"
    style="height: 28px"
  >
    <Fb class="ms-2" />
    <text v-if="companyName && dbPath" class="mx-auto text-sm">
      {{ companyName }} - {{ dbPath }}
    </text>
    <view v-if="!isFullscreen" class="absolute window-no-drag flex h-full items-center right-0">
      <view class="flex items-center px-4 h-full hover:bg-surface-hover" @tap="minimizeWindow">
        <LucideIcon name="minus" class="h-4 w-4 flex-shrink-0" />
      </view>
      <view class="flex items-center px-4 h-full hover:bg-surface-hover" @tap="toggleMaximize">
        <LucideIcon v-if="isMax" name="minimize" class="h-3 w-3 flex-shrink-0" />
        <LucideIcon v-else name="square" class="h-3 w-3 flex-shrink-0" />
      </view>
      <view
        class="flex items-center px-4 h-full hover:bg-error hover:text-white"
        @tap="closeWindow"
      >
        <LucideIcon name="x" class="h-4 w-4 flex-shrink-0" />
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import Fb from "./Icons/18/fb.vue";

defineProps<{
  dbPath?: string;
  companyName?: string;
}>();

const isDesktop = typeof ipc !== "undefined" ? ipc.desktop : false;
const isMax = ref(false);
const isFullscreen = ref(false);

const minimizeWindow = () => ipc.minimizeWindow();
const toggleMaximize = async () => {
  await ipc.toggleMaximize();
  getIsMaximized();
};
const closeWindow = () => ipc.closeWindow();

const getIsMaximized = async () => {
  try {
    isMax.value = (await ipc.isMaximized()) as boolean;
  } catch (error) {
    console.error(error);
  }
};

const getIsFullscreen = async () => {
  try {
    isFullscreen.value = (await ipc.isFullscreen()) as boolean;
  } catch (error) {
    console.error(error);
  }
};

const handleResize = () => {
  getIsFullscreen();
  getIsMaximized();
};

onMounted(() => {
  getIsMaximized();
  getIsFullscreen();
  window.addEventListener("resize", handleResize);
  document.addEventListener("webkitfullscreenchange", getIsFullscreen);
  document.addEventListener("mozfullscreenchange", getIsFullscreen);
  document.addEventListener("fullscreenchange", getIsFullscreen);
  document.addEventListener("MSFullscreenChange", getIsFullscreen);
});

onUnmounted(() => {
  window.removeEventListener("resize", handleResize);
  document.removeEventListener("webkitfullscreenchange", getIsFullscreen);
  document.removeEventListener("mozfullscreenchange", getIsFullscreen);
  document.removeEventListener("fullscreenchange", getIsFullscreen);
  document.removeEventListener("MSFullscreenChange", getIsFullscreen);
});
</script>
