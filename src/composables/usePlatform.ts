import { computed } from 'vue';
import { fyo } from '../initFyo';

export function usePlatform() {
  const rawPlatform = computed(() => fyo.store.platform);
  const platformName = computed(() => {
    switch (rawPlatform.value) {
      case 'win32':
        return 'Windows';
      case 'darwin':
        return 'Mac';
      case 'linux':
        return 'Linux';
      default:
        return 'Linux';
    }
  });

  return {
    platformName,
    isMac: computed(() => platformName.value === 'Mac'),
    isWindows: computed(() => platformName.value === 'Windows'),
    isMobile: computed(() => ['Android', 'iOS'].includes(platformName.value)),
  };
}
