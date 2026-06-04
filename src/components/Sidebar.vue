<template>
  <div class="h-full flex justify-between flex-col bg-sidebar relative">
    <div class="window-no-drag">
      <!-- Company name -->
      <div
        class="px-4 flex flex-row justify-between h-row-largest border-b border-border"
        :class="[
          store.platform !== 'Windows' ? 'window-drag' : '',
          store.platform === 'Mac' && languageDirection === 'ltr'
            ? 'pt-6 items-end pb-3'
            : 'items-center',
        ]"
      >
        <h6
          data-testid="company-name"
          class="window-no-drag font-semibold text-main whitespace-nowrap overflow-auto no-scrollbar select-none"
        >
          {{ companyName }}
        </h6>
      </div>

      <!-- Sidebar Items -->
      <div class="window-no-drag pt-2">
        <div v-for="group in groups" :key="group.label" class="window-no-drag">
          <div
            class="px-4 flex items-center cursor-pointer hover:bg-surface-hover h-10"
            :class="
              isGroupActive(group) && !group.items
                ? 'bg-sidebar-active-bg text-sidebar-active-text border-s-2 border-sidebar-active-border'
                : 'text-muted'
            "
            @click="routeToSidebarItem(group)"
          >
            <component
              :is="group.icon === 'calendar-range' ? 'LucideIcon' : Icon"
              class="flex-shrink-0"
              :name="group.icon"
              :size="group.iconSize || '18'"
              :height="group.iconHeight ?? 0"
              :active="!!isGroupActive(group)"
              :class="isGroupActive(group) && !group.items ? '-ms-1' : ''"
            />
            <div
              class="ms-2 text-lg"
              :class="isGroupActive(group) ? 'text-main' : 'text-muted'"
            >
              {{ group.label }}
            </div>
          </div>

          <!-- Expanded Group -->
          <div v-if="group.items && isGroupActive(group)">
            <div
              v-for="item in group.items"
              :key="item.label"
              class="text-base h-10 ps-10 cursor-pointer flex items-center hover:bg-surface-hover"
              :class="
                isItemActive(item)
                  ? 'bg-sidebar-active-bg text-sidebar-active-text border-s-2 border-sidebar-active-border'
                  : 'text-muted'
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
    </div>

    <!-- Report Issue and DB Switcher -->
    <div class="window-no-drag flex flex-col gap-2 pt-2 pb-4 px-4">
      <button
        class="flex text-sm text-description hover:text-main gap-1 items-center"
        @click="openDocumentation"
      >
        <LucideIcon name="help-circle" class="h-4 w-4 flex-shrink-0" />
        <p>
          {{ t`Help` }}
        </p>
      </button>

      <button
        class="flex text-sm text-description hover:text-main gap-1 items-center"
        @click="viewShortcuts = true"
      >
        <LucideIcon name="command" class="h-4 w-4 flex-shrink-0" />
        <p>{{ t`Shortcuts` }}</p>
      </button>

      <button
        data-testid="change-db"
        class="flex text-sm text-description hover:text-main gap-1 items-center"
        @click="$emit('change-db-file')"
      >
        <LucideIcon name="database" class="h-4 w-4 flex-shrink-0" />
        <p>{{ t`Change DB` }}</p>
      </button>

      <button
        class="flex text-sm text-description hover:text-main gap-1 items-center"
        @click="$emit('toggle-darkmode')"
      >
        <template v-if="resolvedIsDark">
          <LucideIcon name="sun" class="h-4 w-4 flex-shrink-0" />
          <p>{{ t`Light Mode` }}</p>
        </template>
        <template v-else>
          <LucideIcon name="moon" class="h-4 w-4 flex-shrink-0" />
          <p>{{ t`Dark Mode` }}</p>
        </template>
      </button>
      <button
        v-if="false"
        class="flex text-sm text-description hover:text-main gap-1 items-center"
        @click="() => reportIssue()"
      >
        <LucideIcon name="flag" class="h-4 w-4 flex-shrink-0" />
        <p>
          {{ t`Send Feedback` }}
        </p>
      </button>

      <button
        v-if="showDevMode"
        class="flex text-xs text-description hover:text-main gap-1 items-center mt-1"
        @click="showDevMode = false"
        title="Open dev tools with Ctrl+Shift+I"
      >
        <LucideIcon name="terminal" class="h-3.5 w-3.5 flex-shrink-0" />
        <p>dev mode</p>
      </button>
    </div>

    <!-- Hide Sidebar Button -->
    <button
      class="absolute bottom-0 end-0 text-description hover:bg-surface-hover rounded p-1 m-4 rtl-rotate-180"
      @click="() => toggleSidebar()"
    >
      <LucideIcon name="chevrons-left" class="w-4 h-4" />
    </button>

    <Modal :open-modal="viewShortcuts" @closemodal="viewShortcuts = false">
      <ShortcutsHelper class="w-form" />
    </Modal>
  </div>
</template>

<script setup lang="ts">
// --- Imports ---
import { ref, computed, onMounted, onUnmounted, inject } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { reportIssue } from 'src/errorHandling';
import { fyo } from 'src/initFyo';
import {
  languageDirectionKey,
  shortcutsKey,
} from 'src/utils/api/injectionKeys.js';
import { getSidebarConfig } from 'src/utils/api/sidebarConfig.js';
import {
  SidebarConfig,
  SidebarItem,
  SidebarRoot,
} from 'src/utils/api/types.js';
import { routeTo, toggleSidebar } from 'src/utils/api/ui.js';
import { useAppStore } from 'src/stores/app';
import Icon from './Icon.vue';
import Modal from './Modal.vue';
import ShortcutsHelper from './ShortcutsHelper.vue';
import { t } from 'fyo';

// --- Types ---
const COMPONENT_NAME = 'Sidebar';

// --- Props & Emits ---
const props = withDefaults(
  defineProps<{
    theme?: string;
  }>(),
  {
    theme: 'auto',
  }
);

const emit = defineEmits<{
  (e: 'change-db-file'): void;
  (e: 'toggle-darkmode'): void;
}>();

// --- State ---
const router = useRouter();
const route = useRoute();
const store = useAppStore();
const languageDirection = inject(languageDirectionKey);
const shortcuts = inject(shortcutsKey);

const companyName = ref('');
const groups = ref<SidebarConfig>([]);
const viewShortcuts = ref(false);
const activeGroup = ref<SidebarRoot | null>(null);
const showDevMode = ref(false);

// --- Computed ---
const resolvedIsDark = computed(() => {
  return props.theme === 'dark' || (props.theme === 'auto' && store.isDark);
});

// --- Lifecycle ---
onMounted(async () => {
  const { companyName: cName } = await fyo.doc.getDoc('AccountingSettings');
  companyName.value = cName as string;
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
  shortcuts?.pmodShift.set(COMPONENT_NAME, ['KeyD'], () =>
    emit('toggle-darkmode')
  );

  showDevMode.value = store.isDevelopment;
});

onUnmounted(() => {
  shortcuts?.delete(COMPONENT_NAME);
});

// --- Methods ---
function openDocumentation() {
  router.push({
    name: 'Help',
    params: { path: store.docsPath },
  });
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
    return currentRoute.includes(`${item.schemaName}/${params.name as string}`);
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
    return path as any;
  }

  return { path, query: { filters: JSON.stringify(filters) } } as any;
}
</script>
