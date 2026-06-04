<template>
  <div
    id="app"
    class="bg-canvas h-screen flex flex-col font-sans overflow-hidden antialiased"
    :dir="languageDirection"
    :language="language"
  >
    <WindowsTitleBar
      v-if="appStore.platform !== 'Mac'"
      :db-path="appStore.dbPath"
      :company-name="appStore.companyName"
    />
    <!-- Main Contents -->
    <Desk
      v-if="activeScreen === 'Desk'"
      class="flex-1"
      :theme="theme"
      @change-db-file="showDbSelector"
      @toggle-darkmode="toggleDarkMode"
    />
    <DatabaseSelector
      v-if="activeScreen === 'DatabaseSelector'"
      ref="databaseSelector"
      @new-database="newDatabase"
      @file-selected="fileSelected"
    />
    <SetupWizard
      v-if="activeScreen === 'SetupWizard'"
      @setup-complete="setupComplete"
      @setup-canceled="showDbSelector"
    />

    <!-- Render target for toasts -->
    <div
      id="toast-container"
      class="absolute bottom-0 flex flex-col items-end mb-3 pe-6"
      style="width: 100%; pointer-events: none"
    ></div>
  </div>
</template>
<script setup lang="ts">
import { ref, shallowRef, computed, provide, onMounted } from 'vue';
import { ModelNameEnum } from 'models/types';
import WindowsTitleBar from './components/WindowsTitleBar.vue';
import { handleErrorWithDialog } from './errorHandling';
import { fyo } from './initFyo';
import { t } from 'fyo';
import DatabaseSelector from './pages/DatabaseSelector.vue';
import Desk from './pages/Desk.vue';
import SetupWizard from './pages/SetupWizard/SetupWizard.vue';
import setupInstance from './setup/setupInstance';
import { SetupWizardOptions } from './setup/types';
import './styles/index.css';
import { connectToDatabase, dbErrorActionSymbols } from './utils/api/db.js';
import { initializeInstance } from './utils/api/initialization.js';
import * as injectionKeys from './utils/api/injectionKeys.js';
import { showDialog, showToast } from './utils/api/interactive.js';
import { setLanguageMap } from './utils/api/language.js';
import { updateConfigFiles } from './utils/api/misc.js';
import { updatePrintTemplates } from './utils/api/printTemplates.js';
import { Search } from './utils/api/search.js';
import { Shortcuts } from './utils/api/shortcuts.js';
import { routeTo, getSavePath } from './utils/api/ui.js';
import { useKeys } from './utils/api/vueUtils.js';
import { useAppStore } from './stores/app';
import { setTheme, setFont } from 'src/utils/api/theme.js';
import {
  registerInstanceToERPNext,
  updateERPNSyncSettings,
} from './utils/api/erpnextSync.js';
import { ERPNextSyncSettings } from 'models/baseModels/ERPNextSyncSettings/ERPNextSyncSettings';
import { ErrorLogEnum } from 'fyo/telemetry/types';

enum Screen {
  Desk = 'Desk',
  DatabaseSelector = 'DatabaseSelector',
  SetupWizard = 'SetupWizard',
}

const keys = useKeys();
const searcher = shallowRef<null | Search>(null);
const shortcuts = new Shortcuts(keys);
const appStore = useAppStore();

provide(injectionKeys.keysKey, keys);
provide(injectionKeys.searcherKey, searcher);
provide(injectionKeys.shortcutsKey, shortcuts);
provide(
  injectionKeys.languageDirectionKey,
  computed(() => appStore.languageDirection)
);

const databaseSelector = ref<InstanceType<typeof DatabaseSelector> | null>(
  null
);
const activeScreen = ref<Screen | null>(null);

const language = computed(() => appStore.language);
const theme = computed(() => appStore.theme);
const languageDirection = computed(() => appStore.languageDirection);

onMounted(async () => {
  try {
    document.documentElement.classList.add('theme-toggling');
  } catch (err) {
    console.error(err);
  }

  await setInitialScreen();
  const themeSetting = (fyo.singles.SystemSettings?.theme as any) || 'auto';
  const fontSetting = fyo.singles.SystemSettings?.font;
  setTheme(themeSetting);
  setFont(fontSetting as string);
  appStore.theme = themeSetting;

  setTimeout(() => {
    try {
      document.documentElement.classList.remove('theme-toggling');
    } catch (err) {
      console.error(err);
    }
  }, 100);
});

async function setInitialScreen(): Promise<void> {
  const lastSelectedFilePath = fyo.config.get('lastSelectedFilePath', null);

  if (
    typeof lastSelectedFilePath !== 'string' ||
    !lastSelectedFilePath.length
  ) {
    activeScreen.value = Screen.DatabaseSelector;
    return;
  }

  await fileSelected(lastSelectedFilePath);
}

async function setSearcher(): Promise<void> {
  searcher.value = new Search(fyo);
  await searcher.value.initializeKeywords();
}

async function setDesk(filePath: string): Promise<void> {
  await setLanguageMap();
  activeScreen.value = Screen.Desk;
  await setDeskRoute();
  await fyo.telemetry.start(true);
  await appIpc.checkForUpdates();
  appStore.dbPath = filePath;
  appStore.companyName = (await fyo.getValue(
    ModelNameEnum.AccountingSettings,
    'companyName'
  )) as string;
  await setSearcher();
  updateConfigFiles(fyo);
}

