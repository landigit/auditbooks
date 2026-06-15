<template>
  <div class="bg-popover text-popover-foreground">
    <!-- Datetime header -->
    <div class="flex justify-between items-center text-sm px-4 pt-4 pb-2">
      <div
        v-if="viewMonth !== month || viewYear !== year"
        class="text-foreground font-medium select-none"
      >
        {{ `${months[viewMonth]}, ${viewYear}` }}
      </div>
      <div v-else class="text-primary font-medium select-none">
        {{ datetimeString }}
      </div>

      <!-- Next and Previous Month Buttons -->
      <div class="flex items-center gap-1">
        <button
          class="font-mono text-muted-foreground hover:text-foreground hover:bg-accent p-1.5 rounded-md transition-colors cursor-pointer"
          @click="prevClicked"
        >
          <FeatherIcon name="chevron-left" class="w-4 h-4" />
        </button>
        <button
          class="font-mono cursor-pointer w-3 h-3 rounded-full border-muted-foreground border hover:border-primary transition-colors mx-1"
          @click="selectToday"
          title="Today"
        />
        <button
          class="font-mono text-muted-foreground hover:text-foreground hover:bg-accent p-1.5 rounded-md transition-colors cursor-pointer"
          @click="nextClicked"
        >
          <FeatherIcon name="chevron-right" class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Date Input Grid -->
    <div class="flex">
      <!-- Weekday Titles & Grid -->
      <div class="px-3 pb-3" :class="selectTime ? 'pb-4' : ''">
        <div class="grid grid-cols-7 gap-1 mb-1">
          <div
            v-for="day of weekdays"
            :key="day"
            class="w-8 h-8 flex items-center justify-center text-xs text-muted-foreground font-medium select-none"
          >
            {{ day }}
          </div>
        </div>

        <!-- Weekday Grid -->
        <div class="grid grid-cols-7 gap-1">
          <div
            v-for="item of weekdayList"
            :key="`${item.year}-${item.month}-${item.day}`"
            class="w-8 h-8 flex items-center justify-center text-xs cursor-pointer select-none"
            :class="getDayClass(item)"
            @click="select(item)"
          >
            {{ item.day }}
          </div>
        </div>
      </div>

      <!-- Month and Year Selectors -->
      <div
        v-if="selectMonthYear"
        class="border-s border-border flex flex-col justify-between"
      >
        <!-- Month Selector -->
        <div
          class="flex flex-col gap-1 overflow-auto m-3"
          style="height: calc(248px - 79.5px - 1px - 2rem)"
        >
          <div
            v-for="(m, i) of months"
            :key="m"
            ref="monthDivs"
            class="text-xs cursor-pointer p-1.5 rounded transition-colors select-none"
            :class="getMonthClass(i)"
            @click="change(i, 'month')"
          >
            {{ m }}
          </div>
        </div>

        <!-- Year Selector -->
        <div
          class="border-t border-border w-full px-3 pt-3"
          :class="selectTime ? 'pb-3' : ''"
        >
          <label class="date-selector-label">Year</label>
          <input
            class="date-selector-input"
            type="number"
            min="1000"
            max="9999"
            :value="year"
            @change="(e) => change(e, 'year')"
          />
        </div>
      </div>
    </div>

    <!-- Time Selector -->
    <div
      v-if="selectTime"
      class="px-4 pt-4 pb-2 grid gap-4 border-t border-border"
      style="grid-template-columns: repeat(3, minmax(0, 1fr))"
    >
      <div>
        <label class="date-selector-label">Hours</label>
        <input
          class="date-selector-input"
          type="number"
          min="0"
          max="23"
          :value="hours"
          @change="(e) => change(e, 'hours')"
        />
      </div>
      <div>
        <label class="date-selector-label">Minutes</label>
        <input
          class="date-selector-input"
          type="number"
          min="0"
          max="59"
          :value="minutes"
          @change="(e) => change(e, 'minutes')"
        />
      </div>
      <div>
        <label class="date-selector-label">Seconds</label>
        <input
          class="date-selector-input"
          type="number"
          min="0"
          max="59"
          :value="seconds"
          @change="(e) => change(e, 'seconds')"
        />
      </div>
    </div>

    <!-- Footer -->
    <div
      class="flex p-3 w-full justify-between items-center border-t border-border mt-1"
    >
      <button
        class="text-xs text-muted-foreground hover:text-foreground transition-colors font-medium cursor-pointer"
        @click="selectMonthYear = !selectMonthYear"
      >
        {{ selectMonthYear ? t`Hide Month/Year` : t`Show Month/Year` }}
      </button>

      <button
        v-if="showClear"
        class="text-xs text-muted-foreground hover:text-foreground transition-colors font-medium cursor-pointer ms-auto"
        @click="clearClicked"
      >
        {{ t`Clear` }}
      </button>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, nextTick, PropType } from 'vue';
