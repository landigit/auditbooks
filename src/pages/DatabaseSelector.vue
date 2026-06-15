<template>
  <div
    class="flex-1 flex justify-center items-center bg-gray-25 dark:bg-gray-900"
    :class="{
      'pointer-events-none': loadingDatabase,
      'window-drag': platform !== 'Windows',
    }"
  >
    <div
      class="w-full bg-white dark:bg-gray-875 relative flex flex-col"
      :class="
        isMobile
          ? 'h-screen w-screen'
          : 'w-form shadow-lg rounded-lg border dark:border-gray-800 h-[700px]'
      "
    >
      <!-- Welcome to Auditbooks -->
      <div class="px-4 py-4 safe-area-top-padding">
        <h1 class="text-2xl font-semibold select-none dark:text-gray-25">
          {{ t`Welcome to Auditbooks` }}
        </h1>
        <p class="text-gray-600 dark:text-gray-400 text-base select-none">
          {{
            t`Create a new company or select an existing one from your computer`
          }}
        </p>
      </div>

      <hr class="dark:border-gray-800" />

      <!-- New File (Blue Icon) -->
      <div
        data-testid="create-new-file"
        class="px-4 h-row-largest flex flex-row items-center gap-4 p-2"
        :class="
          creatingDemo
            ? ''
            : 'hover:bg-gray-50 dark:hover:bg-gray-890 cursor-pointer'
        "
        @click="newDatabase"
      >
        <div class="w-8 h-8 rounded-full bg-blue-500 relative flex-center">
          <feather-icon
            name="plus"
            class="text-white dark:text-gray-900 w-5 h-5"
          />
        </div>

        <div>
          <p class="font-medium dark:text-gray-200">
            {{ t`New Company` }}
          </p>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            {{ t`Create a new company and store it on your computer` }}
          </p>
        </div>
      </div>

      <!-- Existing File (Green Icon) -->
      <div
        class="px-4 h-row-largest flex flex-row items-center gap-4 p-2"
        :class="
          creatingDemo
            ? ''
            : 'hover:bg-gray-50 dark:hover:bg-gray-890 cursor-pointer'
        "
        @click="existingDatabase"
      >
        <div
          class="w-8 h-8 rounded-full bg-green-500 dark:bg-green-600 relative flex-center"
        >
          <feather-icon
            name="upload"
            class="w-4 h-4 text-white dark:text-gray-900"
          />
        </div>
        <div>
          <p class="font-medium dark:text-gray-200">
            {{ t`Existing Company` }}
          </p>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            {{ t`Load an existing company from your computer` }}
          </p>
        </div>
      </div>

      <!-- Create Demo (Pink Icon) -->
      <div
        v-if="!files?.length"
        class="px-4 h-row-largest flex flex-row items-center gap-4 p-2"
        :class="
          creatingDemo
            ? ''
            : 'hover:bg-gray-50 dark:hover:bg-gray-890 cursor-pointer'
        "
        @click="createDemo"
      >
        <div
          class="w-8 h-8 rounded-full bg-pink-500 dark:bg-pink-600 relative flex-center"
        >
          <feather-icon name="monitor" class="w-4 h-4 text-white" />
        </div>
        <div>
          <p class="font-medium dark:text-gray-200">
            {{ t`Create Demo` }}
          </p>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            {{ t`Create a demo company to try out Auditbooks` }}
          </p>
        </div>
      </div>
      <hr class="dark:border-gray-800" />

      <!-- File List -->
      <div class="overflow-y-auto flex-1">
        <div
          v-for="(file, i) in files"
          :key="file.dbPath"
          class="h-row-largest px-4 flex gap-4 items-center"
          :class="
            creatingDemo
              ? ''
              : 'hover:bg-gray-50 dark:hover:bg-gray-890 cursor-pointer'
          "
          :title="t`${file.companyName} stored at ${file.dbPath}`"
          @click="selectFile(file)"
        >
          <div
            class="w-8 h-8 rounded-full flex justify-center items-center bg-gray-200 dark:bg-gray-800 text-gray-500 font-semibold flex-shrink-0 text-base"
          >
            {{ i + 1 }}
          </div>
          <div class="w-full">
            <div class="flex justify-between overflow-x-auto items-baseline">
              <h2 class="font-medium dark:text-gray-200">
                {{ file.companyName }}
              </h2>
              <p
                class="whitespace-nowrap text-sm text-gray-600 dark:text-gray-400"
              >
                {{ formatDate(file.modified) }}
              </p>
            </div>
            <p
              class="text-sm text-gray-600 dark:text-gray-400 overflow-x-auto no-scrollbar whitespace-nowrap"
            >
              {{ truncate(file.dbPath) }}
            </p>
          </div>
          <button
            class="ms-auto p-2 hover:bg-red-200 dark:hover:bg-red-900 dark:hover:bg-opacity-40 rounded-full w-8 h-8 text-gray-600 dark:text-gray-400 hover:text-red-400 dark:hover:text-red-200"
            @click.stop="() => deleteDb(i)"
          >
            <feather-icon name="x" class="w-4 h-4" />
          </button>
        </div>
      </div>
      <hr v-if="files?.length" class="dark:border-gray-800" />

      <!-- Language Selector -->
      <div
        class="w-full flex justify-between items-center p-4 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-875 flex-shrink-0 safe-area-bottom-padding"
      >
        <LanguageSelector v-show="!creatingDemo" class="text-sm w-28" />
        <button
          v-if="files?.length"
          class="text-sm bg-gray-100 dark:bg-gray-890 hover:bg-gray-200 dark:hover:bg-gray-900 rounded px-4 py-1.5 w-auto h-8 no-scrollbar overflow-x-auto whitespace-nowrap"
          :disabled="creatingDemo"
          @click="createDemo"
        >
          {{ creatingDemo ? t`Please Wait` : t`Create Demo` }}
        </button>
      </div>
    </div>
    <Loading
      v-if="creatingDemo"
      :open="creatingDemo"
      :show-x="false"
      :full-width="true"
      :percent="creationPercent"
      :message="creationMessage"
    />

    <!-- Base Count Selection when Dev -->
    <Modal :open-modal="openModal" @closemodal="openModal = false">
      <div class="p-4 text-gray-900 dark:text-gray-100 w-form">
        <h2 class="text-xl font-semibold select-none">Set Base Count</h2>
        <p class="text-base mt-2">
          Base Count is a lower bound on the number of entries made when
          creating the dummy instance.
        </p>
        <div class="flex my-12 justify-center items-baseline gap-4 text-base">
          <label for="basecount" class="text-gray-600 dark:text-gray-400"
            >Base Count</label
          >
          <input
            v-model="baseCount"
            type="number"
            name="basecount"
            class="bg-gray-100 dark:bg-gray-875 focus:bg-gray-200 dark:focus:bg-gray-890 rounded-md px-2 py-1 outline-none"
          />
        </div>
        <div class="flex justify-between">
          <Button @click="openModal = false">Cancel</Button>
          <Button
            type="primary"
            @click="
              () => {
                openModal = false;
                startDummyInstanceSetup();
              }
            "
            >Create</Button
          >
        </div>
      </div>
    </Modal>
  </div>
