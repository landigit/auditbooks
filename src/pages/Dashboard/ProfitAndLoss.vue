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
      :aspect-ratio="aspectRatio"
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
      <span class="text-base text-gray-600 dark:text-gray-500">
        {{ t`No transactions yet` }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onActivated } from 'vue';
import BarChart from 'src/components/Charts/BarChart.vue';
import { fyo } from 'src/initFyo';
import { formatXLabels, getYMax, getYMin } from 'src/utils/chart';
import { uicolors } from 'src/utils/colors';
import { getDatesAndPeriodList } from 'src/utils/misc';
import { getValueMapFromList } from 'utils';
import PeriodSelector from './PeriodSelector.vue';
import SectionHeader from './SectionHeader.vue';
import { PeriodKey } from 'src/utils/types';
import { useDashboardChart } from '../../composables/useDashboardChart.js';
import { useMobile } from '../../composables/useMobile.js';
import { t } from 'fyo';

const props = withDefaults(
  defineProps<{
    commonPeriod?: PeriodKey;
    darkMode?: boolean;
  }>(),
  {
    commonPeriod: 'This Year',
    darkMode: false,
  }
);

const emit = defineEmits<{
  (e: 'period-change', period: PeriodKey): void;
}>();

const isMobile = useMobile();
const aspectRatio = computed(() => (isMobile.value ? 1.5 : 2.05));

const data = ref<{ yearmonth: string; balance: number }[]>([]);
const hasData = ref(false);
const periodOptions: PeriodKey[] = ['This Year', 'This Quarter', 'YTD'];

const setData = async () => {
  const { fromDate, toDate, periodList } = getDatesAndPeriodList(period.value);

  const dbData = await fyo.db.getIncomeAndExpenses(
    fromDate.toISO()!,
    toDate.toISO()!
  );
  const incomes = getValueMapFromList(dbData.income, 'yearmonth', 'balance');
  const expenses = getValueMapFromList(dbData.expense, 'yearmonth', 'balance');

  data.value = periodList.map((d) => {
    const key = d.toFormat('yyyy-MM');
    const inc = incomes[key] ?? 0;
    const exp = expenses[key] ?? 0;
    return { yearmonth: key, balance: inc - exp };
  });
  hasData.value = dbData.income.length > 0 || dbData.expense.length > 0;
};

const { period } = useDashboardChart(
  props,
  (val: any) => emit('period-change', val),
  setData,
  periodOptions
);

const chartData = computed(() => {
  const points = [data.value.map((d) => d.balance)];
  const colors = [
    {
      positive: uicolors.blue[props.darkMode ? '600' : '500'],
      negative: uicolors.pink[props.darkMode ? '600' : '500'],
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
    gridColor: props.darkMode ? 'rgba(200, 200, 200, 0.2)' : undefined,
    fontColor: props.darkMode ? uicolors.gray['400'] : undefined,
    zeroLineColor: props.darkMode ? uicolors.gray['400'] : undefined,
  };
});

onActivated(async () => {
  await setData();
});
</script>
