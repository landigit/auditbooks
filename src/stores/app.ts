import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useAppStore = defineStore('app', () => {
  const platform = ref<'Windows' | 'Mac' | 'Linux'>('Linux');
  const showSidebar = ref(true);
  const darkMode = ref(false);
  const language = ref('English');
  const languageDirection = ref('ltr');

  function setPlatform(val: string) {
    if (val === 'win32') {
      platform.value = 'Windows';
    } else if (val === 'darwin') {
      platform.value = 'Mac';
    } else {
      platform.value = 'Linux';
    }
  }

  function toggleSidebar() {
    showSidebar.value = !showSidebar.value;
  }

  function setDarkMode(val: boolean) {
    darkMode.value = val;
  }

  return {
    platform,
    showSidebar,
    darkMode,
    language,
    languageDirection,
    setPlatform,
    toggleSidebar,
    setDarkMode,
  };
});
