<template>
  <div>
    <svg
      ref="chartSvg"
      :viewBox="`0 0 ${viewBoxWidth} ${viewBoxHeight}`"
      xmlns="http://www.w3.org/2000/svg"
      class="w-full h-auto"
    >
      <!-- x Grid Lines -->
      <path
        v-if="drawXGrid"
        :d="xGrid"
        :stroke="gridColor"
        class="text-border"
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
          class="text-description"
          :y="
            viewBoxHeight -
            axisPadding +
            yLabelOffset +
            props.fontSize / 2 -
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
        @mouseenter="(e) => create(rec.xi, rec.yi, e)"
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
        @mouseenter="(e) => create(rec.xi, rec.yi, e)"
        @mousemove="update"
        @mouseleave="destroy"
      />
    </svg>
    <Tooltip
      ref="tooltip"
      :offset="15"
      placement="top"
      class="text-sm shadow-md px-2 py-1 bg-surface text-main border-s-4"
      :style="{ borderColor: activeColor }"
    >
      <div class="flex flex-col justify-center items-center">
        <p>
          {{ xi > -1 ? formatX(xLabels[xi] as string) : '' }}
        </p>
        <p class="font-semibold">
          {{ yi > -1 && xi > -1 ? format(points[yi]?.[xi] as number) : '' }}
        </p>
      </div>
    </Tooltip>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onDeactivated } from 'vue';
import { prefixFormat } from 'src/utils/api/chart';
import { Tooltip } from 'src/components/ui';

interface ColorOption {
  positive: string;
  negative: string;
}

const props = withDefaults(
  defineProps<{
    skipXLabel?: number;
    colors?: (string | ColorOption)[];
    xLabels?: string[];
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
    formatY?: (v: number) => string;
    formatX?: (v: string) => string;
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
    gridColor: 'currentColor',
    zeroLineColor: 'currentColor',
    axisColor: 'currentColor',
    axisThickness: 1,
    gridThickness: 0.5,
    yMin: null,
    yMax: null,
    format: (n: number) => n.toFixed(1),
    formatY: prefixFormat,
    formatX: (v: string) => v,
    fontSize: 22,
    fontColor: 'currentColor',
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
const activeColor = ref('transparent');
const tooltip = ref<InstanceType<typeof Tooltip> | null>(null);

onDeactivated(() => {
  xi.value = -1;
  yi.value = -1;
  tooltip.value?.destroy();
});

const fontStyle = computed(() => ({
  fontSize: `${props.fontSize}px`,
  fill: props.fontColor,
}));

const viewBoxWidth = computed(() => props.aspectRatio * props.viewBoxHeight);

const num = computed(() => props.points.length);

const count = computed(() => Math.max(...props.points.map((p) => p.length), 0));

const xs = computed(() => {
  const cnt = count.value;
  return Array(cnt)
    .fill(0)
    .map(
      (_, i) =>
        padding.value +
        props.left +
        (i * (viewBoxWidth.value - props.left - 2 * padding.value)) /
          (cnt - 1 || 1)
    );
});

const z = computed(() => getViewBoxY(0));

const ys = computed(() => props.points.map((pp) => pp.map(getViewBoxY)));

const xy = computed<[number, number[]][]>(() =>
  xs.value.map((x, i) => [x, ys.value.map((y) => y[i] ?? 0)])
);

const min = computed(() => Math.min(...props.points.flat(), 0));
const max = computed(() => Math.max(...props.points.flat(), 0));

const axis = computed(
  () =>
    `M ${props.axisPadding + props.left} ${props.axisPadding} V ${
      props.viewBoxHeight - props.axisPadding - props.bottom
    } H ${viewBoxWidth.value - props.axisPadding}`
);

const padding = computed(() => props.axisPadding + props.pointsPadding);

const xLims = computed(() => {
  const l = padding.value + props.left;
  const r = viewBoxWidth.value - padding.value;
  return { l, r };
});

const xGrid = computed(() => {
  const { l, r } = xLims.value;
  const lo = l + props.extendGridX;
  const ro = r - props.extendGridX;
  const yScales = Array(props.yLabelDivisions + 1)
    .fill(0)
    .map((_, i) => yScalerLocation(i));
  return yScales.map((y) => `M ${lo} ${y} H ${ro}`).join(' ');
});

const zLine = computed(() => {
  const { l, r } = xLims.value;
  const lo = l + props.extendGridX;
  const ro = r - props.extendGridX;
  return `M ${lo} ${z.value} H ${ro}`;
});

interface RectInfo {
  x: number;
  y: number;
  height: number;
  color: string;
  isPositive: boolean;
  xi: number;
  yi: number;
}

const rects = computed<RectInfo[][]>(() =>
  xy.value.map(([x, yValues], i) => yValues.map((y, j) => getRect(x, y, i, j)))
);

const positiveRects = computed(() =>
  rects.value.flat().filter(({ isPositive }) => isPositive)
);

const negativeRects = computed(() =>
  rects.value.flat().filter(({ isPositive }) => !isPositive)
);

const hMin = computed(() => Math.min(props.yMin ?? min.value, 0));

const hMax = computed(() => {
  const hMaxVal = Math.max(props.yMax ?? max.value, 0);
  if (hMaxVal === hMin.value) {
    return hMaxVal + 1000;
  }
  return hMaxVal;
});

function getViewBoxY(value: number): number {
  const minVal = hMin.value;
  const maxVal = hMax.value;
  let percent = 1 - (value - minVal) / (maxVal - minVal);
  if (percent === -Infinity || isNaN(percent)) {
    percent = 0;
  }
  return (
    padding.value +
    percent * (props.viewBoxHeight - 2 * padding.value - props.bottom)
  );
}

function getRect(px: number, py: number, i: number, j: number): RectInfo {
  const isPositive = py <= z.value;
  const x = px - (props.width * num.value) / 2 + j * props.width;
  const y = isPositive ? py : z.value - props.radius;
  const h = Math.abs(py - z.value);
  const height = h + props.radius;
  const color = getColor(j, isPositive);
  return { x, y, height, color, isPositive, xi: i, yi: j };
}

function getColor(j: number, isPositive: boolean): string {
  if (props.colors.length > 0) {
    const c = props.colors[j];
    if (typeof c === 'string') {
      return c;
    }
    if (c && typeof c === 'object') {
      return isPositive ? c.positive : c.negative;
    }
  }
  return getRandomColor();
}

function yScalerLocation(i: number): number {
  return (
    ((props.yLabelDivisions - i) *
      (props.viewBoxHeight - padding.value * 2 - props.bottom)) /
      props.yLabelDivisions +
    padding.value
  );
}

function yScalerValue(i: number): string {
  const minVal = hMin.value;
  const maxVal = hMax.value;
  return props.formatY(
    (i * (maxVal - minVal)) / props.yLabelDivisions + minVal
  );
}

function getRandomColor(): string {
  const rgb = Array(3)
    .fill(0)
    .map(() => Math.floor(Math.random() * 255))
    .join(',');
  return `rgb(${rgb})`;
}

function create(xiVal: number, yiVal: number, event: MouseEvent) {
  xi.value = xiVal;
  yi.value = yiVal;
  const pointVal = props.points[yiVal]?.[xiVal] ?? 0;
  activeColor.value = getColor(yiVal, pointVal > 0);
  tooltip.value?.create(event);
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
