<template>
  <div
    class="relative window-drag flex items-center border-b dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-100 dark:border-gray-800"
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
        class="flex items-center px-4 h-full hover:bg-gray-300 dark:hover:bg-gray-875"
        @click="minimizeWindow"
      >
        <feather-icon name="minus" class="h-4 w-4 flex-shrink-0" />
      </div>
      <div
        class="flex items-center px-4 h-full hover:bg-gray-300 dark:hover:bg-gray-875"
        @click="toggleMaximize"
      >
        <feather-icon
          v-if="isMax"
          name="minimize"
          class="h-3 w-3 flex-shrink-0"
        />
        <feather-icon v-else name="square" class="h-3 w-3 flex-shrink-0" />
      </div>
      <div
        class="flex items-center px-4 h-full hover:bg-red-600 hover:text-white"
        @click="closeWindow"
      >
        <feather-icon name="x" class="h-4 w-4 flex-shrink-0" />
      </div>
    </div>
  </div>
</template>

<script>
import { getCurrentWindow } from '@tauri-apps/api/window';
import Fb from './Icons/18/fb.vue';

export default {
  name: 'WindowsTitleBar',
  components: { Fb },
  props: {
    dbPath: String,
    companyName: String,
  },
  data() {
    return {
      isMax: false,
      isFullscreen: false,
    };
  },
  mounted() {
    this.getIsMaximized();
    this.getIsFullscreen();
    window.addEventListener('resize', this.getIsFullscreen);
    document.addEventListener('webkitfullscreenchange', this.getIsFullscreen);
    document.addEventListener('mozfullscreenchange', this.getIsFullscreen);
    document.addEventListener('fullscreenchange', this.getIsFullscreen);
    document.addEventListener('MSFullscreenChange', this.getIsFullscreen);
  },
  unmounted() {
    window.removeEventListener('resize', this.getIsFullscreen);
    document.removeEventListener('webkitfullscreenchange', this.getIsFullscreen);
    document.removeEventListener('mozfullscreenchange', this.getIsFullscreen);
    document.removeEventListener('fullscreenchange', this.getIsFullscreen);
    document.removeEventListener('MSFullscreenChange', this.getIsFullscreen);
  },
  methods: {
    async minimizeWindow() {
      await getCurrentWindow().minimize();
    },
    async toggleMaximize() {
      await getCurrentWindow().toggleMaximize();
      await this.getIsMaximized();
    },
    async closeWindow() {
      await getCurrentWindow().close();
    },
    async getIsMaximized() {
      try {
        this.isMax = await getCurrentWindow().isMaximized();
      } catch (error) {
        console.error(error);
      }
    },
    async getIsFullscreen() {
      try {
        this.isFullscreen = await getCurrentWindow().isFullscreen();
      } catch (error) {
        this.isFullscreen = !!(document.fullscreenElement);
      }
    },
  },
};
</script>