import FeatherIcon from '../FeatherIcon.vue';

type WeekListItem = {
  year: number;
  month: number;
  day: number;
  weekday: number;
};

type DatetimeValues = {
  year: number;
  month: number;
  day: number;
  hours: number;
  minutes: number;
  seconds: number;
  ms: number;
};

export default defineComponent({
  components: { FeatherIcon },
  props: {
    modelValue: { type: Date },
    selectTime: { type: Boolean, default: true },
    showClear: { type: Boolean, default: true },
    formatValue: { type: Function as PropType<(value: Date | null) => string> },
  },
  emits: ['update:modelValue'],
  data() {
    return {
      selectedMonth: 0,
      selectedYear: 1000,
      viewMonth: 0,
      viewYear: 1000,
      selectMonthYear: false,
    } as {
      selectedMonth: number;
      selectedYear: number;
      selectMonthYear: boolean;
      viewMonth: number;
      viewYear: number;
    };
  },
  computed: {
    today() {
      return new Date();
    },
    internalValue(): Date {
      if (this.modelValue == null) {
        return this.today;
      }
      return this.modelValue;
    },
    year() {
      return this.internalValue?.getFullYear() ?? 1000;
    },
    month() {
      return this.internalValue?.getMonth() ?? 0;
    },
    day() {
      return this.internalValue?.getDate() ?? 1;
    },
    hours() {
      return this.internalValue?.getHours() ?? 0;
    },
    minutes() {
      return this.internalValue?.getMinutes() ?? 0;
    },
    seconds() {
      return this.internalValue?.getSeconds() ?? 0;
    },
    ms() {
      return this.internalValue?.getMilliseconds() ?? 0;
    },
    weekdayList() {
      return getWeekdayList(this.viewYear, this.viewMonth);
    },
    datetimeString() {
      if (this.formatValue) {
        return this.formatValue(this.internalValue);
      }

      const dateString = this.internalValue
        .toDateString()
        .split(' ')
        .slice(1)
        .join(' ');

      if (!this.selectTime) {
        return dateString;
      }
      const timeString = this.internalValue?.toTimeString().split(' ')[0] ?? '';

      return `${dateString} ${timeString}`;
    },
    months() {
      return [
        this.t`January`,
        this.t`February`,
        this.t`March`,
        this.t`April`,
        this.t`May`,
        this.t`June`,
        this.t`July`,
        this.t`August`,
        this.t`September`,
        this.t`October`,
        this.t`November`,
        this.t`December`,
      ];
    },
    weekdays() {
      return [
        this.t`Su`,
        this.t`Mo`,
        this.t`Tu`,
        this.t`We`,
        this.t`Th`,
        this.t`Fr`,
        this.t`Sa`,
      ];
    },
  },
  watch: {
    async selectMonthYear(value) {
      if (!value) {
        return;
      }
      await nextTick();
      const monthDivs = this.$refs.monthDivs as HTMLDivElement[];
      if (!monthDivs?.length) {
        return;
      }
      monthDivs[this.month]?.scrollIntoView({
        block: 'center',
        inline: 'center',
      });
    },
  },
  mounted() {
    this.viewMonth = this.month;
    this.viewYear = this.year;
  },
  methods: {
    getDayClass(item: WeekListItem) {
      let dclass = [];
      const today = this.today;
      const todayDay = today.getDate();
      const todayMonth = today.getMonth();
      const isToday =
        item.day === todayDay &&
        item.month === todayMonth &&
        item.year === today.getFullYear();
      const isSelected =
        item.day === this.day &&
        item.month === this.month &&
        item.year === this.year;

      if (item.month !== this.viewMonth) {
        dclass.push('text-muted-foreground opacity-30');
      } else {
        dclass.push('text-foreground');
      }

      if (isSelected && this.modelValue != null) {
        dclass.push(
          'bg-primary text-primary-foreground font-semibold rounded-md shadow-sm'
        );
      } else if (isToday) {
        dclass.push(
          'bg-accent text-accent-foreground font-semibold rounded-md'
        );
      } else {
        dclass.push('hover:bg-muted rounded-md transition-colors');
      }
      return dclass;
    },
    getMonthClass(item: number) {
      let dclass = [];
      if (item === this.month) {
        dclass.push('font-semibold');
      }
      if (this.modelValue != null && item === this.month) {
        dclass.push('bg-primary text-primary-foreground');
      } else {
        dclass.push(
          'text-muted-foreground hover:bg-muted hover:text-foreground'
        );
      }
      return dclass;
    },
    change(e: number | Event, name: keyof DatetimeValues) {
      let value: number;
      if (typeof e === 'number' && name === 'month') {
        value = e;
      } else if (typeof e !== 'number') {
        value = Number((e.target as HTMLInputElement).value);
      } else {
        return;
      }

      if (Number.isNaN(value)) {
        return;
      }
      if (name === 'year' && value >= 1000 && value <= 9999) {
        return this.select({ year: value });
      }
      if (name === 'month' && value >= 0 && value <= 11) {
        return this.select({ month: value });
      }
      if (name === 'day' && value >= 1 && value <= 31) {
        return this.select({ day: value });
      }
      if (name === 'hours' && value >= 0 && value <= 23) {
        return this.select({ hours: value });
      }
      if (name === 'minutes' && value >= 0 && value <= 59) {
        return this.select({ minutes: value });
      }
      if (name === 'seconds' && value >= 0 && value <= 59) {
        return this.select({ seconds: value });
      }
      if (name === 'ms' && value >= 0 && value <= 999) {
        return this.select({ ms: value });
      }
    },
    select(values: Partial<DatetimeValues>) {
      const year = values.year ?? this.year;
      const month = values.month ?? this.month;
      const day = values.day ?? this.day;
      const hours = values.hours ?? this.hours;
      const minutes = values.minutes ?? this.minutes;
      const seconds = values.seconds ?? this.seconds;
      const ms = values.ms ?? this.ms;

      const date = new Date(year, month, day, hours, minutes, seconds, ms);

      this.viewMonth = month;
      this.viewYear = year;

      this.emitChange(date);
    },
    selectToday() {
      return this.emitChange(new Date());
    },
    clearClicked() {
      this.emitChange(null);
    },
    emitChange(value: null | Date) {
      if (value == null) {
        this.viewMonth = this.today.getMonth();
        this.viewYear = this.today.getFullYear();
      } else {
        this.viewMonth = value.getMonth();
        this.viewYear = value.getFullYear();
      }

      this.$emit('update:modelValue', value);
    },
    nextClicked() {
      const d = new Date(this.viewYear, this.viewMonth + 1, 1);
      this.viewYear = d.getFullYear();
      this.viewMonth = d.getMonth();
    },
    prevClicked() {
      const d = new Date(this.viewYear, this.viewMonth - 1, 1);
      this.viewYear = d.getFullYear();
      this.viewMonth = d.getMonth();
    },
  },
});

