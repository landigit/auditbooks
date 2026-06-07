<template>
  <view v-if="!isLynx">
    <view class="h-screen w-full overflow-hidden flex flex-col">
      <PageHeader :title="t`Dashboard`">
        <view
          class="border border-border rounded bg-canvas-muted focus-within:bg-surface-hover flex items-center"
        >
          <PeriodSelector
            class="px-3"
            :value="period || undefined"
            :options="['This Year', 'This Quarter', 'This Month', 'YTD']"
            @change="(value) => (period = value)"
          />
        </view>
      </PageHeader>
      <view
        class="no-scrollbar overflow-auto bg-canvas"
        style="height: calc(100vh - var(--h-row-largest) - 1px)"
      >
        <view class="w-full">
          <Cashflow
            class="p-4"
            :common-period="period || undefined"
            @period-change="handlePeriodChange"
          />
          <view class="border-b border-border" />
          <view class="flex flex-col md:flex-row w-full">
            <UnpaidInvoices
              :schema-name="'SalesInvoice'"
              :common-period="period || undefined"
              class="border-b md:border-b-0 md:border-e border-border w-full md:w-1/2"
              @period-change="handlePeriodChange"
            />
            <UnpaidInvoices
              :schema-name="'PurchaseInvoice'"
              :common-period="period || undefined"
              class="w-full md:w-1/2"
              @period-change="handlePeriodChange"
            />
          </view>
          <view class="border-b border-border" />
          <view class="flex flex-col md:flex-row w-full">
            <ProfitAndLoss
              class="w-full md:w-1/2 p-4 border-b md:border-b-0 md:border-e border-border"
              :common-period="period || undefined"
              @period-change="handlePeriodChange"
            />
            <Expenses
              class="w-full md:w-1/2 p-4"
              :common-period="period || undefined"
              @period-change="handlePeriodChange"
            />
          </view>
          <view class="border-b border-border" />
        </view>
      </view>
    </view>
  </view>
  <view v-else class="MainView">
    <!-- Native Dashboard -->
    <view class="NavBar">
      <view class="NavBrand">
        <text class="BrandText">{{ t`Dashboard` }}</text>
      </view>
      <PeriodSelector
        :value="period || undefined"
        :options="['This Year', 'This Quarter', 'This Month', 'YTD']"
        @change="(value) => (period = value)"
      />
    </view>
    <scroll-view
      scroll-y="true"
      class="flex-1"
      style="height: 0; min-height: 0"
    >
      <Cashflow
        :common-period="period || undefined"
        @period-change="handlePeriodChange"
      />
      <view
        style="height: 1px; background: var(--color-border); margin: 0 16px"
      />
      <view class="flex flex-row">
        <view class="flex-1">
          <UnpaidInvoices
            :schema-name="'SalesInvoice'"
            :common-period="period || undefined"
            @period-change="handlePeriodChange"
          />
        </view>
        <view style="width: 1px; background: var(--color-border)" />
        <view class="flex-1">
          <UnpaidInvoices
            :schema-name="'PurchaseInvoice'"
            :common-period="period || undefined"
            @period-change="handlePeriodChange"
          />
        </view>
      </view>
      <view
        style="height: 1px; background: var(--color-border); margin: 0 16px"
      />
      <view class="flex flex-row">
        <view class="flex-1">
          <ProfitAndLoss
            :common-period="period || undefined"
            @period-change="handlePeriodChange"
          />
        </view>
        <view style="width: 1px; background: var(--color-border)" />
        <view class="flex-1">
          <Expenses
            :common-period="period || undefined"
            @period-change="handlePeriodChange"
          />
        </view>
      </view>
      <view style="height: 32px" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onActivated, onDeactivated } from 'vue';
import { useAppStore } from 'src/stores/app';
import { isLynx } from 'src/utils/interactive';
import { t } from 'fyo';
import PageHeader from 'src/components/PageHeader.vue';
import UnpaidInvoices from './UnpaidInvoices.vue';
import Cashflow from './Cashflow.vue';
import Expenses from './Expenses.vue';
import PeriodSelector from './PeriodSelector.vue';
import ProfitAndLoss from './ProfitAndLoss.vue';
import { PeriodKey } from 'src/utils/types';

// State definition
const period = ref<PeriodKey | ''>('This Year');
const store = useAppStore();

// Methods
const handlePeriodChange = (newPeriod: string) => {
  if (newPeriod === period.value) {
    return;
  }
  period.value = '';
};

// Lifecycle Hooks (activated/deactivated)
onActivated(() => {
  store.docsPath = 'dashboard';
});

onDeactivated(() => {
  store.docsPath = '';
});
</script>
