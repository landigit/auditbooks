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
          class="text-sm font-medium text-main"
          :class="{
            'bg-canvas-muted text-description rounded': !count,
            'cursor-pointer': paidCount > 0,
          }"
          :title="paidCount > 0 ? t`View Paid Invoices` : ''"
          @click="() => routeToInvoices('paid')"
        >
          {{ fyo.format(paid, 'Currency') }}
          <span :class="{ 'text-main font-normal': count }">{{ t`Paid` }}</span>
        </div>

        <!-- Unpaid -->
        <div
          class="text-sm font-medium text-main"
          :class="{
            'bg-canvas-muted text-description rounded': !count,
            'cursor-pointer': unpaidCount > 0,
          }"
          :title="unpaidCount > 0 ? t`View Unpaid Invoices` : ''"
          @click="() => routeToInvoices('unpaid')"
        >
          {{ fyo.format(unpaid, 'Currency') }}
          <span :class="{ 'text-main font-normal': count }">{{
            t`Unpaid`
          }}</span>
        </div>
      </div>

      <!-- Widget Bar -->
      <div
        class="mt-3 relative rounded-full overflow-hidden h-2.5 bg-gray-100 dark:bg-gray-800/50"
        @mouseenter="show = true"
        @mouseleave="show = false"
      >
        <div
          class="w-full h-2.5 transition-all duration-300"
          :class="unpaidColor"
        ></div>
        <div
          class="absolute inset-y-0 start-0 h-2.5 rounded-full transition-all duration-500 ease-out"
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
      class="text-sm shadow-md px-2 py-1 bg-surface text-main border-s-4"
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
import { ref, computed, watch, onActivated, onDeactivated } from 'vue';
import { t } from 'fyo';
import { DateTime } from 'luxon';
import { ModelNameEnum } from 'models/types';
import MouseFollower from 'src/components/MouseFollower.vue';
import { fyo } from 'src/initFyo';
import { getDatesAndPeriodList } from 'src/utils/misc';
import { PeriodKey } from 'src/utils/types';
import { routeTo } from 'src/utils/ui';
import { safeParseFloat } from 'utils/index';
import PeriodSelector from './PeriodSelector.vue';
import SectionHeader from './SectionHeader.vue';

// Define Props
const props = withDefaults(
  defineProps<{
    schemaName: string;
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
const show = ref(false);
const total = ref(0);
const unpaid = ref(0);
const hasData = ref(false);
const paid = ref(0);
const count = ref(0);
const unpaidCount = ref(0);
const paidCount = ref(0);
const barWidth = ref(40);
const period = ref<PeriodKey>('This Year');
const periodOptions: PeriodKey[] = ['This Year', 'This Quarter', 'YTD'];

// Computed Properties
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
  return color.value === 'blue'
    ? 'var(--chart-blue-main)'
    : 'var(--chart-pink-main)';
});

const paidColor = computed(() => {
  if (!hasData.value) {
    return 'bg-canvas-muted';
  }
  return color.value === 'blue'
    ? 'bg-(--chart-blue-main)'
    : 'bg-(--chart-pink-main)';
});

const unpaidColor = computed(() => {
  if (!hasData.value) {
    return 'bg-canvas-muted';
  }
  return color.value === 'blue'
    ? 'bg-(--chart-blue-muted)'
    : 'bg-(--chart-pink-muted)';
});

// Methods
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
      date: ['<=', toDate.toISO()!, '>=', fromDate.toISO()!],
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

  const res = await fyo.db.getTotalOutstanding(
    props.schemaName,
    fromDate.toISO()!,
    toDate.toISO()!
  );

  const counts = await getCounts(props.schemaName, fromDate, toDate);

  total.value = res.total ?? 0;
  unpaid.value = res.outstanding ?? 0;
  paid.value = total.value - unpaid.value;
  hasData.value = counts.countTotal > 0;
  count.value = counts.countTotal;
  paidCount.value = counts.countTotal - counts.countOutstanding;
  unpaidCount.value = counts.countOutstanding;
  barWidth.value = (paid.value / (total.value || 1)) * 100;
};

const periodChange = async () => {
  emit('period-change', period.value);
  await setData();
};

const routeToInvoices = async (type: 'paid' | 'unpaid') => {
  if (type === 'paid' && !paidCount.value) {
    return;
  }

  if (type === 'unpaid' && !unpaidCount.value) {
    return;
  }

  const zero = fyo.pesa(0).store;
  const filters = { outstandingAmount: ['=', zero] };
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

// Expose methods publicly if needed
defineExpose({
  newInvoice,
});

async function newInvoice() {
  const doc = fyo.doc.getNewDoc(props.schemaName);
  await routeTo(`/edit/${props.schemaName}/${doc.name!}`);
}

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
  show.value = false;
});
</script>
