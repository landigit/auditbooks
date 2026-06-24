<template>
  <div>
    <svg
      ref="chartSvg"
      :viewBox="`0 0 ${viewBoxWidth} ${viewBoxHeight}`"
      xmlns="http://www.w3.org/2000/svg"
      @mousemove="update"
    >
      <!-- x Grid Lines -->
      <path
        v-if="drawXGrid"
        :d="xGrid"
        :stroke="gridColor"
        :stroke-width="gridThickness"
        stroke-linecap="round"
        fill="transparent"
      />

      <!-- Axis -->
      <path
        v-if="drawAxis"
        :d="axis"
        :stroke-width="axisThickness"
        :stroke="axisColor"
        fill="transparent"
      />

      <!-- x Labels -->
      <template v-if="drawLabels && xLabels.length > 0">
        <text
          v-for="(i, j) in count"
          :key="j + '-xlabels'"
          :style="fontStyle"
          :y="
            viewBoxHeight -
            axisPadding +
            yLabelOffset +
            fontStyle.fontSize / 2 -
            bottom
          "
          :x="xs[i - 1]"
          text-anchor="middle"
        >
          {{ formatX(xLabels[i - 1] || '') }}
        </text>
      </template>

      <!-- y Labels -->
      <template v-if="drawLabels && yLabelDivisions > 0">
        <text
          v-for="(i, j) in yLabelDivisions + 1"
          :key="j + '-ylabels'"
          :style="fontStyle"
          :y="yScalerLocation(i - 1)"
          :x="axisPadding - xLabelOffset + left"
          text-anchor="end"
        >
          {{ yScalerValue(i - 1) }}
        </text>
      </template>

      <!-- Gradient Mask -->
      <defs>
        <linearGradient id="grad" x1="0" y1="0" x2="0" y2="85%">
          <stop offset="0%" stop-color="rgba(255, 255, 255, 0.5)" />
          <stop offset="40%" stop-color="rgba(255, 255, 255, 0.1)" />
          <stop offset="70%" stop-color="rgba(255, 255, 255, 0)" />
        </linearGradient>

        <mask v-for="(i, j) in num" :id="'rect-mask-' + i" :key="j + '-mask'">
          <rect
            x="0"
            :y="gradY(j)"
            :height="viewBoxHeight - gradY(j)"
            width="100%"
            fill="url('#grad')"
          />
        </mask>
      </defs>

      <g v-for="(i, j) in num" :key="j + '-gpath'">
        <!-- Gradient Paths -->
        <path
          stroke-linejoin="round"
          :d="getGradLine(i - 1)"
          :stroke-width="thickness"
          stroke-linecap="round"
          :fill="colors[i - 1] || getRandomColor()"
          :mask="`url('#rect-mask-${i}')`"
        />

        <!-- Lines -->
        <path
          stroke-linejoin="round"
          :d="getLine(i - 1)"
          :stroke="colors[i - 1] || getRandomColor()"
          :stroke-width="thickness"
          stroke-linecap="round"
          fill="transparent"
        />
      </g>

      <!-- Tooltip Reference -->
      <circle
        v-if="xi > -1 && yi > -1"
        r="12"
        :cx="cx"
        :cy="cy"
        :fill="colors[yi]"
        style="
          filter: brightness(115%) drop-shadow(0px 2px 3px rgba(0, 0, 0, 0.25));
        "
      />
    </svg>
    <Tooltip
      v-if="showTooltip"
      ref="tooltip"
      :offset="15"
      placement="top"
      class="text-sm shadow-md px-2 py-1 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-200 border-s-4"
      :style="{ borderColor: colors[yi] }"
    >
      <div class="flex flex-col justify-center items-center">
        <p>
          {{ xi > -1 ? formatX(xLabels[xi]) : '' }}
        </p>
        <p class="font-semibold">
          {{ yi > -1 ? format(points[yi][xi]) : '' }}
        </p>
      </div>
    </Tooltip>
  </div>
</template>
<script setup lang="ts">
import { ref, computed } from 'vue';
import { euclideanDistance, prefixFormat } from 'src/utils/chart';
import Tooltip from '../Tooltip.vue';

