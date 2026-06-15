import { ref, computed, onMounted, onUnmounted } from 'vue';

export function useBreakpoint() {
  const width = ref(typeof window !== 'undefined' ? window.innerWidth : 1024);

  const handleResize = () => {
    width.value = window.innerWidth;
  };

  onMounted(() => {
    window.addEventListener('resize', handleResize);
  });

  onUnmounted(() => {
    window.removeEventListener('resize', handleResize);
  });

  return {
    isMobile: computed(() => width.value < 640), // < sm
    isTablet: computed(() => width.value < 1024), // < lg
    isDesktop: computed(() => width.value >= 1024),
    width,
  };
}
