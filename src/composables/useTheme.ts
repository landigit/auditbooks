import { storeToRefs } from 'pinia';
import { useAppStore } from '../stores/app';

export function useTheme() {
  const store = useAppStore();
  const { darkMode } = storeToRefs(store);

  return {
    darkMode,
    setDarkMode: store.setDarkMode,
  };
}
