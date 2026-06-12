<script setup lang="ts">
import { showSidebar } from 'src/utils/refs';
import { toggleSidebar } from 'src/utils/ui';
import Sidebar from '../components/Sidebar.vue';
import { useBreakpoint } from 'src/composables/useBreakpoint';

const props = withDefaults(
  defineProps<{
    darkMode?: boolean;
  }>(),
  {
    darkMode: false,
  }
);

defineEmits<{
  (e: 'change-db-file'): void;
}>();

const { isMobile } = useBreakpoint();
</script>
<template>
  <div class="flex overflow-hidden relative">
    <!-- Dark backdrop on mobile when sidebar is open -->
    <div
      v-if="isMobile && showSidebar"
      class="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-200"
      @click="() => toggleSidebar()"
    />

    <Transition name="sidebar">
      <!-- eslint-disable vue/require-explicit-emits -->
      <Sidebar
        v-show="showSidebar"
        class="flex-shrink-0 border-e dark:border-gray-800 whitespace-nowrap w-sidebar"
        :class="{
          'absolute inset-y-0 start-0 z-50 shadow-2xl h-full': isMobile
        }"
        :dark-mode="darkMode"
        @change-db-file="$emit('change-db-file')"
      />
    </Transition>

    <div
      class="flex flex-1 overflow-y-hidden custom-scroll custom-scroll-thumb1 bg-white dark:bg-gray-875"
    >
      <router-view v-slot="{ Component }">
        <keep-alive>
          <component
            :is="Component"
            :key="$route.path"
            :dark-mode="darkMode"
            class="flex-1"
          />
        </keep-alive>
      </router-view>

      <router-view v-slot="{ Component, route }" name="edit">
        <Transition name="quickedit">
          <div v-if="route?.query?.edit">
            <component
              :is="Component"
              :key="route.query.schemaName + route.query.name"
              :dark-mode="darkMode"
            />
          </div>
        </Transition>
      </router-view>
    </div>

    <!-- Show Sidebar Button -->
    <button
      v-show="!showSidebar"
      class="absolute bottom-0 start-0 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-900 rounded rtl-rotate-180 p-1 m-4 opacity-0 hover:opacity-100 hover:shadow-md"
      @click="() => toggleSidebar()"
    >
      <feather-icon name="chevrons-right" class="w-4 h-4" />
    </button>
  </div>
</template>


<style scoped>
.sidebar-enter-from,
.sidebar-leave-to {
  opacity: 0;
  transform: translateX(calc(-1 * var(--w-sidebar)));
  width: 0px;
}
[dir='rtl'] .sidebar-leave-to {
  opacity: 0;
  transform: translateX(calc(1 * var(--w-sidebar)));
  width: 0px;
}

.sidebar-enter-to,
.sidebar-leave-from {
  opacity: 1;
  transform: translateX(0px);
  width: var(--w-sidebar);
}

.sidebar-enter-active,
.sidebar-leave-active {
  transition: all 150ms ease-out;
}
</style>
