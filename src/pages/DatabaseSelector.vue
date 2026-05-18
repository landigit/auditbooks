<template>
  <div
    class="flex-1 flex justify-center items-center bg-canvas"
    :class="{
      'pointer-events-none': loadingDatabase,
      'window-drag': store.platform !== 'Windows',
    }"
  >
    <div
      class="w-full w-form shadow-lg rounded-lg border border-border relative bg-surface"
      style="height: 700px"
    >
      <!-- Welcome to Auditbooks -->
      <div class="px-4 py-4">
        <h1 class="text-2xl font-semibold select-none text-main">
          {{ t`Welcome to Auditbooks` }}
        </h1>
        <p class="text-description text-base select-none">
          {{
            t`Create a new company or select an existing one from your computer`
          }}
        </p>
      </div>

      <hr class="border-border" />

      <!-- New File (Blue Icon) -->
      <div
        data-testid="create-new-file"
        class="px-4 h-row-largest flex flex-row items-center gap-4 p-2"
        :class="creatingDemo ? '' : 'hover:bg-surface-hover cursor-pointer'"
        @click="newDatabase"
      >
        <div
          class="w-8 h-8 rounded-full bg-indicator-blue-bg relative flex-center"
        >
          <lucide-icon name="plus" class="text-indicator-blue-text w-5 h-5" />
        </div>

        <div>
          <p class="font-medium text-main">
            {{ t`New Company` }}
          </p>
          <p class="text-sm text-description">
            {{ t`Create a new company and store it on your computer` }}
          </p>
        </div>
      </div>

      <!-- Existing File (Green Icon) -->
      <div
        class="px-4 h-row-largest flex flex-row items-center gap-4 p-2"
        :class="creatingDemo ? '' : 'hover:bg-surface-hover cursor-pointer'"
        @click="existingDatabase"
      >
        <div
          class="w-8 h-8 rounded-full bg-indicator-green-bg relative flex-center"
        >
          <lucide-icon
            name="upload"
            class="w-4 h-4 text-indicator-green-text"
          />
        </div>
        <div>
          <p class="font-medium text-main">
            {{ t`Existing Company` }}
          </p>
          <p class="text-sm text-description">
            {{ t`Load an existing company from your computer` }}
          </p>
        </div>
      </div>

      <!-- Create Demo (Pink Icon) -->
      <div
        v-if="!files?.length"
        class="px-4 h-row-largest flex flex-row items-center gap-4 p-2"
        :class="creatingDemo ? '' : 'hover:bg-surface-hover cursor-pointer'"
        @click="createDemo"
      >
        <div
          class="w-8 h-8 rounded-full bg-indicator-blue-bg relative flex-center"
        >
          <lucide-icon
            name="monitor"
            class="w-4 h-4 text-indicator-blue-text"
          />
        </div>
        <div>
          <p class="font-medium text-main">
            {{ t`Create Demo` }}
          </p>
          <p class="text-sm text-description">
            {{ t`Create a demo company to try out Auditbooks` }}
          </p>
        </div>
      </div>
      <hr class="border-border" />

      <!-- File List -->
      <div class="overflow-y-auto" style="max-height: 340px">
        <div
          v-for="(file, i) in files"
          :key="file.dbPath"
          class="h-row-largest px-4 flex gap-4 items-center"
          :class="creatingDemo ? '' : 'hover:bg-surface-hover cursor-pointer'"
          :title="t`${file.companyName} stored at ${file.dbPath}`"
          @click="selectFile(file)"
        >
          <div
            class="w-8 h-8 rounded-full flex justify-center items-center bg-canvas-muted text-description font-semibold flex-shrink-0 text-base"
          >
            {{ i + 1 }}
          </div>
          <div class="w-full">
            <div class="flex justify-between overflow-x-auto items-baseline">
              <h2 class="font-medium text-main">
                {{ file.companyName }}
              </h2>
              <p class="whitespace-nowrap text-sm text-description">
                {{ formatDate(file.modified) }}
              </p>
            </div>
            <p
              class="text-sm text-description overflow-x-auto no-scrollbar whitespace-nowrap"
            >
              {{ truncate(file.dbPath) }}
            </p>
          </div>
          <button
            class="ms-auto p-2 hover:bg-indicator-red-bg rounded-full w-8 h-8 text-description hover:text-error"
            @click.stop="() => deleteDb(i)"
          >
            <lucide-icon name="x" class="w-4 h-4" />
          </button>
        </div>
      </div>
      <hr v-if="files?.length" class="border-border" />

      <!-- Language Selector -->
      <div
        class="w-full flex justify-between items-center absolute p-4 text-main"
        style="top: 100%; transform: translateY(-100%)"
      >
        <LanguageSelector v-show="!creatingDemo" class="text-sm w-28" />
        <button
          v-if="files?.length"
          class="text-sm bg-surface-hover hover:bg-canvas-muted rounded px-4 py-1.5 w-auto h-8 no-scrollbar overflow-x-auto whitespace-nowrap"
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
      <div class="p-4 text-main w-form">
        <h2 class="text-xl font-semibold select-none">Set Base Count</h2>
        <p class="text-base mt-2">
          Base Count is a lower bound on the number of entries made when
          creating the dummy instance.
        </p>
        <div class="flex my-12 justify-center items-baseline gap-4 text-base">
          <label for="basecount" class="text-description">Base Count</label>
          <input
            v-model="baseCount"
            type="number"
            name="basecount"
            class="bg-canvas-muted focus:bg-surface-hover rounded-md px-2 py-1 outline-none"
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
import { ref, onMounted } from 'vue';
import { useAppStore } from 'src/stores/app';
import { setupDummyInstance } from 'dummy';
import { t } from 'fyo';
import { Verb } from 'fyo/telemetry/types';
import { DateTime } from 'luxon';
import { fyo } from 'src/initFyo';
import { showDialog } from 'src/utils/interactive';
import { updateConfigFiles } from 'src/utils/misc';
import {
  deleteDb as deleteDbFile,
  getSavePath,
  getSelectedFilePath,
} from 'src/utils/ui';
import type { ConfigFilesWithModified } from 'utils/types';
import LanguageSelector from 'src/components/Controls/LanguageSelector.vue';
import Loading from 'src/components/Loading.vue';
import LucideIcon from 'src/components/LucideIcon.vue';
import Modal from 'src/components/Modal.vue';
import Button from 'src/components/Button.vue';

