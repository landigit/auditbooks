<template>
  <div class="flex flex-col h-full">
    <SectionHeader>
      <template #title>{{ t`Top Expenses` }}</template>
      <template #action>
        <PeriodSelector :value="period" @change="(value) => (period = value)" />
      </template>
    </SectionHeader>

    <div v-show="hasData" class="flex flex-col sm:flex-row gap-6 relative mt-4">
      <!-- Chart Legend -->
      <div class="w-full sm:w-1/2 flex flex-col gap-4 justify-center dark:text-gray-25">
        <!-- Legend Item -->
        <div v-for="(d, i) in expenses" :key="d.account" class="flex items-center text-sm" @mouseover="active = i"
          @mouseleave="active = null">
          <div class="w-3 h-3 rounded-sm flex-shrink-0" :class="d.class" />
          <p class="ms-2 whitespace-nowrap no-scrollbar flex-1 truncate min-w-0 max-w-[15rem]" :title="d.account">
            {{ d.account }}
          </p>
          <p class="whitespace-nowrap flex-shrink-0 ms-auto">
            {{ fyo.format(d?.total ?? 0, 'Currency') }}
          </p>
        </div>
      </div>
      <DonutChart class="w-full sm:w-1/2 my-auto" :active="active" :sectors="sectors" :offset-x="3" :thickness="10"
        :text-offset-x="6.5" :value-formatter="(value: number) => fyo.format(value, 'Currency')"
        :total-label="t`Total Spending`" :dark-mode="darkMode" @change="(value: number) => (active = value)" />
    </div>

    <!-- Empty Message -->
    <div v-if="expenses.length === 0" class="flex-1 w-full h-full flex-center my-20">
      <span class="text-base text-gray-600 dark:text-gray-500">
        {{ t`No expenses in this period` }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onActivated } from 'vue';
import { truncate } from 'lodash';
import { fyo } from 'src/initFyo';
import { uicolors } from 'src/utils/colors';
import { getDatesAndPeriodList } from 'src/utils/misc';
import DonutChart from '../../components/Charts/DonutChart.vue';
import PeriodSelector from './PeriodSelector.vue';
import SectionHeader from './SectionHeader.vue';
import { PeriodKey } from 'src/utils/types';
import { useDashboardChart } from '../../composables/useDashboardChart.js';
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

const active = ref<null | number>(null);
const expenses = ref<{
  account: string;
  total: number;
  color: { color: string; darkColor: string };
  class: { class: string; darkClass: string };
}[]>([]);

const periodOptions: PeriodKey[] = ['This Year', 'YTD', 'This Quarter', 'This Month'];

const totalExpense = computed(() => {
  return expenses.value.reduce((sum, expense) => sum + expense.total, 0);
});

const hasData = computed(() => {
  return expenses.value.length > 0;
});

const sectors = computed(() => {
  return expenses.value.map(({ account, color, total }) => ({
    color,
    label: truncate(account, { length: 21 }),
    value: total,
  }));
});

const setData = async () => {
  const { fromDate, toDate } = getDatesAndPeriodList(period.value);
  let topExpenses = await fyo.db.getTopExpenses(
    fromDate.toISO(),
    toDate.toISO()
  );
  const shades = [
    { class: 'bg-pink-500', hex: uicolors.pink['500'] },
    { class: 'bg-pink-400', hex: uicolors.pink['400'] },
    { class: 'bg-pink-300', hex: uicolors.pink['300'] },
    { class: 'bg-pink-200', hex: uicolors.pink['200'] },
    { class: 'bg-pink-100', hex: uicolors.pink['100'] },
  ];

  const darkshades = [
    { class: 'bg-pink-600', hex: uicolors.pink['600'] },
    { class: 'bg-pink-500', hex: uicolors.pink['500'] },
    { class: 'bg-pink-400', hex: uicolors.pink['400'] },
    { class: 'bg-pink-300', hex: uicolors.pink['300'] },
    {
      class: 'bg-pink-200 dark:bg-opacity-80',
      hex: uicolors.pink['200'] + 'CC',
    },
  ];

  expenses.value = topExpenses
    .filter((e) => e.total > 0)
    .map((d, i) => {
      return {
        account: d.account,
        total: d.total,
        color: { color: shades[i].hex, darkColor: darkshades[i].hex },
        class: { class: shades[i].class, darkClass: darkshades[i].class },
      };
    });
};

const { period } = useDashboardChart(
  props,
  (val) => emit('period-change', val),
  setData,
  periodOptions
);

onActivated(async () => {
  await setData();
});
</script>
