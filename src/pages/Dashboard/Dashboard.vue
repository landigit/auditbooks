<template>
  <div class="h-screen" style="width: var(--w-desk)">
    <PageHeader :title="t`Dashboard`">
      <div
        class="border border-border rounded bg-canvas-muted focus-within:bg-surface-hover flex items-center"
      >
        <PeriodSelector
          class="px-3"
          :value="period"
          :options="['This Year', 'This Quarter', 'This Month', 'YTD']"
          @change="(value) => (period = value)"
        />
      </div>
      <!-- <Button
        variant="outline"
        class="ms-2"
        @click="$router.push('/calendar')"
      >
        <lucide-icon name="calendar" class="w-4 h-4 me-2" />
        {{ t`View Calendar` }}
      </Button> -->
    </PageHeader>

    <div
      class="no-scrollbar overflow-auto bg-canvas"
      style="height: calc(100vh - var(--h-row-largest) - 1px)"
    >
      <div style="min-width: var(--w-desk-fixed)" class="overflow-auto">
        <Cashflow
          class="p-4"
          :common-period="period"
          @period-change="handlePeriodChange"
        />
        <hr class="border-border" />
        <div class="flex w-full">
          <UnpaidInvoices
            :schema-name="'SalesInvoice'"
            :common-period="period"
            class="border-e border-border"
            @period-change="handlePeriodChange"
          />
          <UnpaidInvoices
            :schema-name="'PurchaseInvoice'"
            :common-period="period"
            @period-change="handlePeriodChange"
          />
        </div>
        <hr class="border-border" />
        <div class="flex">
          <ProfitAndLoss
            class="w-full p-4 border-e border-border"
            :common-period="period"
            @period-change="handlePeriodChange"
          />
          <Expenses
            class="w-full p-4"
            :common-period="period"
            @period-change="handlePeriodChange"
          />
        </div>
        <hr class="border-border" />
      </div>
    </div>
  </div>
</template>

<script>
import PageHeader from 'src/components/PageHeader.vue';
import UnpaidInvoices from './UnpaidInvoices.vue';
import Cashflow from './Cashflow.vue';
import Expenses from './Expenses.vue';
import PeriodSelector from './PeriodSelector.vue';
import ProfitAndLoss from './ProfitAndLoss.vue';
import { Button } from 'src/components/ui';
import { useAppStore } from 'src/stores/app';

export default {
  name: 'Dashboard',
  components: {
    PageHeader,
    Cashflow,
    ProfitAndLoss,
    Expenses,
    PeriodSelector,
    UnpaidInvoices,
    Button,
  },
  props: {},
  data() {
    return {
      period: 'This Year',
      store: useAppStore(),
    };
  },
  activated() {
    this.store.docsPath = 'dashboard';
  },
  deactivated() {
    this.store.docsPath = '';
  },
  methods: {
    handlePeriodChange(period) {
      if (period === this.period) {
        return;
      }

      this.period = '';
    },
  },
};
</script>
