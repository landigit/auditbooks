import { ref, onMounted, onUnmounted } from 'vue';

export function useMobile() {
  const isMobile = ref(false);

  const checkMobile = () => {
    isMobile.value = window.innerWidth < 768; // Tailwind md breakpoint
  };

  onMounted(() => {
    checkMobile();
    window.addEventListener('resize', checkMobile);
  });

  onUnmounted(() => {
    window.removeEventListener('resize', checkMobile);
  });

  return isMobile;
}
