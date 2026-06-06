import { computed } from "vue";

export function useIconColors(active: () => boolean) {
  const lightColor = computed(() => {
    return active() ? "var(--icon-light-active)" : "var(--icon-light-passive)";
  });

  const darkColor = computed(() => {
    return active() ? "var(--icon-dark-active)" : "var(--icon-dark-passive)";
  });

  return { lightColor, darkColor };
}
