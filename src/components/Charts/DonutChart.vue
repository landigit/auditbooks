<template>
  <div>
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <path
        v-for="[i, theta, start] in thetasAndStarts"
        :key="i"
        :d="getArcPath(cx, cy, radius, start, theta)"
        :fill="getSectorColor(i)"
        @click="$emit('change', i)"
        :class="{ 'opacity-50': active !== null && active !== i }"
        class="cursor-pointer transition-opacity duration-300"
      />
      <text
        :x="50 + textOffsetX"
        :y="50 + textOffsetY"
        text-anchor="middle"
        class="text-sm font-bold select-none"
        :fill="darkMode ? '#F9FAFB' : '#111827'"
      >
        {{ totalLabel }}
      </text>
      <text
        :x="50 + textOffsetX"
        :y="55 + textOffsetY"
        text-anchor="middle"
        class="text-lg font-bold select-none"
        :fill="darkMode ? '#F9FAFB' : '#111827'"
      >
        {{ valueFormatter(totalValue) }}
      </text>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

defineOptions({
  name: 'DonutChart',
});

const props = withDefaults(
  defineProps<{
    sectors?: { value: number; color: { color: string; darkColor: string } }[];
    totalLabel?: string;
    radius?: number;
    startAngle?: number;
    thickness?: number;
    active?: number | null;
    valueFormatter?: (v: number) => string;
    offsetX?: number;
    offsetY?: number;
    textOffsetX?: number;
    textOffsetY?: number;
    darkMode?: boolean;
  }>(),
  {
    sectors: () => [],
    totalLabel: 'Total',
    radius: 36,
    startAngle: Math.PI,
    thickness: 10,
    active: null,
    valueFormatter: (v: number) => v.toString(),
    offsetX: 0,
    offsetY: 0,
    textOffsetX: 0,
    textOffsetY: 0,
    darkMode: false,
  }
);

defineEmits(['change']);

const cx = computed(() => 50 + props.offsetX);
const cy = computed(() => 50 + props.offsetY);

const totalValue = computed(() => {
  return props.sectors.map(({ value }) => value).reduce((a, b) => a + b, 0);
});

const thetasAndStarts = computed(() => {
  const thetas = props.sectors
    .map(({ value }, i) => ({
      value: (2 * Math.PI * value) / totalValue.value,
      filterOut: value !== 0,
      i,
    }))
    .filter(({ filterOut }) => filterOut);

  const starts = [...thetas.map(({ value }) => value)];
  starts.forEach((_, i) => {
    if (i > 0) starts[i] += starts[i - 1];
  });

  starts.unshift(0);
  starts.pop();

  return thetas.map((t, i) => [t.i, t.value, starts[i]]);
});

function getArcPath(
  cx: number,
  cy: number,
  r: number,
  start: number,
  theta: number
) {
  start += props.startAngle;
  const startX = cx + r * Math.cos(start);
  const startY = cy + r * Math.sin(start);
  const endX = cx + r * Math.cos(start + theta);
  const endY = cy + r * Math.sin(start + theta);
  const largeArcFlag = theta > Math.PI ? 1 : 0;
  const sweepFlag = 1;

  return `M ${startX} ${startY} A ${r} ${r} 0 ${largeArcFlag} ${sweepFlag} ${endX} ${endY}`;
}

function getSectorColor(index: number) {
  return props.darkMode
    ? props.sectors[index].color.darkColor
    : props.sectors[index].color.color;
}
</script>
