<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { Calendar as CalendarUI } from "src/components/ui";
import PageHeader from "src/components/PageHeader.vue";
import { fyo } from "src/initFyo";
import { CalendarDate } from "@internationalized/date";
import { routeTo } from "src/utils/ui";
import { getFormRoute } from "src/utils/ui";
import Badge from "src/components/Badge.vue";
import { t } from "fyo";

const today = new Date();
const dateValue = ref<any>(
  new CalendarDate(today.getFullYear(), today.getMonth() + 1, today.getDate()),
);
const transactions = ref<any[]>([]);

async function fetchTransactions() {
  const start = new Date(dateValue.value.year, dateValue.value.month - 1, 1);
  const end = new Date(dateValue.value.year, dateValue.value.month, 0);

  // Fetch from multiple schemas for a comprehensive view
  const schemas = ["SalesInvoice", "PurchaseInvoice", "JournalEntry"];
  const allResults = await Promise.all(
    schemas.map((schema) =>
      fyo.db.getAll(schema, {
        filters: {
          date: ["between", [start.toISOString(), end.toISOString()]],
        },
      }),
    ),
  );

  transactions.value = allResults
    .flat()
    .sort(
      (a, b) =>
        new Date(b.date as string).getTime() -
        new Date(a.date as string).getTime(),
    );
}

const selectedDayTransactions = computed(() => {
  if (!dateValue.value) return [];
  const selectedDateStr = new Date(
    dateValue.value.year,
    dateValue.value.month - 1,
    dateValue.value.day,
  )
    .toISOString()
    .split("T")[0];

  return transactions.value.filter((t) =>
    (t.date as string).startsWith(selectedDateStr),
  );
});

const currentMonthLabel = computed(() => {
  if (!dateValue.value) return "";
  const date = new Date(dateValue.value.year, dateValue.value.month - 1, 1);
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
});

const selectedDayLabel = computed(() => {
  if (!dateValue.value) return "";
  const date = new Date(
    dateValue.value.year,
    dateValue.value.month - 1,
    dateValue.value.day,
  );
  return date.toLocaleDateString(undefined, { dateStyle: "medium" });
});

const daysInMonth = computed(() => {
  const numDays = new Date(
    dateValue.value.year,
    dateValue.value.month,
    0,
  ).getDate();
  const arr = [];
  for (let i = 1; i <= numDays; i++) {
    arr.push(i);
  }
  return arr;
});

const startOfWeekday = computed(() => {
  if (!dateValue.value) return 0;
  const firstDay = new Date(dateValue.value.year, dateValue.value.month - 1, 1);
  return firstDay.getDay();
});

function selectDay(day: number) {
  dateValue.value = new CalendarDate(
    dateValue.value.year,
    dateValue.value.month,
    day,
  );
}

async function changeMonth(offset: number) {
  let newMonth = dateValue.value.month + offset;
  let newYear = dateValue.value.year;
  if (newMonth > 12) {
    newMonth = 1;
    newYear++;
  } else if (newMonth < 1) {
    newMonth = 12;
    newYear--;
  }
  const maxDays = new Date(newYear, newMonth, 0).getDate();
  const newDay = Math.min(dateValue.value.day, maxDays);
  dateValue.value = new CalendarDate(newYear, newMonth, newDay);
  await fetchTransactions();
}

onMounted(fetchTransactions);

async function openTransaction(t: any) {
  const route = getFormRoute(t.schemaName, t.name);
  await routeTo(route);
}
</script>

