<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import {
  DateFormatter,
  type DateValue,
  CalendarDate,
  Time,
} from '@internationalized/date';
import { Calendar } from 'src/components/ui';
import { Popover, PopoverContent, PopoverTrigger } from 'src/components/ui';
import { cn } from 'src/utils/cn';

const props = defineProps<{
  modelValue?: Date | null;
  placeholder?: string;
}>();

const emits = defineEmits<{
  'update:modelValue': [value: Date | null];
}>();

const df = new DateFormatter('en-US', {
  dateStyle: 'long',
  timeStyle: 'short',
});

// Internal state
const datePart = ref<DateValue | undefined>(undefined);
const hours = ref(0);
const minutes = ref(0);

// Sync with modelValue
watch(
  () => props.modelValue,
  (newVal) => {
    if (newVal) {
      datePart.value = new CalendarDate(
        newVal.getFullYear(),
        newVal.getMonth() + 1,
        newVal.getDate()
      );
      hours.value = newVal.getHours();
      minutes.value = newVal.getMinutes();
    } else {
      datePart.value = undefined;
      hours.value = 0;
      minutes.value = 0;
    }
  },
  { immediate: true }
);

const updateModel = () => {
  if (!datePart.value) {
    emits('update:modelValue', null);
    return;
  }

  const d = new Date(
    datePart.value.year,
    datePart.value.month - 1,
    datePart.value.day,
    hours.value,
    minutes.value
  );
  emits('update:modelValue', d);
};

const handleDateChange = (val: DateValue | undefined) => {
  datePart.value = val;
  updateModel();
};

const handleTimeChange = (type: 'hours' | 'minutes', val: string) => {
  const num = parseInt(val, 10) || 0;
  if (type === 'hours') hours.value = Math.min(23, Math.max(0, num));
  if (type === 'minutes') minutes.value = Math.min(59, Math.max(0, num));
  updateModel();
};

const displayValue = computed(() => {
  if (!props.modelValue) return props.placeholder || 'Select Date & Time';
  return df.format(props.modelValue);
});
</script>

<template>
  <Popover>
    <PopoverTrigger as-child>
      <button
        variant="outline"
        :class="
          cn(
            'w-full flex items-center justify-between px-3 py-1.5 text-left font-normal bg-surface border border-border rounded hover:bg-surface-hover transition-colors focus:ring-2 focus:ring-indicator-green-bg outline-none h-9 shadow-none',
            !modelValue && 'text-description'
          )
        "
      >
        <div
          class="flex items-center gap-2 overflow-hidden whitespace-nowrap text-sm"
        >
          <lucide-icon
            name="calendar"
            class="h-4 w-4 opacity-50 flex-shrink-0"
          />
          <span class="truncate">{{ displayValue }}</span>
        </div>
      </button>
    </PopoverTrigger>
    <PopoverContent class="w-auto p-0 overflow-hidden shadow-lg border-border">
      <div
        class="flex flex-col sm:flex-row divide-y sm:divide-y-0 sm:divide-x divide-border"
      >
        <Calendar
          :model-value="datePart"
          class="border-none shadow-none rounded-none"
          @update:model-value="handleDateChange"
        />

        <div class="p-4 flex flex-col gap-4 bg-surface min-w-[120px]">
          <div class="flex flex-col gap-1.5">
            <label
              class="text-xs font-medium text-description uppercase tracking-wider"
              >{{ t`Time` }}</label
            >
            <div class="flex items-center gap-2">
              <div class="flex flex-col gap-1">
                <input
                  type="number"
                  min="0"
                  max="23"
                  :value="hours.toString().padStart(2, '0')"
                  class="w-12 h-9 text-center bg-surface border border-border rounded text-sm focus:ring-2 focus:ring-indicator-green-bg outline-none"
                  @input="
                    (e) =>
                      handleTimeChange(
                        'hours',
                        (e.target as HTMLInputElement).value
                      )
                  "
                />
                <span
                  class="text-[10px] text-description text-center uppercase"
                  >{{ t`Hrs` }}</span
                >
              </div>
              <span class="text-main font-bold mb-5">:</span>
              <div class="flex flex-col gap-1">
                <input
                  type="number"
                  min="0"
                  max="59"
                  :value="minutes.toString().padStart(2, '0')"
                  class="w-12 h-9 text-center bg-surface border border-border rounded text-sm focus:ring-2 focus:ring-indicator-green-bg outline-none"
                  @input="
                    (e) =>
                      handleTimeChange(
                        'minutes',
                        (e.target as HTMLInputElement).value
                      )
                  "
                />
                <span
                  class="text-[10px] text-description text-center uppercase"
                  >{{ t`Min` }}</span
                >
              </div>
            </div>
          </div>

          <div class="mt-auto pt-4 border-t border-border flex flex-col gap-2">
            <button
              class="w-full h-8 text-xs font-medium bg-indicator-green-bg text-white rounded hover:opacity-90 transition-opacity"
              @click="updateModel"
            >
              {{ t`Set Time` }}
            </button>
          </div>
        </div>
      </div>
    </PopoverContent>
  </Popover>
</template>

<style scoped>
/* Hide spin buttons for time inputs */
input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
input[type='number'] {
  appearance: textfield;
}
</style>
