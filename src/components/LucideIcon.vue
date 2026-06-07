<template>
  <component :is="iconComponent" :size="size" :stroke-width="strokeWidth" class="lucide-icon" />
</template>

<script setup lang="ts">
import { computed } from "vue";
import * as icons from "@lucide/vue";

interface LucideIconProps {
  name: string;
  size?: string | number;
  strokeWidth?: string | number;
}

const props = withDefaults(defineProps<LucideIconProps>(), {
  size: 16,
  strokeWidth: 2,
});

const toPascalCase = (str: string) =>
  str.replace(/(^\w|-\w)/g, (match) => match.replace(/-/, "").toUpperCase());

const iconComponent = computed(() => {
  const iconName = toPascalCase(props.name);
  const Icon = (icons as Record<string, any>)[iconName];

  if (!Icon) {
    console.warn(`[Lucide] Icon "${props.name}" (mapped to "${iconName}") not found.`);
    return null;
  }

  return Icon;
});
</script>

<style scoped>
.lucide-icon {
  display: inline-block;
  vertical-align: middle;
}
</style>
