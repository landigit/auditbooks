<template>
  <div
    class="flex flex-col h-full bg-sidebar border-r border-border w-64 flex-shrink-0 select-none"
  >
    <!-- Search -->
    <div class="p-4 border-b border-border">
      <div class="relative">
        <lucide-icon
          name="search"
          class="absolute left-3 top-2.5 h-4 w-4 text-muted"
        />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search docs..."
          class="w-full bg-canvas border border-border rounded-md py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
    </div>

    <!-- Navigation Tree -->
    <div class="flex-1 overflow-y-auto custom-scroll p-2">
      <div v-for="group in filteredNav" :key="group.id" class="mb-4">
        <div
          class="flex items-center px-2 py-1.5 text-xs font-semibold text-muted uppercase tracking-wider cursor-pointer hover:text-main"
          @click="toggleGroup(group)"
        >
          <lucide-icon
            name="chevron-right"
            class="h-3 w-3 mr-1 transition-transform"
            :class="{ 'rotate-90': group.isExpanded !== false }"
          />
          {{ group.title }}
        </div>

        <div v-if="group.isExpanded !== false" class="mt-1 space-y-0.5">
          <div
            v-for="item in group.children"
            :key="item.id"
            @click="navigateTo(item)"
            class="group flex items-center px-6 py-1.5 rounded-md text-sm cursor-pointer transition-colors"
            :class="[
              isActive(item)
                ? 'bg-blue-50 text-blue-700 font-medium dark:bg-blue-900/20 dark:text-blue-400'
                : 'text-muted hover:bg-surface-hover hover:text-main',
            ]"
          >
            {{ item.title }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { docsNavigation, DocNode } from 'src/utils/docsNavigation';

const router = useRouter();
const route = useRoute();
const searchQuery = ref('');
const nav = ref(docsNavigation.map((g) => ({ ...g, isExpanded: true })));

const filteredNav = computed(() => {
  if (!searchQuery.value) return nav.value;

  const query = searchQuery.value.toLowerCase();
  return nav.value
    .map((group) => {
      const filteredChildren = group.children?.filter((child) =>
        child.title.toLowerCase().includes(query)
      );
      return {
        ...group,
        children: filteredChildren,
        isExpanded: true,
      };
    })
    .filter((group) => (group.children?.length ?? 0) > 0);
});

const toggleGroup = (group: any) => {
  group.isExpanded = !group.isExpanded;
};

const navigateTo = (item: DocNode) => {
  if (item.path) {
    router.push({ name: 'Help', params: { path: item.path } });
  }
};

const isActive = (item: DocNode) => {
  const currentPath = route.params.path;
  const normalizedCurrent = Array.isArray(currentPath)
    ? currentPath.join('/')
    : currentPath;
  return normalizedCurrent === item.path;
};
</script>

<style scoped>
@reference "../styles/index.css";
</style>
