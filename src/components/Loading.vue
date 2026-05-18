<template>
  <div
    v-if="open && !close"
    class="absolute bottom-0 flex justify-end pb-6 pe-6"
    :style="{ width: fullWidth ? '100%' : 'calc(100% - 12rem)' }"
  >
    <!-- Loading Continer -->
    <div
      class="border border-border text-main shadow-lg px-3 py-3 items-center w-96 z-10 bg-surface rounded-lg"
    >
      <!-- Message -->
      <p v-if="message?.length" class="text-base text-description pb-2">
        {{ message }}
      </p>

      <!-- Loading Bar Container -->
      <div class="w-full flex flex-row items-center">
        <!-- Loading Bar BG -->
        <div
          class="w-full h-3 me-2 rounded"
          :class="percent >= 0 ? 'bg-canvas-muted' : 'bg-canvas-muted'"
        >
          <!-- Loading Bar -->
          <div
            v-if="percent >= 0"
            class="h-3 rounded bg-main"
            :style="{ width: `${percent * 100}%` }"
          ></div>
        </div>

        <!-- Close Icon -->
        <lucide-icon
          v-if="showX"
          name="x"
          class="w-4 h-4 ms-auto text-description cursor-pointer hover:text-main"
          @click="closeToast"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, getCurrentInstance } from 'vue';

interface LoadingProps {
  open?: boolean;
  percent?: number;
  message?: string;
  fullWidth?: boolean;
  showX?: boolean;
}

withDefaults(defineProps<LoadingProps>(), {
  open: false,
  percent: 0.5,
  message: '',
  fullWidth: false,
  showX: true,
});

const close = ref(false);

const closeToast = () => {
  close.value = true;
};

const instance = getCurrentInstance();
onMounted(() => {
  (window as any).l = instance?.proxy;
});

defineExpose({
  closeToast,
});
</script>
