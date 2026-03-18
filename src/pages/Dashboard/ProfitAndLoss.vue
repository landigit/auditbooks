<template>
  <div class="flex flex-col h-full w-full p-4">
    <SectionHeader class="mb-8">
      <template #title>
        <span
          class="text-lg font-semibold normal-case tracking-[0.15em] bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60"
        >
          {{ t`Profit and Loss` }}
        </span>
      </template>
      <template #action>
        <PeriodSelector
          :value="period"
          :options="periodOptions"
          @change="(value) => (period = value)"
        />
      </template>
    </SectionHeader>
    <div class="flex-1 relative w-full mt-4">
      <BarChart
        v-if="hasData"
        class="h-full w-full drop-shadow-xl"
        :aspect-ratio="2.05"
        :colors="chartData.colors"
        :grid-color="chartData.gridColor"
        :font-color="chartData.fontColor"
        :points="chartData.points"
        :x-labels="chartData.xLabels"
        :format="chartData.format"
        :format-x="chartData.formatX"
        :y-max="chartData.yMax"
        :y-min="chartData.yMin"
      />
      <div
        v-else
        class="flex-1 w-full h-full flex flex-col justify-center items-center gap-5 my-10 opacity-60"
      >
        <div
          class="w-20 h-20 rounded-[2rem] bg-white/5 flex items-center justify-center border border-gray-100 dark:border-gray-800 shadow-inner"
        >
          <LucideIcon
            name="trending-up"
            class="text-muted-foreground w-10 h-10"
          />
        </div>
        <span
          class="text-xs normal-case tracking-[0.25em] font-semibold text-muted-foreground text-center max-w-[200px] leading-relaxed"
        >
          {{ t`No transactions yet` }}
        </span>
      </div>
    </div>
  </div>
</template>
<script lang="ts">
import BarChart from 'src/components/Charts/BarChart.vue';
import { fyo } from 'src/initFyo';
import { formatXLabels, getYMax, getYMin } from 'src/utils/chart';
import { uicolors } from 'src/utils/colors';
import { getDatesAndPeriodList } from 'src/utils/misc';
import { getValueMapFromList } from 'utils';
import DashboardChartBase from './BaseDashboardChart.vue';
import PeriodSelector from './PeriodSelector.vue';
import SectionHeader from './SectionHeader.vue';
import LucideIcon from 'src/components/LucideIcon.vue';
import { defineComponent } from 'vue';

// Linting broken in this file cause of `extends: ...`

export default defineComponent({
  name: 'ProfitAndLoss',
  components: {
    PeriodSelector,
    SectionHeader,
    BarChart,
    LucideIcon,
  },
  extends: DashboardChartBase,
  props: {
    darkMode: { type: Boolean, default: false },
  },
  data: () => ({
    data: [] as { yearmonth: string; balance: number }[],
    hasData: false,
    periodOptions: ['This Year', 'This Quarter', 'YTD'],
  }),
  computed: {
    chartData() {
      const points = [this.data.map((d) => d.balance)];
      const colors = [
        {
          positive: uicolors.blue[this.darkMode ? '600' : '500'],
          negative: uicolors.pink[this.darkMode ? '600' : '500'],
        },
      ];
      const format = (value: number) => fyo.format(value ?? 0, 'Currency');
      const yMax = getYMax(points);
      const yMin = getYMin(points);
      return {
        xLabels: this.data.map((d) => d.yearmonth),
        points,
        format,
        colors,
        yMax,
        yMin,
        formatX: formatXLabels,
        gridColor: this.darkMode ? 'rgba(200, 200, 200, 0.2)' : undefined,
        fontColor: this.darkMode ? uicolors.gray['400'] : undefined,
        zeroLineColor: this.darkMode ? uicolors.gray['400'] : undefined,
      };
    },
  },
  activated() {
    this.setData();
  },
  methods: {
    async setData() {
      const { fromDate, toDate, periodList } = getDatesAndPeriodList(
        this.period
      );

      const data = await fyo.db.getIncomeAndExpenses(
        fromDate.toISO(),
        toDate.toISO()
      );
      const incomes = getValueMapFromList(data.income, 'yearmonth', 'balance');
      const expenses = getValueMapFromList(
        data.expense,
        'yearmonth',
        'balance'
      );

      this.data = periodList.map((d) => {
        const key = d.toFormat('yyyy-MM');
        const inc = incomes[key] ?? 0;
        const exp = expenses[key] ?? 0;
        return { yearmonth: key, balance: inc - exp };
      });
      this.hasData = data.income.length > 0 || data.expense.length > 0;
    },
  },
});
</script>
