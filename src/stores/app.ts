import { fyo } from 'src/initFyo';

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
    get darkMode() {
      return store.darkMode ?? false;
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
    setDarkMode(value: boolean) {
      store.darkMode = value;
    },
  };
}
