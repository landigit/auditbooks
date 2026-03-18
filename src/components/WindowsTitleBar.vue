<template>
  <div
    class="relative window-drag flex items-center border-b dark:bg-gray-900 text-gray-900 dark:text-gray-100 border-gray-100 dark:border-gray-800"
    style="height: 28px"
  >
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
        <LucideIcon name="minus" :size="16" class="h-4 w-4 flex-shrink-0" />
      </div>
      <div
        class="flex items-center px-4 h-full hover:bg-gray-300 dark:hover:bg-gray-875"
        @click="toggleMaximize"
      >
        <LucideIcon
          v-if="isMax"
          name="minimize"
          :size="12"
          class="h-3 w-3 flex-shrink-0"
        />
        <LucideIcon v-else name="square" :size="12" class="h-3 w-3 flex-shrink-0" />
      </div>
      <div
        class="flex items-center px-4 h-full hover:bg-red-600 hover:text-white"
        @click="closeWindow"
      >
        <LucideIcon name="x" :size="16" class="h-4 w-4 flex-shrink-0" />
      </div>
    </div>
  </div>
</template>

<script>
import LucideIcon from 'src/components/LucideIcon.vue';

export default {
  name: 'WindowsTitleBar',
  components: { LucideIcon },
  props: {
    dbPath: String,
    companyName: String,
  },
  data() {
    return {
      isMax: Boolean,
      isFullscreen: Boolean,
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
  destroyed() {
    window.removeEventListener('resize', this.getIsFullscreen);
    document.removeEventListener(
      'webkitfullscreenchange',
      this.getIsFullscreen
    );
    document.removeEventListener('mozfullscreenchange', this.getIsFullscreen);
    document.removeEventListener('fullscreenchange', this.getIsFullscreen);
    document.removeEventListener('MSFullscreenChange', this.getIsFullscreen);
  },
  methods: {
    minimizeWindow() {
      ipc.minimizeWindow();
    },
    toggleMaximize() {
      ipc.toggleMaximize();
      this.getIsMaximized();
    },
    closeWindow() {
      ipc.closeWindow();
    },
    getIsMaximized() {
      ipc
        .isMaximized()
        .then((result) => {
          this.isMax = result;
        })
        .catch((error) => {
          console.error(error);
        });
    },
    getIsFullscreen() {
      ipc
        .isFullscreen()
        .then((result) => {
          this.isFullscreen = result;
        })
        .catch((error) => {
          console.error(error);
        });
    },
  },
};
</script>
