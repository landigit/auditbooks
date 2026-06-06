<template>
  <view
    v-if="!isLynx"
    class="flex-1 flex justify-center items-center bg-canvas"
    :class="{
      'pointer-events-none': loadingDatabase,
      'window-drag': store.platform !== 'Windows',
    }"
  >
    <view
      class="w-full h-full md:h-[700px] md:w-[var(--w-form)] md:shadow-lg md:rounded-lg md:border md:border-border relative bg-surface window-no-drag"
    >
      <!-- Welcome to Auditbooks -->
      <view class="px-4 py-4 flex flex-col">
        <text class="text-2xl font-semibold select-none text-main">
          {{ t`Welcome to Auditbooks` }}
        </text>
        <text class="text-description text-base select-none">
          {{
            t`Create a new company or select an existing one from your computer`
          }}
        </text>
      </view>

      <view class="border-b border-border" />

      <!-- New File (Blue Icon) -->
      <view
        data-testid="create-new-file"
        class="px-4 h-row-largest flex flex-row items-center gap-4 p-2"
        :class="creatingDemo ? '' : 'hover:bg-surface-hover cursor-pointer'"
        @tap="newDatabase"
      >
        <view
          class="w-8 h-8 rounded-full bg-indicator-blue-bg relative flex-center"
        >
          <lucide-icon name="plus" class="text-indicator-blue-text w-5 h-5" />
        </view>

        <view class="flex flex-col">
          <text class="font-medium text-main">
            {{ t`New Company` }}
          </text>
          <text class="text-sm text-description">
            {{ t`Create a new company and store it on your computer` }}
          </text>
        </view>
      </view>

      <!-- Existing File (Green Icon) -->
      <view
        class="px-4 h-row-largest flex flex-row items-center gap-4 p-2"
        :class="creatingDemo ? '' : 'hover:bg-surface-hover cursor-pointer'"
        @tap="existingDatabase"
      >
        <view
          class="w-8 h-8 rounded-full bg-indicator-green-bg relative flex-center"
        >
          <lucide-icon
            name="upload"
            class="w-4 h-4 text-indicator-green-text"
          />
        </view>
        <view class="flex flex-col">
          <text class="font-medium text-main">
            {{ t`Existing Company` }}
          </text>
          <text class="text-sm text-description">
            {{ t`Load an existing company from your computer` }}
          </text>
        </view>
      </view>

      <!-- Create Demo (Pink Icon) -->
      <view
        v-if="!files?.length"
        class="px-4 h-row-largest flex flex-row items-center gap-4 p-2"
        :class="creatingDemo ? '' : 'hover:bg-surface-hover cursor-pointer'"
        @tap="createDemo"
      >
        <view
          class="w-8 h-8 rounded-full bg-indicator-blue-bg relative flex-center"
        >
          <lucide-icon
            name="monitor"
            class="w-4 h-4 text-indicator-blue-text"
          />
        </view>
        <view class="flex flex-col">
          <text class="font-medium text-main">
            {{ t`Create Demo` }}
          </text>
          <text class="text-sm text-description">
            {{ t`Create a demo company to try out Auditbooks` }}
          </text>
        </view>
      </view>
      <view class="border-b border-border" />

      <!-- File List -->
      <view class="overflow-y-auto file-list">
        <view
          v-for="(file, i) in files"
          :key="file.dbPath"
          class="h-row-largest px-4 flex gap-4 items-center"
          :class="creatingDemo ? '' : 'hover:bg-surface-hover cursor-pointer'"
          :title="t`${file.companyName} stored at ${file.dbPath}`"
          @tap="selectFile(file)"
        >
          <view
            class="w-8 h-8 rounded-full flex justify-center items-center bg-canvas-muted text-description font-semibold flex-shrink-0 text-base"
          >
            {{ i + 1 }}
          </view>
          <view class="w-full flex flex-col">
            <view class="flex justify-between overflow-x-auto items-baseline">
              <text class="font-medium text-main">
                {{ file.companyName }}
              </text>
              <text class="whitespace-nowrap text-sm text-description">
                {{ formatDate(file.modified) }}
              </text>
            </view>
            <text
              class="text-sm text-description overflow-x-auto no-scrollbar whitespace-nowrap"
            >
              {{ truncate(file.dbPath) }}
            </text>
          </view>
          <view
            class="ms-auto p-2 hover:bg-indicator-red-bg rounded-full w-8 h-8 text-description hover:text-error"
            @tap.stop="() => deleteDb(i)"
          >
            <lucide-icon name="x" class="w-4 h-4" />
          </view>
        </view>
      </view>
      <view class="border-b border-border" v-if="files?.length" />

      <!-- Language Selector -->
      <view
        class="w-full flex justify-between items-center absolute p-4 text-main"
        style="top: 100%; transform: translateY(-100%)"
      >
        <LanguageSelector v-show="!creatingDemo" class="text-sm w-28" />
        <view
          v-if="files?.length"
          class="text-sm bg-surface-hover hover:bg-canvas-muted rounded px-4 py-1.5 w-auto h-8 no-scrollbar overflow-x-auto whitespace-nowrap"
          :disabled="creatingDemo"
          @tap="createDemo"
        >
          {{ creatingDemo ? t`Please Wait` : t`Create Demo` }}
        </view>
      </view>
    </view>
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
      <view class="p-4 text-main w-form">
        <text class="text-xl font-semibold select-none">Set Base Count</text>
        <text class="text-base mt-2">
          Base Count is a lower bound on the number of entries made when
          creating the dummy instance.
        </text>
        <view class="flex my-12 justify-center items-baseline gap-4 text-base">
          <text for="basecount" class="text-description">Base Count</text>
          <input
            v-model="baseCount"
            type="number"
            name="basecount"
            class="bg-canvas-muted focus:bg-surface-hover rounded-md px-2 py-1 outline-none"
          />
        </view>
        <view class="flex justify-between">
          <Button @tap="openModal = false">Cancel</Button>
          <Button
            type="primary"
            @tap="
              () => {
                openModal = false;
                startDummyInstanceSetup();
              }
            "
            >Create</Button
          >
        </view>
      </view>
    </Modal>
  </view>

  <view v-else class="Container" :class="{ dark: store.isDark }">
    <view class="Card">
      <!-- Header -->
      <view class="Header">
        <text class="Title">{{ t`Welcome to Auditbooks` }}</text>
        <text class="Subtitle">
          {{ t`Create a new company or select an existing one` }}
        </text>
      </view>

      <view class="Divider" />

      <!-- Actions List -->
      <view class="Actions">
        <!-- New Company Button -->
        <view class="ActionItem" @tap="newDatabase">
          <view class="IconBadge IconBadge--blue">
            <text class="BadgeText">+</text>
          </view>
          <view class="ActionDetails">
            <text class="ActionTitle">{{ t`New Company` }}</text>
            <text class="ActionDesc">{{ t`Create a new company file` }}</text>
          </view>
        </view>

        <!-- Existing Company Button -->
        <view class="ActionItem" @tap="existingDatabase">
          <view class="IconBadge IconBadge--green">
            <text class="BadgeText">📂</text>
          </view>
          <view class="ActionDetails">
            <text class="ActionTitle">{{ t`Existing Company` }}</text>
            <text class="ActionDesc">{{ t`Load an existing file` }}</text>
          </view>
        </view>

        <!-- Create Demo Button -->
        <view v-if="!files.length" class="ActionItem" @tap="createDemo">
          <view class="IconBadge IconBadge--pink">
            <text class="BadgeText">⚡</text>
          </view>
          <view class="ActionDetails">
            <text class="ActionTitle">{{ t`Create Demo` }}</text>
            <text class="ActionDesc">{{ t`Setup a demo database` }}</text>
          </view>
        </view>
      </view>

      <view class="Divider" />

      <!-- Recent Databases List -->
      <view class="FileListContainer">
        <text class="ListHeader" v-if="files.length">{{
          t`Recent Companies`
        }}</text>
        <view class="FileListView">
          <view
            v-for="(file, i) in files"
            :key="file.dbPath"
            class="FileRow"
            @tap="selectFile(file)"
          >
            <view class="IndexBadge">
              <text class="IndexBadgeText">{{ i + 1 }}</text>
            </view>
            <view class="FileInfo">
              <text class="FileName">{{ file.companyName }}</text>
              <text class="FilePath">{{ truncate(file.dbPath) }}</text>
            </view>
            <view class="DeleteButton" @tap.stop="() => deleteDb(i)">
              <text class="DeleteText">✕</text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>
