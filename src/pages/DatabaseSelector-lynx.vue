<template>
  <view class="Container" :class="{ dark: store.isDark }">
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
        <text class="ListHeader" v-if="files.length">{{ t`Recent Companies` }}</text>
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
import { ref, onMounted } from 'vue-lynx';
import { useAppStore } from 'src/stores/app';
import { t } from 'fyo';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import type { ConfigFilesWithModified } from 'utils/types';

dayjs.extend(relativeTime);

const emit = defineEmits<{
  (e: 'file-selected', filePath: string): void;
  (e: 'new-database'): void;
}>();

const store = useAppStore();
const files = ref<ConfigFilesWithModified[]>([]);

const truncate = (value: string) => {
  if (value.length < 35) return value;
  return '...' + value.slice(value.length - 35);
};

const setFiles = async () => {
  try {
    const dbList = (await (globalThis as any).ipc.getDbList()) || [];
    files.value = dbList.sort(
      (a: any, b: any) => Date.parse(b.modified) - Date.parse(a.modified)
    );
  } catch (err) {
    console.error('Failed to get database list:', err);
  }
};

const deleteDb = async (i: number) => {
  const file = files.value[i];
  if (!file) return;
  try {
    await (globalThis as any).ipc.deleteFile(file.dbPath);
    await setFiles();
  } catch (err) {
    console.error('Failed to delete database file:', err);
  }
};

const emitFileSelected = (filePath: string) => {
  if (filePath) {
    emit('file-selected', filePath);
  }
};

const newDatabase = () => {
  emit('new-database');
};

const existingDatabase = async () => {
  try {
    const response = await (globalThis as any).ipc.getOpenFilePath({
      title: t`Select file`,
      properties: ['openFile'],
      filters: [{ name: 'SQLite DB File', extensions: ['db'] }],
    });
    const filePath = response?.filePaths?.[0];
    if (filePath) {
      emitFileSelected(filePath);
    }
  } catch (err) {
    console.error('Failed to open file path selector:', err);
  }
};

const createDemo = async () => {
  try {
    const response = await (globalThis as any).ipc.getSaveFilePath({
      title: t`Select folder`,
      defaultPath: `demo.db`,
    });
    if (response?.filePath) {
      emitFileSelected(response.filePath);
    }
  } catch (err) {
    console.error('Failed to save file path selector:', err);
  }
};

const selectFile = (file: ConfigFilesWithModified) => {
  emitFileSelected(file.dbPath);
};

onMounted(async () => {
  await setFiles();
});
</script>

<style scoped>
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
