```
<template>
  <div class="flex flex-col h-full w-full overflow-hidden">
    <PageHeader :title="t`Dashboard`">
      <div
        class="
          border
          dark:border-gray-900
          rounded
          bg-gray-50
          dark:bg-gray-890
          focus-within:bg-gray-100
          dark:focus-within:bg-gray-900
          flex
          items-center
        "
      >
        <PeriodSelector
          class="px-3"
          :value="period"
          :options="['This Year', 'This Quarter', 'This Month', 'YTD']"
          @change="(value) => (period = value)"
        />
      </div>
    </PageHeader>

    <div class="flex-1 no-scrollbar overflow-auto dark:bg-gray-875">
      <div class="w-full">
        <!-- Cashflow: Full width but responsive internally -->
        <Cashflow
          class="p-4"
          :common-period="period"
          :dark-mode="darkMode"
          @period-change="handlePeriodChange"
        />
        <hr class="dark:border-gray-800" />

        <!-- First Grid: Unpaid Invoices (Sales vs Purchase) -->
        <div class="grid grid-cols-1 md:grid-cols-2 w-full">
          <UnpaidInvoices
            :schema-name="'SalesInvoice'"
            :common-period="period"
            :dark-mode="darkMode"
            class="p-2 border-b md:border-b-0 md:border-e dark:border-gray-800"
            @period-change="handlePeriodChange"
          />
          <UnpaidInvoices
            :schema-name="'PurchaseInvoice'"
            :common-period="period"
            :dark-mode="darkMode"
            class="p-2"
            @period-change="handlePeriodChange"
          />
        </div>
        <hr class="dark:border-gray-800" />

        <!-- Second Grid: P&L vs Expenses -->
        <div class="grid grid-cols-1 md:grid-cols-2 w-full">
          <ProfitAndLoss
            class="p-4 border-b md:border-b-0 md:border-e dark:border-gray-800"
            :common-period="period"
            :dark-mode="darkMode"
            @period-change="handlePeriodChange"
          />
          <Expenses
            class="p-4"
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

<script>
import PageHeader from "src/components/PageHeader.vue";
import { docsPathRef } from "src/utils/refs";
import Cashflow from "./Cashflow.vue";
import Expenses from "./Expenses.vue";
import PeriodSelector from "./PeriodSelector.vue";
import ProfitAndLoss from "./ProfitAndLoss.vue";
import UnpaidInvoices from "./UnpaidInvoices.vue";

export default {
	name: "Dashboard",
	components: {
		PageHeader,
		Cashflow,
		ProfitAndLoss,
		Expenses,
		PeriodSelector,
		UnpaidInvoices,
	},
	props: {
		darkMode: { type: Boolean, default: false },
	},
	data() {
		return { period: "This Year" };
	},
	activated() {
		docsPathRef.value = "books/dashboard";
	},
	deactivated() {
		docsPathRef.value = "";
	},
	methods: {
		handlePeriodChange(period) {
			if (period === this.period) {
				return;
			}

			this.period = "";
		},
	},
};
</script>
