<template>
  <view v-if="!isLynx">
    <view class="flex flex-col h-full">
      <SectionHeader>
        <template #title>{{ t`Profit and Loss` }}</template>
        <template #action>
          <PeriodSelector
            :value="period"
            :options="periodOptions"
            @change="(value) => (period = value)"
          />
        </template>
      </SectionHeader>
      <BarChart
        v-if="hasData"
        class="mt-4"
        :aspect-ratio="2.05"
        :colors="chartData.colors"
        :grid-color="chartData.gridColor"
        :font-color="chartData.fontColor"
        :points="chartData.points"
        :x-labels="chartData.xLabels"
        :format="chartData.format"
        :format-x="chartData.formatX"
        :y-max="chartData.yMax"
        :y-min="chartData.yMin"
      />
      <view v-else class="flex-1 w-full h-full flex-center my-20">
        <text class="text-base text-description">
          {{ t`No transactions yet` }}
        </text>
      </view>
    </view>
  </view>
  <view v-else class="p-4 bg-canvas rounded-xl mb-4 border border-border">
    <!-- Header -->
    <view class="flex-row justify-between items-center mb-3">
      <text class="text-sm font-semibold text-main">{{ t`Profit and Loss` }}</text>
      <PeriodSelector
        :value="period"
        :options="periodOptions"
        @change="(value) => (period = value)"
      />
    </view>

    <!-- Profit & Loss Cards -->
    <view class="flex-row gap-3 mb-4">
      <view class="flex-1 p-3 rounded-lg bg-canvas-muted border border-border">
        <text class="text-xs text-description mb-1">{{ t`Income` }}</text>
        <text class="text-base font-bold text-success">{{ chartData.format(totalIncome) }}</text>
      </view>
      <view class="flex-1 p-3 rounded-lg bg-canvas-muted border border-border">
        <text class="text-xs text-description mb-1">{{ t`Expense` }}</text>
        <text class="text-base font-bold text-danger">{{ chartData.format(totalExpense) }}</text>
      </view>
    </view>

    <!-- Net Profit -->
    <view
      class="p-3 rounded-lg bg-canvas-muted border border-border mb-4 flex-row justify-between items-center"
    >
      <text class="text-sm font-medium text-main">{{ t`Net Profit` }}</text>
      <text class="text-lg font-extrabold" :class="netProfit >= 0 ? 'text-success' : 'text-danger'">
        {{ chartData.format(netProfit) }}
      </text>
    </view>

    <!-- Monthly Profit/Loss breakdown list -->
    <view v-if="hasData && data && data.length" class="mt-2">
      <text class="text-xs font-semibold text-description mb-2">{{ t`Monthly Performance` }}</text>
      <view
        v-for="item in data"
        :key="item.yearmonth"
        class="flex-row justify-between py-2 border-b border-border"
      >
        <text class="text-sm text-main font-medium">{{ item.yearmonth }}</text>
        <text class="text-sm font-bold" :class="item.balance >= 0 ? 'text-success' : 'text-danger'">
          {{ chartData.format(item.balance) }}
        </text>
      </view>
    </view>

    <!-- Empty Message -->
    <view v-if="!hasData" class="flex-col items-center justify-center py-6">
      <text class="text-sm text-description">
        {{ t`No transactions yet` }}
      </text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch, onActivated } from "vue";
import BarChart from "src/components/Charts/BarChart.vue";
import { fyo } from "src/initFyo";
import { t } from "fyo";
import { formatXLabels, getYMax, getYMin } from "src/utils/chart";
import { getDatesAndPeriodList } from "src/utils/misc";
import { getValueMapFromList } from "utils";
import PeriodSelector from "./PeriodSelector.vue";
import SectionHeader from "./SectionHeader.vue";
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

// State definition
const data = ref<{ yearmonth: string; balance: number }[]>([]);
const totalIncome = ref(0);
const totalExpense = ref(0);
const hasData = ref(false);
const period = ref<PeriodKey>("This Year");
const periodOptions: PeriodKey[] = ["This Year", "This Quarter", "YTD"];

// Computed Properties
const netProfit = computed(() => {
  return totalIncome.value - totalExpense.value;
});

// Methods
const setData = async () => {
  const { fromDate, toDate, periodList } = getDatesAndPeriodList(period.value);

  const res = await fyo.db.getIncomeAndExpenses(
    fromDate.format("YYYY-MM-DD"),
    toDate.format("YYYY-MM-DD"),
  );

  totalIncome.value = res.income.reduce((sum, item) => sum + (item.balance || 0), 0);
  totalExpense.value = res.expense.reduce((sum, item) => sum + (item.balance || 0), 0);

  const incomes = getValueMapFromList(res.income, "yearmonth", "balance");
  const expenses = getValueMapFromList(res.expense, "yearmonth", "balance");

  data.value = periodList.map((d) => {
    const key = d.format("YYYY-MM");
    const inc = incomes[key] ?? 0;
    const exp = expenses[key] ?? 0;
    return { yearmonth: key, balance: inc - exp };
  });
  hasData.value = res.income.length > 0 || res.expense.length > 0;
};

const periodChange = async () => {
  emit("period-change", period.value);
  await setData();
};

// Computed Properties
const chartData = computed(() => {
  const points = [data.value.map((d) => d.balance)];
  const colors = [
    {
      positive: "var(--chart-blue-main)",
      negative: "var(--chart-pink-main)",
    },
  ];
  const format = (value: number) => fyo.format(value ?? 0, "Currency");
  const yMax = getYMax(points);
  const yMin = getYMin(points);
  return {
    xLabels: data.value.map((d) => d.yearmonth),
    points,
    format,
    colors,
    yMax,
    yMin,
    formatX: formatXLabels,
    gridColor: "var(--color-border)",
    fontColor: "var(--color-description)",
  };
});

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
onActivated(async () => {
  await setData();
});
</script>
