import { fyo } from 'src/initFyo';
import { Theme, setTheme } from 'src/utils/theme';
import { ref } from 'vue';

const isSystemDark = ref(window.matchMedia('(prefers-color-scheme: dark)').matches);
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  isSystemDark.value = e.matches;
});

export function useAppStore() {
  const store = fyo.store as any;
  return {
    get platform() {
      return store.platform === 'win32'
        ? 'Windows'
        : store.platform === 'darwin'
          ? 'Mac'
          : 'Linux';
    },
    get showSidebar() {
      return store.showSidebar ?? true;
    },
    get theme(): Theme {
      return store.theme ?? 'auto';
    },
    get isDark(): boolean {
      if (this.theme === 'auto') {
        return isSystemDark.value;
      }
      return this.theme === 'dark';
    },
    get language() {
      // If language is empty string or null, return 'English'
      return store.language || 'English';
    },
    get languageDirection() {
      return store.languageDirection ?? 'ltr';
    },
    setPlatform(platform: string) {
      store.platform = platform;
    },
    toggleSidebar() {
      store.showSidebar = !this.showSidebar;
    },
    setTheme(value: Theme) {
      store.theme = value;
    },
  };
}
