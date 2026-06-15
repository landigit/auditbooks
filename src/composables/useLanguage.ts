import { inject, computed } from 'vue';
import { languageDirectionKey } from '../utils/injectionKeys';

export function useLanguage() {
  const languageDirection = inject(languageDirectionKey);
  return {
    languageDirection,
    isRtl: computed(() => languageDirection?.value === 'rtl'),
    isLtr: computed(
      () => languageDirection?.value === 'ltr' || !languageDirection?.value
    ),
  };
}
