<template>
  <view class="pb-2 h-full flex justify-between flex-col bg-sidebar">
    <view class="window-no-drag">
      <!-- Company name -->
      <view
        class="px-4 flex flex-row items-center justify-between h-row-largest border-b border-border"
        :class="[
          store.platform !== 'Windows' ? 'window-drag' : '',
          store.platform === 'Mac'
            ? languageDirection === 'rtl'
              ? 'pe-20'
              : 'ps-20'
            : '',
        ]"
      >
        <text
          data-testid="company-name"
          class="window-no-drag text-xl font-semibold text-main whitespace-nowrap overflow-auto no-scrollbar select-none"
        >
          {{ companyName }}
        </text>
      </view>

      <!-- Sidebar Items -->
      <view v-for="group in groups" :key="group.label" class="window-no-drag">
        <view
          class="px-4 flex items-center cursor-pointer hover:bg-surface-hover h-10"
          :class="
            isGroupActive(group) && !group.items
              ? 'bg-sidebar-active-bg text-sidebar-active-text border-s-2 border-sidebar-active-border'
              : 'text-muted'
          "
          @tap="routeToSidebarItem(group)"
        >
          <component
            :is="group.icon === 'calendar-range' ? 'LucideIcon' : Icon"
            class="flex-shrink-0"
            :name="group.icon"
            :size="group.iconSize || '18'"
            :height="group.iconHeight ?? 0"
            :active="!!isGroupActive(group)"
            :class="isGroupActive(group) && !group.items ? '-ms-1' : ''"
            :style="getIconStyle(group.icon, !!isGroupActive(group))"
          />
          <view
            class="ms-2 text-lg"
            :class="
              isGroupActive(group) && !group.items ? 'text-main' : 'text-muted'
            "
          >
            {{ group.label }}
          </view>
        </view>

        <!-- Expanded Group -->
        <view v-if="group.items && isGroupActive(group)">
          <view
            v-for="item in group.items"
            :key="item.label"
            class="text-base h-10 ps-10 cursor-pointer flex items-center hover:bg-surface-hover"
            :class="
              isItemActive(item)
                ? 'bg-sidebar-active-bg text-sidebar-active-text border-s-2 border-sidebar-active-border'
                : 'text-muted'
            "
            @tap="routeToSidebarItem(item)"
          >
            <text :style="isItemActive(item) ? 'margin-left: -4px' : ''">
              {{ item.label }}
            </text>
          </view>
        </view>
      </view>
    </view>

    <!-- Report Issue and DB Switcher -->
    <view class="window-no-drag flex flex-col gap-2 py-2 px-4">
      <view
        class="flex text-sm text-description hover:text-main gap-1 items-center"
        @tap="openDocumentation"
      >
        <LucideIcon name="help-circle" class="h-4 w-4 flex-shrink-0" />
        <text>
          {{ t`Help` }}
        </text>
      </view>

      <view
        class="flex text-sm text-description hover:text-main gap-1 items-center"
        @tap="viewShortcuts = true"
      >
        <LucideIcon name="command" class="h-4 w-4 flex-shrink-0" />
        <text>{{ t`Shortcuts` }}</text>
      </view>

      <view
        data-testid="change-db"
        class="flex text-sm text-description hover:text-main gap-1 items-center"
        @tap="$emit('change-db-file')"
      >
        <LucideIcon name="database" class="h-4 w-4 flex-shrink-0" />
        <text>{{ t`Change DB` }}</text>
      </view>

      <view
        class="flex text-sm text-description hover:text-main gap-1 items-center"
        @tap="$emit('toggle-darkmode')"
      >
        <template v-if="resolvedIsDark">
          <LucideIcon name="sun" class="h-4 w-4 flex-shrink-0" />
          <text>{{ t`Light Mode` }}</text>
        </template>
        <template v-else>
          <LucideIcon name="moon" class="h-4 w-4 flex-shrink-0" />
          <text>{{ t`Dark Mode` }}</text>
        </template>
      </view>
      <view
        v-if="false"
        class="flex text-sm text-description hover:text-main gap-1 items-center"
        @tap="() => reportIssue()"
      >
        <LucideIcon name="flag" class="h-4 w-4 flex-shrink-0" />
        <text>
          {{ t`Send Feedback` }}
        </text>
      </view>

      <text
        v-if="showDevMode"
        class="text-xs text-description select-none cursor-pointer"
        @tap="showDevMode = false"
        title="Open dev tools with Ctrl+Shift+I"
      >
        dev mode
      </text>
    </view>

    <!-- Hide Sidebar Button -->
    <view
      class="absolute bottom-0 end-0 text-description hover:bg-surface-hover rounded p-1 m-4 rtl-rotate-180"
      @tap="() => toggleSidebar()"
    >
      <LucideIcon name="chevrons-left" class="w-4 h-4" />
    </view>

    <Modal :open-modal="viewShortcuts" @closemodal="viewShortcuts = false">
      <ShortcutsHelper class="w-form" />
    </Modal>
  </view>
</template>

