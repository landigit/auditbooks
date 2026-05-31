<script setup lang="ts">
import { computed } from 'vue';
import { DateFormatter, CalendarDate } from '@internationalized/date';
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
});

// Convert Date to CalendarDate for Reka UI
const value = computed({
  get: () => {
    if (!props.modelValue) return undefined;
    const d = props.modelValue;
    return new CalendarDate(d.getFullYear(), d.getMonth() + 1, d.getDate());
  },
  set: (val) => {
    if (!val) {
      emits('update:modelValue', null);
      return;
    }
    const d = new Date(val.year, val.month - 1, val.day);
    emits('update:modelValue', d);
  },
});

const sizeClasses = computed(() => {
  if (props.size === 'small') {
    return 'px-2 py-1 h-8';
  }
  return 'px-3 py-2 h-10';
});
</script>

<template>
  <Popover>
    <PopoverTrigger as-child>
      <button
        variant="outline"
        :class="
          cn(
            'w-full flex items-center justify-between text-left font-normal bg-surface border border-border rounded hover:bg-surface-hover transition-colors focus:ring-2 focus:ring-indicator-green-bg outline-none',
            sizeClasses,
            !modelValue && 'text-description'
          )
        "
        :aria-label="
          modelValue
            ? `Selected date: ${df.format(modelValue)}`
            : 'Select a date'
        "
      >
        <div
          class="flex items-center gap-2 overflow-hidden whitespace-nowrap text-sm"
        >
          <lucide-icon
            name="calendar"
            class="h-4 w-4 opacity-50 flex-shrink-0"
          />
          <span class="truncate">{{
            modelValue ? df.format(modelValue) : placeholder || 'Pick a date'
          }}</span>
        </div>
      </button>
    </PopoverTrigger>
    <PopoverContent class="w-auto p-0">
      <Calendar v-model="value" initial-focus />
    </PopoverContent>
  </Popover>
</template>
