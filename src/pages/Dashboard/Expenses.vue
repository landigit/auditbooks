<template>
  <div class="flex flex-col h-full w-full p-4">
    <SectionHeader class="mb-8">
      <template #title>
        <span
          class="text-lg font-semibold normal-case tracking-[0.15em] bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60"
        >
          {{ t`Top Expenses` }}
        </span>
      </template>
      <template #action>
        <PeriodSelector :value="period" @change="(value) => (period = value)" />
      </template>
    </SectionHeader>

    <div
      v-show="hasData"
      class="flex flex-1 relative items-center justify-between"
    >
      <!-- Chart Legend -->
      <div class="w-1/2 flex flex-col gap-3 justify-center">
        <!-- Ledgend Item -->
        <div
          v-for="(d, i) in expenses"
          :key="d.account"
          class="flex items-center px-5 py-3 rounded-lg transition-all duration-300 group cursor-pointer border"
          :class="
            active === i
              ? 'bg-white/10 border-white/20 shadow-md scale-105 z-10'
              : 'bg-transparent border-transparent hover:bg-white/5'
          "
          @mouseover="active = i"
          @mouseleave="active = undefined"
        >
          <div
            class="w-3.5 h-3.5 rounded-full flex-shrink-0 shadow-inner"
            :class="d.class"
          />
          <p
            class="ms-4 font-bold text-sm text-foreground/70 group-hover:text-foreground transition-colors overflow-x-auto whitespace-nowrap no-scrollbar w-32"
          >
            {{ d.account }}
          </p>
          <p
            class="whitespace-nowrap flex-shrink-0 ms-auto font-semibold tracking-tight text-foreground group-hover:text-primary transition-colors"
          >
            {{ fyo.format(d?.total ?? 0, 'Currency') }}
          </p>
        </div>
      </div>
      <DonutChart
        class="w-1/2 drop-shadow-2xl"
        :active="active"
        :sectors="sectors"
        :offset-x="0"
        :thickness="14"
        :text-offset-x="6.8"
        :value-formatter="(value: number) => fyo.format(value, 'Currency')"
        :total-label="t`Total Spending`"
        :dark-mode="darkMode"
        @change="(value: number) => (active = value)"
      />
    </div>

    <!-- Empty Message -->
    <div
      v-if="expenses.length === 0"
      class="flex-1 w-full h-full flex flex-col justify-center items-center gap-5 my-10 opacity-60"
    >
      <div
        class="w-20 h-20 rounded-[2rem] bg-white/5 flex items-center justify-center border border-gray-100 dark:border-gray-800 shadow-inner"
      >
        <LucideIcon name="receipt" class="text-muted-foreground w-10 h-10" />
      </div>
      <span
        class="text-xs normal-case tracking-[0.25em] font-semibold text-muted-foreground text-center max-w-[200px] leading-relaxed"
      >
        {{ t`No expenses in this period` }}
      </span>
    </div>
  </div>
</template>

<script lang="ts">
import { truncate } from 'lodash';
import { fyo } from 'src/initFyo';
import { uicolors } from 'src/utils/colors';
import { getDatesAndPeriodList } from 'src/utils/misc';
import { defineComponent } from 'vue';
import DonutChart from '../../components/Charts/DonutChart.vue';
import DashboardChartBase from './BaseDashboardChart.vue';
import PeriodSelector from './PeriodSelector.vue';
import SectionHeader from './SectionHeader.vue';
import LucideIcon from 'src/components/LucideIcon.vue';

// Linting broken in this file cause of `extends: ...`

export default defineComponent({
  name: 'Expenses',
  components: {
    DonutChart,
    PeriodSelector,
    SectionHeader,
    LucideIcon,
  },
  extends: DashboardChartBase,
  props: {
    darkMode: { type: Boolean, default: false },
  },
  data: () => ({
    active: undefined as undefined | number,
    expenses: [] as {
      account: string;
      total: number;
      color: { color: string; darkColor: string };
      class: { class: string; darkClass: string };
    }[],
  }),
  computed: {
    totalExpense(): number {
      return this.expenses.reduce((sum, expense) => sum + expense.total, 0);
    },
    hasData(): boolean {
      return this.expenses.length > 0;
    },
    sectors(): {
      color: { color: string; darkColor: string };
      label: string;
      value: number;
    }[] {
      return this.expenses.map(({ account, color, total }) => ({
        color,
        label: truncate(account, { length: 21 }),
        value: total,
      }));
    },
  },
  activated() {
    this.setData();
  },
  methods: {
    async setData() {
      const { fromDate, toDate } = getDatesAndPeriodList(this.period);
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

      this.expenses = topExpenses
        .filter((e) => e.total > 0)
        .map((d, i) => {
          return {
            account: d.account,
            total: d.total,
            color: { color: shades[i].hex, darkColor: darkshades[i].hex },
            class: { class: shades[i].class, darkClass: darkshades[i].class },
          };
        });
    },
  },
});
</script>
