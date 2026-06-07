<script setup lang="ts">
import { useAppStore } from 'src/stores/app';
import Sidebar from '../components/Sidebar.vue';
import { isLynx } from 'src/utils/interactive';
/*
Define Props */ withDefaults(defineProps<{ theme?: string }>(), {
  theme: 'auto',
});
/* Define Emits */ defineEmits<{
  (e: 'change-db-file'): void;
  (e: 'toggle-darkmode'): void;
}>();
const appStore = useAppStore();
</script>
<template>
  <view v-if="!isLynx" class="flex-1 flex flex-col h-full w-full">
    <view class="flex overflow-hidden relative h-full w-full">
      <!-- Sidebar backdrop overlay for mobile -->
      <Transition
        enter-active-class="transition-opacity duration-150 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-opacity duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <view
          v-if="appStore.showSidebar"
          class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden"
          @tap="() => appStore.toggleSidebar(false)"
        />
      </Transition>

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
          class="fixed md:relative inset-y-0 start-0 z-50 bg-sidebar flex-shrink-0 border-e border-border whitespace-nowrap w-sidebar"
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
    </view>
  </view>
  <view v-else class="MainView">
    <!-- Native Lynx: the router renders pages as stack navigation.
         Desk.vue is the shell; the active page is rendered by App.vue's
         lynx-router-view. Nothing extra needed here. -->
    <view class="flex-1 bg-canvas" />
  </view>
</template>
