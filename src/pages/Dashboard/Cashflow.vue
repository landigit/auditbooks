<template>
  <div>
    <!-- Title and Period Selector -->
    <div
      class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2"
    >
      <div class="flex items-center justify-between w-full sm:w-auto">
        <div class="font-semibold text-base dark:text-white">
          {{ t`Cashflow` }}
        </div>
        <!-- Period Selector only on mobile next to title -->
        <PeriodSelector
          v-if="hasData"
          class="sm:hidden"
          :value="period"
          :options="periodOptions"
          @change="(value) => (period = value)"
        />
        <div
          v-else
          class="sm:hidden w-20 h-5 bg-gray-200 dark:bg-gray-700 rounded"
        />
      </div>

      <!-- Chart Legend & Period Selector for tablet/desktop -->
      <div
        class="flex items-center justify-between sm:justify-start gap-6 sm:gap-8 w-full sm:w-auto"
      >
        <div v-if="hasData" class="flex text-sm sm:text-base gap-6 sm:gap-8">
          <div class="flex items-center gap-2">
            <span
              class="w-3 h-3 rounded-sm inline-block bg-blue-500 dark:bg-blue-600"
            />
            <span class="text-gray-900 dark:text-gray-25">{{ t`Inflow` }}</span>
          </div>
          <div class="flex items-center gap-2">
            <span
              class="w-3 h-3 rounded-sm inline-block bg-pink-500 dark:bg-pink-600"
            />
            <span class="text-gray-900 dark:text-gray-25">{{
              t`Outflow`
            }}</span>
          </div>
        </div>
        <div v-else class="w-16 h-5 bg-gray-200 dark:bg-gray-700 rounded" />

        <!-- Period Selector on tablet/desktop -->
        <PeriodSelector
          v-if="hasData"
          class="hidden sm:block"
          :value="period"
          :options="periodOptions"
          @change="(value) => (period = value)"
        />
        <div
          v-else
          class="hidden sm:block w-20 h-5 bg-gray-200 dark:bg-gray-700 rounded"
        />
      </div>
    </div>

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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onActivated } from 'vue';
import { AccountTypeEnum } from 'models/baseModels/Account/types';
import { ModelNameEnum } from 'models/types';
import LineChart from 'src/components/Charts/LineChart.vue';
import { fyo } from 'src/initFyo';
import { formatXLabels, getYMax } from 'src/utils/chart';
import { uicolors } from 'src/utils/colors';
import { getDatesAndPeriodList } from 'src/utils/misc';
import { getMapFromList } from 'utils/index';
import { PeriodKey } from 'src/utils/types';
import { useDashboardChart } from '../../composables/useDashboardChart';
import { useMobile } from '../../composables/useMobile';
import PeriodSelector from './PeriodSelector.vue';
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
const aspectRatio = computed(() => (isMobile.value ? 2.0 : 4.15));

const data = ref<{ inflow: number; outflow: number; yearmonth: string }[]>([]);
const periodOptions: PeriodKey[] = ['This Year', 'This Quarter', 'YTD'];
const hasData = ref(false);

const chartData = computed(() => {
  let displayData = data.value;
  let colors = [
    uicolors.blue[props.darkMode ? '600' : '500'],
    uicolors.pink[props.darkMode ? '600' : '500'],
  ];
  if (!hasData.value) {
    displayData = dummyData;
    colors = [
      props.darkMode ? uicolors.gray['700'] : uicolors.gray['200'],
      props.darkMode ? uicolors.gray['800'] : uicolors.gray['100'],
    ];
  }

  const xLabels = displayData.map((cf) => cf.yearmonth);
  const points = (['inflow', 'outflow'] as const).map((k) =>
    displayData.map((d) => d[k])
  );

  const format = (value: number) => fyo.format(value ?? 0, 'Currency');
  const yMax = getYMax(points);
  return {
    points,
    xLabels,
    colors,
    format,
    yMax,
    formatX: formatXLabels,
    gridColor: props.darkMode ? 'rgba(200, 200, 200, 0.2)' : undefined,
    fontColor: props.darkMode ? uicolors.gray['400'] : undefined,
  };
});

const setHasData = async () => {
  const accounts = await fyo.db.getAllRaw('Account', {
    filters: {
      accountType: ['in', [AccountTypeEnum.Cash, AccountTypeEnum.Bank]],
    },
  });
  const accountNames = accounts.map((a) => a.name as string);
  const count = await fyo.db.count(ModelNameEnum.AccountingLedgerEntry, {
    filters: { account: ['in', accountNames] },
  });
  hasData.value = count > 0;
};

const setData = async () => {
  const { periodList, fromDate, toDate } = getDatesAndPeriodList(period.value);

  const dbData = await fyo.db.getCashflow(fromDate.toISO()!, toDate.toISO()!);
  const dataMap = getMapFromList(dbData, 'yearmonth');
  data.value = periodList.map((p) => {
    const key = p.toFormat('yyyy-MM');
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

const { period } = useDashboardChart(
  props,
  (val: any) => emit('period-change', val),
  setData,
  periodOptions
);

onActivated(async () => {
  await setData();
  if (!hasData.value) {
    await setHasData();
  }
});

const dummyData = [
  {
    inflow: 100,
    outflow: 250,
    yearmonth: '2021-05',
  },
  {
    inflow: 350,
    outflow: 100,
    yearmonth: '2021-06',
  },
  {
    inflow: 50,
    outflow: 300,
    yearmonth: '2021-07',
  },
  {
    inflow: 320,
    outflow: 100,
    yearmonth: '2021-08',
  },
];
</script>
