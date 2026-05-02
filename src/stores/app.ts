import { fyo } from 'src/initFyo';

export function useAppStore() {
  return {
    get platform() {
      return fyo.store.platform === 'win32'
        ? 'Windows'
        : fyo.store.platform === 'darwin'
          ? 'Mac'
          : 'Linux';
    },
    get showSidebar() {
      return fyo.store.showSidebar ?? true;
    },
    get darkMode() {
      return fyo.store.darkMode ?? false;
    },
    get language() {
      // If language is empty string or null, return 'English'
      return fyo.store.language || 'English';
    },
    get languageDirection() {
      return fyo.store.languageDirection ?? 'ltr';
    },
    setPlatform(platform: string) {
      fyo.store.platform = platform;
    },
    toggleSidebar() {
      fyo.store.showSidebar = !this.showSidebar;
    },
    setDarkMode(value: boolean) {
      fyo.store.darkMode = value;
    },
  };
}
