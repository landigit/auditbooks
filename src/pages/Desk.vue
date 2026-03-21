<script setup lang="ts">
import { showSidebar } from "src/utils/refs";

defineProps<{ darkMode?: boolean }>();
defineEmits<(e: "change-db-file") => void>();
</script>

<template>
  <div class="flex h-full overflow-hidden">
    <!-- Sidebar with slide transition -->
    <Transition name="sidebar">
      <Sidebar
        v-show="showSidebar"
        class="flex-shrink-0 border-e dark:border-gray-800 whitespace-nowrap w-sidebar"
        :dark-mode="darkMode"
        @change-db-file="$emit('change-db-file')"
      />
    </Transition>

    <div
      class="flex-grow overflow-y-hidden custom-scroll custom-scroll-thumb1 bg-white dark:bg-gray-875 relative"
    >
      <!-- Page Content -->
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

      <!-- Quick Edit Slider -->
      <router-view v-slot="{ Component, route }" name="edit">
        <Transition name="quickedit">
          <div v-if="route?.query?.edit">
            <component
              :is="Component"
              :key="(route.query.schemaName as string) + (route.query.name as string)"
              :dark-mode="darkMode"
            />
          </div>
        </Transition>
      </router-view>
    </div>
  </div>
</template>

<style scoped>
.sidebar-enter-from,
.sidebar-leave-to {
  opacity: 0;
  transform: translateX(calc(-1 * var(--w-sidebar)));
  width: 0px;
}

[dir='rtl'] .sidebar-enter-from,
[dir='rtl'] .sidebar-leave-to {
  transform: translateX(calc(1 * var(--w-sidebar)));
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
