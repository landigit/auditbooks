<template>
  <div
    class="pb-2 h-full flex justify-between flex-col bg-gray-25 dark:bg-gray-900 relative"
    :class="{
      'window-drag': platform !== 'Windows',
    }"
  >
    <div>
      <!-- Company name -->
      <div
        class="px-4 flex flex-row items-center justify-between border-b dark:border-gray-800 h-row-largest flex-shrink-0"
        :class="
          platform === 'Mac' && languageDirection === 'ltr' ? 'pt-8' : ''
        "
      >
        <h6
          data-testid="company-name"
          class="font-semibold dark:text-gray-25 whitespace-nowrap overflow-auto no-scrollbar select-none"
        >
          {{ companyName }}
        </h6>
      </div>

      <!-- Sidebar Items -->
      <div v-for="group in groups" :key="group.label">
        <div
          class="px-4 flex items-center cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-875 h-10"
          :class="
            isGroupActive(group) && !group.items
              ? 'bg-gray-100 dark:bg-gray-875 border-s-4 border-gray-800 dark:border-gray-100'
              : ''
          "
          @click="routeToSidebarItem(group)"
        >
          <Icon
            class="flex-shrink-0"
            :name="group.icon"
            :size="group.iconSize || '18'"
            :height="group.iconHeight ?? 0"
            :active="!!isGroupActive(group)"
            :darkMode="darkMode"
            :class="isGroupActive(group) && !group.items ? '-ms-1' : ''"
          />
          <div
            class="ms-2 text-lg text-gray-700"
            :class="
              isGroupActive(group) && !group.items
                ? 'text-gray-900 dark:text-gray-25'
                : 'dark:text-gray-300'
            "
          >
            {{ group.label }}
          </div>
        </div>

        <!-- Expanded Group -->
        <div v-if="group.items && isGroupActive(group)">
          <div
            v-for="item in group.items"
            :key="item.label"
            class="text-base h-10 ps-10 cursor-pointer flex items-center hover:bg-gray-100 dark:hover:bg-gray-875"
            :class="
              isItemActive(item)
                ? 'bg-gray-100 dark:bg-gray-875 text-gray-900 dark:text-gray-100 border-s-4 border-gray-800 dark:border-gray-100'
                : 'text-gray-700 dark:text-gray-400'
            "
            @click="routeToSidebarItem(item)"
          >
            <p :style="isItemActive(item) ? 'margin-left: -4px' : ''">
              {{ item.label }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Report Issue and DB Switcher -->
    <div class="window-no-drag flex flex-col gap-2 py-2 px-4">
      <button
        class="flex text-sm text-gray-600 dark:text-gray-500 hover:text-gray-800 dark:hover:text-gray-400 gap-1 items-center"
        @click="openDocumentation"
      >
        <feather-icon name="help-circle" class="h-4 w-4 flex-shrink-0" />
        <p>
          {{ t`Help` }}
        </p>
      </button>

      <button
        class="flex text-sm text-gray-600 dark:text-gray-500 hover:text-gray-800 dark:hover:text-gray-400 gap-1 items-center"
        @click="viewShortcuts = true"
      >
        <feather-icon name="command" class="h-4 w-4 flex-shrink-0" />
        <p>{{ t`Shortcuts` }}</p>
      </button>

      <button
        data-testid="change-db"
        class="flex text-sm text-gray-600 dark:text-gray-500 hover:text-gray-800 dark:hover:text-gray-400 gap-1 items-center"
        @click="$emit('change-db-file')"
      >
        <feather-icon name="database" class="h-4 w-4 flex-shrink-0" />
        <p>{{ t`Change DB` }}</p>
      </button>

      <button
        class="flex text-sm text-gray-600 dark:text-gray-500 hover:text-gray-800 dark:hover:text-gray-400 gap-1 items-center"
        @click="() => reportIssue()"
      >
        <feather-icon name="flag" class="h-4 w-4 flex-shrink-0" />
        <p>
          {{ t`Report Issue` }}
        </p>
      </button>

      <p
        v-if="showDevMode"
        class="text-xs text-gray-500 select-none cursor-pointer"
        @click="showDevMode = false"
        title="Open dev tools with Ctrl+Shift+I"
      >
        dev mode
      </p>
    </div>

    <!-- Hide Sidebar Button -->
    <button
      class="absolute bottom-0 end-0 text-gray-600 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-875 rounded p-1 m-4 rtl-rotate-180"
      @click="() => toggleSidebar()"
    >
      <feather-icon name="chevrons-left" class="w-4 h-4" />
    </button>

    <Modal :open-modal="viewShortcuts" @closemodal="viewShortcuts = false">
      <ShortcutsHelper class="w-form" />
    </Modal>
  </div>
</template>
<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { reportIssue } from 'src/errorHandling';
import { docsPathRef } from 'src/utils/refs';
import { getSidebarConfig } from 'src/utils/sidebarConfig';
import type { SidebarConfig, SidebarItem, SidebarRoot } from 'src/utils/types';
import { routeTo, toggleSidebar } from 'src/utils/ui';
import Icon from './Icon.vue';
import Modal from './Modal.vue';
import ShortcutsHelper from './ShortcutsHelper.vue';
import { useApp } from 'src/composables/useApp.js';
import { usePlatform } from 'src/composables/usePlatform.js';
import { useLanguage } from 'src/composables/useLanguage.js';
import { useShortcuts } from 'src/composables/useShortcuts.js';

const COMPONENT_NAME = 'Sidebar';

const props = withDefaults(
  defineProps<{
    darkMode?: boolean;
  }>(),
  {
    darkMode: false,
  }
);

const emit = defineEmits<{
  (e: 'change-db-file'): void;
  (e: 'toggle-darkmode'): void;
}>();

const router = useRouter();
const route = useRoute();

const { fyo, t } = useApp();
const { platformName: platform } = usePlatform();
const { languageDirection } = useLanguage();
const shortcuts = useShortcuts();

const companyName = ref('');
const groups = ref<SidebarConfig>([]);
const viewShortcuts = ref(false);
const activeGroup = ref<null | SidebarRoot>(null);
const showDevMode = ref(false);

const appVersion = computed(() => fyo.store.appVersion);

async function openDocumentation() {
  const { open } = await import('@tauri-apps/plugin-opener');
  await open('https://docs.frappe.io/' + docsPathRef.value).catch(console.error);
}

function setActiveGroup() {
  const { fullPath } = router.currentRoute.value;
  const fallBackGroup = activeGroup.value;
  activeGroup.value =
    groups.value.find((g) => {
      if (fullPath.startsWith(g.route) && g.route !== '/') {
        return true;
      }

      if (g.route === fullPath) {
        return true;
      }

      if (g.items) {
        let activeItem = g.items.filter(
          ({ route }) => route === fullPath || fullPath.startsWith(route)
        );

        if (activeItem.length) {
          return true;
        }
      }
    }) ??
    fallBackGroup ??
    groups.value[0];
}

function isItemActive(item: SidebarItem) {
  const currentRoute = route.path;
  const params = route.params;
  const routeMatch = currentRoute === item.route;

  const schemaNameMatch =
    item.schemaName && params.schemaName === item.schemaName;

  const isMatch = routeMatch || schemaNameMatch;
  if (params.name && item.schemaName && !isMatch) {
    return currentRoute.includes(`${item.schemaName}/${params.name}`);
  }

  return isMatch;
}

function isGroupActive(group: SidebarRoot) {
  return activeGroup.value && group.label === activeGroup.value.label;
}

function routeToSidebarItem(item: SidebarItem | SidebarRoot) {
  routeTo(getPath(item));
}

function getPath(item: SidebarItem | SidebarRoot) {
  const { route: path, filters } = item;
  if (!filters) {
    return path;
  }

  return { path, query: { filters: JSON.stringify(filters) } };
}

onMounted(async () => {
  const { companyName: name } = await fyo.doc.getDoc('AccountingSettings');
  companyName.value = name as string;
  groups.value = await getSidebarConfig();

  setActiveGroup();
  router.afterEach(() => {
    setActiveGroup();
  });

  shortcuts?.shift.set(COMPONENT_NAME, ['KeyH'], () => {
    if (document.body === document.activeElement) {
      toggleSidebar();
    }
  });
  shortcuts?.set(COMPONENT_NAME, ['F1'], () => openDocumentation());

  showDevMode.value = fyo.store.isDevelopment;
});

onUnmounted(() => {
  shortcuts?.delete(COMPONENT_NAME);
});
</script>

