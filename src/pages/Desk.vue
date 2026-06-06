<script setup lang="ts">
import { useAppStore } from 'src/stores/app';
import Sidebar from '../components/Sidebar.vue';

// Define Props
withDefaults(
  defineProps<{
    theme?: string;
  }>(),
  {
    theme: 'auto',
  }
);

// Define Emits
defineEmits<{
  (e: 'change-db-file'): void;
  (e: 'toggle-darkmode'): void;
}>();

const appStore = useAppStore();
const toggleSidebar = () => appStore.toggleSidebar();
</script>
<template>
  <view class="flex overflow-hidden">
    <Transition
      enter-active-class="transition-all duration-150 ease-out"
      enter-from-class="-translate-x-full rtl:translate-x-full opacity-0 w-0"
      enter-to-class="translate-x-0 opacity-100 w-[var(--w-sidebar)]"
      leave-active-class="transition-all duration-150 ease-in"
      leave-from-class="translate-x-0 opacity-100 w-[var(--w-sidebar)]"
      leave-to-class="-translate-x-full rtl:translate-x-full opacity-0 w-0"
    >
      <!-- eslint-disable vue/require-explicit-emits -->
      <Sidebar
        v-show="appStore.showSidebar"
        class="flex-shrink-0 border-e border-border whitespace-nowrap w-sidebar"
        :theme="theme"
        @change-db-file="$emit('change-db-file')"
        @toggle-darkmode="$emit('toggle-darkmode')"
      />
    </Transition>

    <view
      class="flex flex-1 overflow-y-hidden custom-scroll custom-scroll-thumb1 bg-canvas"
    >
      <router-view v-slot="{ Component }">
        <keep-alive>
          <component :is="Component" :key="$route.path" class="flex-1" />
        </keep-alive>
      </router-view>

      <router-view v-slot="{ Component, route }" name="edit">
        <Transition
          enter-active-class="transition-all duration-150 ease-out"
          enter-from-class="translate-x-full opacity-0 w-0"
          enter-to-class="translate-x-0 opacity-100 w-[var(--w-quick-edit)]"
          leave-active-class="transition-all duration-150 ease-in"
          leave-from-class="translate-x-0 opacity-100 w-[var(--w-quick-edit)]"
          leave-to-class="translate-x-full opacity-0 w-0"
        >
          <view v-if="route?.query?.edit">
            <component
              :is="Component"
              :key="
                String(route.query.schemaName || '') +
                String(route.query.name || '')
              "
            />
          </view>
        </Transition>
      </router-view>
    </view>

    <!-- Show Sidebar Button -->
    <button
      v-show="!appStore.showSidebar"
      class="absolute bottom-0 start-0 text-description hover:bg-surface-hover rounded rtl-rotate-180 p-1 m-4 opacity-0 hover:opacity-100 hover:shadow-md"
      @tap="() => toggleSidebar()"
    >
      <LucideIcon name="chevrons-right" class="w-4 h-4" />
    </button>
  </view>
</template>
