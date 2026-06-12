<template>
  <div
    class="flex flex-col h-screen select-none overflow-hidden"
    :dir="languageDirection"
  >
    <Desk
      v-if="activeScreen === 'Desk'"
      class="flex-1"
      :dark-mode="darkMode"
      @change-db-file="showDbSelector"
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
import { ref, computed, watch, provide, onMounted } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { exists as tauriExists } from '@tauri-apps/plugin-fs';
import { RTL_LANGUAGES } from 'fyo/utils/consts';
import { ModelNameEnum } from 'models/types';
import { systemLanguageRef } from 'src/utils/refs';

import { handleErrorWithDialog } from './errorHandling';
import { fyo } from './initFyo';
import DatabaseSelector from './pages/DatabaseSelector.vue';
import Desk from './pages/Desk.vue';
import SetupWizard from './pages/SetupWizard/SetupWizard.vue';
import setupInstance from './setup/setupInstance';
import { SetupWizardOptions } from './setup/types';
import './styles/index.css';
import { connectToDatabase, dbErrorActionSymbols } from './utils/db';
import { initializeInstance } from './utils/initialization';
import * as injectionKeys from './utils/injectionKeys';
import { showToast } from './utils/interactive';
import { setLanguageMap } from './utils/language';
import { updateConfigFiles } from './utils/misc';
import { updatePrintTemplates } from './utils/printTemplates';
import { Search } from './utils/search';
import { Shortcuts } from './utils/shortcuts';
import { routeTo } from './utils/ui';
import { useKeys } from './utils/vueUtils';
import { setDarkMode } from 'src/utils/theme';
import {
  registerInstanceToERPNext,
  updateERPNSyncSettings,
} from './utils/erpnextSync';
import { ERPNextSyncSettings } from 'models/baseModels/ERPNextSyncSettings/ERPNextSyncSettings';
import { ErrorLogEnum } from 'fyo/telemetry/types';

enum Screen {
  Desk = 'Desk',
  DatabaseSelector = 'DatabaseSelector',
  SetupWizard = 'SetupWizard',
}

const keys = useKeys();
const searcher = ref<null | Search>(null);
const shortcuts = new Shortcuts(keys);
const languageDirection = ref(getLanguageDirection(systemLanguageRef.value));

provide(injectionKeys.keysKey, keys);
provide(injectionKeys.searcherKey, searcher);
provide(injectionKeys.shortcutsKey, shortcuts);
provide(injectionKeys.languageDirectionKey, languageDirection);

const databaseSelector = ref<InstanceType<typeof DatabaseSelector> | null>(null);

const activeScreen = ref<null | Screen>(null);
const dbPath = ref('');
const companyName = ref('');
const darkMode = ref<boolean | undefined>(false);

const language = computed(() => systemLanguageRef.value);

watch(language, (value) => {
  languageDirection.value = getLanguageDirection(value);
});

onMounted(async () => {
  await setInitialScreen();
  const isDark = !!fyo.singles.SystemSettings?.darkMode;
  setDarkMode(isDark);
  darkMode.value = isDark;
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
  dbPath.value = filePath;
  companyName.value = (await fyo.getValue(
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
  if (filePath !== ':memory:') {
    const fileExists = await tauriExists(filePath).catch(() => false);
    if (!fileExists) {
      // File doesn't exist yet (new db), that's OK
    }
  }

  try {
    await showSetupWizardOrDesk(filePath);
  } catch (error) {
    await handleErrorWithDialog(error, undefined, true, true);
    await showDbSelector();
  }
}

async function setupComplete(setupWizardOptions: SetupWizardOptions): Promise<void> {
  const company = setupWizardOptions.companyName;

  // Ask the user where to save the new database file
  const { getSavePath } = await import('./utils/ui');
  const { filePath: chosenPath, canceled } = await getSavePath(company, 'db');

  let filePath: string;
  if (canceled || !chosenPath) {
    // Fall back to the auto-generated default path in app data dir
    filePath = await invoke<string>('get_db_default_path', { companyName: company });
  } else {
    filePath = chosenPath;
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
  const enableERPNextSync =
    fyo.singles.AccountingSettings?.enableERPNextSync;

  if (enableERPNextSync && baseURL && token) {
    try {
      await registerInstanceToERPNext(fyo);
      await updateERPNSyncSettings(fyo);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : String(err);

      try {
        const existing = await fyo.db.getAll(
          ErrorLogEnum.IntegrationErrorLog,
          {
            filters: {
              error: errorMessage,
            },
            limit: 1,
          }
        );

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

  let routePath = '/get-started';
  if (hideGetStarted || onboardingComplete) {
    routePath = localStorage.getItem('lastRoute') || '/';
  }

  await routeTo(routePath);
}

async function showDbSelector(): Promise<void> {
  localStorage.clear();
  fyo.config.set('lastSelectedFilePath', null);
  fyo.telemetry.stop();
  await fyo.purgeCache();
  activeScreen.value = Screen.DatabaseSelector;
  dbPath.value = '';
  searcher.value = null;
  companyName.value = '';
}

function getLanguageDirection(languageCode: string): 'rtl' | 'ltr' {
  return RTL_LANGUAGES.includes(languageCode) ? 'rtl' : 'ltr';
}
</script>
