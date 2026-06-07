<template>
  <view v-if="!isLynx">
    <view>
      <!-- Title and Period Selector -->
      <view class="flex items-center justify-between">
        <view class="font-semibold text-base text-main">
          {{ t`Cashflow` }}
        </view>

        <!-- Chart Legend -->
        <view v-if="hasData" class="flex text-base gap-8">
          <view class="flex items-center gap-2">
            <text class="w-3 h-3 rounded-sm inline-block bg-[var(--chart-blue-main)]" />
            <text class="text-main">{{ t`Inflow` }}</text>
          </view>
          <view class="flex items-center gap-2">
            <text class="w-3 h-3 rounded-sm inline-block bg-[var(--chart-pink-main)]" />
            <text class="text-main">{{ t`Outflow` }}</text>
          </view>
        </view>
        <view v-else class="w-16 h-5 bg-canvas-muted rounded" />

        <PeriodSelector
          v-if="hasData"
          :value="period"
          :options="periodOptions"
          @change="(value) => (period = value)"
        />
        <view v-else class="w-20 h-5 bg-canvas-muted rounded" />
      </view>

      <!-- Line Chart -->
      <LineChart
        v-if="chartData.points.length"
        class="mt-4"
        :aspect-ratio="aspectRatio"
        :colors="chartData.colors"
        :grid-color="chartData.gridColor"
        :font-color="chartData.fontColor"
        :points="chartData.points"
        :x-labels="chartData.xLabels"
        :format="chartData.format"
        :format-x="chartData.formatX"
        :y-max="chartData.yMax"
        :draw-labels="hasData"
        :show-tooltip="hasData"
      />
    </view>
  </view>
  <view v-else class="p-4 bg-canvas rounded-xl mb-4 border border-border">
    <view class="flex-row justify-between items-center mb-3">
      <text class="text-sm font-semibold text-main">{{ t`Cashflow` }}</text>
      <PeriodSelector
        :value="period"
        :options="periodOptions"
        @change="(value) => (period = value)"
      />
    </view>

    <!-- Cashflow summary cards -->
    <view class="flex-row gap-3 mb-4">
      <view class="flex-1 p-3 rounded-lg bg-canvas-muted border border-border">
        <text class="text-xs text-description mb-1">{{ t`Inflow` }}</text>
        <text class="text-base font-bold text-success">{{ chartData.format(totalInflow) }}</text>
      </view>
      <view class="flex-1 p-3 rounded-lg bg-canvas-muted border border-border">
        <text class="text-xs text-description mb-1">{{ t`Outflow` }}</text>
        <text class="text-base font-bold text-danger">{{ chartData.format(totalOutflow) }}</text>
      </view>
    </view>

    <view
      class="p-3 rounded-lg bg-canvas-muted border border-border mb-4 flex-row justify-between items-center"
    >
      <text class="text-sm font-medium text-main">{{ t`Net Cashflow` }}</text>
      <text
        class="text-lg font-extrabold"
        :class="netCashflow >= 0 ? 'text-success' : 'text-danger'"
      >
        {{ chartData.format(netCashflow) }}
      </text>
    </view>

    <!-- Monthly breakdown list -->
    <view v-if="data && data.length" class="mt-2">
      <text class="text-xs font-semibold text-description mb-2">{{ t`Monthly Breakdown` }}</text>
      <view
        v-for="item in data"
        :key="item.yearmonth"
        class="flex-row justify-between py-2 border-b border-border"
      >
        <text class="text-sm text-main font-medium">{{ item.yearmonth }}</text>
        <view class="flex-row gap-4">
          <text class="text-xs text-success font-semibold"
            >+{{ chartData.format(item.inflow) }}</text
          >
          <text class="text-xs text-danger font-semibold"
            >-{{ chartData.format(item.outflow) }}</text
          >
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, onActivated } from "vue";
import { AccountTypeEnum } from "models/baseModels/Account/types";
import { ModelNameEnum } from "models/types";
import LineChart from "src/components/Charts/LineChart.vue";
import { fyo } from "src/initFyo";
import { t } from "fyo";
import { formatXLabels, getYMax } from "src/utils/chart";
import { getDatesAndPeriodList } from "src/utils/misc";
import PeriodSelector from "./PeriodSelector.vue";
import { getMapFromList } from "utils/index";
import { PeriodKey } from "src/utils/types";
import { isLynx } from "src/utils/interactive";