const props = withDefaults(
  defineProps<{
    colors?: string[];
    xLabels?: any[];
    yLabelDivisions?: number;
    points?: number[][];
    drawAxis?: boolean;
    drawXGrid?: boolean;
    drawLabels?: boolean;
    viewBoxHeight?: number;
    aspectRatio?: number;
    axisPadding?: number;
    pointsPadding?: number;
    xLabelOffset?: number;
    yLabelOffset?: number;
    gridColor?: string;
    axisColor?: string;
    thickness?: number;
    axisThickness?: number;
    gridThickness?: number;
    yMin?: number | null;
    yMax?: number | null;
    format?: (n: number) => string;
    formatY?: (n: number) => string;
    formatX?: (v: any) => any;
    fontSize?: number;
    fontColor?: string;
    bottom?: number;
    left?: number;
    extendGridX?: number;
    tooltipDispDistThreshold?: number;
    showTooltip?: boolean;
  }>(),
  {
    colors: () => [],
    xLabels: () => [],
    yLabelDivisions: 4,
    points: () => [[]],
    drawAxis: false,
    drawXGrid: true,
    drawLabels: true,
    viewBoxHeight: 500,
    aspectRatio: 4,
    axisPadding: 30,
    pointsPadding: 24,
    xLabelOffset: 20,
    yLabelOffset: 5,
    gridColor: 'rgba(0, 0, 0, 0.2)',
    axisColor: 'rgba(0, 0, 0, 0.5)',
    thickness: 5,
    axisThickness: 1,
    gridThickness: 0.5,
    yMin: null,
    yMax: null,
    format: (n: number) => n.toFixed(1),
    formatY: prefixFormat,
    formatX: (v: any) => v,
    fontSize: 20,
    fontColor: '#415668',
    bottom: 0,
    left: 55,
    extendGridX: -20,
    tooltipDispDistThreshold: 40,
    showTooltip: true,
  }
);

const cx = ref(-1);
const cy = ref(-1);
const xi = ref(-1);
const yi = ref(-1);

const chartSvg = ref<SVGGraphicsElement | null>(null);
const tooltip = ref<InstanceType<typeof Tooltip> | null>(null);

const fontStyle = computed(() => {
  return { fontSize: props.fontSize, fill: props.fontColor };
});

const viewBoxWidth = computed(() => {
  return props.aspectRatio * props.viewBoxHeight;
});

const num = computed(() => {
  return props.points.length;
});

const count = computed(() => {
  return Math.max(...props.points.map((p) => p.length));
});

const padding = computed(() => {
  return props.axisPadding + props.pointsPadding;
});

const xs = computed(() => {
  return Array(count.value)
    .fill(undefined)
    .map(
      (_, i) =>
        padding.value +
        props.left +
        (i * (viewBoxWidth.value - props.left - 2 * padding.value)) /
          (count.value - 1 || 1)
    );
});

const min = computed(() => {
  return Math.min(...props.points.flat());
});

const max = computed(() => {
  return Math.max(...props.points.flat());
});

const hMin = computed(() => {
  return Math.min(props.yMin ?? min.value, 0);
});

const hMax = computed(() => {
  let hMaxVal = Math.max(props.yMax ?? max.value, 0);
  if (hMaxVal === hMin.value) {
    return hMaxVal + 1000;
  }
  return hMaxVal;
});

const ys = computed(() => {
  const minVal = hMin.value;
  const maxVal = hMax.value;
  return props.points.map((pp) =>
    pp.map(
      (p) =>
        padding.value +
        (1 - (p - minVal) / (maxVal - minVal)) *
          (props.viewBoxHeight - 2 * padding.value - props.bottom)
    )
  );
});

const xy = computed(() => {
  return xs.value.map(
    (x, i) => [x, ys.value.map((y) => y[i])] as [number, number[]]
  );
});

const axis = computed(() => {
  return `M ${props.axisPadding + props.left} ${props.axisPadding} V ${
    props.viewBoxHeight - props.axisPadding - props.bottom
  } H ${viewBoxWidth.value - props.axisPadding}`;
});

