<template>
  <div>
    <svg
      ref="chartSvg"
      :viewBox="`0 0 ${viewBoxWidth} ${viewBoxHeight}`"
      xmlns="http://www.w3.org/2000/svg"
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

      <!-- zero line -->
      <path
        v-if="drawZeroLine"
        :d="zLine"
        :stroke="zeroLineColor"
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
      <template v-if="xLabels.length > 0">
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
          {{ j % skipXLabel === 0 ? formatX(xLabels[i - 1] || '') : '' }}
        </text>
      </template>

      <!-- y Labels -->
      <template v-if="yLabelDivisions > 0">
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

      <defs>
        <clipPath id="positive-rect-clip">
          <rect x="0" y="0" :width="viewBoxWidth" :height="z" />
        </clipPath>
        <clipPath id="negative-rect-clip">
          <rect
            x="0"
            :y="z"
            :width="viewBoxWidth"
            :height="viewBoxHeight - z"
          />
        </clipPath>
      </defs>

      <rect
        v-for="(rec, i) in positiveRects"
        :key="i + 'prec'"
        :rx="radius"
        :ry="radius"
        :x="rec.x"
        :y="rec.y"
        :width="width"
        :height="rec.height"
        :fill="rec.color"
        clip-path="url(#positive-rect-clip)"
        @mouseenter="() => create(rec.xi, rec.yi)"
        @mousemove="update"
        @mouseleave="destroy"
      />

      <rect
        v-for="(rec, i) in negativeRects"
        :key="i + 'nrec'"
        :rx="radius"
        :ry="radius"
        :x="rec.x"
        :y="rec.y"
        :width="width"
        :height="rec.height"
        :fill="rec.color"
        clip-path="url(#negative-rect-clip)"
        @mouseenter="() => create(rec.xi, rec.yi)"
        @mousemove="update"
        @mouseleave="destroy"
      />
    </svg>
    <Tooltip
      ref="tooltip"
      :offset="15"
      placement="top"
      class="text-sm shadow-md px-2 py-1 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-200 border-s-4"
      :style="{ borderColor: activeColor }"
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
import { prefixFormat } from 'src/utils/chart';
import Tooltip from '../Tooltip.vue';

const props = withDefaults(
  defineProps<{
    skipXLabel?: number;
    colors?: any[];
    xLabels?: any[];
    yLabelDivisions?: number;
    points?: number[][];
    drawAxis?: boolean;
    drawXGrid?: boolean;
    viewBoxHeight?: number;
    aspectRatio?: number;
    axisPadding?: number;
    pointsPadding?: number;
    xLabelOffset?: number;
    yLabelOffset?: number;
    gridColor?: string;
    zeroLineColor?: string;
    axisColor?: string;
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
    width?: number;
    left?: number;
    radius?: number;
    extendGridX?: number;
    tooltipDispDistThreshold?: number;
    drawZeroLine?: boolean;
  }>(),
  {
    skipXLabel: 2,
    colors: () => [],
    xLabels: () => [],
    yLabelDivisions: 4,
    points: () => [[]],
    drawAxis: false,
    drawXGrid: true,
    viewBoxHeight: 500,
    aspectRatio: 2.1,
    axisPadding: 30,
    pointsPadding: 40,
    xLabelOffset: 20,
    yLabelOffset: 0,
    gridColor: 'rgba(0, 0, 0, 0.2)',
    zeroLineColor: 'rgba(0, 0, 0, 0.2)',
    axisColor: 'rgba(0, 0, 0, 0.5)',
    axisThickness: 1,
    gridThickness: 0.5,
    yMin: null,
    yMax: null,
    format: (n: number) => n.toFixed(1),
    formatY: prefixFormat,
    formatX: (v: any) => v,
    fontSize: 22,
    fontColor: '#415668',
    bottom: 0,
    width: 28,
    left: 65,
    radius: 17,
    extendGridX: -20,
    tooltipDispDistThreshold: 20,
    drawZeroLine: true,
  }
);

const xi = ref(-1);
const yi = ref(-1);
const activeColor = ref('rgba(0, 0, 0, 0.2)');

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

function getViewBoxY(value: number) {
  const minVal = hMin.value;
  const maxVal = hMax.value;
  let percent = 1 - (value - minVal) / (maxVal - minVal);
  if (percent === -Infinity) {
    percent = 0;
  }
  return (
    padding.value +
    percent * (props.viewBoxHeight - 2 * padding.value - props.bottom)
  );
}

const z = computed(() => {
  return getViewBoxY(0);
});

const ys = computed(() => {
  return props.points.map((pp) => pp.map(getViewBoxY));
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

const zLine = computed(() => {
  const { l, r } = xLims.value;
  const lo = l + props.extendGridX;
  const ro = r - props.extendGridX;
  return `M ${lo} ${z.value} H ${ro}`;
});

function getRect(px: number, py: number, i: number, j: number) {
  const isPositive = py <= z.value;
  const x = px - (props.width * num.value) / 2 + j * props.width;
  const y = isPositive ? py : z.value - props.radius;
  const h = Math.abs(py - z.value);
  const height = h + props.radius;
  const color = getColor(j, isPositive);
  return { x, y, height, color, isPositive, xi: i, yi: j };
}

const rects = computed(() => {
  return xy.value.map(([x, ysVal], i) =>
    ysVal.map((y, j) => getRect(x, y, i, j))
  );
});

const positiveRects = computed(() => {
  return rects.value.flat().filter(({ isPositive }) => isPositive);
});

const negativeRects = computed(() => {
  return rects.value.flat().filter(({ isPositive }) => !isPositive);
});

function getColor(j: number, isPositive: boolean) {
  if (props.colors.length > 0) {
    const c = props.colors[j];
    return typeof c === 'string' ? c : c[isPositive ? 'positive' : 'negative'];
  }
  return getRandomColor();
}

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

function getRandomColor() {
  const rgb = Array(3)
    .fill(undefined)
    .map(() => Math.floor(Math.random() * 255))
    .join(',');
  return `rgb(${rgb})`;
}

function create(xiVal: number, yiVal: number) {
  xi.value = xiVal;
  yi.value = yiVal;
  activeColor.value = getColor(yiVal, props.points[yiVal]?.[xiVal] > 0);
  tooltip.value?.create();
}

function update(event: MouseEvent) {
  tooltip.value?.update(event);
}

function destroy() {
  xi.value = -1;
  yi.value = -1;
  tooltip.value?.destroy();
}
</script>

<style scoped>
rect:hover {
  filter: brightness(105%);
}
</style>
