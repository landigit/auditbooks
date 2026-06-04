<template>
  <div
    class="page-header px-4 flex justify-between items-center h-row-largest flex-shrink-0 bg-canvas"
    :class="[
      border ? 'border-b border-border' : '',
      store.platform !== 'Windows' ? 'window-drag' : '',
    ]"
  >
    <Transition
      enter-active-class="transition-all duration-150 ease-out"
      enter-from-class="opacity-0 w-0 !me-0 !border-e-0"
      enter-to-class="opacity-100 w-[var(--w-trafficlights)] me-4 border-e border-border"
      leave-active-class="transition-all duration-150 ease-in"
      leave-from-class="opacity-100 w-[var(--w-trafficlights)] me-4 border-e border-border"
      leave-to-class="opacity-0 w-0 !me-0 !border-e-0"
      class="border-none"
    >
      <div
        v-if="
          !store.showSidebar &&
          store.platform === 'Mac' &&
          store.languageDirection !== 'rtl'
        "
        class="h-full w-[var(--w-trafficlights)]"
        :class="spacerClass"
      />
    </Transition>

    <div
      class="flex items-center window-no-drag gap-4 me-auto"
      :class="
        store.platform === 'Mac' && store.languageDirection === 'rtl'
          ? 'me-18'
          : ''
      "
    >
      <!-- Nav Group -->
      <PageHeaderNavGroup />
      <h1
        class="text-xl font-semibold select-none whitespace-nowrap text-main leading-none"
      >
        {{ title || '' }}
      </h1>

      <!-- Left Slot -->
      <div class="flex items-stretch window-no-drag gap-4">
        <slot name="left" />
      </div>
    </div>

    <!-- Right (regular) Slot -->
    <div
      class="flex items-stretch window-no-drag gap-2 ms-auto"
      :class="
        store.platform === 'Mac' && store.languageDirection === 'rtl'
          ? 'me-18'
          : ''
      "
    >
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue';
import { useAppStore } from 'src/stores/app';

// Define Props
const props = withDefaults(
  defineProps<{
    title?: string;
    border?: boolean;
    searchborder?: boolean;
  }>(),
  {
    title: '',
    border: true,
    searchborder: true,
  }
);

const store = useAppStore();

const PageHeaderNavGroup = defineAsyncComponent(
  () => import('./PageHeaderNavGroup.vue')
);

// Computed Properties
const spacerClass = computed(() => {
  if (store.showSidebar) {
    return '';
  }

  if (props.border) {
    return 'me-4 border-e border-border';
  }

  return 'me-4';
});
</script>

<style scoped></style>