function newDatabase() {
  activeScreen.value = Screen.SetupWizard;
}

async function fileSelected(filePath: string): Promise<void> {
  fyo.config.set('lastSelectedFilePath', filePath);
  if (filePath !== ':memory:' && !(await appIpc.checkDbAccess(filePath))) {
    await showDialog({
      title: t`Cannot open file`,
      type: 'error',
      detail: t`Auditbooks does not have access to the selected file: ${filePath}`,
    });

    fyo.config.set('lastSelectedFilePath', null);
    return;
  }

  try {
    await showSetupWizardOrDesk(filePath);
  } catch (error) {
    await handleErrorWithDialog(error, undefined, true, true);
    await showDbSelector();
  }
}

async function setupComplete(
  setupWizardOptions: SetupWizardOptions
): Promise<void> {
  const companyName = setupWizardOptions.companyName;
  const { filePath, canceled } = await getSavePath(companyName, 'db');
  if (canceled || !filePath) {
    activeScreen.value = Screen.DatabaseSelector;
    return;
  }
  await setupInstance(filePath, setupWizardOptions, fyo);
  fyo.config.set('lastSelectedFilePath', filePath);
  await setDesk(filePath);
}

async function showSetupWizardOrDesk(filePath: string): Promise<void> {
  const { countryCode, error, actionSymbol } = await connectToDatabase(
    fyo,
    filePath
  );

  if (!countryCode && error && actionSymbol) {
    return await handleConnectionFailed(error, actionSymbol);
  }

  const setupCompleteVal = await fyo.getValue(
    ModelNameEnum.AccountingSettings,
    'setupComplete'
  );

  if (!setupCompleteVal) {
    activeScreen.value = Screen.SetupWizard;
    return;
  }

  await initializeInstance(filePath, false, countryCode, fyo);
  await updatePrintTemplates(fyo);

  const syncSettingsDoc = (await fyo.doc.getDoc(
    ModelNameEnum.ERPNextSyncSettings
  )) as ERPNextSyncSettings;

  const baseURL = syncSettingsDoc.baseURL;
  const token = syncSettingsDoc.authToken;
  const enableERPNextSync = fyo.singles.AccountingSettings?.enableERPNextSync;

  if (enableERPNextSync && baseURL && token) {
    try {
      await registerInstanceToERPNext(fyo);
      await updateERPNSyncSettings(fyo);
      await appIpc.initScheduler(
        `${fyo.singles.ERPNextSyncSettings?.dataSyncInterval as string}m`
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      try {
        const existing = await fyo.db.getAll(ErrorLogEnum.IntegrationErrorLog, {
          filters: {
            error: errorMessage,
          },
          limit: 1,
        });

        if (!existing.length) {
          await fyo.doc
            .getNewDoc(ErrorLogEnum.IntegrationErrorLog, {
              error: errorMessage,
              data: JSON.stringify({
                instance: fyo.singles.ERPNextSyncSettings?.deviceID,
                operation: 'register_instance',
                trigger: 'showSetupWizardOrDesk',
                baseURL: baseURL,
              }),
            })
            .sync();
        }
      } catch (logError) {
        throw logError;
      }
      showToast({ message: 'Connection Failed', type: 'error' });
    }
  }

  await setDesk(filePath);
}

async function handleConnectionFailed(error: Error, actionSymbol: symbol) {
  await showDbSelector();

  if (actionSymbol === dbErrorActionSymbols.CancelSelection) {
    return;
  }

  if (actionSymbol === dbErrorActionSymbols.SelectFile) {
    await databaseSelector.value?.existingDatabase();
    return;
  }

  throw error;
}

async function setDeskRoute(): Promise<void> {
  const { onboardingComplete } = await fyo.doc.getDoc('GetStarted');
  const { hideGetStarted } = await fyo.doc.getDoc('SystemSettings');

  let route = '/get-started';
  if (hideGetStarted || onboardingComplete) {
    route = localStorage.getItem('lastRoute') || '/';
  }

  await routeTo(route);
}

async function showDbSelector(): Promise<void> {
  localStorage.clear();
  fyo.config.set('lastSelectedFilePath', null);
  fyo.telemetry.stop();
  await fyo.purgeCache();
  activeScreen.value = Screen.DatabaseSelector;
  appStore.dbPath = '';
  searcher.value = null;
  appStore.companyName = '';
}

async function toggleDarkMode() {
  try {
    document.documentElement.classList.add('theme-toggling');
  } catch (err) {
    console.error(err);
  }

  const isCurrentlyDark = appStore.isDark;

  appStore.theme = isCurrentlyDark ? 'light' : 'dark';

  setTheme(appStore.theme);

  const doc = await fyo.doc.getDoc('SystemSettings');
  await doc.set('theme', appStore.theme);
  await doc.sync();

  setTimeout(() => {
    try {
      document.documentElement.classList.remove('theme-toggling');
    } catch (err) {
      console.error(err);
    }
  }, 50);
}
</script>
