<template>
  <div class="flex flex-col h-full">
    <SectionHeader>
      <template #title>{{ t`Top Expenses` }}</template>
      <template #action>
        <PeriodSelector :value="period" @change="(value) => (period = value)" />
      </template>
    </SectionHeader>

    <div v-show="hasData" class="flex relative">
      <!-- Chart Legend -->
      <div class="w-1/2 flex flex-col gap-4 justify-center text-main">
        <!-- Ledgend Item -->
        <div
          v-for="(d, i) in expenses"
          :key="d.account"
          class="flex items-center text-sm"
          @mouseover="active = i"
          @mouseleave="active = undefined"
        >
          <div class="w-3 h-3 rounded-sm flex-shrink-0" :class="d.class" />
          <p class="ms-2 overflow-x-auto whitespace-nowrap no-scrollbar w-28">
            {{ d.account }}
          </p>
          <p class="whitespace-nowrap flex-shrink-0 ms-auto">
            {{ fyo.format(d?.total ?? 0, 'Currency') }}
          </p>
        </div>
      </div>
      <DonutChart
        class="w-1/2 my-auto"
        :active="active"
        :sectors="sectors"
        :offset-x="3"
        :thickness="10"
        :text-offset-x="6.5"
        :value-formatter="(value: number) => fyo.format(value, 'Currency')"
        :total-label="t`Total Spending`"
        @change="(value: number | null) => (active = value)"
      />
    </div>

    <!-- Empty Message -->
    <div
      v-if="expenses.length === 0"
      class="flex-1 w-full h-full flex-center my-20"
    >
      <span class="text-base text-description">
        {{ t`No expenses in this period` }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onActivated, onDeactivated } from 'vue';
import { fyo } from 'src/initFyo';
import { truncate } from 'src/utils';
import { getDatesAndPeriodList } from 'src/utils/misc';
import DonutChart from '../../components/Charts/DonutChart.vue';
import PeriodSelector from './PeriodSelector.vue';
import SectionHeader from './SectionHeader.vue';
import { PeriodKey } from 'src/utils/types';

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
const active = ref<number | null | undefined>(undefined);
const period = ref<PeriodKey>('This Year');
const periodOptions: PeriodKey[] = [
  'This Year',
  'YTD',
  'This Quarter',
  'This Month',
];
const expenses = ref<
  {
    account: string;
    total: number;
    color: string;
    class: string;
  }[]
>([]);

// Computed Properties
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

// Methods
const setData = async () => {
  const { fromDate, toDate } = getDatesAndPeriodList(period.value);
  let topExpenses = await fyo.db.getTopExpenses(
    fromDate.format('YYYY-MM-DD'),
    toDate.format('YYYY-MM-DD')
  );
  const shades = [
    { class: 'bg-chart-pink-1', hex: 'var(--color-chart-pink-1)' },
    { class: 'bg-chart-pink-2', hex: 'var(--color-chart-pink-2)' },
    { class: 'bg-chart-pink-3', hex: 'var(--color-chart-pink-3)' },
    { class: 'bg-chart-pink-4', hex: 'var(--color-chart-pink-4)' },
    { class: 'bg-chart-pink-5', hex: 'var(--color-chart-pink-5)' },
  ];

  expenses.value = topExpenses
    .filter((e) => e.total > 0)
    .map((d, i) => {
      return {
        account: d.account,
        total: d.total,
        color: shades[i].hex,
        class: shades[i].class,
      };
    });
};

const periodChange = async () => {
  emit('period-change', period.value);
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
  }
);

// Lifecycle Hooks (activated/deactivated)
onActivated(async () => {
  await setData();
});

onDeactivated(() => {
  active.value = undefined;
});
</script>