<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useAppStore } from "src/stores/app";
import { setupDummyInstance } from "dummy";
import { t } from "fyo";
import { Verb } from "fyo/telemetry/types";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
dayjs.extend(relativeTime);
import { fyo } from "src/initFyo";
import { showDialog, isLynx } from "src/utils/interactive";
import { updateConfigFiles } from "src/utils/misc";
import {
  deleteDb as deleteDbFile,
  getSavePath,
  getSelectedFilePath,
} from "src/utils/ui";
import type { ConfigFilesWithModified } from "utils/types";
import LanguageSelector from "src/components/Controls/LanguageSelector.vue";
import Loading from "src/components/Loading.vue";
import LucideIcon from "src/components/LucideIcon.vue";
import Modal from "src/components/Modal.vue";
import Button from "src/components/Button.vue";

// Define Emits
const emit = defineEmits<{
  (e: "file-selected", filePath: string): void;
  (e: "new-database"): void;
}>();

// State definition
const store = useAppStore();
const openModal = ref(false);
const baseCount = ref(100);
const creationMessage = ref("");
const creationPercent = ref(0);
const creatingDemo = ref(false);
const loadingDatabase = ref(false);
const files = ref<ConfigFilesWithModified[]>([]);

// Methods
const truncate = (value: string) => {
  if (value.length < 72) {
    return value;
  }
  return "..." + value.slice(value.length - 72);
};

const formatDate = (isoDate: string) => {
  return dayjs(isoDate).fromNow();
};

const setFiles = async () => {
  const dbList = (await ipc.getDbList()) || [];
  files.value = dbList.sort(
    (a, b) => Date.parse(b.modified) - Date.parse(a.modified),
  );
};

