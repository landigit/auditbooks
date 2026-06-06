<script setup lang="ts">
import { currentRoute } from './router-lynx.js';
import DatabaseSelector from './pages/DatabaseSelector-lynx.vue';

function handleFileSelected(filePath: string) {
  console.info(`[App] Database file selected: ${filePath}`);
}

function handleNewDatabase() {
  console.info('[App] User requested new database creation');
}
</script>

<template>
  <view class="MainView">
    <DatabaseSelector
      v-if="currentRoute.name === 'DatabaseSelector'"
      @file-selected="handleFileSelected"
      @new-database="handleNewDatabase"
    />
    <view v-else class="DeskPlaceholder">
      <text class="PlaceholderText">Connected to Database!</text>
    </view>
  </view>
</template>

<style scoped>
.MainView {
  width: 100vw;
  height: 100vh;
  background-color: #0b0f19;
}

.DeskPlaceholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100vw;
  height: 100vh;
}

.PlaceholderText {
  color: #38bdf8;
  font-size: 20px;
  font-weight: bold;
}
</style>
