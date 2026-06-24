<template>
  <div>
    <svg
      version="1.1"
      viewBox="0 0 100 100"
      @mouseleave="$emit('change', null)"
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
          hasNonZeroValues ? getSectorColor(thetasAndStarts[0]?.[0]) : '#f4f4f6'
        "
        :class="hasNonZeroValues ? 'sector' : ''"
        :style="{ transformOrigin: `${cx}px ${cy}px` }"
        fill="transparent"
        @mouseover="
          $emit(
            'change',
            thetasAndStarts.length === 1 ? thetasAndStarts[0][0] : null
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
          @mouseover="$emit('change', i)"
        />
      </template>
      <text
        :x="cx"
        :y="cy"
        text-anchor="middle"
        :style="{
          fontSize: '6px',
          fontWeight: 'bold',
          fill: darkMode ? '#FFFFFF' : '#0f172a',
        }"
      >
        {{
          valueFormatter(
            active !== null && sectors.length !== 0
              ? sectors[active].value
              : totalValue,
            'Currency'
          )
        }}
      </text>
      <text
        :x="cx"
        :y="cy + 8"
        text-anchor="middle"
        :style="{
          fontSize: '5px',
          fill: darkMode ? '#94a3b8' : '#475569',
        }"
      >
        {{
          active !== null && sectors.length !== 0
            ? sectors[active].label
            : totalLabel
        }}
      </text>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

type Sector = {
  value: number;
  label: string;
  color: any;
};

const props = withDefaults(
  defineProps<{
    sectors?: Sector[];
    totalLabel?: string;
    radius?: number;
    startAngle?: number;
    thickness?: number;
    active?: number | null;
    valueFormatter?: (v: any, type?: string) => string;
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
    valueFormatter: (v: any) => v.toString(),
    offsetX: 0,
    offsetY: 0,
    textOffsetX: 0,
    textOffsetY: 0,
    darkMode: false,
  }
);

defineEmits<{
  (e: 'change', index: any): void;
}>();

const cx = computed(() => 50 + props.offsetX);
const cy = computed(() => 50 + props.offsetY);

const totalValue = computed(() => {
  return props.sectors.map(({ value }) => value).reduce((a, b) => a + b, 0);
});

const thetasAndStarts = computed(() => {
  const thetas = props.sectors
    .map(({ value }, i) => ({
      value:
        totalValue.value === 0 ? 0 : (2 * Math.PI * value) / totalValue.value,
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

  return thetas.map(
    (t, i) => [t.i, t.value, starts[i]] as [number, number, number]
  );
});

const hasNonZeroValues = computed(() => {
  return thetasAndStarts.value.some((t) => props.sectors[t[0]].value !== 0);
});

function getArcPath(...args: [number, number, number, number, number]) {
  let [cxVal, cyVal, rVal, startVal, thetaVal] = args.map(Number);

  startVal += Number(props.startAngle);
  const startX = cxVal + rVal * Math.cos(startVal);
  const startY = cyVal + rVal * Math.sin(startVal);
  const endX = cxVal + rVal * Math.cos(startVal + thetaVal);
  const endY = cyVal + rVal * Math.sin(startVal + thetaVal);
  const largeArcFlag = thetaVal > Math.PI ? 1 : 0;
  const sweepFlag = 1;

  return `M ${startX} ${startY} A ${rVal} ${rVal} 0 ${largeArcFlag} ${sweepFlag} ${endX} ${endY}`;
}

function getSectorColor(index: number) {
  if (index === undefined || !props.sectors[index]) return '#f4f4f6';
  const sector = props.sectors[index];
  if (props.darkMode) {
    return sector.color?.darkColor ?? sector.color ?? '#f4f4f6';
  } else {
    return sector.color?.color ?? sector.color ?? '#f4f4f6';
  }
}
</script>

<style scoped>
.sector {
  transition: 100ms stroke-width ease-out;
}
</style>