const xLims = computed(() => {
  const l = padding.value + props.left;
  const r = viewBoxWidth.value - padding.value;
  return { l, r };
});

const xGrid = computed(() => {
  const { l, r } = xLims.value;
  const lo = l + props.extendGridX;
  const ro = r - props.extendGridX;
  const gridYs = Array(props.yLabelDivisions + 1)
    .fill(undefined)
    .map((_, i) => yScalerLocation(i));
  return gridYs.map((y) => `M ${lo} ${y} H ${ro}`).join(' ');
});

function yScalerLocation(i: number) {
  return (
    ((props.yLabelDivisions - i) *
      (props.viewBoxHeight - padding.value * 2 - props.bottom)) /
      props.yLabelDivisions +
    padding.value
  );
}

function yScalerValue(i: number) {
  const minVal = hMin.value;
  const maxVal = hMax.value;
  return props.formatY(
    (i * (maxVal - minVal)) / props.yLabelDivisions + minVal
  );
}

function getLine(i: number) {
  const firstPoint = xy.value[0];
  if (!firstPoint) return '';
  const [x, y] = firstPoint;
  let d = `M ${x} ${y[i]} `;
  xy.value.slice(1).forEach(([xVal, yVal]) => {
    d += `L ${xVal} ${yVal[i]} `;
  });
  return d;
}

function getGradLine(i: number) {
  let bo = props.viewBoxHeight - padding.value - props.bottom;
  let d = `M ${padding.value + props.left} ${bo}`;
  xy.value.forEach(([x, y]) => {
    d += `L ${x} ${y[i]} `;
  });
  return d + ` V ${bo} Z`;
}

function gradY(i: number) {
  if (ys.value[i] === undefined) return 0;
  return Math.min(...ys.value[i]);
}

function getRandomColor() {
  const rgb = Array(3)
    .fill(undefined)
    .map(() => Math.floor(Math.random() * 255))
    .join(',');
  return `rgb(${rgb})`;
}

function getSvgXY({ clientX, clientY }: { clientX: number; clientY: number }) {
  if (!chartSvg.value) return { x: 0, y: 0 };
  const screenCTM = chartSvg.value.getScreenCTM();
  if (!screenCTM) return { x: 0, y: 0 };
  const inv = screenCTM.inverse();
  const point = new DOMPoint(clientX, clientY);
  const { x, y } = point.matrixTransform(inv);
  return { x, y };
}

function getPointIndexAndCoords(x: number, y: number) {
  const { l, r } = xLims.value;
  const xiVal = Math.round((x - l) / ((r - l) / (count.value - 1)));
  if (xiVal < 0 || xiVal > count.value - 1) {
    return {
      d: props.tooltipDispDistThreshold + 1,
      xi: -1,
      yi: -1,
      cx: -1,
      cy: -1,
    };
  }
  const px = xs.value[xiVal];
  const pys = ys.value.map((yarr) => yarr[xiVal]);
  const dists = pys.map((py) => euclideanDistance(x, y, px, py));
  const minDist = Math.min(...dists);
  const yiVal =
    dists
      .map((j, idx) => [j - minDist, idx])
      .filter(([j, _]) => j === 0)
      .at(-1)?.[1] ?? 0;
  return { xi: xiVal, yi: yiVal, cx: px, cy: pys[yiVal], d: minDist };
}

function update(event: MouseEvent) {
  if (!props.showTooltip) {
    return;
  }

  const { x, y } = getSvgXY(event);
  const res = getPointIndexAndCoords(x, y);

  if (res.d > props.tooltipDispDistThreshold) {
    xi.value = -1;
    yi.value = -1;
    cx.value = -1;
    cy.value = -1;
    tooltip.value?.destroy();
    return;
  }
  tooltip.value?.create();

  xi.value = res.xi;
  yi.value = res.yi;
  cx.value = res.cx;
  cy.value = res.cy;
  tooltip.value?.update(event);
}
</script>
