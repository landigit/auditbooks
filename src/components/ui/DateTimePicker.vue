<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import {
  DateFormatter,
  type DateValue,
  CalendarDate,
} from '@internationalized/date';
import { Calendar } from 'src/components/ui';
import { Popover, PopoverContent, PopoverTrigger } from 'src/components/ui';
import { cn } from 'src/utils/cn';

const props = withDefaults(
  defineProps<{
    modelValue?: Date | null;
    placeholder?: string;
    size?: string;
  }>(),
  {
    size: 'large',
  }
);

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

// Use a separate ref for the popover to avoid conflicts with model updates
const isOpen = ref(false);

// Helper for translation if not global
const t = (window as any).fyo?.t || ((s: any) => s);

// Sync with modelValue
watch(
  () => props.modelValue,
  (newVal) => {
    if (newVal && !isOpen.value) {
      datePart.value = new CalendarDate(
        newVal.getFullYear(),
        newVal.getMonth() + 1,
        newVal.getDate()
      );
      hours.value = newVal.getHours();
      minutes.value = newVal.getMinutes();
    } else if (!newVal) {
      datePart.value = undefined;
      hours.value = 0;
      minutes.value = 0;
    }
  },
  { immediate: true }
);

const updateModel = (shouldClose = false) => {
  let targetDate = datePart.value;
  if (!targetDate) {
    const now = new Date();
    targetDate = new CalendarDate(
      now.getFullYear(),
      now.getMonth() + 1,
      now.getDate()
    );
    datePart.value = targetDate;
  }

  const d = new Date(
    targetDate.year,
    targetDate.month - 1,
    targetDate.day,
    hours.value,
    minutes.value
  );

  emits('update:modelValue', d);
  if (shouldClose) {
    isOpen.value = false;
  }
};

const handleDateChange = (val: DateValue | undefined) => {
  datePart.value = val;
  updateModel(false);
};

const handleTimeChange = (type: 'hours' | 'minutes', val: string) => {
  const num = parseInt(val, 10) || 0;
  if (type === 'hours') hours.value = Math.min(23, Math.max(0, num));
  if (type === 'minutes') minutes.value = Math.min(59, Math.max(0, num));
  updateModel(false);
};

const displayValue = computed(() => {
  if (!props.modelValue) return props.placeholder || 'Select Date & Time';
  return df.format(props.modelValue);
});

const sizeClasses = computed(() => {
  if (props.size === 'small') {
    return 'px-2 py-1 h-8';
  }
  return 'px-3 py-2 h-10';
});
</script>

<template>
  <Popover v-model:open="isOpen">
    <PopoverTrigger as-child>
      <button
        variant="outline"
        :class="
          cn(
            'w-full flex items-center justify-between text-left font-normal bg-surface border border-border rounded hover:bg-surface-hover transition-colors focus:ring-2 focus:ring-indicator-green-bg outline-none shadow-none',
            sizeClasses,
            !modelValue && 'text-description'
          )
        "
      >
        <view
          class="flex items-center gap-2 overflow-hidden whitespace-nowrap text-sm"
        >
          <lucide-icon
            name="calendar"
            class="h-4 w-4 opacity-50 flex-shrink-0"
          />
          <text class="truncate">{{ displayValue }}</text>
        </view>
      </button>
    </PopoverTrigger>
    <PopoverContent class="w-auto p-0 overflow-hidden shadow-lg border-border">
      <view
        class="flex flex-col sm:flex-row divide-y sm:divide-y-0 sm:divide-x divide-border"
      >
        <Calendar
          :model-value="datePart as any"
          class="border-none shadow-none rounded-none"
          @update:model-value="handleDateChange"
        />

        <view class="p-4 flex flex-col gap-4 bg-surface min-w-[120px]">
          <view class="flex flex-col gap-1.5">
            <text
              class="text-xs font-medium text-description uppercase tracking-wider"
              >{{ t`Time` }}</text
            >
            <view class="flex items-center gap-2">
              <view class="flex flex-col gap-1">
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
                <text
                  class="text-[10px] text-description text-center uppercase"
                  >{{ t`Hrs` }}</text
                >
              </view>
              <text class="text-main font-bold mb-5">:</text>
              <view class="flex flex-col gap-1">
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
                <text
                  class="text-[10px] text-description text-center uppercase"
                  >{{ t`Min` }}</text
                >
              </view>
            </view>
          </view>

          <view class="mt-auto pt-4 border-t border-border flex flex-col gap-2">
            <button
              class="w-full h-8 text-xs font-medium bg-indicator-green-bg text-white rounded hover:opacity-90 transition-opacity"
              @tap="updateModel(true)"
            >
              {{ t`Set Time` }}
            </button>
          </view>
        </view>
      </view>
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