// Define Emits
const emit = defineEmits<{
  (e: 'file-selected', filePath: string): void;
  (e: 'new-database'): void;
}>();

// State definition
const store = useAppStore();
const openModal = ref(false);
const baseCount = ref(100);
const creationMessage = ref('');
const creationPercent = ref(0);
const creatingDemo = ref(false);
const loadingDatabase = ref(false);
const files = ref<ConfigFilesWithModified[]>([]);

// Methods
const truncate = (value: string) => {
  if (value.length < 72) {
    return value;
  }
  return '...' + value.slice(value.length - 72);
};

const formatDate = (isoDate: string) => {
  return DateTime.fromISO(isoDate).toRelative();
};

const setFiles = async () => {
  const dbList = (await ipc.getDbList()) || [];
  files.value = dbList.sort(
    (a, b) => Date.parse(b.modified) - Date.parse(a.modified)
  );
};

const deleteDb = async (i: number) => {
  const file = files.value[i];
  if (!file) return;

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
};

const emitFileSelected = (filePath: string) => {
  if (!filePath) {
    return;
  }
  emit('file-selected', filePath);
};

const startDummyInstanceSetup = async () => {
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
  emitFileSelected(filePath);
};

const createDemo = async () => {
  if (!store.isDevelopment) {
    await startDummyInstanceSetup();
  } else {
    openModal.value = true;
  }
};

const newDatabase = () => {
  if (creatingDemo.value) {
    return;
  }
  emit('new-database');
};

const existingDatabase = async () => {
  if (creatingDemo.value) {
    return;
  }
  const filePath = (await getSelectedFilePath())?.filePaths?.[0];
  if (filePath) {
    emitFileSelected(filePath);
  }
};

const selectFile = (file: ConfigFilesWithModified) => {
  if (creatingDemo.value) {
    return;
  }
  emitFileSelected(file.dbPath);
};

// Lifecycle Hooks
onMounted(async () => {
  await setFiles();

  if (store.isDevelopment) {
    // @ts-ignore
    window.ds = {
      truncate,
      formatDate,
      deleteDb,
      createDemo,
      startDummyInstanceSetup,
      setFiles,
      newDatabase,
      existingDatabase,
      selectFile,
      emitFileSelected,
      openModal,
      baseCount,
      creationMessage,
      creationPercent,
      creatingDemo,
      loadingDatabase,
      files,
    };
  }
});

// Expose methods publicly for parent component refs (e.g. App.vue)
defineExpose({
  existingDatabase,
});
</script>