const deleteDb = async (i: number) => {
  const file = files.value[i];
  if (!file) return;

  await showDialog({
    title: t`Delete ${file.companyName}?`,
    detail: t`Database file: ${file.dbPath}`,
    type: "warning",
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
  emit("file-selected", filePath);
};

const startDummyInstanceSetup = async () => {
  const { filePath, canceled } = await getSavePath("demo", "db");
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
    },
  );

  updateConfigFiles(fyo);
  await fyo.purgeCache();
  await setFiles();
  fyo.telemetry.log(Verb.Created, "dummy-instance");
  creatingDemo.value = false;
  emitFileSelected(filePath);
};

const createDemo = async () => {
  if (isLynx) {
    try {
      const response = await (globalThis as any).ipc.getSaveFilePath({
        title: t`Select folder`,
        defaultPath: `demo.db`,
      });
      if (response?.filePath) {
        emitFileSelected(response.filePath);
      }
    } catch (err) {
      console.error("Failed to open save file selector:", err);
    }
  } else {
    if (!store.isDevelopment) {
      await startDummyInstanceSetup();
    } else {
      openModal.value = true;
    }
  }
};

const newDatabase = () => {
  if (creatingDemo.value) {
    return;
  }
  emit("new-database");
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

  if (store.isDevelopment && typeof window !== "undefined") {
    // @ts-expect-error
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

<style scoped>
.file-list {
  max-height: calc(100vh - 340px);
}
@media (min-width: 768px) {
  .file-list {
    max-height: 340px;
  }
}

/* Lynx Database Selector Styles */
.Container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: white;
  width: 100vw;
  height: 100vh;
  padding: 16px;
  --color-canvas: white;
  --color-canvas-muted: #f8f8f8;
  --color-surface: white;
  --color-surface-hover: #f3f3f3;
  --color-border: #ededed;
  --color-main: #020617;
  --color-description: #334155;
}

.Container.dark {
  background-color: #171717;
  --color-canvas: #171717;
  --color-canvas-muted: #1c1c1c;
  --color-surface: #212121;
  --color-surface-hover: #1c1c1c;
  --color-border: #383838;
  --color-main: #fbfbfb;
  --color-description: #999999;
}

.Card {
  display: flex;
  flex-direction: column;
  background-color: var(--color-surface);
  border-radius: 8px;
  width: 90vw;
  max-width: 420px;
  padding: 20px;
  border: 1px solid var(--color-border);
}

.Header {
  display: flex;
  flex-direction: column;
  margin-bottom: 12px;
}

.Title {
  font-size: 22px;
  font-weight: 600;
  color: var(--color-main);
  margin-bottom: 4px;
}

.Subtitle {
  font-size: 14px;
  color: var(--color-description);
}

.Divider {
  height: 1px;
  background-color: var(--color-border);
  margin-top: 12px;
  margin-bottom: 12px;
}

.Actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ActionItem {
  display: flex;
  flex-direction: row;
  align-items: center;
  background-color: var(--color-surface);
  border-radius: 8px;
  padding: 12px;
  border: 1px solid transparent;
}

.ActionItem:active {
  background-color: var(--color-surface-hover);
}

.IconBadge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  margin-right: 12px;
}

.IconBadge--blue {
  background-color: rgba(51, 161, 255, 0.15);
}

.IconBadge--green {
  background-color: rgba(89, 186, 139, 0.15);
}

.IconBadge--pink {
  background-color: rgba(223, 158, 184, 0.15);
}

.BadgeText {
  color: #ffffff;
  font-size: 18px;
  font-weight: bold;
}

.IconBadge--blue .BadgeText {
  color: #33a1ff;
}

.IconBadge--green .BadgeText {
  color: #59ba8b;
}

.IconBadge--pink .BadgeText {
  color: #df9eb8;
}

.ActionDetails {
  display: flex;
  flex-direction: column;
}

.ActionTitle {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-main);
}

.ActionDesc {
  font-size: 13px;
  color: var(--color-description);
  margin-top: 2px;
}

.FileListContainer {
  display: flex;
  flex-direction: column;
  margin-top: 8px;
}

.ListHeader {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-description);
  margin-bottom: 8px;
}

.FileListView {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.FileRow {
  display: flex;
  flex-direction: row;
  align-items: center;
  background-color: var(--color-surface);
  border-radius: 8px;
  padding: 10px;
}

.FileRow:active {
  background-color: var(--color-surface-hover);
}

.IndexBadge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background-color: var(--color-canvas-muted);
  margin-right: 10px;
}

.IndexBadgeText {
  color: var(--color-description);
  font-size: 12px;
  font-weight: 600;
}

.FileInfo {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.FileName {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-main);
}

.FilePath {
  font-size: 11px;
  color: var(--color-description);
  margin-top: 2px;
}

.DeleteButton {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background-color: transparent;
}

.DeleteButton:active {
  background-color: #e03636;
}

.DeleteText {
  color: var(--color-description);
  font-size: 12px;
}

.DeleteButton:active .DeleteText {
  color: #ffffff;
}
</style>
