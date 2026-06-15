import { inject } from 'vue';
import { shortcutsKey } from '../utils/injectionKeys';

export function useShortcuts() {
  const shortcuts = inject(shortcutsKey);
  if (!shortcuts) {
    throw new Error(
      'useShortcuts must be used within a component providing shortcutsKey'
    );
  }
  return shortcuts;
}
