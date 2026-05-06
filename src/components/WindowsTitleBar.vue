<template>
  <div
    class="relative window-drag flex items-center border-b bg-canvas text-main border-border"
    style="height: 28px"
  >
    <Fb class="ms-2" />
    <p v-if="companyName && dbPath" class="mx-auto text-sm">
      {{ companyName }} - {{ dbPath }}
    </p>
    <div
      v-if="!isFullscreen"
      class="absolute window-no-drag flex h-full items-center right-0"
    >
      <div
        class="flex items-center px-4 h-full hover:bg-surface-hover"
        @click="minimizeWindow"
      >
        <lucide-icon name="minus" class="h-4 w-4 flex-shrink-0" />
      </div>
      <div
        class="flex items-center px-4 h-full hover:bg-surface-hover"
        @click="toggleMaximize"
      >
        <lucide-icon
          v-if="isMax"
          name="minimize"
          class="h-3 w-3 flex-shrink-0"
        />
        <lucide-icon v-else name="square" class="h-3 w-3 flex-shrink-0" />
      </div>
      <div
        class="flex items-center px-4 h-full hover:bg-error hover:text-white"
        @click="closeWindow"
      >
        <lucide-icon name="x" class="h-4 w-4 flex-shrink-0" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useAppStore } from 'src/stores/app';
import Fb from './Icons/18/fb.vue';

const props = defineProps<{
  dbPath?: string;
  companyName?: string;
}>();

const appStore = useAppStore();
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
    isMax.value = await ipc.isMaximized();
  } catch (error) {
    console.error(error);
  }
};

const getIsFullscreen = async () => {
  try {
    isFullscreen.value = await ipc.isFullscreen();
  } catch (error) {
    console.error(error);
  }
};

onMounted(() => {
  getIsMaximized();
  getIsFullscreen();
  window.addEventListener('resize', getIsFullscreen);
  document.addEventListener('webkitfullscreenchange', getIsFullscreen);
  document.addEventListener('mozfullscreenchange', getIsFullscreen);
  document.addEventListener('fullscreenchange', getIsFullscreen);
  document.addEventListener('MSFullscreenChange', getIsFullscreen);
});

onUnmounted(() => {
  window.removeEventListener('resize', getIsFullscreen);
  document.removeEventListener('webkitfullscreenchange', getIsFullscreen);
  document.removeEventListener('mozfullscreenchange', getIsFullscreen);
  document.removeEventListener('fullscreenchange', getIsFullscreen);
  document.removeEventListener('MSFullscreenChange', getIsFullscreen);
});
</script>
