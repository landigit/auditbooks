<script setup lang="ts">
import LucideIcon from './LucideIcon.vue';

interface Props {
  name: string;
  size?: number | string;
  color?: string;
  strokeWidth?: number | string;
  defaultClass?: string;
}

const props = withDefaults(defineProps<Props>(), {
  size: 16,
  strokeWidth: 2,
  defaultClass: '',
});

function getLucideIconName(name: string): string {
  const mapping: Record<string, string> = {
    dashboard: 'layout-dashboard',
    sales: 'badge-percent',
    purchase: 'shopping-cart',
    reports: 'bar-chart-3',
    inventory: 'package',
    pos: 'store',
    settings: 'settings',
    general: 'home',
    gst: 'landmark',
    'common-entries': 'layers',
    // Add more mappings as discovered
    filter: 'filter',
    x: 'x',
    plus: 'plus',
    'trash-2': 'trash-2',
    search: 'search',
    'chevrons-right': 'chevrons-right',
    'chevrons-left': 'chevrons-left',
    'help-circle': 'help-circle',
    command: 'command',
    database: 'database',
    flag: 'flag',
    star: 'star',
    coins: 'coins',
    info: 'info',
  };
  return mapping[name] ?? name;
}
</script>

<template>
  <LucideIcon
    :name="getLucideIconName(props.name)"
    :size="props.size"
    :color="props.color"
    :stroke-width="props.strokeWidth"
    :default-class="props.defaultClass"
  />
</template>
