<template>
  <div class="flex-col justify-between w-full p-4">
    <!-- Title and Period Selector -->
    <SectionHeader>
      <template #title>{{ title }}</template>
      <template #action>
        <PeriodSelector :value="period" @change="(value) => (period = value)" />
      </template>
    </SectionHeader>

    <!-- Widget Body -->
    <div class="mt-4">
      <!-- Paid & Unpaid Amounts -->
      <div class="flex justify-between">
        <!-- Paid -->
        <div
          class="text-sm font-medium dark:text-gray-25"
          :class="{
            'bg-gray-200 dark:bg-gray-700 text-gray-200 dark:text-gray-700 rounded':
              !count,
            'cursor-pointer': paidCount > 0,
          }"
          :title="paidCount > 0 ? t`View Paid Invoices` : ''"
          @click="() => routeToInvoices('paid')"
        >
          {{ fyo.format(paid, 'Currency') }}
          <span
            :class="{ 'text-gray-900 dark:text-gray-200 font-normal': count }"
            >{{ t`Paid` }}</span
          >
        </div>

        <!-- Unpaid -->
        <div
          class="text-sm font-medium dark:text-gray-25"
          :class="{
            'bg-gray-200 dark:bg-gray-700 text-gray-200 dark:text-gray-700 rounded':
              !count,
            'cursor-pointer': unpaidCount > 0,
          }"
          :title="unpaidCount > 0 ? t`View Unpaid Invoices` : ''"
          @click="() => routeToInvoices('unpaid')"
        >
          {{ fyo.format(unpaid, 'Currency') }}
          <span
            :class="{ 'text-gray-900 dark:text-gray-200 font-normal': count }"
            >{{ t`Unpaid` }}</span
          >
        </div>
      </div>

      <!-- Widget Bar -->
      <div
        class="mt-2 relative rounded overflow-hidden"
        @mouseenter="show = true"
        @mouseleave="show = false"
      >
        <div class="w-full h-4" :class="unpaidColor"></div>
        <div
          class="absolute inset-0 h-4"
          :class="paidColor"
          :style="`width: ${barWidth}%`"
        ></div>
      </div>
    </div>
    <MouseFollower
      v-if="hasData"
      :offset="15"
      :show="show"
      placement="top"
      class="text-sm shadow-md px-2 py-1 bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-s-4"
      :style="{ borderColor: colors }"
    >
      <div class="flex justify-between gap-4">
        <p>{{ t`Paid` }}</p>
        <p class="font-semibold">{{ paidCount ?? 0 }}</p>
      </div>
      <div v-if="unpaidCount > 0" class="flex justify-between gap-4">
        <p>{{ t`Unpaid` }}</p>
        <p class="font-semibold">{{ unpaidCount ?? 0 }}</p>
      </div>
    </MouseFollower>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onActivated } from 'vue';
import { t } from 'fyo';
import { DateTime } from 'luxon';
import { ModelNameEnum } from 'models/types';
import MouseFollower from 'src/components/MouseFollower.vue';
import { fyo } from 'src/initFyo';
import { uicolors } from 'src/utils/colors';
import { getDatesAndPeriodList } from 'src/utils/misc';
import { PeriodKey } from 'src/utils/types';
import { routeTo } from 'src/utils/ui';
import { safeParseFloat } from 'utils/index';
import { useDashboardChart } from '../../composables/useDashboardChart';
import PeriodSelector from './PeriodSelector.vue';
import SectionHeader from './SectionHeader.vue';

const props = withDefaults(
  defineProps<{
    schemaName: string;
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

const show = ref(false);
const total = ref(0);
const unpaid = ref(0);
const hasData = ref(false);
const paid = ref(0);
const count = ref(0);
const unpaidCount = ref(0);
const paidCount = ref(0);
const barWidth = ref(40);
const periodOptions: PeriodKey[] = [
  'This Year',
  'YTD',
  'This Quarter',
  'This Month',
];

const title = computed(() => {
  return fyo.schemaMap[props.schemaName]?.label ?? '';
});

const color = computed(() => {
  if (props.schemaName === ModelNameEnum.SalesInvoice) {
    return 'blue';
  }
  return 'pink';
});

const colors = computed(() => {
  return uicolors[color.value][props.darkMode ? '600' : '500'];
});

const paidColor = computed(() => {
  if (!hasData.value) {
    return props.darkMode ? 'bg-gray-700' : 'bg-gray-400';
  }
  return `bg-${color.value}-${props.darkMode ? '600' : '500'}`;
});

const unpaidColor = computed(() => {
  if (!hasData.value) {
    return `bg-gray-${props.darkMode ? '800' : '200'}`;
  }
  return `bg-${color.value}-${props.darkMode ? '700 bg-opacity-20' : '200'}`;
});

const getCounts = async (
  schemaName: string,
  fromDate: DateTime,
  toDate: DateTime
) => {
  const outstandingAmounts = await fyo.db.getAllRaw(schemaName, {
    fields: ['outstandingAmount'],
    filters: {
      cancelled: false,
      submitted: true,
      date: ['<=', toDate.toISO(), '>=', fromDate.toISO()],
    },
  });

  const isOutstanding = outstandingAmounts.map((o) =>
    safeParseFloat(o.outstandingAmount)
  );

  return {
    countTotal: isOutstanding.length,
    countOutstanding: isOutstanding.filter((o) => o > 0).length,
  };
};

const setData = async () => {
  const { fromDate, toDate } = getDatesAndPeriodList(period.value);

  const { total: dbTotal, outstanding: dbOutstanding } =
    await fyo.db.getTotalOutstanding(
      props.schemaName,
      fromDate.toISO(),
      toDate.toISO()
    );

  const { countTotal, countOutstanding } = await getCounts(
    props.schemaName,
    fromDate,
    toDate
  );

  total.value = dbTotal ?? 0;
  unpaid.value = dbOutstanding ?? 0;
  paid.value = total.value - unpaid.value;
  hasData.value = countTotal > 0;
  count.value = countTotal;
  paidCount.value = countTotal - countOutstanding;
  unpaidCount.value = countOutstanding;
  barWidth.value = (paid.value / (total.value || 1)) * 100;
};

const { period } = useDashboardChart(
  props,
  (val) => emit('period-change', val),
  setData,
  periodOptions
);

const routeToInvoices = async (type: 'paid' | 'unpaid') => {
  if (type === 'paid' && !paidCount.value) {
    return;
  }

  if (type === 'unpaid' && !unpaidCount.value) {
    return;
  }

  const zero = fyo.pesa(0).store;
  const filters: Record<string, any> = { outstandingAmount: ['=', zero] };
  const schemaLabel = fyo.schemaMap[props.schemaName]?.label ?? '';
  let label = t`Paid ${schemaLabel}`;
  if (type === 'unpaid') {
    filters.outstandingAmount[0] = '!=';
    label = t`Unpaid ${schemaLabel}`;
  }

  const path = `/list/${props.schemaName}/${label}`;
  const query = { filters: JSON.stringify(filters) };
  await routeTo({ path, query });
};

onActivated(async () => {
  await setData();
});
</script>
