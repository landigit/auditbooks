import { defineStore } from 'pinia';
import { RTL_LANGUAGES } from 'fyo/utils/consts';
import { Theme } from 'src/utils/theme';
import { ref, computed, reactive } from 'vue';
import type { HistoryState } from 'vue-router';
import type { reports as reportsMap } from 'reports/index';
import type { Report } from 'reports/Report';

const isSystemDark = ref(
  typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
    : false
);
if (typeof window !== 'undefined' && window.matchMedia) {
  window
    .matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', (e) => {
      isSystemDark.value = e.matches;
    });
}

export const useAppStore = defineStore('app', () => {
  const _platform = ref('');
  const platform = computed(() => {
    return _platform.value === 'win32'
      ? 'Windows'
      : _platform.value === 'darwin'
        ? 'Mac'
        : 'Linux';
  });

  const showSidebar = ref(true);
  const theme = ref<Theme>('auto');

  const isDark = computed(() => {
    if (theme.value === 'auto') {
      return isSystemDark.value;
    }
    return theme.value === 'dark';
  });

  const language = ref('English');
  const languageDirection = computed(() => {
    return RTL_LANGUAGES.includes(language.value) ? 'rtl' : 'ltr';
  });

  const isDevelopment = ref(false);
  const appVersion = ref('');
  const instanceId = ref('');
  const deviceId = ref('');
  const openCount = ref(0);
  const skipTelemetryLogging = ref(false);
  const dbPath = ref('');
  const companyName = ref('');
  const docsPath = ref('');
  const reports = ref(
    {} as Record<keyof typeof reportsMap, Report | undefined>
  );
  const appFlags = ref({} as Record<string, boolean>);
  const historyState = reactive({
    forward:
      typeof history !== 'undefined'
        ? !!(history.state as HistoryState)?.forward
        : false,
    back:
      typeof history !== 'undefined'
        ? !!(history.state as HistoryState)?.back
        : false,
  });

  function toggleSidebar(value?: boolean) {
    if (typeof value === 'boolean') {
      showSidebar.value = value;
    } else {
      showSidebar.value = !showSidebar.value;
    }
  }

  function setPlatform(p: string) {
    _platform.value = p;
  }

  return {
    platform,
    showSidebar,
    theme,
    isDark,
    language,
    languageDirection,
    isDevelopment,
    appVersion,
    instanceId,
    deviceId,
    openCount,
    skipTelemetryLogging,
    dbPath,
    companyName,
    docsPath,
    reports,
    appFlags,
    historyState,
    toggleSidebar,
    setPlatform,
  };
});
