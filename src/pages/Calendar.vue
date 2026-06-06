<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Calendar as CalendarUI } from 'src/components/ui';
import PageHeader from 'src/components/PageHeader.vue';
import { fyo } from 'src/initFyo';
import { CalendarDate } from '@internationalized/date';
import { routeTo } from 'src/utils/ui';
import { getFormRoute } from 'src/utils/ui';
import Badge from 'src/components/Badge.vue';

const today = new Date();
const dateValue = ref<any>(
  new CalendarDate(today.getFullYear(), today.getMonth() + 1, today.getDate())
);
const transactions = ref<any[]>([]);

async function fetchTransactions() {
  const start = new Date(dateValue.value.year, dateValue.value.month - 1, 1);
  const end = new Date(dateValue.value.year, dateValue.value.month, 0);

  // Fetch from multiple schemas for a comprehensive view
  const schemas = ['SalesInvoice', 'PurchaseInvoice', 'JournalEntry'];
  const allResults = await Promise.all(
    schemas.map((schema) =>
      fyo.db.getAll(schema, {
        filters: {
          date: ['between', [start.toISOString(), end.toISOString()]],
        },
      })
    )
  );

  transactions.value = allResults
    .flat()
    .sort(
      (a, b) =>
        new Date(b.date as string).getTime() -
        new Date(a.date as string).getTime()
    );
}

const selectedDayTransactions = computed(() => {
  if (!dateValue.value) return [];
  const selectedDateStr = new Date(
    dateValue.value.year,
    dateValue.value.month - 1,
    dateValue.value.day
  )
    .toISOString()
    .split('T')[0];

  return transactions.value.filter((t) =>
    (t.date as string).startsWith(selectedDateStr)
  );
});

onMounted(fetchTransactions);

async function openTransaction(t: any) {
  const route = getFormRoute(t.schemaName, t.name);
  await routeTo(route);
}
</script>

<template>
  <view class="h-screen flex flex-col bg-canvas">
    <PageHeader :title="t`Transaction Calendar`" />

    <view class="flex-1 flex overflow-hidden p-6 gap-6">
      <!-- Calendar Panel -->
      <view class="w-1/3 flex flex-col gap-4">
        <component
          :is="CalendarUI"
          v-bind="
            {
              modelValue: dateValue,
              class: 'w-full border-border border rounded',
            } as any
          "
          @update:model-value="
            (val: any) => {
              dateValue = val;
              fetchTransactions();
            }
          "
        />

        <!-- <view class="bg-surface p-4 rounded border border-border">
          <text class="font-semibold text-main mb-2">{{ t`Stats for this Month` }}</text>
          <view class="space-y-2">
            <view class="flex justify-between text-sm">
              <text class="text-description">{{ t`Total Transactions` }}</text>
              <text class="font-medium">{{ transactions.length }}</text>
            </view>
          </view>
        </view> -->
      </view>

      <!-- Transactions List Panel -->
      <view
        class="flex-1 bg-surface rounded border border-border flex flex-col overflow-hidden"
      >
        <view
          class="p-4 border-b border-border flex justify-between items-center bg-surface-hover/30"
        >
          <text class="font-semibold text-main text-lg">
            {{
              dateValue
                ? new Date(
                    dateValue.year,
                    dateValue.month - 1,
                    dateValue.day
                  ).toLocaleDateString(undefined, { dateStyle: 'full' })
                : ''
            }}
          </text>
          <Badge
            class="bg-indicator-blue-bg text-indicator-blue-text border-indicator-blue-text border"
          >
            {{ selectedDayTransactions.length }} {{ t`Items` }}
          </Badge>
        </view>

        <view class="flex-1 overflow-auto p-4 space-y-3 no-scrollbar">
          <view
            v-for="t in selectedDayTransactions"
            :key="t.name"
            class="group p-4 border border-border rounded-lg hover:border-indicator-blue-text hover:bg-surface-hover transition-all cursor-pointer flex justify-between items-center"
            @tap="openTransaction(t)"
          >
            <view class="flex flex-col">
              <text
                class="text-xs uppercase tracking-wider text-description font-semibold"
                >{{ t.schemaName }}</text>
              <text class="font-medium text-main">{{ t.name }}</text>
              <text class="text-sm text-description">{{
                t.party || t.reference_name || ''
              }}</text>
            </view>
            <view class="text-right flex flex-col items-end">
              <text class="font-bold text-main">{{
                fyo.format(t.grandTotal || t.total_amount || 0, 'Currency')
              }}</text>
              <view class="mt-1">
                <Badge color="blue">
                  {{ t.status || 'Submitted' }}
                </Badge>
              </view>
            </view>
          </view>

          <view
            v-if="selectedDayTransactions.length === 0"
            class="h-full flex flex-col items-center justify-center text-description py-20"
          >
            <lucide-icon
              name="calendar-range"
              class="w-12 h-12 mb-4 opacity-20"
            />
            <text>{{ t`No transactions for this day` }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>
