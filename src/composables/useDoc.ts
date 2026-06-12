import { computed } from 'vue';
import { useShortcuts } from './useShortcuts';
import { useDocShortcuts as originalUseDocShortcuts } from '../utils/vueUtils';
import type { DocRef } from '../utils/types';

export function useDoc(docRef: DocRef, name: string, isMultiple = true) {
  const shortcuts = useShortcuts();
  const context = originalUseDocShortcuts(shortcuts, docRef, name, isMultiple);

  return {
    context,
    canSave: computed(() => docRef.value?.canSave ?? false),
    canSubmit: computed(() => docRef.value?.canSubmit ?? false),
    canCancel: computed(() => docRef.value?.canCancel ?? false),
    canDelete: computed(() => docRef.value?.canDelete ?? false),
  };
}