</template>
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { setupDummyInstance } from 'dummy';
import { Verb } from 'fyo/telemetry/types';
import { DateTime } from 'luxon';
import Button from 'src/components/Button.vue';
import LanguageSelector from 'src/components/Controls/LanguageSelector.vue';
import FeatherIcon from 'src/components/FeatherIcon.vue';
import Loading from 'src/components/Loading.vue';
import Modal from 'src/components/Modal.vue';
import { fyo } from 'src/initFyo';
import { showDialog } from 'src/utils/interactive';
import { updateConfigFiles } from 'src/utils/misc';
import {
  deleteDb as deleteDbFile,
  getSavePath,
  getSelectedFilePath,
} from 'src/utils/ui';
import type { ConfigFilesWithModified } from 'utils/types';
import { useApp } from 'src/composables/useApp';
import { usePlatform } from 'src/composables/usePlatform';
import { useBreakpoint } from 'src/composables/useBreakpoint';

const props = defineProps<{
  // No props in original settings
}>();

const emit = defineEmits<{
  (e: 'file-selected', filePath: string): void;
  (e: 'new-database'): void;
}>();

const { t } = useApp();
const { platformName: platform } = usePlatform();
const { isMobile } = useBreakpoint();

const openModal = ref(false);
const baseCount = ref(100);
const creationMessage = ref('');
const creationPercent = ref(0);
const creatingDemo = ref(false);
const loadingDatabase = ref(false);
const files = ref<ConfigFilesWithModified[]>([]);

