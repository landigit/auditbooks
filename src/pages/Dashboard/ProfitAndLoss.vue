<template>
  <div class="flex flex-col h-full">
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
    <div v-else class="flex-1 w-full h-full flex-center my-20">
      <span class="text-base text-description">
        {{ t`No transactions yet` }}
      </span>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, computed, watch, onActivated } from 'vue';
import BarChart from 'src/components/Charts/BarChart.vue';
import { fyo } from 'src/initFyo';
import { formatXLabels, getYMax, getYMin } from 'src/utils/api/chart.js';
import { getDatesAndPeriodList } from 'src/utils/api/misc.js';
import { getValueMapFromList } from 'src/utils/core/index.js';
import PeriodSelector from './PeriodSelector.vue';
import SectionHeader from './SectionHeader.vue';
import { PeriodKey } from 'src/utils/api/types.js';

// Define Props
const props = withDefaults(
  defineProps<{
    commonPeriod?: PeriodKey;
  }>(),
  {
    commonPeriod: 'This Year',
  }
);

// Define Emits
const emit = defineEmits<{
  (e: 'period-change', period: PeriodKey): void;
}>();

// State definition
const data = ref<{ yearmonth: string; balance: number }[]>([]);
const hasData = ref(false);
const period = ref<PeriodKey>('This Year');
const periodOptions: PeriodKey[] = ['This Year', 'This Quarter', 'YTD'];

// Methods
const setData = async () => {
  const { fromDate, toDate, periodList } = getDatesAndPeriodList(period.value);

  const res = await fyo.db.getIncomeAndExpenses(
    fromDate.format('YYYY-MM-DD'),
    toDate.format('YYYY-MM-DD')
  );
  const incomes = getValueMapFromList(res.income, 'yearmonth', 'balance');
  const expenses = getValueMapFromList(res.expense, 'yearmonth', 'balance');

  data.value = periodList.map((d) => {
    const key = d.format('YYYY-MM');
    const inc = incomes[key] ?? 0;
    const exp = expenses[key] ?? 0;
    return { yearmonth: key, balance: inc - exp };
  });
  hasData.value = res.income.length > 0 || res.expense.length > 0;
};

const periodChange = async () => {
  emit('period-change', period.value);
  await setData();
};

// Computed Properties
const chartData = computed(() => {
  const points = [data.value.map((d) => d.balance)];
  const colors = [
    {
      positive: 'var(--chart-blue-main)',
      negative: 'var(--chart-pink-main)',
    },
  ];
  const format = (value: number) => fyo.format(value ?? 0, 'Currency');
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
    gridColor: 'var(--color-border)',
    fontColor: 'var(--color-description)',
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
  }
);

// Lifecycle Hooks
onActivated(async () => {
  await setData();
});
</script>