function getWeekdayList(startYear: number, startMonth: number): WeekListItem[] {
  let year = startYear;
  let month = startMonth;
  let day = 1;

  const weekdayList: WeekListItem[] = [];

  while (month === startMonth) {
    const date = new Date(year, month, day);
    if (date.getMonth() !== month) {
      break;
    }

    weekdayList.push({ year, month, day, weekday: date.getDay() });

    year = date.getFullYear();
    month = date.getMonth();
    day += 1;
  }

  while (weekdayList[0]?.weekday !== 0) {
    const { year, month, day } = weekdayList[0] ?? {};
    if (year === undefined || month === undefined || day === undefined) {
      break;
    }

    const date = new Date(year, month, day - 1);
    weekdayList.unshift({
      year: date.getFullYear(),
      month: date.getMonth(),
      day: date.getDate(),
      weekday: date.getDay(),
    });
  }

  while (weekdayList.length !== 42) {
    const { year, month, day } = weekdayList.at(-1) ?? {};
    if (year === undefined || month === undefined || day === undefined) {
      break;
    }

    const date = new Date(year, month, day + 1);
    weekdayList.push({
      year: date.getFullYear(),
      month: date.getMonth(),
      day: date.getDate(),
      weekday: date.getDay(),
    });
  }

  return weekdayList;
}
</script>

<style scoped>
.date-selector-label {
  color: var(--muted-foreground) !important;
  font-weight: 500;
  display: block;
  margin-bottom: 0.125rem;
  font-size: 0.75rem;
}

.date-selector-input {
  background-color: var(--background) !important;
  color: var(--foreground) !important;
  border: 1px solid var(--border) !important;
  border-radius: var(--radius, 0.375rem);
  padding: 0.25rem 0.5rem;
  font-size: 0.875rem;
  outline: none;
  width: 100%;
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
}

.date-selector-input:focus {
  border-color: var(--ring) !important;
  box-shadow: 0 0 0 1px var(--ring);
}

input[type='number']::-webkit-inner-spin-button {
  appearance: auto;
}
</style>