<template>
  <view v-if="!isLynx">
    <view class="h-screen flex flex-col bg-canvas">
      <PageHeader :title="t`Transaction Calendar`" />

      <view
        class="flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden p-4 md:p-6 gap-4 md:gap-6"
      >
        <!-- Calendar Panel -->
        <view class="w-full md:w-1/3 flex flex-col gap-4 flex-shrink-0">
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
        </view>

        <!-- Transactions List Panel -->
        <view
          class="flex-1 bg-surface rounded border border-border flex flex-col min-h-[350px] md:min-h-0 overflow-hidden"
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
                      dateValue.day,
                    ).toLocaleDateString(undefined, { dateStyle: "full" })
                  : ""
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
                  >{{ t.schemaName }}</text
                >
                <text class="font-medium text-main">{{ t.name }}</text>
                <text class="text-sm text-description">{{
                  t.party || t.reference_name || ""
                }}</text>
              </view>
              <view class="text-right flex flex-col items-end">
                <text class="font-bold text-main">{{
                  fyo.format(t.grandTotal || t.total_amount || 0, "Currency")
                }}</text>
                <view class="mt-1">
                  <Badge color="blue">
                    {{ t.status || "Submitted" }}
                  </Badge>
                </view>
              </view>
            </view>

            <view
              v-if="selectedDayTransactions.length === 0"
              class="h-full flex flex-col items-center justify-center text-description py-20"
            >
              <text>{{ t`No transactions for this day` }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>

  <view v-else class="MainView">
    <view class="NavBar">
      <view class="NavBrand">
        <text class="BrandText">Calendar</text>
      </view>
    </view>
    <view class="flex-1 flex flex-col px-4 py-2">
      <!-- Month Selector -->
      <view
        class="flex flex-row justify-between items-center bg-surface border border-border rounded-xl p-3 mb-4"
      >
        <view
          class="Btn py-1 px-3 bg-canvas border border-border rounded-lg"
          @tap="changeMonth(-1)"
        >
          <text class="BtnText text-xs font-semibold">◀ Prev</text>
        </view>
        <text class="font-bold text-main text-sm">{{ currentMonthLabel }}</text>
        <view
          class="Btn py-1 px-3 bg-canvas border border-border rounded-lg"
          @tap="changeMonth(1)"
        >
          <text class="BtnText text-xs font-semibold">Next ▶</text>
        </view>
      </view>

      <!-- Days Grid Header (Sun - Sat) -->
      <view class="flex flex-row justify-between mb-2 w-full">
        <view
          v-for="day in [t`Su`, t`Mo`, t`Tu`, t`We`, t`Th`, t`Fr`, t`Sa`]"
          :key="day"
          style="width: 14.28%"
          class="items-center"
        >
          <text class="text-xs font-semibold text-description">{{ day }}</text>
        </view>
      </view>

      <!-- Days Grid Content -->
      <view class="flex flex-row flex-wrap w-full mb-4">
        <!-- Offset/padding days -->
        <view
          v-for="pad in startOfWeekday"
          :key="'pad-' + pad"
          style="width: 14.28%"
          class="h-10"
        />
        <!-- Real days of the month -->
        <view
          v-for="d in daysInMonth"
          :key="d"
          style="width: 14.28%"
          class="h-10 items-center justify-center"
          @tap="selectDay(d)"
        >
          <view
            class="w-8 h-8 rounded-full flex items-center justify-center border"
            :class="
              d === dateValue.day
                ? 'bg-blue-600 border-blue-600'
                : 'bg-surface border-border'
            "
          >
            <text
              class="text-xs font-bold"
              :class="d === dateValue.day ? 'text-white' : 'text-main'"
              >{{ d }}</text
            >
          </view>
        </view>
      </view>

      <!-- Transactions List -->
      <text class="SectionHeader text-sm font-semibold mb-2"
        >Transactions for {{ selectedDayLabel }}</text
      >
      <scroll-view scroll-y="true" class="flex-1">
        <view
          v-if="!selectedDayTransactions.length"
          class="flex flex-col items-center justify-center p-10 bg-surface border border-border rounded-2xl shadow-sm my-4 mx-2"
        >
          <view
            class="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4"
          >
            <text class="text-xl">📅</text>
          </view>
          <text class="text-sm font-semibold text-main text-center mb-1">
            {{ t`No Transactions` }}
          </text>
          <text class="text-xs text-description text-center">
            {{ t`No transactions recorded for this day.` }}
          </text>
        </view>
        <view
          v-for="t in selectedDayTransactions"
          :key="t.name"
          class="p-4 bg-surface border border-border rounded-xl mb-3 flex flex-row justify-between items-center"
          @tap="openTransaction(t)"
        >
          <view class="flex-1">
            <text class="text-[10px] font-bold text-blue-500 uppercase">{{
              t.schemaName
            }}</text>
            <text class="font-semibold text-main text-sm mt-0.5">{{
              t.name
            }}</text>
            <text class="text-xs text-description mt-0.5">{{
              t.party || t.reference_name || ""
            }}</text>
          </view>
          <view class="items-end text-right">
            <text class="font-bold text-main text-sm">{{
              fyo.format(t.grandTotal || t.total_amount || 0, "Currency")
            }}</text>
            <view
              class="mt-1 px-2 py-0.5 bg-blue-900/40 rounded border border-blue-800"
            >
              <text class="text-[10px] text-blue-300 font-semibold">{{
                t.status || "Submitted"
              }}</text>
            </view>
          </view>
        </view>
      </scroll-view>
    </view>
  </view>
</template>
