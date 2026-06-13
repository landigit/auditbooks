<template>
  <div class="h-screen w-full md:w-[var(--w-desk)]">
    <PageHeader :title="t`Dashboard`">
      <PeriodSelector
        :value="period"
        :options="['This Year', 'This Quarter', 'This Month', 'YTD']"
        @change="(value) => (period = value)"
      />
    </PageHeader>

    <div
      class="no-scrollbar overflow-auto dark:bg-gray-875"
      style="height: calc(100vh - var(--h-row-largest) - 1px)"
    >
      <div class="w-full md:min-w-[var(--w-desk-fixed)] overflow-auto">
        <Cashflow
          class="p-4"
          :common-period="period"
          :dark-mode="darkMode"
          @period-change="handlePeriodChange"
        />
        <hr class="dark:border-gray-800" />
        <div class="flex flex-col md:flex-row w-full">
          <UnpaidInvoices
            :schema-name="'SalesInvoice'"
            :common-period="period"
            :dark-mode="darkMode"
            class="w-full md:w-1/2 border-b md:border-b-0 md:border-e dark:border-gray-800"
            @period-change="handlePeriodChange"
          />
          <UnpaidInvoices
            :schema-name="'PurchaseInvoice'"
            :common-period="period"
            :dark-mode="darkMode"
            class="w-full md:w-1/2"
            @period-change="handlePeriodChange"
          />
        </div>
        <hr class="dark:border-gray-800" />
        <div class="flex flex-col md:flex-row w-full">
          <ProfitAndLoss
            class="w-full md:w-1/2 p-4 border-b md:border-b-0 md:border-e dark:border-gray-800"
            :common-period="period"
            :dark-mode="darkMode"
            @period-change="handlePeriodChange"
          />
          <Expenses
            class="w-full md:w-1/2 p-4"
            :common-period="period"
            :dark-mode="darkMode"
            @period-change="handlePeriodChange"
          />
        </div>
        <hr class="dark:border-gray-800" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onActivated, onDeactivated } from 'vue';
import PageHeader from 'src/components/PageHeader.vue';
import UnpaidInvoices from './UnpaidInvoices.vue';
import Cashflow from './Cashflow.vue';
import Expenses from './Expenses.vue';
import PeriodSelector from './PeriodSelector.vue';
import ProfitAndLoss from './ProfitAndLoss.vue';
import { docsPathRef } from 'src/utils/refs';
import { PeriodKey } from 'src/utils/types';
import { t } from 'fyo';

const props = withDefaults(
  defineProps<{
    darkMode?: boolean;
  }>(),
  {
    darkMode: false,
  }
);

const period = ref<PeriodKey>('This Year');

const handlePeriodChange = (newPeriod: PeriodKey) => {
  if (newPeriod === period.value) {
    return;
  }

  period.value = '' as PeriodKey;
};

onActivated(() => {
  docsPathRef.value = 'books/dashboard';
});

onDeactivated(() => {
  docsPathRef.value = '';
});
</script>