// Define Props
const props = withDefaults(
  defineProps<{
    commonPeriod?: PeriodKey;
  }>(),
  {
    commonPeriod: "This Year",
  },
);

// Define Emits
const emit = defineEmits<{
  (e: "period-change", period: PeriodKey): void;
}>();

// Dummy data for when there's no real data
const dummyData = [
  { inflow: 100, outflow: 250, yearmonth: "2021-05" },
  { inflow: 350, outflow: 100, yearmonth: "2021-06" },
  { inflow: 50, outflow: 300, yearmonth: "2021-07" },
  { inflow: 320, outflow: 100, yearmonth: "2021-08" },
];

// State definition
const data = ref<{ inflow: number; outflow: number; yearmonth: string }[]>([]);
const period = ref<PeriodKey>("This Year");
const periodOptions: PeriodKey[] = ["This Year", "This Quarter", "YTD"];
const hasData = ref(false);
const aspectRatio = ref(4.15);

// Computed Properties
const totalInflow = computed(() => {
  return data.value.reduce((acc, curr) => acc + (curr.inflow || 0), 0);
});

const totalOutflow = computed(() => {
  return data.value.reduce((acc, curr) => acc + (curr.outflow || 0), 0);
});

const netCashflow = computed(() => {
  return totalInflow.value - totalOutflow.value;
});

const chartData = computed(() => {
  let displayData = data.value;
  let colors = ["var(--chart-blue-main)", "var(--chart-pink-main)"];
  if (!hasData.value) {
    displayData = dummyData;
    colors = ["var(--color-chart-empty)", "var(--color-chart-empty)"];
  }

  const xLabels = displayData.map((cf) => cf.yearmonth);
  const points = (["inflow", "outflow"] as const).map((k) => displayData.map((d) => d[k]));

  const format = (value: number) => fyo.format(value ?? 0, "Currency");
  const yMax = getYMax(points);
  return {
    points,
    xLabels,
    colors,
    format,
    yMax,
    formatX: formatXLabels,
    gridColor: "var(--color-border)",
    fontColor: "var(--color-description)",
  };
});

// Methods
const updateAspectRatio = () => {
  let width = 1024;
  if (typeof window !== "undefined") {
    width = window.innerWidth;
  } else if (typeof SystemInfo !== "undefined") {
    width = SystemInfo.pixelWidth / SystemInfo.pixelRatio;
  }
  aspectRatio.value = width < 768 ? 2.2 : 4.15;
};

const setData = async () => {
  const { periodList, fromDate, toDate } = getDatesAndPeriodList(period.value);

  const res = await fyo.db.getCashflow(fromDate.format("YYYY-MM-DD"), toDate.format("YYYY-MM-DD"));
  const dataMap = getMapFromList(res, "yearmonth");
  data.value = periodList.map((p) => {
    const key = p.format("YYYY-MM");
    const item = dataMap[key];
    if (item) {
      return item;
    }

    return {
      inflow: 0,
      outflow: 0,
      yearmonth: key,
    };
  });
};

const setHasData = async () => {
  const accounts = await fyo.db.getAllRaw("Account", {
    filters: {
      accountType: ["in", [AccountTypeEnum.Cash, AccountTypeEnum.Bank]],
    },
  });
  const accountNames = accounts.map((a) => a.name as string);
  const count = await fyo.db.count(ModelNameEnum.AccountingLedgerEntry, {
    filters: { account: ["in", accountNames] },
  });
  hasData.value = count > 0;
};

const periodChange = async () => {
  emit("period-change", period.value);
  await setData();
};

// Watchers
watch(period, async () => {
  await periodChange();
});

watch(
  () => props.commonPeriod,
  (val) => {
    if (!val || !periodOptions.includes(val)) {
      return;
    }
    period.value = val;
  },
);

// Lifecycle Hooks
onMounted(() => {
  updateAspectRatio();
  if (typeof window !== "undefined") {
    window.addEventListener("resize", updateAspectRatio);
  }
});

onUnmounted(() => {
  if (typeof window !== "undefined") {
    window.removeEventListener("resize", updateAspectRatio);
  }
});

onActivated(async () => {
  updateAspectRatio();
  await setData();
  if (!hasData.value) {
    await setHasData();
  }
});
</script>
