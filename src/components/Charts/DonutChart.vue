<template>
  <div>
    <svg
      version="1.1"
      viewBox="0 0 100 100"
      @mouseleave="emit('change', null)"
    >
      <defs>
        <clipPath id="donut-hole">
          <circle
            :cx="cx"
            :cy="cy"
            :r="radius + thickness / 2"
            fill="black"
            stroke-width="0"
          />
        </clipPath>
      </defs>
      <circle
        v-if="thetasAndStarts.length === 1 || thetasAndStarts.length === 0"
        clip-path="url(#donut-hole)"
        :cx="cx"
        :cy="cy"
        :r="radius"
        :stroke-width="
          thickness +
          (hasNonZeroValues && active === thetasAndStarts[0]?.[0] ? 4 : 0)
        "
        :stroke="
          hasNonZeroValues && thetasAndStarts[0]
            ? sectors[thetasAndStarts[0][0]].color
            : 'var(--color-chart-empty)'
        "
        :class="hasNonZeroValues ? 'sector' : ''"
        :style="{ transformOrigin: `${cx}px ${cy}px` }"
        fill="transparent"
        @mouseover="
          emit(
            'change',
            thetasAndStarts.length === 1 && thetasAndStarts[0] ? thetasAndStarts[0][0] : null
          )
        "
      />
      <template v-if="thetasAndStarts.length > 1">
        <path
          v-for="[i, theta, start_] in thetasAndStarts"
          :key="i"
          clip-path="url(#donut-hole)"
          :d="getArcPath(cx, cy, radius, start_, theta)"
          :stroke="getSectorColor(i)"
          :stroke-width="thickness + (active === i ? 4 : 0)"
          :style="{ transformOrigin: `${cx}px ${cy}px` }"
          class="sector"
          fill="transparent"
          @mouseover="emit('change', i)"
        />
      </template>
      <text
        :x="cx"
        :y="cy"
        text-anchor="middle"
        :style="{
          fontSize: '6px',
          fontWeight: 'bold',
          fill: 'currentColor',
        }"
      >
        {{
          valueFormatter(
            active !== null && sectors.length !== 0 && sectors[active]
              ? sectors[active].value
              : totalValue
          )
        }}
      </text>
      <text
        :x="cx"
        :y="cy + 8"
        text-anchor="middle"
        style="font-size: 5px; fill: currentColor"
        class="text-description"
      >
        {{
          active !== null && sectors.length !== 0 && sectors[active]
            ? sectors[active].label
            : totalLabel
        }}
      </text>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Sector {
  value: number;
  label: string;
  color: string;
}

const props = withDefaults(
  defineProps<{
    sectors?: Sector[];
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
  }
);

const emit = defineEmits<{
  (e: 'change', active: number | null): void;
}>();

const cx = computed(() => 50 + props.offsetX);
const cy = computed(() => 50 + props.offsetY);

const totalValue = computed(() =>
  props.sectors.map(({ value }) => value).reduce((a, b) => a + b, 0)
);

const thetasAndStarts = computed<[number, number, number][]>(() => {
  const total = totalValue.value;
  if (total === 0) {
    return [];
  }
  const thetas = props.sectors
    .map(({ value }, i) => ({
      value: (2 * Math.PI * value) / total,
      filterOut: value !== 0,
      i,
    }))
    .filter(({ filterOut }) => filterOut);

  const starts = [...thetas.map(({ value }) => value)];
  starts.forEach((_, i) => {
    starts[i] += starts[i - 1] ?? 0;
  });

  starts.unshift(0);
  starts.pop();

  return thetas.map((t, i) => [t.i, t.value, starts[i]]);
});

const hasNonZeroValues = computed(() =>
  thetasAndStarts.value.some((t) => props.sectors[t[0]]?.value !== 0)
);

function getArcPath(
  cxVal: number,
  cyVal: number,
  rVal: number,
  startVal: number,
  thetaVal: number
): string {
  const start = startVal + props.startAngle;
  const startX = cxVal + rVal * Math.cos(start);
  const startY = cyVal + rVal * Math.sin(start);
  const endX = cxVal + rVal * Math.cos(start + thetaVal);
  const endY = cyVal + rVal * Math.sin(start + thetaVal);
  const largeArcFlag = thetaVal > Math.PI ? 1 : 0;
  const sweepFlag = 1;

  return `M ${startX} ${startY} A ${rVal} ${rVal} 0 ${largeArcFlag} ${sweepFlag} ${endX} ${endY}`;
}

function getSectorColor(index: number): string {
  return props.sectors[index]?.color ?? '';
}
</script>

<style scoped>
.sector {
  transition: 100ms stroke-width ease-out;
}
</style>