<script setup lang="ts">
// --- Imports ---
import { ref, computed, onMounted, onUnmounted, inject } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { reportIssue } from 'src/errorHandling';
import { fyo } from 'src/initFyo';
import { languageDirectionKey, shortcutsKey } from 'src/utils/injectionKeys';
import { getSidebarConfig } from 'src/utils/sidebarConfig';
import { SidebarConfig, SidebarItem, SidebarRoot } from 'src/utils/types';
import { routeTo, toggleSidebar } from 'src/utils/ui';
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
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      store.toggleSidebar(false);
    }
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
function getIconStyle(iconName: string, active: boolean) {
  const isDark = resolvedIsDark.value;

  const colorMap: Record<
    string,
    { light: string; dark: string; lightPassive: string; darkPassive: string }
  > = isDark
    ? {
        dashboard: {
          light: 'var(--color-blue-300)',
          dark: 'var(--color-blue-400)',
          lightPassive: 'var(--color-blue-400)',
          darkPassive: 'var(--color-blue-500)',
        },
        'common-entries': {
          light: 'var(--color-teal-300)',
          dark: 'var(--color-teal-400)',
          lightPassive: 'var(--color-teal-400)',
          darkPassive: 'var(--color-teal-500)',
        },
        sales: {
          light: 'var(--color-green-300)',
          dark: 'var(--color-green-400)',
          lightPassive: 'var(--color-green-400)',
          darkPassive: 'var(--color-green-500)',
        },
        purchase: {
          light: 'var(--color-red-300)',
          dark: 'var(--color-red-400)',
          lightPassive: 'var(--color-red-400)',
          darkPassive: 'var(--color-red-500)',
        },
        inventory: {
          light: 'var(--color-amber-300)',
          dark: 'var(--color-amber-400)',
          lightPassive: 'var(--color-amber-400)',
          darkPassive: 'var(--color-amber-500)',
        },
        gst: {
          light: 'var(--color-violet-300)',
          dark: 'var(--color-violet-400)',
          lightPassive: 'var(--color-violet-400)',
          darkPassive: 'var(--color-violet-500)',
        },
        pos: {
          light: 'var(--color-indigo-300)',
          dark: 'var(--color-indigo-400)',
          lightPassive: 'var(--color-indigo-400)',
          darkPassive: 'var(--color-indigo-500)',
        },
        reports: {
          light: 'var(--color-orange-300)',
          dark: 'var(--color-orange-400)',
          lightPassive: 'var(--color-orange-400)',
          darkPassive: 'var(--color-orange-500)',
        },
        settings: {
          light: 'var(--color-purple-300)',
          dark: 'var(--color-purple-400)',
          lightPassive: 'var(--color-purple-400)',
          darkPassive: 'var(--color-purple-500)',
        },
      }
    : {
        dashboard: {
          light: 'var(--color-blue-400)',
          dark: 'var(--color-blue-600)',
          lightPassive: 'var(--color-blue-600)',
          darkPassive: 'var(--color-blue-800)',
        },
        'common-entries': {
          light: 'var(--color-teal-400)',
          dark: 'var(--color-teal-600)',
          lightPassive: 'var(--color-teal-600)',
          darkPassive: 'var(--color-teal-800)',
        },
        sales: {
          light: 'var(--color-green-400)',
          dark: 'var(--color-green-600)',
          lightPassive: 'var(--color-green-600)',
          darkPassive: 'var(--color-green-800)',
        },
        purchase: {
          light: 'var(--color-red-400)',
          dark: 'var(--color-red-600)',
          lightPassive: 'var(--color-red-600)',
          darkPassive: 'var(--color-red-800)',
        },
        inventory: {
          light: 'var(--color-amber-400)',
          dark: 'var(--color-amber-600)',
          lightPassive: 'var(--color-amber-600)',
          darkPassive: 'var(--color-amber-800)',
        },
        gst: {
          light: 'var(--color-violet-400)',
          dark: 'var(--color-violet-600)',
          lightPassive: 'var(--color-violet-600)',
          darkPassive: 'var(--color-violet-800)',
        },
        pos: {
          light: 'var(--color-indigo-400)',
          dark: 'var(--color-indigo-600)',
          lightPassive: 'var(--color-indigo-600)',
          darkPassive: 'var(--color-indigo-800)',
        },
        reports: {
          light: 'var(--color-orange-400)',
          dark: 'var(--color-orange-600)',
          lightPassive: 'var(--color-orange-600)',
          darkPassive: 'var(--color-orange-800)',
        },
        settings: {
          light: 'var(--color-purple-400)',
          dark: 'var(--color-purple-600)',
          lightPassive: 'var(--color-purple-600)',
          darkPassive: 'var(--color-purple-800)',
        },
      };

  const colors = colorMap[iconName];
  if (!colors) {
    return {};
  }

  if (active) {
    return {
      '--icon-light-active': colors.light,
      '--icon-dark-active': colors.dark,
    };
  } else {
    return {
      '--icon-light-passive': colors.lightPassive,
      '--icon-dark-passive': colors.darkPassive,
    };
  }
}
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
