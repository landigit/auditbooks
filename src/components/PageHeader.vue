<template>
  <div
    class="px-2 md:px-4 flex justify-between items-center flex-shrink-0 dark:bg-gray-875 safe-area-top-padding"
    :style="`height: calc(var(--h-row-largest) + env(safe-area-inset-top, 0px))`"
    :class="[
      border ? 'border-b dark:border-gray-800' : '',
      platformName !== 'Windows' ? 'window-drag' : '',
    ]"
  >
    <Transition name="spacer" class="border-none">
      <div
        v-if="!showSidebar && platformName === 'Mac' && languageDirection !== 'rtl'"
        class="h-full"
        :class="spacerClass"
      />
    </Transition>

    <div
      class="flex items-center window-no-drag gap-1.5 md:gap-4 min-w-0 me-auto"
      :class="platformName === 'Mac' && languageDirection === 'rtl' ? 'me-18' : ''"
    >
      <!-- Nav Group -->
      <PageHeaderNavGroup />
      <h1
        v-if="title"
        class="text-base md:text-xl font-semibold select-none truncate max-w-[120px] sm:max-w-[200px] md:max-w-none dark:text-white"
        :title="title"
      >
        {{ title }}
      </h1>

      <!-- Left Slot -->
      <div class="flex items-stretch window-no-drag gap-1.5 md:gap-4 min-w-0">
        <slot name="left" />
      </div>
    </div>

    <!-- Right (regular) Slot -->
    <div
      class="flex items-stretch window-no-drag gap-1 md:gap-2 ms-auto flex-shrink-0"
      :class="platformName === 'Mac' && languageDirection === 'rtl' ? 'me-18' : ''"
    >
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, Transition, useSlots } from 'vue';
import { languageDirectionKey } from 'src/utils/injectionKeys';
import { showSidebar } from 'src/utils/refs';
import { fyo } from 'src/initFyo';
import PageHeaderNavGroup from './PageHeaderNavGroup.vue';

const props = defineProps({
  title: { type: String, default: '' },
  border: { type: Boolean, default: true },
  searchborder: { type: Boolean, default: true },
});

const slots = useSlots();
const languageDirection = inject(languageDirectionKey);

// Translate platform string from fyo.store.platform to match global computed: 'Windows' | 'Mac' | 'Linux'
const platformName = computed(() => {
  const p = fyo.store.platform;
  if (p === 'win32') return 'Windows';
  if (p === 'darwin') return 'Mac';
  return 'Linux';
});

const showBorder = computed(() => {
  return !!slots.default && props.searchborder;
});

const spacerClass = computed(() => {
  if (showSidebar.value) {
    return '';
  }

  if (props.border) {
    return 'w-tl me-4 border-e';
  }

  return 'w-tl me-4';
});
</script>

<style scoped>
.w-tl {
  width: var(--w-trafficlights);
}

.spacer-enter-from,
.spacer-leave-to {
  opacity: 0;
  width: 0px;
  margin-right: 0px;
  border-right-width: 0px;
}

.spacer-enter-to,
.spacer-leave-from {
  opacity: 1;
  width: var(--w-trafficlights);
  margin-right: 1rem;
  border-right-width: 1px;
}

.spacer-enter-active,
.spacer-leave-active {
  transition: all 150ms ease-out;
}
</style>
