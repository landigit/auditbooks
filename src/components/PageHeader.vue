<template>
  <view
    v-if="!isLynx"
    class="px-4 flex justify-between items-center h-row-largest flex-shrink-0 bg-surface border-b border-border"
    :class="[
      border ? '' : 'md:border-b-0',
      store.platform !== 'Windows' ? 'window-drag' : '',
    ]"
  >
    <Transition
      enter-active-class="transition-all duration-150 ease-out"
      enter-from-class="opacity-0 w-0 !mr-0 !border-r-0"
      enter-to-class="opacity-100 w-[var(--w-trafficlights)] mr-4 border-r border-border"
      leave-active-class="transition-all duration-150 ease-in"
      leave-from-class="opacity-100 w-[var(--w-trafficlights)] mr-4 border-r border-border"
      leave-to-class="opacity-0 w-0 !mr-0 !border-r-0"
      class="border-none"
    >
      <view
        v-if="
          !store.showSidebar &&
          store.platform === 'Mac' &&
          store.languageDirection !== 'rtl'
        "
        class="h-full w-tl"
        :class="spacerClass"
      />
    </Transition>

    <view
      class="flex items-center window-no-drag gap-2 md:gap-4 me-auto min-w-0"
      :class="
        store.platform === 'Mac' && store.languageDirection === 'rtl'
          ? 'me-18'
          : ''
      "
    >
      <!-- Hamburger menu toggle -->
      <view
        v-if="!store.showSidebar"
        class="flex items-center justify-center p-1.5 rounded hover:bg-surface-hover text-main cursor-pointer flex-shrink-0"
        @tap="() => store.toggleSidebar(true)"
      >
        <lucide-icon name="menu" class="w-5 h-5" />
      </view>

      <!-- Nav Group -->
      <PageHeaderNavGroup class="flex-shrink-0" />
      <text
        v-if="title"
        class="text-xl font-semibold select-none truncate text-main leading-none max-w-[120px] md:max-w-none flex-shrink-0"
        :title="title"
      >
        {{ title }}
      </text>

      <!-- Left Slot -->
      <view
        class="flex items-stretch window-no-drag gap-2 md:gap-4 flex-shrink-0 min-w-0"
      >
        <slot name="left" />
      </view>
    </view>

    <!-- Right (regular) Slot -->
    <view
      class="flex items-stretch window-no-drag gap-1.5 md:gap-2 ms-auto flex-shrink-0"
      :class="
        store.platform === 'Mac' && store.languageDirection === 'rtl'
          ? 'me-18'
          : ''
      "
    >
      <slot />
    </view>
  </view>
  <view
    v-else
    class="NavBar flex flex-row justify-between items-center px-4 py-3 bg-surface border-b border-border"
  >
    <view class="flex flex-row items-center gap-2">
      <slot name="left" />
      <text v-if="title" class="text-lg font-bold text-main">{{ title }}</text>
    </view>
    <view class="flex flex-row items-center gap-2">
      <slot />
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue';
import { useAppStore } from 'src/stores/app';
import { isLynx } from 'src/utils/interactive';

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

<style scoped>
.w-tl {
  width: var(--w-trafficlights);
}
</style>