function truncate(value: string) {
  if (value.length < 72) {
    return value;
  }
  return '...' + value.slice(value.length - 72);
}

function formatDate(isoDate: string) {
  return DateTime.fromISO(isoDate).toRelative();
}

async function deleteDb(i: number) {
  const file = files.value[i];
  await showDialog({
    title: t`Delete ${file.companyName}?`,
    detail: t`Database file: ${file.dbPath}`,
    type: 'warning',
    buttons: [
      {
        label: t`Yes`,
        async action() {
          await deleteDbFile(file.dbPath);
          await setFiles();
        },
        isPrimary: true,
      },
      {
        label: t`No`,
        action() {
          return null;
        },
        isEscape: true,
      },
    ],
  });
}

async function createDemo() {
  if (!fyo.store.isDevelopment) {
    await startDummyInstanceSetup();
  } else {
    openModal.value = true;
  }
}

async function startDummyInstanceSetup() {
  const { filePath, canceled } = await getSavePath('demo', 'db');
  if (canceled || !filePath) {
    return;
  }

  creatingDemo.value = true;
  await setupDummyInstance(
    filePath,
    fyo,
    1,
    baseCount.value,
    (message, percent) => {
      creationMessage.value = message;
      creationPercent.value = percent;
    }
  );

  updateConfigFiles(fyo);
  await fyo.purgeCache();
  await setFiles();
  fyo.telemetry.log(Verb.Created, 'dummy-instance');
  creatingDemo.value = false;
  emit('file-selected', filePath);
}

async function setFiles() {
  const configFiles = (fyo.config.get('files') ?? []) as Array<{
    id: string;
    companyName: string;
    dbPath: string;
    openCount: number;
  }>;

  const { stat } = await import('@tauri-apps/plugin-fs');
  const enriched = await Promise.all(
    configFiles.map(async (f) => {
      let modified = new Date().toISOString();
      try {
        const info = await stat(f.dbPath);
        if (info.mtime) {
          modified = new Date(info.mtime).toISOString();
        }
      } catch {
        // file may not exist yet
      }
      return { ...f, modified };
    })
  );

  files.value = enriched.sort(
    (a, b) => Date.parse(b.modified) - Date.parse(a.modified)
  );
}

function newDatabase() {
  if (creatingDemo.value) {
    return;
  }
  emit('new-database');
}

async function existingDatabase() {
  if (creatingDemo.value) {
    return;
  }
  const isMobilePlatform = ['Android', 'iOS'].includes(platform.value);
  if (isMobilePlatform) {
    const { showToast } = await import('src/utils/interactive');
    showToast({
      type: 'info',
      message: t`Select a .db file from your Files app`,
    });
  }
  const filePath = (await getSelectedFilePath())?.filePaths?.[0];
  emitFileSelected(filePath);
}

function selectFile(file: ConfigFilesWithModified) {
  if (creatingDemo.value) {
    return;
  }
  emitFileSelected(file.dbPath);
}

function emitFileSelected(filePath?: string) {
  if (!filePath) {
    return;
  }
  emit('file-selected', filePath);
}

onMounted(async () => {
  await setFiles();
  if (fyo.store.isDevelopment) {
    // @ts-ignore
    window.ds = {
      openModal,
      baseCount,
      creationMessage,
      creationPercent,
      creatingDemo,
      files,
      setFiles,
      existingDatabase,
    };
  }
});

defineExpose({
  existingDatabase,
});
</script>
